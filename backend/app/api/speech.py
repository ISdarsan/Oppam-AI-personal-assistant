from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from ..schemas.speech import SpeechTranscribeResponse, SpeechServiceStatus
from ..services.sarvam_service import (
    sarvam_service,
    SarvamServiceError,
    SarvamNotConfiguredError,
    SarvamAuthError,
    SarvamQuotaError,
    InvalidAudioError,
    AudioFileTooLargeError,
    SarvamTimeoutError,
    SarvamServiceUnavailableError,
)

router = APIRouter(prefix="/speech", tags=["Speech"])

@router.get("/status", response_model=SpeechServiceStatus)
async def get_speech_status():
    """Check whether Sarvam speech recognition is configured on the backend."""
    configured = sarvam_service.is_configured()
    return SpeechServiceStatus(
        configured=configured,
        model=sarvam_service.model,
        provider="sarvam",
        message=(
            f"Sarvam AI speech recognition ({sarvam_service.model}) is ready."
            if configured
            else "Sarvam AI is not configured. Set SARVAM_API_KEY in backend .env to enable cloud voice recognition."
        )
    )

@router.post("/transcribe", response_model=SpeechTranscribeResponse)
async def transcribe_audio_endpoint(
    file: UploadFile = File(..., description="Multipart audio file recording"),
    language: Optional[str] = Form("ml-IN", description="Language code e.g. ml-IN, en-IN"),
    mode: Optional[str] = Form(None, description="Transcription mode (transcribe, translate, etc.)"),
):
    """
    Transcribe browser-recorded audio using Sarvam AI Saaras model.
    Accepts WebM, MP4, WAV, OGG, or AAC audio files.
    """
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "MISSING_AUDIO_FILE",
                "message": "No audio file was attached to the request.",
                "suggestion": "Record audio in the browser before requesting transcription."
            }
        )

    filename = file.filename or "recording.webm"
    content_type = file.content_type or "audio/webm"

    try:
        audio_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "FAILED_READING_UPLOAD",
                "message": f"Could not read uploaded audio: {str(e)}",
                "suggestion": "Try recording again."
            }
        )

    try:
        result = await sarvam_service.transcribe_audio(
            audio_bytes=audio_bytes,
            filename=filename,
            content_type=content_type,
            language=language or "ml-IN",
            mode=mode
        )
        return SpeechTranscribeResponse(**result)

    except SarvamNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": e.code,
                "message": e.message,
                "suggestion": "Configure SARVAM_API_KEY in the backend .env file."
            }
        )
    except SarvamAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": e.code,
                "message": e.message,
                "suggestion": "Verify your SARVAM_API_KEY credentials at https://sarvam.ai"
            }
        )
    except SarvamQuotaError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": e.code,
                "message": e.message,
                "suggestion": "Check your Sarvam AI account quota and credits."
            }
        )
    except (InvalidAudioError, AudioFileTooLargeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": e.code,
                "message": e.message,
                "suggestion": "Keep recordings under 30 seconds and speak clearly."
            }
        )
    except (SarvamTimeoutError, SarvamServiceUnavailableError) as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": e.code,
                "message": e.message,
                "suggestion": "Please check your internet connection and try again."
            }
        )
    except SarvamServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": e.code,
                "message": e.message,
                "suggestion": "Try again or type your request directly."
            }
        )
