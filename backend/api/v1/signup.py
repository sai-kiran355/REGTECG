"""
Self-service sign-up endpoint.

POST /api/v1/auth/signup
  - Creates a new organization (tenant)
  - Creates the first admin user for that organization
  - Returns access + refresh tokens (user is logged in immediately)
"""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.deps import get_db
from core.security import create_access_token, hash_password
from crud.role import get_permissions_for_role, get_role_by_name
from models.tenant import Tenant
from models.user import User
from schemas.auth import TokenResponse
from services.auth_service import AuthService
from core.redis import get_redis
import redis.asyncio as aioredis

router = APIRouter(tags=["auth"])


class SignUpRequest(BaseModel):
    # Organization details
    organization_name: str = Field(..., min_length=2, max_length=100, description="Your bank or fintech name")
    organization_type: str = Field(..., description="bank or fintech")

    # User details
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr = Field(..., max_length=254)
    password: str = Field(..., min_length=8, max_length=128)


def _slugify(name: str) -> str:
    """Convert organization name to a valid slug."""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug).strip('-')
    slug = slug[:50]
    if len(slug) < 3:
        slug = slug + '-org'
    return slug


@router.post("/auth/signup", response_model=TokenResponse, status_code=201)
async def signup(
    request: Request,
    body: SignUpRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> TokenResponse:
    """
    Create a new organization and admin user, then return auth tokens.
    The user is signed in immediately after sign-up.
    """
    # Validate organization type
    if body.organization_type not in ("bank", "fintech"):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_ORG_TYPE", "message": "organization_type must be 'bank' or 'fintech'"},
        )

    # Generate unique slug for the organization
    base_slug = _slugify(body.organization_name)
    slug = base_slug
    counter = 1
    while True:
        existing_tenant = await db.execute(select(Tenant).where(Tenant.slug == slug))
        if not existing_tenant.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Create tenant (organization)
    tenant = Tenant(
        slug=slug,
        name=body.organization_name,
        status="active",
        organization_type=body.organization_type,
    )
    db.add(tenant)
    await db.flush()

    # Get admin role
    admin_role = await get_role_by_name(db, "admin")
    if not admin_role:
        raise HTTPException(status_code=500, detail={"code": "SETUP_ERROR", "message": "System roles not configured."})

    # Create first admin user
    user = User(
        tenant_id=tenant.id,
        full_name=body.full_name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role_id=admin_role.id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    await db.refresh(tenant)

    # Get permissions
    permissions = await get_permissions_for_role(db, str(admin_role.id))

    # Issue tokens
    import secrets
    from core.redis import REFRESH_PREFIX
    from core.config import Settings
    settings = Settings()

    access_token = create_access_token(
        sub=str(user.id),
        tenant_id=str(tenant.id),
        role="admin",
        permissions=permissions,
    )
    refresh_token = secrets.token_hex(32)
    await redis.setex(
        f"{REFRESH_PREFIX}{refresh_token}",
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        str(user.id),
    )

    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )
