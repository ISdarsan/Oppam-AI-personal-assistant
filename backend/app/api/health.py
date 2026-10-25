from fastapi import APIRouter
from ..schemas.health import HealthResponse
from ..services.ollama_client import ollama_client

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("", response_model=HealthResponse)
async def get_health():
    """Check backend operational status and local Ollama / open-weight model availability."""
    health_data = await ollama_client.check_health()
    return HealthResponse(**health_data)
