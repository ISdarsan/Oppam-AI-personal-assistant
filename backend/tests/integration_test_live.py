"""
Koode AI — Real Provider Integration Verification Script

This script verifies REAL live connectivity to:
1. Sarvam AI Speech-to-Text API (https://api.sarvam.ai/speech-to-text)
2. Ollama Local LLM (http://localhost:11434 with configured Gemma model)

Usage:
  python backend/tests/integration_test_live.py

Note:
  Never prints API keys in logs or outputs.
  Reports actual live results vs unavailable state honestly.
"""

import os
import sys
import math
import struct
import asyncio
import httpx
from dotenv import load_dotenv

# Load local .env if present
load_dotenv()

def generate_minimal_wav_bytes(duration_seconds: float = 1.0, sample_rate: int = 16000) -> bytes:
    """Generate a valid, minimal in-memory 16kHz mono WAV tone."""
    num_samples = int(sample_rate * duration_seconds)
    audio_data = bytearray()
    for i in range(num_samples):
        # 440 Hz gentle sine tone
        val = int(32767.0 * 0.3 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
        audio_data.extend(struct.pack('<h', val))

    data_size = len(audio_data)
    total_file_size = 36 + data_size

    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF',
        total_file_size,
        b'WAVE',
        b'fmt ',
        16,      # Subchunk1Size
        1,       # AudioFormat (PCM)
        1,       # NumChannels (Mono)
        sample_rate,
        sample_rate * 2,  # ByteRate
        2,       # BlockAlign
        16,      # BitsPerSample
        b'data',
        data_size
    )
    return bytes(header + audio_data)

async def verify_sarvam_live():
    print("=" * 60)
    print("1. VERIFYING SARVAM AI SPEECH-TO-TEXT (LIVE)")
    print("=" * 60)

    api_key = os.getenv("SARVAM_API_KEY", "").strip()
    if not api_key or api_key == "your_sarvam_api_key_here":
        print("[SARVAM LIVE] Result: SKIPPED (No valid SARVAM_API_KEY found in environment)")
        print("              To test live, set SARVAM_API_KEY=<key> in .env")
        return False

    # Mask key for privacy
    masked_key = api_key[:4] + "..." + api_key[-4:] if len(api_key) > 8 else "***"
    print(f"[SARVAM LIVE] Found SARVAM_API_KEY: {masked_key}")
    print("[SARVAM LIVE] Generating test audio clip (1.0s, 16kHz mono WAV)...")
    wav_bytes = generate_minimal_wav_bytes()

    url = "https://api.sarvam.ai/speech-to-text"
    headers = {"api-subscription-key": api_key}
    files = {"file": ("test_tone.wav", wav_bytes, "audio/wav")}
    data = {"model": "saaras:v4", "mode": "transcribe", "language_code": "en-IN"}

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            print("[SARVAM LIVE] Sending request to https://api.sarvam.ai/speech-to-text ...")
            res = await client.post(url, headers=headers, files=files, data=data)
            if res.status_code == 200:
                body = res.json()
                print("[SARVAM LIVE] Result: SUCCESS (HTTP 200 OK)")
                print(f"              Model: {data['model']}")
                print(f"              Request ID: {body.get('request_id')}")
                print(f"              Language Code: {body.get('language_code')}")
                print(f"              Transcript: '{body.get('transcript')}'")
                return True
            elif res.status_code == 401 or res.status_code == 403:
                print(f"[SARVAM LIVE] Result: AUTHENTICATION FAILED (HTTP {res.status_code})")
                print("              The provided SARVAM_API_KEY was rejected by Sarvam AI.")
                return False
            elif res.status_code == 429:
                print("[SARVAM LIVE] Result: QUOTA / RATE LIMIT EXCEEDED (HTTP 429)")
                return False
            else:
                print(f"[SARVAM LIVE] Result: HTTP {res.status_code} - {res.text[:200]}")
                return False
    except httpx.TimeoutException:
        print("[SARVAM LIVE] Result: TIMEOUT after 20.0s")
        return False
    except httpx.ConnectError:
        print("[SARVAM LIVE] Result: NETWORK CONNECTION ERROR (Cannot reach api.sarvam.ai)")
        return False
    except Exception as e:
        print(f"[SARVAM LIVE] Result: ERROR ({type(e).__name__}: {str(e)})")
        return False

async def verify_ollama_live():
    print("\n" + "=" * 60)
    print("2. VERIFYING OLLAMA LOCAL AI (LIVE)")
    print("=" * 60)

    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    model = os.getenv("OLLAMA_MODEL", "gemma3:4b")
    print(f"[OLLAMA LIVE] Target Base URL: {base_url}")
    print(f"[OLLAMA LIVE] Configured Model: {model}")

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(f"{base_url}/api/tags")
            if res.status_code == 200:
                data = res.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                print(f"[OLLAMA LIVE] Service: REACHABLE (Found {len(models)} installed models: {models})")
                model_found = any(model == m or m.startswith(f"{model}:") for m in models)
                if model_found:
                    print(f"[OLLAMA LIVE] Configured Model '{model}': INSTALLED AND READY")
                    # Test generation
                    gen_res = await client.post(
                        f"{base_url}/api/generate",
                        json={
                            "model": model,
                            "prompt": "Say 'Koode AI is ready' in 5 words.",
                            "stream": False
                        },
                        timeout=15.0
                    )
                    if gen_res.status_code == 200:
                        gen_out = gen_res.json().get("response", "").strip()
                        print(f"[OLLAMA LIVE] Test Generation Output: '{gen_out}'")
                        print("[OLLAMA LIVE] Result: SUCCESS (Gemma model responsive)")
                        return True
                    else:
                        print(f"[OLLAMA LIVE] Generation HTTP {gen_res.status_code}: {gen_res.text[:200]}")
                        return False
                else:
                    print(f"[OLLAMA LIVE] Model '{model}' NOT found in installed list.")
                    print(f"              Run: 'ollama run {model}'")
                    return False
            else:
                print(f"[OLLAMA LIVE] HTTP {res.status_code}: {res.text[:200]}")
                return False
    except httpx.ConnectError:
        print("[OLLAMA LIVE] Result: OFFLINE / UNREACHABLE")
        print(f"              Cannot connect to {base_url}. Ensure Ollama is started ('ollama serve').")
        return False
    except Exception as e:
        print(f"[OLLAMA LIVE] Result: ERROR ({type(e).__name__}: {str(e)})")
        return False

async def main():
    sarvam_ok = await verify_sarvam_live()
    ollama_ok = await verify_ollama_live()

    print("\n" + "=" * 60)
    print("LIVE INTEGRATION SUMMARY")
    print("=" * 60)
    print(f"Sarvam AI STT Live Status: {'READY' if sarvam_ok else 'NOT ACTIVE (Mocked in unit tests)'}")
    print(f"Ollama Gemma Live Status:  {'READY' if ollama_ok else 'OFFLINE (Mocked in unit tests)'}")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
