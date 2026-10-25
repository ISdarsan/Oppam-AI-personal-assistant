from typing import Optional
from pydantic import BaseModel, Field

class SpeechTranscribeResponse(BaseModel):
    transcript: str = Field(..., description="Recognized speech transcript")
    language_code: Optional[str] = Field("ml-IN", description="Detected or requested language code (e.g. ml-IN, en-IN)")
    request_id: Optional[str] = Field(None, description="Provider request ID")
    model: str = Field("saaras:v4", description="Sarvam model used for transcription")
    mode: str = Field("transcribe", description="Transcription mode")
    duration_seconds: Optional[float] = Field(None, description="Duration of audio processed in seconds")

class SpeechServiceStatus(BaseModel):
    configured: bool
    model: str
    provider: str = "sarvam"
    message: str
