"""
Pydantic schemas for authentication endpoints.

Schemas:
  LoginRequest    — POST /api/v1/auth/login request body
  TokenResponse   — successful auth response (access + refresh tokens)
  RefreshRequest  — POST /api/v1/auth/refresh request body
  JWTClaims       — dataclass representing decoded JWT payload
"""

from __future__ import annotations

from dataclasses import dataclass, field

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    """Request body for POST /api/v1/auth/login."""

    email: EmailStr = Field(..., description="Your email address", max_length=254)
    password: str = Field(..., description="Your password", min_length=1, max_length=128)
    product: str | None = Field(default=None, description="Product hint: 'compliance' or 'fintech'")


class TokenResponse(BaseModel):
    """Successful authentication response."""

    access_token: str = Field(..., description="Signed RS256 JWT access token")
    refresh_token: str = Field(..., description="Opaque refresh token (256-bit hex)")
    token_type: str = Field(default="bearer", description="Token type")


class RefreshRequest(BaseModel):
    """Request body for POST /api/v1/auth/refresh."""

    refresh_token: str = Field(..., description="Opaque refresh token previously issued")


@dataclass
class JWTClaims:
    """Decoded JWT claims structure."""

    sub: str          # user UUID
    tenant_id: str    # tenant UUID
    role: str         # role name
    permissions: list[str] = field(default_factory=list)
    iat: int = 0      # issued-at (Unix timestamp)
    exp: int = 0      # expiry (Unix timestamp)
    jti: str = ""     # unique token ID (UUID v4)

    @classmethod
    def from_dict(cls, data: dict) -> "JWTClaims":
        """Construct JWTClaims from a decoded JWT payload dict."""
        return cls(
            sub=data["sub"],
            tenant_id=data["tenant_id"],
            role=data["role"],
            permissions=data.get("permissions", []),
            iat=data.get("iat", 0),
            exp=data.get("exp", 0),
            jti=data.get("jti", ""),
        )
