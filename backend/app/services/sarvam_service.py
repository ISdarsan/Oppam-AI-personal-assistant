import os
import io
import logging
from typing import Any, Dict, Optional
import httpx
from ..core.config import settings

logger = logging.getLogger(__name__)

class SarvamServiceError(Exception):
    """Base exception for Sarvam AI errors."""
    def __init__(self, message: str, code: str = "SARVAM_ERROR", status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code

class SarvamNotConfiguredError(SarvamServiceError):
    def __init__(self, message: str = "Sarvam API key is not configured on the backend."):
        super().__init__(message, code="SARVAM_NOT_CONFIGURED", status_code=503)

class SarvamAuthError(SarvamServiceError):
    def __init__(self, message: str = "Invalid or expired Sarvam API key."):
        super().__init__(message, code="INVALID_API_KEY", status_code=401)

class SarvamQuotaError(SarvamServiceError):
    def __init__(self, message: str = "Sarvam API rate limit or quota exhausted."):
        super().__init__(message, code="QUOTA_EXHAUSTED", status_code=429)

class InvalidAudioError(SarvamServiceError):
    def __init__(self, message: str = "Invalid or unsupported audio format."):
        super().__init__(message, code="INVALID_AUDIO", status_code=400)

class AudioFileTooLargeError(SarvamServiceError):
    def __init__(self, message: str = "Audio file exceeds maximum size limit (10MB)."):
        super().__init__(message, code="AUDIO_TOO_LARGE", status_code=413)

class SarvamTimeoutError(SarvamServiceError):
    def __init__(self, message: str = "Sarvam transcription request timed out."):
        super().__init__(message, code="SARVAM_TIMEOUT", status_code=504)

class SarvamServiceUnavailableError(SarvamServiceError):
    def __init__(self, message: str = "Sarvam AI service is temporarily unavailable."):
        super().__init__(message, code="SARVAM_UNAVAILABLE", status_code=503)

# Map UI language codes to Sarvam language_code
LANGUAGE_CODE_MAP = {
    "ml": "ml-IN",
    "ml-IN": "ml-IN",
    "en": "en-IN",
    "en-IN": "en-IN",
    "en-US": "en-IN",
    "hi": "hi-IN",
    "hi-IN": "hi-IN",
    "ta": "ta-IN",
    "ta-IN": "ta-IN",
    "te": "te-IN",
    "te-IN": "te-IN",
    "kn": "kn-IN",
    "kn-IN": "kn-IN",
}

class SarvamService:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = settings.SARVAM_BASE_URL,
        model: str = settings.SARVAM_MODEL,
        mode: str = settings.SARVAM_DEFAULT_MODE,
        timeout: float = settings.SARVAM_TIMEOUT_SECONDS,
    ):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.mode = mode
        self.timeout = timeout

    @property
    def current_api_key(self) -> Optional[str]:
        if self.api_key is not None:
            return self.api_key
        return settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY")

    def is_configured(self) -> bool:
        key = self.current_api_key
        return bool(key and key.strip() and key != "your_sarvam_api_key_here")

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str = "recording.webm",
        content_type: str = "audio/webm",
        language: str = "ml-IN",
        mode: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe raw audio bytes using Sarvam AI Saaras model.
        Performs strict validation and error normalization.
        """
        if not self.is_configured():
            raise SarvamNotConfiguredError(
                "Sarvam AI speech recognition is not configured. "
                "Please configure SARVAM_API_KEY in the backend environment."
            )

        api_key = self.current_api_key.strip()

        if not audio_bytes or len(audio_bytes) == 0:
            raise InvalidAudioError("Recorded audio is empty. Please speak into the microphone and try again.")

        if len(audio_bytes) > settings.MAX_AUDIO_SIZE_BYTES:
            raise AudioFileTooLargeError(
                f"Audio file size ({len(audio_bytes)} bytes) exceeds limit ({settings.MAX_AUDIO_SIZE_BYTES} bytes)."
            )

        target_lang = LANGUAGE_CODE_MAP.get(language, language) if language else "ml-IN"
        op_mode = mode or self.mode

        url = f"{self.base_url}/speech-to-text"
        headers = {
            "api-subscription-key": api_key,
        }

        files = {
            "file": (filename, audio_bytes, content_type)
        }
        data = {
            "model": self.model,
            "mode": op_mode,
            "language_code": target_lang
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, headers=headers, files=files, data=data)

                if res.status_code == 200:
                    resp_data = res.json()
                    transcript = resp_data.get("transcript", "").strip()
                    return {
                        "transcript": transcript,
                        "language_code": resp_data.get("language_code", target_lang),
                        "request_id": resp_data.get("request_id"),
                        "model": self.model,
                        "mode": op_mode,
                    }

                elif res.status_code == 401 or res.status_code == 403:
                    raise SarvamAuthError("Authentication with Sarvam AI failed. Please check your SARVAM_API_KEY.")
                elif res.status_code == 429:
                    raise SarvamQuotaError("Sarvam AI rate limit or quota exceeded. Please try again shortly.")
                elif res.status_code == 400 or res.status_code == 422:
                    error_detail = res.text
                    try:
                        error_detail = res.json().get("detail", error_detail)
                    except Exception:
                        pass
                    raise InvalidAudioError(f"Sarvam AI could not process audio: {error_detail}")
                else:
                    raise SarvamServiceUnavailableError(
                        f"Sarvam AI returned unexpected status {res.status_code}."
                    )

        except httpx.TimeoutException as te:
            raise SarvamTimeoutError(f"Sarvam speech transcription timed out after {self.timeout}s.") from te
        except httpx.ConnectError as ce:
            raise SarvamServiceUnavailableError("Could not connect to Sarvam AI network. Check internet connection.") from ce
        except SarvamServiceError:
            raise
        except Exception as e:
            logger.exception("Unexpected error during Sarvam transcription")
            raise SarvamServiceError(f"Unexpected speech transcription failure: {str(e)}") from e

sarvam_service = SarvamService()
