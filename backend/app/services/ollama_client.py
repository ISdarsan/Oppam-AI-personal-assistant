import json
import re
from typing import Any, Dict, List, Optional
import httpx
from ..core.config import settings

class OllamaServiceError(Exception):
    """Raised when Ollama cannot be reached or fails to respond."""
    pass

class OllamaModelNotFoundError(OllamaServiceError):
    """Raised when the configured model is not installed in Ollama."""
    pass

class OllamaClient:
    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL, model: str = settings.OLLAMA_MODEL, timeout: float = settings.OLLAMA_TIMEOUT_SECONDS):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    async def check_health(self) -> Dict[str, Any]:
        """Check if Ollama service is reachable and if the configured model is pulled."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models: List[str] = [m.get("name", "") for m in data.get("models", [])]
                    model_available = any(
                        self.model == m or m.startswith(f"{self.model}:") or self.model.startswith(m)
                        for m in models
                    )
                    status = "healthy" if model_available else "degraded"
                    msg = (
                        f"Connected to Ollama. Model '{self.model}' is ready."
                        if model_available
                        else f"Ollama is running, but model '{self.model}' is not pulled yet. Run 'ollama run {self.model}'."
                    )
                    return {
                        "status": status,
                        "ollama_connected": True,
                        "model_available": model_available,
                        "configured_model": self.model,
                        "available_models": models,
                        "message": msg
                    }
                else:
                    return {
                        "status": "unavailable",
                        "ollama_connected": False,
                        "model_available": False,
                        "configured_model": self.model,
                        "available_models": [],
                        "message": f"Ollama responded with HTTP {res.status_code}."
                    }
        except httpx.ConnectError:
            return {
                "status": "unavailable",
                "ollama_connected": False,
                "model_available": False,
                "configured_model": self.model,
                "available_models": [],
                "message": f"Cannot connect to Ollama at {self.base_url}. Ensure Ollama is running ('ollama serve')."
            }
        except Exception as e:
            return {
                "status": "unavailable",
                "ollama_connected": False,
                "model_available": False,
                "configured_model": self.model,
                "available_models": [],
                "message": f"Error connecting to Ollama: {str(e)}"
            }

    async def warm_up(self) -> None:
        """Best-effort background load of the model so the first real request isn't a cold start."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                await client.post(f"{self.base_url}/api/generate",
                                  json={"model": self.model, "prompt": "", "keep_alive": settings.OLLAMA_KEEP_ALIVE, "stream": False})
        except Exception:
            pass  # Ollama down or model missing: requests will fall back / report 503 on their own

    async def generate_json(self, prompt: str) -> Dict[str, Any]:
        """Send prompt to Ollama with format='json' and parse JSON response."""
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "keep_alive": settings.OLLAMA_KEEP_ALIVE,
            "options": {
                "temperature": 0.1,  # Low temperature for deterministic output
                "num_predict": settings.OLLAMA_NUM_PREDICT,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 404:
                    raise OllamaModelNotFoundError(f"Model '{self.model}' not found in Ollama. Run: ollama run {self.model}")
                if res.status_code != 200:
                    raise OllamaServiceError(f"Ollama returned HTTP {res.status_code}: {res.text}")

                data = res.json()
                raw_text = data.get("response", "").strip()

                # Clean possible markdown wrap
                cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
                cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE).strip()

                try:
                    parsed = json.loads(cleaned)
                except json.JSONDecodeError as jde:
                    # Attempt to find the first '{' and last '}'
                    match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
                    try:
                        parsed = json.loads(match.group(1)) if match else None
                    except json.JSONDecodeError:
                        parsed = None
                    if parsed is None:
                        raise OllamaServiceError(f"Failed to parse model output as JSON: {raw_text[:200]}") from jde
                if not isinstance(parsed, dict):
                    raise OllamaServiceError(f"Model returned JSON that is not an object: {raw_text[:200]}")
                return parsed

        except httpx.ConnectError as ce:
            raise OllamaServiceError(f"Cannot connect to local Ollama at {self.base_url}. Is Ollama running?") from ce
        except httpx.TimeoutException as te:
            raise OllamaServiceError(f"Request to Ollama timed out after {self.timeout}s.") from te

ollama_client = OllamaClient()
