import json
from typing import Optional, Any
import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool
import structlog

from app.core.config import settings

logger = structlog.get_logger()

pool: Optional[ConnectionPool] = None
redis_client: Optional[redis.Redis] = None


async def init_redis():
    global pool, redis_client
    try:
        pool = ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
        redis_client = redis.Redis(connection_pool=pool)
        await redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.error("Failed to connect to Redis", error=str(e))
        redis_client = None


async def get_redis() -> Optional[redis.Redis]:
    return redis_client


class CacheManager:
    def __init__(self, prefix: str = "csv_parser"):
        self.prefix = prefix
    
    def _make_key(self, key: str) -> str:
        return f"{self.prefix}:{key}"
    
    async def get(self, key: str) -> Optional[Any]:
        if not redis_client:
            return None
        
        try:
            value = await redis_client.get(self._make_key(key))
            return json.loads(value) if value else None
        except Exception as e:
            logger.error("Cache get error", key=key, error=str(e))
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        if not redis_client:
            return False
        
        try:
            serialized = json.dumps(value)
            ttl = ttl or settings.CACHE_TTL
            await redis_client.setex(self._make_key(key), ttl, serialized)
            return True
        except Exception as e:
            logger.error("Cache set error", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        if not redis_client:
            return False
        
        try:
            await redis_client.delete(self._make_key(key))
            return True
        except Exception as e:
            logger.error("Cache delete error", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        if not redis_client:
            return False
        
        try:
            return await redis_client.exists(self._make_key(key)) > 0
        except Exception as e:
            logger.error("Cache exists error", key=key, error=str(e))
            return False


cache_manager = CacheManager()