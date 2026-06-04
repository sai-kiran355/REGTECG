"""
FastAPI application entry point for the RegTech Compliance OS backend.

Startup sequence
----------------
1. Validate environment configuration (Pydantic Settings).
   Any missing or invalid required variable is logged by name and the process
   exits with code 1 before accepting any requests.
2. Configure structured JSON logging.
3. Perform lifespan checks (Redis PING, DB connection).
4. Register middleware (RequestIDMiddleware outermost, TenantMiddleware inner).
5. Register exception handlers.
6. Mount the versioned API router at /api/v1/.
7. Conditionally expose OpenAPI docs (disabled in production).
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

# ---------------------------------------------------------------------------
# Step 1 — Validate configuration at import time.
# ---------------------------------------------------------------------------
try:
    from core.config import Settings

    settings = Settings()
except ValidationError as exc:
    _log = logging.getLogger("startup")
    logging.basicConfig(level=logging.ERROR)
    for error in exc.errors():
        field = error["loc"][0] if error["loc"] else "<unknown>"
        msg = error["msg"]
        _log.error("Missing or invalid config: %s — %s", field, msg)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Step 2 — Configure structured JSON logging.
# ---------------------------------------------------------------------------
from core.logging import get_logger, setup_logging  # noqa: E402

setup_logging(settings.LOG_LEVEL)
logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Step 3 — Lifespan: startup / shutdown hooks.
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Perform startup checks and clean up on shutdown."""
    logger.info("Starting RegTech Compliance OS backend", env=settings.ENVIRONMENT)

    # Redis connectivity check
    try:
        from core.redis import redis_client
        import asyncio
        await asyncio.wait_for(redis_client.ping(), timeout=5.0)
        logger.info("Redis connectivity check passed")
    except Exception as exc:
        logger.error("Redis connectivity check failed", error=str(exc))
        sys.exit(1)

    # Database connectivity check
    try:
        import asyncio
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import create_async_engine

        _engine = create_async_engine(str(settings.DATABASE_URL), echo=False)
        async with asyncio.timeout(5):
            async with _engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        await _engine.dispose()
        logger.info("Database connectivity check passed")
    except Exception as exc:
        logger.error("Database connectivity check failed", error=str(exc))
        sys.exit(1)

    yield

    # Shutdown
    logger.info("Shutting down RegTech Compliance OS backend")
    try:
        from core.redis import redis_client as _rc
        await _rc.aclose()
    except Exception as exc:
        logger.warning("Error closing Redis connection pool", error=str(exc))


# ---------------------------------------------------------------------------
# Step 4 — Instantiate FastAPI with conditional OpenAPI docs.
# ---------------------------------------------------------------------------

_is_production = settings.ENVIRONMENT == "production"

app = FastAPI(
    title="RegTech Compliance OS",
    version=settings.APP_VERSION,
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Step 5 — Exception handlers.
# ---------------------------------------------------------------------------


def _error_body(request: Request, code: str, message: str) -> dict:
    request_id = getattr(request.state, "request_id", "")
    return {"error": {"code": code, "message": message, "request_id": request_id}}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "VALIDATION_ERROR", "message": str(exc.errors()), "request_id": getattr(request.state, "request_id", "")}},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    from sqlalchemy.exc import IntegrityError, SQLAlchemyError
    from redis.exceptions import RedisError
    from jose import JWTError

    if isinstance(exc, IntegrityError):
        return JSONResponse(
            status_code=409,
            content=_error_body(request, "CONFLICT", "A conflict occurred with existing data."),
        )
    if isinstance(exc, SQLAlchemyError):
        return JSONResponse(
            status_code=409,
            content=_error_body(request, "CONFLICT", "A database error occurred."),
        )
    if isinstance(exc, RedisError):
        logger.error("Redis error", error=str(exc))
        return JSONResponse(
            status_code=503,
            content=_error_body(request, "SERVICE_UNAVAILABLE", "A downstream service is unavailable."),
        )
    if isinstance(exc, JWTError):
        return JSONResponse(
            status_code=401,
            content=_error_body(request, "MALFORMED_TOKEN", "Token is invalid."),
        )

    logger.error("Unhandled exception", error=str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content=_error_body(request, "INTERNAL_ERROR", "An unexpected error occurred."),
    )


# ---------------------------------------------------------------------------
# Step 6 — Middleware registration.
# ---------------------------------------------------------------------------
# Starlette applies middleware in reverse registration order.
# Register TenantMiddleware first → RequestIDMiddleware last = outermost.

from core.middleware import RequestIDMiddleware, TenantMiddleware  # noqa: E402

app.add_middleware(TenantMiddleware)
app.add_middleware(RequestIDMiddleware)


# ---------------------------------------------------------------------------
# Step 7 — Mount the versioned API router.
# ---------------------------------------------------------------------------

from api.v1.router import router as v1_router  # noqa: E402

app.include_router(v1_router, prefix="/api/v1")

# ── Observability ────────────────────────────────────────────────────────────
from core.telemetry import setup_telemetry  # noqa: E402
setup_telemetry(app)
