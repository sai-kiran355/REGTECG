"""
Redis client and connection pool for the RegTech Compliance OS backend.
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator

import redis.asyncio as aioredis
from redis.exceptions import RedisError

from core.config import Settings

logger = logging.getLogger(__name__)

settings = Settings()

BLACKLIST_PREFIX = "blacklist:"
REFRESH_PREFIX = "refresh:"
CACHE_PREFIX = "cache:"

# Create connection pool without socket timeouts (causes issues on Windows with asyncio)
redis_pool = aioredis.ConnectionPool.from_url(
    str(settings.REDIS_URL),
    max_connections=20,
    decode_responses=True,
)

redis_client: aioredis.Redis = aioredis.Redis(connection_pool=redis_pool)


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """FastAPI dependency that yields the shared Redis client."""
    yield redis_client


async def check_redis_health() -> str:
    """Ping Redis. Returns 'ok' or 'degraded'."""
    try:
        import asyncio
        await asyncio.wait_for(redis_client.ping(), timeout=2.0)
        return "ok"
    except Exception as exc:
        logger.error("Redis health check failed: %s — %s", type(exc).__name__, exc)
        return "degraded"
