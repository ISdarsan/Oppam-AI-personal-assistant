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
