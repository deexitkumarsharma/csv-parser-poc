from fastapi import APIRouter, status
from datetime import datetime

from app.core.config import settings
from app.core.cache import get_redis

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def health_check():
    redis_healthy = False
    redis_client = await get_redis()
    
    if redis_client:
        try:
            await redis_client.ping()
            redis_healthy = True
        except:
            pass
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "services": {
            "redis": redis_healthy,
            "gemini": bool(settings.GEMINI_API_KEY),
        }
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    redis_client = await get_redis()
    
    if not redis_client:
        return {"status": "not_ready", "reason": "Redis not connected"}, status.HTTP_503_SERVICE_UNAVAILABLE
    
    try:
        await redis_client.ping()
    except:
        return {"status": "not_ready", "reason": "Redis ping failed"}, status.HTTP_503_SERVICE_UNAVAILABLE
    
    return {"status": "ready"}