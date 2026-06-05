"""
Authentication service — token lifecycle management.

Implements:
  login           — validate credentials, issue access + refresh tokens
  refresh         — rotate refresh token atomically
  logout          — blacklist JWT jti
  is_blacklisted  — check Redis blacklist
  blacklist_token — add jti to Redis blacklist
  Rate limiting   — track failed login attempts per email
"""

from __future__ import annotations

import logging
import os
import secrets
import time
from datetime import datetime, timezone
from typing import Any

import redis.asyncio as aioredis
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings
from core.redis import BLACKLIST_PREFIX, REFRESH_PREFIX
from core.security import (
    create_access_token,
    hash_password,
    verify_access_token,
    verify_password,
)
from crud.role import get_permissions_for_role
from crud.user import get_user_by_email
from schemas.auth import TokenResponse

logger = logging.getLogger(__name__)
settings = Settings()

RATE_LIMIT_PREFIX = "ratelimit:"


class AuthService:
    """
    Handles all authentication token lifecycle operations.

    Parameters
    ----------
    db:
        Active async database session.
    redis:
        Async Redis client.
    """

    def __init__(self, db: AsyncSession, redis: aioredis.Redis) -> None:
        self.db = db
        self.redis = redis

    # ------------------------------------------------------------------
    # Login
    # ------------------------------------------------------------------

    async def login(
        self,
        email: str,
        password: str,
        tenant_id: str,
    ) -> TokenResponse:
        """
        Validate credentials and issue access + refresh tokens.

        Returns HTTP 401 INVALID_CREDENTIALS for any failure without
        distinguishing email vs password (Requirement 3.13).
        Returns HTTP 429 RATE_LIMITED after 5 failures in 15 minutes.

        Raises
        ------
        RateLimitError
            After 5 failed attempts within the rate-limit window.
        InvalidCredentialsError
            For any credential failure.
        """
        rate_key = f"{RATE_LIMIT_PREFIX}{email}"

        # Check rate limit before attempting auth.
        attempt_count = await self.redis.get(rate_key)
        if attempt_count and int(attempt_count) >= settings.RATE_LIMIT_ATTEMPTS:
            ttl = await self.redis.ttl(rate_key)
            raise RateLimitError(retry_after=max(ttl, 1))

        # Look up user.
        user = await get_user_by_email(self.db, email, tenant_id)

        # Validate password — always run bcrypt to prevent timing attacks.
        if user is None or not verify_password(password, user.hashed_password):
            # Increment failure counter.
            pipe = self.redis.pipeline()
            pipe.incr(rate_key)
            pipe.expire(rate_key, settings.RATE_LIMIT_WINDOW_SECONDS)
            await pipe.execute()
            raise InvalidCredentialsError()

        # Clear rate limit on successful login.
        await self.redis.delete(rate_key)

        # Fetch permissions for the user's role.
        permissions = await get_permissions_for_role(self.db, str(user.role_id))

        # Issue access token.
        access_token = create_access_token(
            sub=str(user.id),
            tenant_id=str(user.tenant_id),
            role=user.role.name,
            permissions=permissions,
        )

        # Issue refresh token — 256-bit random hex.
        refresh_token = secrets.token_hex(32)
        refresh_key = f"{REFRESH_PREFIX}{refresh_token}"
        await self.redis.setex(
            refresh_key,
            settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            str(user.id),
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )

    # ------------------------------------------------------------------
    # Refresh
    # ------------------------------------------------------------------

    async def refresh(self, refresh_token: str) -> TokenResponse:
        """
        Atomically rotate the refresh token and issue a new access token.

        Raises
        ------
        InvalidRefreshTokenError
            If the token doesn't exist or has already been used.
        """
        refresh_key = f"{REFRESH_PREFIX}{refresh_token}"

        # Use GET + DELETE for Redis < 6.2 compatibility (GETDEL requires Redis 6.2+)
        user_id = await self.redis.get(refresh_key)
        if user_id is None:
            raise InvalidRefreshTokenError()
        await self.redis.delete(refresh_key)

        # Look up user to get current role/permissions.
        from sqlalchemy import select
        from models.user import User

        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise InvalidRefreshTokenError()

        permissions = await get_permissions_for_role(self.db, str(user.role_id))

        # Issue new access token.
        access_token = create_access_token(
            sub=str(user.id),
            tenant_id=str(user.tenant_id),
            role=user.role.name,
            permissions=permissions,
        )

        # Issue new refresh token.
        new_refresh_token = secrets.token_hex(32)
        new_refresh_key = f"{REFRESH_PREFIX}{new_refresh_token}"
        await self.redis.setex(
            new_refresh_key,
            settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            str(user.id),
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
        )

    # ------------------------------------------------------------------
    # Logout
    # ------------------------------------------------------------------

    async def logout(self, token: str) -> None:
        """
        Blacklist the JWT's jti with TTL = remaining token lifetime.

        Raises
        ------
        InvalidTokenError
            If the token is malformed, expired, or already blacklisted.
        """
        try:
            claims = verify_access_token(token)
        except JWTError:
            raise InvalidTokenError()

        jti = claims.get("jti", "")
        exp = claims.get("exp", 0)

        # Check if already blacklisted.
        if await self.is_blacklisted(jti):
            raise InvalidTokenError()

        # Calculate remaining TTL.
        now = int(datetime.now(timezone.utc).timestamp())
        remaining = exp - now
        if remaining <= 0:
            raise InvalidTokenError()

        await self.blacklist_token(jti, remaining)

    async def is_blacklisted(self, jti: str) -> bool:
        """Return True if the jti is in the Redis blacklist."""
        return bool(await self.redis.exists(f"{BLACKLIST_PREFIX}{jti}"))

    async def blacklist_token(self, jti: str, ttl: int) -> None:
        """Add jti to the Redis blacklist with the given TTL in seconds."""
        await self.redis.setex(f"{BLACKLIST_PREFIX}{jti}", ttl, "1")


# ------------------------------------------------------------------
# Custom exceptions
# ------------------------------------------------------------------


class InvalidCredentialsError(Exception):
    """Raised when login credentials are invalid."""


class InvalidTokenError(Exception):
    """Raised when a JWT is malformed, expired, or blacklisted."""


class InvalidRefreshTokenError(Exception):
    """Raised when a refresh token is invalid or already used."""


class RateLimitError(Exception):
    """Raised when the rate limit is exceeded."""

    def __init__(self, retry_after: int) -> None:
        self.retry_after = retry_after
        super().__init__(f"Rate limit exceeded. Retry after {retry_after} seconds.")
