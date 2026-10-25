import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "Sahaaya AI Backend"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Ollama open-weight AI configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma2:2b")
    OLLAMA_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "30.0"))
    
    # Input bounds
    MAX_TEXT_INPUT_LENGTH: int = 5000
    MAX_ASSISTANT_INPUT_LENGTH: int = 1500
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

settings = Settings()
