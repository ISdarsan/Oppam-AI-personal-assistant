from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from ..schemas.assistant import AssistantInterpretRequest, AssistantInterpretResponse, ReminderIntentData
from ..services.ollama_client import ollama_client, OllamaServiceError
from ..services.prompt_templates import get_assistant_interpret_prompt

router = APIRouter(prefix="/assistant", tags=["Assistant"])

@router.post("/interpret", response_model=AssistantInterpretResponse)
async def interpret_assistant_request(request: AssistantInterpretRequest):
    """
    Interpret user voice/text instruction using configured open-weight model.
    Extracts structured reminder intent or conversational response.
    """
    # Reference time
    ref_time = request.user_time or datetime.now().isoformat()

    prompt = get_assistant_interpret_prompt(
        user_text=request.text,
        current_time_str=ref_time,
        language=request.language
    )

    try:
        raw_output = await ollama_client.generate_json(prompt)
    except OllamaServiceError as ose:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_UNAVAILABLE",
                "message": str(ose),
                "suggestion": f"Ensure Ollama is running with model '{ollama_client.model}'."
            }
        )

    # Validate and structure the output
    intent = raw_output.get("intent", "unknown")
    spoken_response = raw_output.get("spoken_response") or "I heard you, but let us verify."
    reminder_data_raw = raw_output.get("reminder_data")
    clarification_prompt = raw_output.get("clarification_prompt")

    parsed_reminder: ReminderIntentData | None = None
    if intent == "create_reminder" and reminder_data_raw:
        title = reminder_data_raw.get("title") or "Reminder"
        date_val = reminder_data_raw.get("date")
        time_val = reminder_data_raw.get("time")
        category_val = reminder_data_raw.get("category") or "general"
        if category_val not in ["medicine", "doctor", "call", "water", "general"]:
            category_val = "general"

        missing = []
        if not time_val:
            missing.append("time")
        if not date_val:
            missing.append("date")

        # If time is missing or incomplete, do not guess
        if "time" in missing:
            intent = "clarification_needed"
            clarification_prompt = (
                "ഏത് സമയത്താണ് ഓർമ്മിപ്പിക്കേണ്ടത് എന്ന് പറയാമോ?"
                if request.language == "ml"
                else "Could you tell me what time you would like this reminder set for?"
            )
            spoken_response = clarification_prompt
        else:
            parsed_reminder = ReminderIntentData(
                title=title,
                category=category_val,
                date=date_val,
                time=time_val,
                description=reminder_data_raw.get("description"),
                missing_fields=missing,
                requires_confirmation=True
            )

    return AssistantInterpretResponse(
        intent=intent,
        spoken_response=spoken_response,
        reminder_data=parsed_reminder,
        clarification_prompt=clarification_prompt,
        model_used=ollama_client.model,
        confidence=float(raw_output.get("confidence", 0.95))
    )
