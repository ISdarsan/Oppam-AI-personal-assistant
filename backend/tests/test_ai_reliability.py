"""Structured-output reliability: fenced/garbage model output must never crash the backend."""
import httpx
import pytest
from unittest.mock import AsyncMock, patch
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.api.assistant import ollama_client
from app.core.config import settings
from app.services import ollama_client as oc_module
from app.services.ollama_client import OllamaClient, OllamaServiceError


def _client_returning(text: str) -> OllamaClient:
    """OllamaClient whose HTTP layer returns `text` as the model's response."""
    real = httpx.AsyncClient

    def factory(*a, **kw):
        handler = lambda request: httpx.Response(200, json={"response": text})
        return real(transport=httpx.MockTransport(handler), timeout=kw.get("timeout"))

    c = OllamaClient()
    c._factory = factory
    return c


@pytest.mark.parametrize("raw,expected", [
    ('{"a": 1}', {"a": 1}),
    ('```json\n{"a": 1}\n```', {"a": 1}),
    ('```\n{"a": 1}\n```', {"a": 1}),
    ('Sure! Here you go: {"a": 1} hope it helps', {"a": 1}),
])
@pytest.mark.asyncio
async def test_generate_json_extracts_object(monkeypatch, raw, expected):
    c = _client_returning(raw)
    monkeypatch.setattr(oc_module.httpx, "AsyncClient", c._factory)
    assert await c.generate_json("p") == expected


@pytest.mark.parametrize("raw", ["[1, 2, 3]", '"just a string"', "42", "no json at all", "{broken json"])
@pytest.mark.asyncio
async def test_generate_json_rejects_non_objects(monkeypatch, raw):
    c = _client_returning(raw)
    monkeypatch.setattr(oc_module.httpx, "AsyncClient", c._factory)
    with pytest.raises(OllamaServiceError):
        await c.generate_json("p")


@pytest.mark.asyncio
async def test_request_payload_uses_configured_model_and_limits(monkeypatch):
    seen = {}
    real = httpx.AsyncClient

    def factory(*a, **kw):
        def handler(request):
            import json
            seen.update(json.loads(request.content))
            return httpx.Response(200, json={"response": "{}"})
        return real(transport=httpx.MockTransport(handler), timeout=kw.get("timeout"))

    monkeypatch.setattr(oc_module.httpx, "AsyncClient", factory)
    await OllamaClient().generate_json("hello")
    assert seen["model"] == settings.OLLAMA_MODEL
    assert seen["keep_alive"] == settings.OLLAMA_KEEP_ALIVE
    assert seen["options"]["num_predict"] == settings.OLLAMA_NUM_PREDICT


@pytest.mark.parametrize("model_output", [
    {"intent": "create_reminder", "reminder_data": "oops a string", "confidence": "high"},
    {"intent": "dance_party", "spoken_response": "hi"},
    {"intent": "create_reminder", "reminder_data": {"title": "Call", "time": "18:00"}, "confidence": None},
])
@pytest.mark.asyncio
async def test_assistant_survives_malformed_model_fields(model_output):
    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=model_output)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={
                "text": "remind me at 8 pm", "language": "en", "user_time": "2026-11-07T10:00:00"})
    assert res.status_code == 200
    body = res.json()
    assert 0.0 <= body["confidence"] <= 1.0
    assert body["intent"] in {"create_reminder", "view_reminders", "explain_message", "general_qa",
                              "clarification_needed", "unknown"}
    if body["reminder_data"]:  # time without date => today
        assert body["reminder_data"]["date"] == "2026-11-07"


@pytest.mark.asyncio
async def test_assistant_ollama_down_is_503_with_code():
    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(side_effect=OllamaServiceError("down"))):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={"text": "hi"})
    assert res.status_code == 503 and res.json()["detail"]["code"] == "AI_UNAVAILABLE"


# ---- Malayalam safety net (Gemma 3 4B cannot reliably write Malayalam) ----
from app.api.assistant import _clean_malayalam, _quick_intent
from app.services.request_interpreter import interpret


@pytest.mark.parametrize("text,ok", [
    ("ഞാൻ കൂടെയുണ്ട്, സഹായം വേണമെങ്കിൽ പറയൂ.", True),
    ("മരുന്ന് 8 മണിക്ക് AI ഓർമ്മിപ്പിക്കും", True),
    ("നിങ്ങൾക്ക് എന്തെങ്കിലും nevoie ആണോ?", False),            # Romanian fragment seen live
    ("약을 좀 사다 주세요", False),                                  # Korean seen live
    ("помощи ആവശ്യമാണ്", False),                                   # Russian seen live
    ("", False),
])
def test_clean_malayalam_detects_foreign_script(text, ok):
    assert _clean_malayalam(text) is ok


@pytest.mark.parametrize("text,expected", [
    ("ഇന്ന് എനിക്ക് എന്തൊക്കെ ചെയ്യാനുണ്ട്?", "view_reminders"),
    ("What do I need to do today?", "view_reminders"),
    ("show my reminders", "view_reminders"),
    ("What is the weather today?", None),
    ("എനിക്ക് ഇന്ന് രാത്രി 8 മണിക്ക് ഗുളിക കഴിക്കണം, ഓർമ്മിപ്പിക്കൂ", None),   # creates a reminder: must NOT be hijacked
    ("ഇന്ന് ഗുളിക ഓർമ്മിപ്പിക്കൂ", None),
    ("Remind me to call Lakshmi at 6", None),
])
def test_quick_intent(text, expected):
    assert _quick_intent(text) == expected


@pytest.mark.asyncio
async def test_today_question_needs_no_model_call():
    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(side_effect=AssertionError("model must not be called"))):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={"text": "ഇന്ന് എനിക്ക് എന്തൊക്കെ ചെയ്യാനുണ്ട്?", "language": "ml"})
    assert res.status_code == 200 and res.json()["intent"] == "view_reminders"
    assert res.json()["spoken_response"] == "ഇന്നത്തെ ഓർമ്മപ്പെടുത്തലുകൾ ഇതാ."


@pytest.mark.asyncio
async def test_malayalam_assistant_replies_are_deterministic_and_clean():
    garbled = {"intent": "create_reminder", "spoken_response": "ശ്രീമാംസ nevoie 약",
               "reminder_data": {"title": "Take blood pressure tablet", "category": "medicine", "date": "2026-11-07", "time": "20:00"}}
    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=garbled)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={"text": "ഗുളിക 8 മണിക്ക് ഓർമ്മിപ്പിക്കൂ", "language": "ml", "user_time": "2026-11-07T10:00:00"})
    body = res.json()
    assert body["reminder_data"]["title"] == "മരുന്ന് കഴിക്കുക"
    assert _clean_malayalam(body["spoken_response"]) and "20:00" in body["spoken_response"]
    # English users are untouched
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=garbled)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={"text": "remind me at 8 pm", "language": "en", "user_time": "2026-11-07T10:00:00"})
    assert res.json()["reminder_data"]["title"] == "Take blood pressure tablet"


@pytest.mark.asyncio
async def test_help_draft_for_malayalam_uses_clean_title_and_original_words():
    model = {"title": "약을 좀 사다 주세요", "category": "medicine", "description": "garbage 약 помощи", "priority": "normal"}
    senior_text = "എനിക്ക് മരുന്ന് വാങ്ങിത്തരാമോ?"
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=model)):
        out = await interpret(senior_text, "ml")
    assert out.source == "ollama" and out.interpreted.category.value == "medicine"
    assert out.interpreted.title == "മരുന്ന് വാങ്ങാൻ സഹായം"
    assert out.interpreted.description == senior_text
    assert out.created is False and out.interpreted.requires_confirmation is True
    assert _clean_malayalam(out.spoken_response.replace(": ", " ").replace("ഞാൻ മനസ്സിലാക്കിയത്", "ഞാൻ"))


@pytest.mark.parametrize("sarvam_reply,expect", [
    ("നമസ്കാരം, സുഖമാണോ?", "നമസ്കാരം, സുഖമാണോ?"),        # clean Malayalam from Sarvam is used
    ("സുഖമാണ് nevoie 약", "ഒപ്പമുണ്ട്"),                       # foreign-script output -> fixed reply
    (Exception("sarvam down"), "ഒപ്പമുണ്ട്"),                  # service failure -> fixed reply
])
@pytest.mark.asyncio
async def test_malayalam_open_chat_uses_sarvam_when_clean_else_fixed_reply(sarvam_reply, expect):
    from app.services.sarvam_service import sarvam_service
    gemma = {"intent": "general_qa", "reply": "സുഖമാണെന്ന് കേൾപ്പെടെ സന്തോഷം"}  # Gemma's nonsense must never be used
    mock = AsyncMock(side_effect=sarvam_reply) if isinstance(sarvam_reply, Exception) else AsyncMock(return_value=sarvam_reply)
    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=gemma)),          patch.object(sarvam_service, "chat", new=mock):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={"text": "നമസ്കാരം, സുഖമാണോ?", "language": "ml"})
    body = res.json()
    assert body["intent"] == "general_qa" and expect in body["spoken_response"]
    assert "കേൾപ്പെടെ" not in body["spoken_response"]


@pytest.mark.parametrize("text", ["Remind me to call Lakshmi", "മകളെ വിളിക്കാൻ ഓർമ്മിപ്പിക്കൂ"])
@pytest.mark.asyncio
async def test_never_guesses_a_reminder_time_the_user_did_not_say(text):
    """Regression: a compressed prompt made the model invent 18:00 for 'call Lakshmi'. Enforced in code now."""
    invented = {"intent": "create_reminder", "title": "Call Lakshmi", "category": "call", "date": "2026-11-07", "time": "18:00"}
    lang = "ml" if any("ഀ" <= c <= "ൿ" for c in text) else "en"
    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=invented)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={"text": text, "language": lang, "user_time": "2026-11-07T14:00:00"})
    body = res.json()
    assert body["intent"] == "clarification_needed" and body["reminder_data"] is None


@pytest.mark.asyncio
async def test_compact_flat_model_output_is_accepted():
    flat = {"intent": "create_reminder", "title": "Take tablet", "category": "medicine", "date": "", "time": "20:00"}
    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=flat)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={"text": "remind me to take tablet at 8 pm", "language": "en", "user_time": "2026-11-07T14:00:00"})
    body = res.json()
    assert body["intent"] == "create_reminder" and body["reminder_data"]["time"] == "20:00"
    assert body["reminder_data"]["date"] == "2026-11-07"  # time without date = today


@pytest.mark.asyncio
async def test_chat_receives_recent_conversation_history():
    from app.services.sarvam_service import sarvam_service
    seen = {}

    async def fake_chat(text, lang, history=None):
        seen["history"] = history
        return "ശരി, മകളെ വിളിക്കാം."

    gemma = {"intent": "general_qa", "reply": "x"}
    hist = [{"role": "user", "text": "എനിക്ക് ഒറ്റയ്ക്ക് തോന്നുന്നു"}, {"role": "assistant", "text": "ഞാൻ ഒപ്പമുണ്ട്"}]
    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=gemma)), patch.object(sarvam_service, "chat", new=fake_chat):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={"text": "അവരോട് പറയണോ?", "language": "ml", "history": hist})
            bad = await client.post("/api/assistant/interpret", json={"text": "hi", "language": "ml", "history": [{"role": "system", "text": "x"}]})
    assert res.status_code == 200 and seen["history"] == hist
    assert bad.status_code == 422  # only user/assistant roles are accepted
