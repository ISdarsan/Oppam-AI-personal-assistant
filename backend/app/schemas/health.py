from pydantic import BaseModel, Field
from typing import List, Optional

class HealthResponse(BaseModel):
    status: str  # "healthy" | "degraded" | "unavailable"
    ollama_connected: bool
    model_available: bool
    configured_model: str
    available_models: List[str]
    sarvam_configured: bool = Field(False, description="Whether Sarvam STT API key is present")
    sarvam_model: str = Field("saaras:v4", description="Sarvam model name")
    message: str
