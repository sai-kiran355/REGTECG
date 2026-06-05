"""
Authentication API endpoints.

Routes:
  POST /api/v1/auth/login    — sign in with email + password (no tenant ID needed)
  POST /api/v1/auth/refresh  — rotate refresh token
  POST /api/v1/auth/logout   — blacklist JWT jti
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis

from api.v1.deps import get_db
from core.redis import get_redis
from core.security import create_access_token, verify_password
from crud.role import get_permissions_for_role
from models.user import User
from schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from services.auth_service import (
    AuthService,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    InvalidTokenError,
    RateLimitError,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> TokenResponse:
    """
    Sign in with email and password only — no Tenant ID required.
    The tenant is automatically resolved from the user's account.
    """
    import secrets
    from core.redis import REFRESH_PREFIX, BLACKLIST_PREFIX
    from core.config import Settings
    settings = Settings()

    # Rate limiting key by email
    rate_key = f"ratelimit:{body.email}"
    attempt_count = await redis.get(rate_key)
    if attempt_count and int(attempt_count) >= settings.RATE_LIMIT_ATTEMPTS:
        ttl = await redis.ttl(rate_key)
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMITED", "message": "Too many failed attempts. Please wait."},
            headers={"Retry-After": str(max(ttl, 1))},
        )

    # Look up user by email — may exist in multiple tenants (bank + fintech)
    # Join with Tenant to filter by organization_type if product context is provided
    from models.tenant import Tenant as TenantModel
    result = await db.execute(
        select(User).join(TenantModel, User.tenant_id == TenantModel.id)
        .where(User.email == body.email, TenantModel.status == "active")
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    # Find matching user — try password against all matching accounts
    user = None
    for u in users:
        if verify_password(body.password, u.hashed_password):
            # If product hint provided, prefer matching org type
            if hasattr(body, 'product') and body.product:
                expected = 'fintech' if body.product == 'fintech' else 'bank'
                if hasattr(u, 'tenant') and u.tenant and u.tenant.organization_type == expected:
                    user = u
                    break
            else:
                user = u
                break

    if user is None:
        # Increment failure counter
        pipe = redis.pipeline()
        pipe.incr(rate_key)
        pipe.expire(rate_key, settings.RATE_LIMIT_WINDOW_SECONDS)
        await pipe.execute()
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."},
        )

    # Clear rate limit on success
    await redis.delete(rate_key)

    # Get permissions
    permissions = await get_permissions_for_role(db, str(user.role_id))

    # Issue access token
    access_token = create_access_token(
        sub=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role.name,
        permissions=permissions,
    )

    # Issue refresh token
    refresh_token = secrets.token_hex(32)
    await redis.setex(
        f"{REFRESH_PREFIX}{refresh_token}",
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        str(user.id),
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> TokenResponse:
    """Rotate the refresh token and issue a new access token."""
    from core.redis import REFRESH_PREFIX
    from core.config import Settings
    import secrets
    settings = Settings()

    refresh_key = f"{REFRESH_PREFIX}{body.refresh_token}"
    # Use GET + DELETE instead of GETDEL for Redis < 6.2 compatibility
    user_id = await redis.get(refresh_key)
    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_REFRESH_TOKEN", "message": "Refresh token is invalid or expired."},
        )
    await redis.delete(refresh_key)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_REFRESH_TOKEN", "message": "User not found."},
        )

    permissions = await get_permissions_for_role(db, str(user.role_id))
    access_token = create_access_token(
        sub=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role.name,
        permissions=permissions,
    )

    new_refresh = secrets.token_hex(32)
    await redis.setex(
        f"{REFRESH_PREFIX}{new_refresh}",
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        str(user.id),
    )

    return TokenResponse(access_token=access_token, refresh_token=new_refresh, token_type="bearer")


@router.post("/logout", status_code=200)
async def logout(
    authorization: str | None = Header(default=None, alias="Authorization"),
    redis: aioredis.Redis = Depends(get_redis),
) -> dict:
    """Revoke the current access token."""
    from core.security import verify_access_token
    from core.redis import BLACKLIST_PREFIX
    from datetime import datetime, timezone
    from jose import JWTError

    if not authorization:
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN", "message": "No token provided."})

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN", "message": "Invalid token format."})

    try:
        claims = verify_access_token(parts[1])
    except JWTError:
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN", "message": "Token is invalid."})

    jti = claims.get("jti", "")
    exp = claims.get("exp", 0)
    remaining = exp - int(datetime.now(timezone.utc).timestamp())
    if remaining > 0 and jti:
        await redis.setex(f"{BLACKLIST_PREFIX}{jti}", remaining, "1")

    return {"message": "Logged out successfully."}
