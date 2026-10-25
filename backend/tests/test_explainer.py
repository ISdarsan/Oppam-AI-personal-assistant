import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.explainer import ollama_client
from app.services.ollama_client import OllamaServiceError

@pytest.mark.asyncio
async def test_explain_valid_message():
    mock_model_response = {
        "simple_summary": "Your prescription for eye drops is ready for collection at City Pharmacy.",
        "key_details": ["City Pharmacy", "Prescription ready"],
        "action_items": ["Collect prescription before 5 PM"],
        "warnings_and_checks": ["Check pharmacy timings before visiting"],
        "is_suspicious": False
    }

    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=mock_model_response)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/messages/explain", json={
                "text": "Your prescription for eye drops is ready for collection at City Pharmacy before 5 PM.",
                "language": "en"
            })
            assert res.status_code == 200
            data = res.json()
            assert "prescription" in data["simple_summary"].lower()
            assert len(data["key_details"]) > 0
            assert data["is_suspicious"] is False

@pytest.mark.asyncio
async def test_explain_suspicious_message_red_flag():
    mock_model_response = {
        "simple_summary": "Someone claiming to be your bank asks for your OTP.",
        "key_details": ["Urgent request", "Mentions OTP"],
        "action_items": ["Do not reply or share information"],
        "warnings_and_checks": ["Never share your OTP with anyone."],
        "is_suspicious": True
    }

    transport = ASGITransport(app=app)
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=mock_model_response)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/messages/explain", json={
                "text": "URGENT: Your bank account will be blocked! Send your OTP immediately to 9876543210 to reactivate.",
                "language": "en"
            })
            assert res.status_code == 200
            data = res.json()
            assert data["is_suspicious"] is True
            assert any("otp" in w.lower() for w in data["warnings_and_checks"])

@pytest.mark.asyncio
async def test_explain_empty_message_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/messages/explain", json={
            "text": "   ",
            "language": "en"
        })
        assert res.status_code == 400
