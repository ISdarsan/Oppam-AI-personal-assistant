import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from pydantic import BaseModel

# Automatically discover and load .env from project root or backend directory
current_dir = Path(__file__).resolve().parent
# current_dir is backend/app/core
# parent 1: backend/app
# parent 2: backend
# parent 3: project root
project_root = current_dir.parent.parent.parent
backend_dir = current_dir.parent.parent

for candidate in [project_root / ".env", backend_dir / ".env", Path.cwd() / ".env"]:
    if candidate.exists():
        load_dotenv(dotenv_path=candidate, override=True)
        break

class Settings(BaseModel):
    APP_NAME: str = "Koode AI Backend"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Ollama open-weight AI configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma3:4b")
    # Gemma 3 4B needs ~50s for the very first (cold) load on a laptop; warm calls take a few seconds.
    OLLAMA_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "90.0"))
    OLLAMA_KEEP_ALIVE: str = os.getenv("OLLAMA_KEEP_ALIVE", "30m")  # keep the model loaded between requests
    OLLAMA_NUM_PREDICT: int = int(os.getenv("OLLAMA_NUM_PREDICT", "400"))  # cap output tokens (JSON replies are short)
    
    # Sarvam AI Speech-to-Text configuration
    SARVAM_API_KEY: Optional[str] = os.getenv("SARVAM_API_KEY")
    SARVAM_BASE_URL: str = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai")
    SARVAM_MODEL: str = os.getenv("SARVAM_MODEL", "saaras:v4")
    SARVAM_CHAT_MODEL: str = os.getenv("SARVAM_CHAT_MODEL", "sarvam-105b-conversations")
    SARVAM_TTS_MODEL: str = os.getenv("SARVAM_TTS_MODEL", "bulbul:v3")
    SARVAM_DEFAULT_MODE: str = os.getenv("SARVAM_MODE", "transcribe")
    SARVAM_TIMEOUT_SECONDS: float = float(os.getenv("SARVAM_TIMEOUT_SECONDS", "25.0"))
    
    # Audio upload limits
    MAX_AUDIO_SIZE_BYTES: int = int(os.getenv("MAX_AUDIO_SIZE_BYTES", str(10 * 1024 * 1024)))  # 10 MB limit
    MAX_AUDIO_DURATION_SECONDS: float = float(os.getenv("MAX_AUDIO_DURATION_SECONDS", "30.0"))  # 30s limit for synchronous STT
    
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
