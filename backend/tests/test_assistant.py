import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.assistant import ollama_client
from app.services.ollama_client import OllamaServiceError

@pytest.mark.asyncio
async def test_assistant_valid_reminder_extraction():
    mock_model_response = {
        "intent": "create_reminder",
        "spoken_response": "I have prepared a reminder to call your daughter at six this evening. Please confirm.",
        "reminder_data": {
            "title": "Call daughter",
            "date": "2026-10-25",
            "time": "18:00",
            "description": None,
            "requires_confirmation": True
        },
        "clarification_prompt": None,
        "confidence": 0.98
    }

    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=mock_model_response)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={
                "text": "Remind me to call my daughter at six this evening",
                "language": "en",
                "user_time": "2026-10-25T12:00:00"
            })
            assert res.status_code == 200
            data = res.json()
            assert data["intent"] == "create_reminder"
            assert data["reminder_data"]["title"] == "Call daughter"
            assert data["reminder_data"]["time"] == "18:00"
            assert data["reminder_data"]["requires_confirmation"] is True

@pytest.mark.asyncio
async def test_assistant_ambiguous_time_clarification():
    mock_model_response = {
        "intent": "create_reminder",
        "spoken_response": "What time would you like to take your medicine?",
        "reminder_data": {
            "title": "Take medicine",
            "date": "2026-10-25",
            "time": None,  # Missing time!
            "requires_confirmation": True
        },
        "clarification_prompt": "What time would you like this reminder set for?",
        "confidence": 0.8
    }

    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=mock_model_response)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={
                "text": "Remind me to take my medicine",
                "language": "en"
            })
            assert res.status_code == 200
            data = res.json()
            # Must NOT silently guess time
            assert data["intent"] == "clarification_needed"
            assert data["clarification_prompt"] is not None

@pytest.mark.asyncio
async def test_assistant_ollama_unavailable():
    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(side_effect=OllamaServiceError("Connection refused"))):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/assistant/interpret", json={
                "text": "Hello Sahaaya",
                "language": "en"
            })
            assert res.status_code == 503
            data = res.json()
            assert data["detail"]["code"] == "AI_UNAVAILABLE"
