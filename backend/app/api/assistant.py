import re
from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from ..schemas.assistant import AssistantInterpretRequest, AssistantInterpretResponse, ReminderIntentData
from ..services.ollama_client import ollama_client, OllamaServiceError
from ..services.prompt_templates import get_assistant_interpret_prompt

router = APIRouter(prefix="/assistant", tags=["Assistant"])

VALID_INTENTS = {"create_reminder", "view_reminders", "explain_message", "general_qa", "clarification_needed", "unknown"}


# --- Malayalam safety net --------------------------------------------------------------------------------
# Live tests showed Gemma 3 4B understands Malayalam (intent, time) but its Malayalam *replies* can contain broken
# words and foreign-script fragments. For language "ml" we therefore speak deterministic, correct Malayalam and use the
# model only for structured understanding. Free-form chat text is used only if it passes the purity check below.
_ML_CATEGORY_TITLE = {
    "medicine": "മരുന്ന് കഴിക്കുക",
    "doctor": "ഡോക്ടറെ കാണുക",
    "call": "ഫോൺ വിളിക്കുക",
    "water": "വെള്ളം കുടിക്കുക",
    "general": "ഓർമ്മപ്പെടുത്തൽ",
}
_ML_FALLBACK_CHAT = "ഞാൻ കൂടെയുണ്ട്. സഹായം വേണമെങ്കിൽ 'സഹായം ചോദിക്കുക' അമർത്തുക, അല്ലെങ്കിൽ ഇവിടെ പറയൂ."
_FOREIGN_SCRIPT = re.compile(r"[Ѐ-ӿ぀-ヿ㐀-鿿가-힯؀-ۿ]")
_LATIN_WORD = re.compile(r"[A-Za-z]{3,}")
_TODAY_ML = re.compile(r"ഇന്ന്.*(എന്തൊക്കെ|എന്ത്).*(ചെയ്യാനുണ്ട്|ചെയ്യണം)|ഇന്നത്തെ ഓർമ്മപ്പെടുത്തലുകൾ|ഓർമ്മപ്പെടുത്തലുകൾ (കാണിക്കൂ|പറയൂ)")
# Phrases that CREATE a reminder must never be mistaken for a "what's today" question.
_CREATE_ML = re.compile(r"ഓർമ്മിപ്പിക്ക|ഓർമ്മപ്പെടുത്തണം|\d+\s*മണി")
_TODAY_EN = re.compile(r"what (do i|should i|have i got).*(today|to do)|my reminders|reminders for today", re.I)


def _clean_malayalam(text) -> bool:
    """True only if a model reply is safe to show/speak to a Malayalam user."""
    if not isinstance(text, str) or not text.strip():
        return False
    return not _FOREIGN_SCRIPT.search(text) and not _LATIN_WORD.search(text.replace("AI", "").replace("Koode", ""))


def _quick_intent(text: str):
    """Obvious 'what do I need to do today' questions need no model call (instant, always correct)."""
    if _CREATE_ML.search(text):
        return None
    return "view_reminders" if (_TODAY_ML.search(text) or _TODAY_EN.search(text)) else None


def _safe_confidence(value) -> float:
    try:
        return min(1.0, max(0.0, float(value)))
    except (TypeError, ValueError):
        return 0.95

@router.post("/interpret", response_model=AssistantInterpretResponse)
async def interpret_assistant_request(request: AssistantInterpretRequest):
    """
    Interpret user voice/text instruction using configured open-weight model.
    Extracts structured reminder intent or conversational response.
    """
    # Reference time
    ref_time = request.user_time or datetime.now().isoformat()

    if _quick_intent(request.text) == "view_reminders":
        return AssistantInterpretResponse(
            intent="view_reminders",
            spoken_response=("ഇന്നത്തെ ഓർമ്മപ്പെടുത്തലുകൾ ഇതാ." if request.language == "ml" else "Here are your reminders for today."),
            model_used="rules",
            confidence=1.0,
        )

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
    if intent not in VALID_INTENTS:
        intent = "unknown"
    spoken_response = raw_output.get("spoken_response") or "I heard you, but let us verify."
    reminder_data_raw = raw_output.get("reminder_data")
    if not isinstance(reminder_data_raw, dict):
        reminder_data_raw = None
    clarification_prompt = raw_output.get("clarification_prompt")

    parsed_reminder: ReminderIntentData | None = None
    if intent == "create_reminder" and reminder_data_raw:
        title = reminder_data_raw.get("title") or "Reminder"
        date_val = reminder_data_raw.get("date")
        time_val = reminder_data_raw.get("time")
        category_val = reminder_data_raw.get("category") or "general"
        if category_val not in ["medicine", "doctor", "call", "water", "general"]:
            category_val = "general"

        # A time without a date means "today" (as the prompt instructs); don't leave the date blank.
        if time_val and not date_val:
            date_val = ref_time[:10]

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

    if request.language == "ml":
        if intent == "create_reminder" and parsed_reminder:
            parsed_reminder.title = _ML_CATEGORY_TITLE.get(parsed_reminder.category, "ഓർമ്മപ്പെടുത്തൽ")
            spoken_response = f"{parsed_reminder.time}-ന് ഓർമ്മപ്പെടുത്താം: {parsed_reminder.title}. ശരിയാണെങ്കിൽ സ്ഥിരീകരിക്കുക."
        elif intent == "view_reminders":
            spoken_response = "ഇന്നത്തെ ഓർമ്മപ്പെടുത്തലുകൾ ഇതാ."
        elif intent == "clarification_needed":
            spoken_response = clarification_prompt or "ഏത് സമയത്താണ് ഓർമ്മിപ്പിക്കേണ്ടത് എന്ന് പറയാമോ?"
            if not _clean_malayalam(clarification_prompt):
                clarification_prompt = "ഏത് സമയത്താണ് ഓർമ്മിപ്പിക്കേണ്ടത് എന്ന് പറയാമോ?"
                spoken_response = clarification_prompt
        else:
            # Open-ended chat: the model's Malayalam is not trustworthy (fluent-looking but often meaningless),
            # so give a fixed, correct, warm reply instead of generated text.
            spoken_response = _ML_FALLBACK_CHAT

    return AssistantInterpretResponse(
        intent=intent,
        spoken_response=spoken_response,
        reminder_data=parsed_reminder,
        clarification_prompt=clarification_prompt,
        model_used=ollama_client.model,
        confidence=_safe_confidence(raw_output.get("confidence"))
    )
