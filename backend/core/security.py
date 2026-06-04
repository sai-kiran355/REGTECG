"""
JWT sign/verify and bcrypt password helpers.
Uses HS256 (HMAC-SHA256) with a single SECRET_KEY — no PEM files needed.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import Settings

settings = Settings()

ALGORITHM = "HS256"

_pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=max(settings.BCRYPT_COST, 12),
)


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain* using cost factor >= 12."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*."""
    return _pwd_context.verify(plain, hashed)


def create_access_token(
    sub: str,
    tenant_id: str,
    role: str,
    permissions: list[str],
) -> str:
    """Sign and return an HS256 JWT access token with all required claims."""
    now = int(datetime.now(timezone.utc).timestamp())
    expire = now + settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    payload: dict[str, Any] = {
        "sub": sub,
        "tenant_id": tenant_id,
        "role": role,
        "permissions": permissions,
        "iat": now,
        "exp": expire,
        "jti": str(uuid.uuid4()),
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> dict[str, Any]:
    """Validate HS256 JWT and return claims. Raises JWTError on failure."""
    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        raise

    required = {"sub", "tenant_id", "role", "permissions", "iat", "exp", "jti"}
    missing = required - claims.keys()
    if missing:
        raise JWTError(f"Token missing required claims: {missing}")

    return claims
