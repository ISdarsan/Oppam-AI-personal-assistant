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


def test_codec_suffix_is_stripped_before_sending_to_sarvam():
    """Regression: browsers send 'audio/webm;codecs=opus' which Sarvam rejects as an invalid file type."""
    import inspect
    from app.services import sarvam_service as mod
    src = inspect.getsource(mod.SarvamService.transcribe_audio)
    assert '.split(";")[0]' in src


# ---- text-to-speech (/api/speech/speak) ----
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app as _app
from app.services.sarvam_service import sarvam_service, SarvamNotConfiguredError, SarvamQuotaError

_tts_client = TestClient(_app)


def test_speak_returns_wav_audio():
    with patch.object(sarvam_service, "synthesize", new=AsyncMock(return_value=b"RIFFxxxxWAVE")) as m:
        r = _tts_client.post("/api/speech/speak", json={"text": "നമസ്കാരം", "language": "ml"})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/wav" and r.content.startswith(b"RIFF")
    assert m.call_args.args[1] == "ml-IN"


def test_speak_maps_english_and_validates_input():
    with patch.object(sarvam_service, "synthesize", new=AsyncMock(return_value=b"RIFF")) as m:
        _tts_client.post("/api/speech/speak", json={"text": "hello", "language": "en"})
    assert m.call_args.args[1] == "en-IN"
    assert _tts_client.post("/api/speech/speak", json={"text": "", "language": "ml"}).status_code == 422
    assert _tts_client.post("/api/speech/speak", json={"text": "x" * 501, "language": "ml"}).status_code == 422


def test_speak_errors_are_clean_so_the_app_can_fall_back():
    with patch.object(sarvam_service, "synthesize", new=AsyncMock(side_effect=SarvamNotConfiguredError())):
        r = _tts_client.post("/api/speech/speak", json={"text": "hi", "language": "en"})
    assert r.status_code == 503 and r.json()["detail"]["code"]
    with patch.object(sarvam_service, "synthesize", new=AsyncMock(side_effect=SarvamQuotaError("quota"))):
        assert _tts_client.post("/api/speech/speak", json={"text": "hi", "language": "en"}).status_code == 429
