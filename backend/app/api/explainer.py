from fastapi import APIRouter, HTTPException, status
from ..schemas.explainer import MessageExplainRequest, MessageExplainResponse
from ..services.ollama_client import ollama_client, OllamaServiceError
from ..services.prompt_templates import get_message_explain_prompt

router = APIRouter(prefix="/messages", tags=["Message Explainer"])

@router.post("/explain", response_model=MessageExplainResponse)
async def explain_message(request: MessageExplainRequest):
    """
    Explain confusing messages or notices in plain language and identify red flags.
    """
    if not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMPTY_TEXT", "message": "Please provide the message text to explain."}
        )

    prompt = get_message_explain_prompt(request.text, request.language)

    try:
        raw_output = await ollama_client.generate_json(prompt)
    except OllamaServiceError as ose:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_UNAVAILABLE",
                "message": str(ose),
                "suggestion": f"Check that Ollama is running and model '{ollama_client.model}' is installed."
            }
        )

    simple_summary = raw_output.get("simple_summary", "This message could not be summarized.")
    key_details = raw_output.get("key_details", [])
    action_items = raw_output.get("action_items", [])
    warnings_and_checks = raw_output.get("warnings_and_checks", [])
    is_suspicious = bool(raw_output.get("is_suspicious", False))

    # Basic heuristic check for safety fallback (e.g. OTP, UPI PIN, urgent bank transfer)
    lower_text = request.text.lower()
    red_flag_terms = ["otp", "cvv", "upi pin", "atm pin", "password", "urgent transfer", "account blocked", "lottery winner"]
    if any(term in lower_text for term in red_flag_terms) and not is_suspicious:
        is_suspicious = True
        warning_msg = (
            "സുരക്ഷാ മുന്നറിയിപ്പ്: ഈ സന്ദേശത്തിൽ ബാങ്ക് വിവരങ്ങളോ OTP യോ ചോദിക്കുന്നതായി സംശയിക്കുന്നു. ആരുമായും പങ്കുവെക്കരുത്."
            if request.language == "ml"
            else "Security Alert: This message mentions sensitive terms (like OTP or Account details). Never share passwords or PINs."
        )
        if warning_msg not in warnings_and_checks:
            warnings_and_checks.insert(0, warning_msg)

    return MessageExplainResponse(
        simple_summary=simple_summary,
        key_details=key_details if isinstance(key_details, list) else [str(key_details)],
        action_items=action_items if isinstance(action_items, list) else [str(action_items)],
        warnings_and_checks=warnings_and_checks if isinstance(warnings_and_checks, list) else [str(warnings_and_checks)],
        is_suspicious=is_suspicious,
        model_used=ollama_client.model
    )
