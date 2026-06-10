"""
FastAPI middleware components for the RegTech Compliance OS backend.

Middleware
----------
RequestIDMiddleware
    Outermost middleware. Generates a UUID v4 ``request_id`` per request,
    attaches it to ``request.state``, adds it to the ``X-Request-ID``
    response header, and emits one structured JSON log entry per request
    containing: timestamp, method, path, status_code, duration_ms,
    tenant_id, and request_id.

TenantMiddleware
    Resolves the tenant from the ``X-Tenant-ID`` header and attaches the
    tenant context to ``request.state``. Excluded paths bypass resolution.
"""

from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from core.logging import get_logger
from db.session import AsyncSessionLocal

logger = get_logger(__name__)


def _error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
) -> JSONResponse:
    """Build a standard error JSON envelope response."""
    request_id = getattr(request.state, "request_id", "")
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "request_id": request_id,
            }
        },
    )


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Outermost middleware that assigns a unique request ID to every request.

    For each inbound request this middleware:

    1. Generates a UUID v4 ``request_id``.
    2. Attaches it to ``request.state.request_id``.
    3. Records the start time with ``time.perf_counter()``.
    4. Calls ``call_next(request)`` to obtain the response.
    5. Adds ``X-Request-ID: {request_id}`` to the response headers.
    6. Emits one structured JSON log entry with the fields required by
       Requirements 7.4 and 7.5.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # 1. Generate a UUID v4 request ID.
        request_id = str(uuid.uuid4())

        # 2. Attach to request state so downstream handlers can read it.
        request.state.request_id = request_id

        # 3. Record start time.
        start = time.perf_counter()

        # 4. Process the request.
        response: Response = await call_next(request)

        # 5. Calculate elapsed time in milliseconds.
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        # 6. Add X-Request-ID header to the response.
        response.headers["X-Request-ID"] = request_id

        # 7. Resolve tenant_id: use slug from resolved tenant if present,
        #    otherwise fall back to "anonymous".
        tenant_id: str = "anonymous"
        tenant = getattr(request.state, "tenant", None)
        if tenant is not None:
            tenant_id = getattr(tenant, "slug", "anonymous") or "anonymous"

        # 8. Emit one structured JSON log entry per request.
        logger.info(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            tenant_id=tenant_id,
            request_id=request_id,
        )

        return response


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware that resolves the current tenant from the X-Tenant-ID header.

    Excluded paths bypass tenant resolution entirely. For all other paths:
      - Missing/empty/whitespace header → 400 MISSING_TENANT_ID
      - Unknown/inactive tenant → 404 TENANT_NOT_FOUND
      - DB error → 500 TENANT_SCHEMA_ERROR
      - Success → attaches Tenant to request.state.tenant

    Requirements: 2.1–2.8, 2.11
    """

    EXCLUDED_PATHS: frozenset[str] = frozenset(
        {
            "/api/v1/health",
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/signup",
            "/api/v1/applicant/signup",
            "/api/v1/applicant/login",
            "/api/v1/applicant/applications",
            "/api/v1/applicant/me",
            "/api/v1/applicant/banks",
            "/docs",
            "/redoc",
            "/openapi.json",
        }
    )

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip tenant resolution for excluded paths and CORS preflight requests.
        if request.method == "OPTIONS" or request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)

        # Also exclude portal and careers paths with dynamic segments
        if request.url.path.startswith("/api/v1/portal/"):
            return await call_next(request)
        if request.url.path.startswith("/api/v1/careers/"):
            return await call_next(request)
        if "/public" in request.url.path or "/public-onboard" in request.url.path or "/upload-doc" in request.url.path or "/download-doc" in request.url.path:
            return await call_next(request)
        # Extract X-Tenant-ID header.
        tenant_header = request.headers.get("X-Tenant-ID", "").strip()
        if not tenant_header:
            # Fallback: check query parameter token
            token = request.query_params.get("token")
            if not token:
                # Fallback: check Authorization header
                auth_header = request.headers.get("Authorization", "")
                if auth_header.lower().startswith("bearer "):
                    token = auth_header.split(" ", 1)[1]

            if token:
                try:
                    from core.security import verify_access_token
                    claims = verify_access_token(token)
                    tenant_header = claims.get("tenant_id", "")
                except Exception:
                    pass

        if not tenant_header:
            return _error_response(
                request,
                400,
                "MISSING_TENANT_ID",
                "The X-Tenant-ID header is required.",
            )

        # Look up the active tenant — supports both UUID and slug lookup
        try:
            async with AsyncSessionLocal() as session:
                from crud.tenant import get_active_tenant_by_slug
                import uuid as _uuid

                # Try UUID lookup first (sent by frontend after login)
                tenant = None
                try:
                    tenant_uuid = _uuid.UUID(tenant_header)
                    from sqlalchemy import select
                    from models.tenant import Tenant
                    result = await session.execute(
                        select(Tenant).where(
                            Tenant.id == tenant_uuid,
                            Tenant.status == "active",
                        )
                    )
                    tenant = result.scalar_one_or_none()
                except (ValueError, Exception):
                    pass

                # Fall back to slug lookup
                if tenant is None:
                    tenant = await get_active_tenant_by_slug(session, tenant_header)
        except Exception as exc:
            logger.error("Tenant lookup failed", error=str(exc))
            return _error_response(
                request,
                500,
                "TENANT_SCHEMA_ERROR",
                "An error occurred while resolving the tenant.",
            )

        if tenant is None:
            return _error_response(
                request,
                404,
                "TENANT_NOT_FOUND",
                f"No active tenant found for slug '{tenant_header}'.",
            )

        # Attach tenant to request state.
        request.state.tenant = tenant

        return await call_next(request)
