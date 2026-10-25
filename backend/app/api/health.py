from fastapi import APIRouter
from ..schemas.health import HealthResponse
from ..services.ollama_client import ollama_client
from ..services.sarvam_service import sarvam_service

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("", response_model=HealthResponse)
async def get_health():
    """Check backend operational status, local Ollama / open-weight model availability, and Sarvam AI status."""
    health_data = await ollama_client.check_health()
    health_data["sarvam_configured"] = sarvam_service.is_configured()
    health_data["sarvam_model"] = sarvam_service.model
    return HealthResponse(**health_data)
