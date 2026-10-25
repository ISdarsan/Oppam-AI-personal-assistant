import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.health import ollama_client

@pytest.mark.asyncio
async def test_health_endpoint_healthy():
    transport = ASGITransport(app=app)
    mock_health = {
        "status": "healthy",
        "ollama_connected": True,
        "model_available": True,
        "configured_model": "gemma2:2b",
        "available_models": ["gemma2:2b"],
        "message": "Connected to Ollama. Model 'gemma2:2b' is ready."
    }
    with patch.object(ollama_client, "check_health", new=AsyncMock(return_value=mock_health)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["ollama_connected"] is True
            assert data["model_available"] is True
            assert data["configured_model"] == "gemma2:2b"

@pytest.mark.asyncio
async def test_health_endpoint_unavailable():
    transport = ASGITransport(app=app)
    mock_health = {
        "status": "unavailable",
        "ollama_connected": False,
        "model_available": False,
        "configured_model": "gemma2:2b",
        "available_models": [],
        "message": "Cannot connect to Ollama at http://localhost:11434."
    }
    with patch.object(ollama_client, "check_health", new=AsyncMock(return_value=mock_health)):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unavailable"
            assert data["ollama_connected"] is False
