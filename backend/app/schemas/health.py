from pydantic import BaseModel
from typing import List

class HealthResponse(BaseModel):
    status: str  # "healthy" | "degraded" | "unavailable"
    ollama_connected: bool
    model_available: bool
    configured_model: str
    available_models: List[str]
    message: str
