from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
import asyncio
from contextlib import asynccontextmanager
from .services.ollama_client import ollama_client
from .api import health, assistant, explainer, speech, demo, community, family, sos, ai_requests
from .db import init_db

@asynccontextmanager
async def lifespan(_app):
    init_db()
    warm = asyncio.create_task(ollama_client.warm_up())  # non-blocking: server starts immediately
    yield
    warm.cancel()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for Oppam — A compassionate, multilingual elderly companion powered by Sarvam AI & open-weight Gemma.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(assistant.router, prefix=settings.API_PREFIX)
app.include_router(explainer.router, prefix=settings.API_PREFIX)
app.include_router(speech.router, prefix=settings.API_PREFIX)
for _r in (demo, community, family, sos, ai_requests):
    app.include_router(_r.router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health",
        "speech_status": f"{settings.API_PREFIX}/speech/status"
    }
