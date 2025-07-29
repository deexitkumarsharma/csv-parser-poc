from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import structlog

from app.api.routes import parser, health
from app.core.config import settings
from app.core.cache import init_redis

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up CSV Parser API", version=settings.VERSION)
    await init_redis()
    yield
    logger.info("Shutting down CSV Parser API")


app = FastAPI(
    title="LLM-Powered CSV Parser",
    description="Intelligent CSV/Excel parser using Gemini AI",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=f"{settings.API_PREFIX}/health", tags=["health"])
app.include_router(parser.router, prefix=f"{settings.API_PREFIX}/parse", tags=["parser"])

if settings.UPLOAD_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")


@app.get("/")
async def root():
    return {
        "message": "LLM-Powered CSV Parser API",
        "version": settings.VERSION,
        "docs": "/docs",
    }