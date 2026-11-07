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
                "text": "remind me", "language": "en", "user_time": "2026-11-07T10:00:00"})
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
            res = await client.post("/api/assistant/interpret", json={"text": "ഗുളിക ഓർമ്മിപ്പിക്കൂ", "language": "ml", "user_time": "2026-11-07T10:00:00"})
    body = res.json()
    assert body["reminder_data"]["title"] == "മരുന്ന് കഴിക്കുക"
    assert _clean_malayalam(body["spoken_response"]) and "20:00" in body["spoken_response"]
    # English users are untouched
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=garbled)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={"text": "remind me", "language": "en", "user_time": "2026-11-07T10:00:00"})
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


@pytest.mark.asyncio
async def test_malayalam_open_chat_uses_fixed_warm_reply_not_model_text():
    chat = {"intent": "general_qa", "spoken_response": "സുഖമാണെന്ന് കേൾപ്പെടെ സന്തോഷം"}  # fluent-looking nonsense seen live
    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=chat)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={"text": "നമസ്കാരം, സുഖമാണോ?", "language": "ml"})
    assert res.json()["intent"] == "general_qa"
    assert "കൂടെയുണ്ട്" in res.json()["spoken_response"] and "കേൾപ്പെടെ" not in res.json()["spoken_response"]
