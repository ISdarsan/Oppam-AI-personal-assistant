"""Turns a senior's free text (English/Malayalam) into a structured help-request DRAFT.

Never creates a request. Uses the existing Ollama/Gemma client; any failure (Ollama down, malformed JSON,
invalid category) falls back to a deterministic keyword classifier. Gemma is a text model here: no image input.
"""
import logging
from pydantic import ValidationError
from ..schemas.community import Category, InterpretedRequest, InterpretRequestOut, Priority
from .ollama_client import ollama_client, OllamaServiceError
from .prompt_templates import LANG_NAME_MAP

log = logging.getLogger("koode.interpreter")

TITLES = {
    Category.medicine: "Medicine purchase",
    Category.grocery: "Grocery shopping",
    Category.hospital_assistance: "Hospital assistance",
    Category.transportation: "Transportation help",
    Category.ration_shop: "Ration shop assistance",
    Category.bank: "Bank assistance",
    Category.government_office: "Government office assistance",
    Category.other: "Help needed",
}

# Order matters: more specific intents first (a hospital trip is hospital_assistance, not plain transportation).
KEYWORDS: list[tuple[Category, tuple[str, ...]]] = [
    (Category.medicine, ("medicine", "medicines", "tablet", "tablets", "pills", "pharmacy", "medical shop", "insulin",
                         "മരുന്ന്", "മരുന്ന", "ഗുളിക", "ഫാർമസി")),
    (Category.ration_shop, ("ration", "റേഷൻ", "റേഷന്")),
    (Category.hospital_assistance, ("hospital", "doctor", "clinic", "appointment", "checkup", "check-up",
                                    "ആശുപത്രി", "ഡോക്ടർ", "ഡോക്ടറെ", "ക്ലിനിക്")),
    (Category.bank, ("bank", "pension", "passbook", "atm", "ബാങ്ക്", "പെൻഷൻ")),
    (Category.government_office, ("government", "office", "village office", "panchayat", "certificate", "aadhaar",
                                  "aadhar", "ഓഫീസ്", "വില്ലേജ്", "പഞ്ചായത്ത്", "സർട്ടിഫിക്കറ്റ്")),
    (Category.grocery, ("grocery", "groceries", "vegetable", "vegetables", "rice", "supermarket", "provisions",
                        "പലചരക്ക്", "പച്ചക്കറി", "അരി", "സാധനങ്ങൾ", "സാധനം")),
    (Category.transportation, ("transport", "ride", "auto", "taxi", "cab", "drop me", "take me", "bus", "vehicle",
                               "വണ്ടി", "ഓട്ടോ", "യാത്ര", "ടാക്സി")),
]
URGENT_WORDS = ("urgent", "emergency", "immediately", "right now", "asap", "ഉടൻ", "അടിയന്തര")

_ALIASES = {
    "medicine purchase": "medicine", "medicines": "medicine", "pharmacy": "medicine",
    "groceries": "grocery", "grocery shopping": "grocery",
    "hospital": "hospital_assistance", "hospital assistance": "hospital_assistance", "doctor": "hospital_assistance",
    "transport": "transportation", "ration": "ration_shop", "ration shop": "ration_shop", "ration shop assistance": "ration_shop",
    "bank assistance": "bank", "government": "government_office", "government office assistance": "government_office",
}


def fallback_interpret(text: str) -> InterpretedRequest:
    low = text.lower()
    category = Category.other
    for cat, words in KEYWORDS:
        if any(w in low or w in text for w in words):
            category = cat
            break
    priority = Priority.high if any(w in low or w in text for w in URGENT_WORDS) else Priority.normal
    return InterpretedRequest(title=TITLES[category], category=category, description=text.strip()[:1000],
                              priority=priority, requires_confirmation=True)


def _prompt(text: str, language: str) -> str:
    lang = LANG_NAME_MAP.get(language, "English")
    cats = ", ".join(c.value for c in Category)
    return f"""You help elderly people in Kerala ask neighbours/volunteers for help. Text input may be {lang} or English.
Convert the request into JSON. Do not invent medicine names, doses, addresses or phone numbers.
Request: "{text}"

Allowed categories: {cats}
(hospital appointments/escorts -> hospital_assistance; plain travel -> transportation)
Allowed priority: low, normal, high, urgent

Return ONLY JSON:
{{"title": "short title (max 6 words, English)", "category": "<one allowed category>",
"description": "one clear sentence describing what is needed", "priority": "normal", "requires_confirmation": true}}"""


def _spoken(interp: InterpretedRequest, language: str) -> str:
    if language == "ml":
        return f"ഞാൻ മനസ്സിലാക്കിയത്: {interp.title}. ശരിയാണെങ്കിൽ സ്ഥിരീകരിക്കുക."
    return f"I understood: {interp.title}. Please check it and confirm before I ask for help."


async def interpret(text: str, language: str = "en") -> InterpretRequestOut:
    interp: InterpretedRequest | None = None
    source, model = "fallback", None
    try:
        raw = await ollama_client.generate_json(_prompt(text, language))
        cat = str(raw.get("category", "")).strip().lower().replace(" ", "_")
        raw["category"] = _ALIASES.get(str(raw.get("category", "")).strip().lower(), cat)
        raw["priority"] = str(raw.get("priority", "normal")).lower()
        raw["requires_confirmation"] = True  # never trust the model to waive confirmation
        raw["description"] = raw.get("description") or text.strip()[:1000]
        interp = InterpretedRequest.model_validate(raw)
        source, model = "ollama", ollama_client.model
    except (OllamaServiceError, ValidationError, ValueError, AttributeError, TypeError) as e:
        log.info("AI interpretation fell back to keyword classifier: %s", e)
    if interp is None:
        interp = fallback_interpret(text)
    return InterpretRequestOut(interpreted=interp, source=source, model_used=model,
                               spoken_response=_spoken(interp, language), created=False)
