"""
Health check endpoint.

Route:
  GET /api/v1/health — check DB and Redis connectivity
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Literal

from core.config import Settings
from core.redis import check_redis_health

router = APIRouter(tags=["health"])
settings = Settings()


class HealthResponse(BaseModel):
    """Health check response schema."""

    status: Literal["ok", "degraded"]
    version: str
    db: Literal["ok", "degraded"]
    redis: Literal["ok", "degraded"]


async def _check_db_health() -> str:
    """
    Execute SELECT 1 against the database with a 5-second timeout.

    Returns "ok" or "degraded".
    """
    try:
        import asyncio
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import create_async_engine

        engine = create_async_engine(
            str(settings.DATABASE_URL),
            echo=False,
            connect_args={"command_timeout": 5},
        )
        async with asyncio.timeout(5):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        await engine.dispose()
        return "ok"
    except Exception:
        return "degraded"


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Check the health of all critical dependencies.

    Returns HTTP 200 if all dependencies are healthy.
    Returns HTTP 503 if any dependency is degraded.
    """
    import asyncio

    db_status, redis_status = await asyncio.gather(
        _check_db_health(),
        check_redis_health(),
    )

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"
    version = settings.APP_VERSION if hasattr(settings, "APP_VERSION") else "unknown"

    response = HealthResponse(
        status=overall,
        version=version,
        db=db_status,
        redis=redis_status,
    )

    from fastapi.responses import JSONResponse

    status_code = 200 if overall == "ok" else 503
    return JSONResponse(
        status_code=status_code,
        content=response.model_dump(),
    )
