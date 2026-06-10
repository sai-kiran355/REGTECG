"""
Shared FastAPI dependencies.

Provides:
  get_db              — async database session scoped to the request
  get_current_user    — validate JWT and return user context
  require_permission  — RBAC guard dependency factory
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

from fastapi import Depends, Header, HTTPException, Query
from jose import JWTError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings
from core.redis import get_redis
from db.session import AsyncSessionLocal
from schemas.auth import JWTClaims

import redis.asyncio as aioredis

settings = Settings()


# ---------------------------------------------------------------------------
# Database dependency
# ---------------------------------------------------------------------------


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an AsyncSession for the duration of a single request.
    The session is closed automatically after the request completes.
    """
    async with AsyncSessionLocal() as session:
        yield session


# ---------------------------------------------------------------------------
# Current user dependency
# ---------------------------------------------------------------------------


async def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    token: str | None = Query(default=None),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    redis: aioredis.Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
) -> JWTClaims:
    """
    Validate the Bearer JWT or developer X-API-Key, and return the claims context.
    """
    if x_api_key:
        from crud.integration import verify_api_key
        key = await verify_api_key(db, x_api_key)
        if not key:
            raise HTTPException(
                status_code=401,
                detail={"code": "INVALID_API_KEY", "message": "API key is invalid or expired."},
            )
        
        scopes_list = [s.strip() for s in key.scopes.split(",") if s.strip()]
        if "*" in scopes_list:
            permissions = ["cases:read", "cases:write", "employee:read", "employee:write", "recruitment:read", "recruitment:write"]
        else:
            permissions = scopes_list

        return JWTClaims(
            sub=str(key.id),
            tenant_id=str(key.tenant_id),
            role="developer",
            permissions=permissions,
        )

    from core.security import verify_access_token
    from core.redis import BLACKLIST_PREFIX

    if not authorization:
        if token:
            authorization = f"Bearer {token}"
        else:
            raise HTTPException(
                status_code=401,
                detail={"code": "MISSING_TOKEN", "message": "Authorization header or X-API-Key is required."},
            )

    # Extract Bearer token.
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail={"code": "MALFORMED_TOKEN", "message": "Invalid Authorization header format."},
        )

    token = parts[1]

    try:
        claims = verify_access_token(token)
    except JWTError as exc:
        msg = str(exc).lower()
        if "expired" in msg:
            raise HTTPException(
                status_code=401,
                detail={"code": "TOKEN_EXPIRED", "message": "Token has expired."},
            )
        raise HTTPException(
            status_code=401,
            detail={"code": "MALFORMED_TOKEN", "message": "Token is invalid."},
        )

    # Check blacklist.
    jti = claims.get("jti", "")
    if jti and await redis.exists(f"{BLACKLIST_PREFIX}{jti}"):
        raise HTTPException(
            status_code=401,
            detail={"code": "TOKEN_REVOKED", "message": "Token has been revoked."},
        )

    return JWTClaims.from_dict(claims)



# ---------------------------------------------------------------------------
# RBAC guard
# ---------------------------------------------------------------------------


def require_permission(permission: str):
    """
    FastAPI dependency factory that enforces a required permission.

    Usage::

        @router.get("/cases", dependencies=[Depends(require_permission("cases:read"))])
        async def list_cases(): ...

    Raises
    ------
    HTTPException 401 UNAUTHENTICATED
        If no valid session exists.
    HTTPException 403 INSUFFICIENT_PERMISSIONS
        If the user's role does not include the required permission.
    """

    async def _guard(
        current_user: JWTClaims = Depends(get_current_user),
    ) -> JWTClaims:
        if permission not in current_user.permissions:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "INSUFFICIENT_PERMISSIONS",
                    "message": f"Permission '{permission}' is required.",
                },
            )
        return current_user

    return _guard
