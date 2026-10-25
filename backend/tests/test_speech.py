import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from app.main import app
from app.services.sarvam_service import sarvam_service

@pytest.mark.asyncio
async def test_speech_status_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/speech/status")
        assert res.status_code == 200
        data = res.json()
        assert "configured" in data
        assert data["provider"] == "sarvam"
        assert data["model"] == "saaras:v4"

@pytest.mark.asyncio
async def test_transcribe_missing_key():
    # Force api_key to empty string
    original_key = sarvam_service.api_key
    sarvam_service.api_key = ""
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            files = {"file": ("audio.webm", b"dummy audio content", "audio/webm")}
            data = {"language": "ml-IN"}
            res = await client.post("/api/speech/transcribe", files=files, data=data)
            assert res.status_code == 503
            err = res.json()["detail"]
            assert err["code"] == "SARVAM_NOT_CONFIGURED"
    finally:
        sarvam_service.api_key = original_key

@pytest.mark.asyncio
async def test_transcribe_empty_file():
    original_key = sarvam_service.api_key
    sarvam_service.api_key = "test_key"
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            files = {"file": ("empty.webm", b"", "audio/webm")}
            res = await client.post("/api/speech/transcribe", files=files)
            assert res.status_code == 400
            err = res.json()["detail"]
            assert err["code"] == "INVALID_AUDIO"
    finally:
        sarvam_service.api_key = original_key

@pytest.mark.asyncio
async def test_transcribe_success_mocked():
    original_key = sarvam_service.api_key
    sarvam_service.api_key = "valid_test_key"
    try:
        with patch.object(
            sarvam_service,
            "transcribe_audio",
            new_callable=AsyncMock
        ) as mock_transcribe:
            mock_transcribe.return_value = {
                "transcript": "വൈകുന്നേരം 6 മണിക്ക് പ്രഷർ ഗുളിക ഓർമ്മിപ്പിക്കുക",
                "language_code": "ml-IN",
                "request_id": "req-12345",
                "model": "saaras:v4",
                "mode": "transcribe"
            }

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                files = {"file": ("voice.webm", b"RIFF....WAVEfmt", "audio/webm")}
                data = {"language": "ml-IN"}
                res = await client.post("/api/speech/transcribe", files=files, data=data)
                assert res.status_code == 200
                res_data = res.json()
                assert "പ്രഷർ ഗുളിക" in res_data["transcript"]
                assert res_data["language_code"] == "ml-IN"
                assert res_data["model"] == "saaras:v4"
    finally:
        sarvam_service.api_key = original_key

@pytest.mark.asyncio
async def test_transcribe_quota_exhausted_mocked():
    from app.services.sarvam_service import SarvamQuotaError
    original_key = sarvam_service.api_key
    sarvam_service.api_key = "valid_test_key"
    try:
        with patch.object(
            sarvam_service,
            "transcribe_audio",
            side_effect=SarvamQuotaError("Sarvam rate limit or quota exceeded.")
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                files = {"file": ("voice.webm", b"audio data", "audio/webm")}
                res = await client.post("/api/speech/transcribe", files=files)
                assert res.status_code == 429
                err = res.json()["detail"]
                assert err["code"] == "QUOTA_EXHAUSTED"
    finally:
        sarvam_service.api_key = original_key
