"""
User profile endpoints — get, update, change password.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.deps import get_current_user, get_db
from core.audit import log_action
from core.security import hash_password, verify_password
from models.tenant import Tenant
from models.user import User
from schemas.auth import JWTClaims

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    tenant_id: str
    tenant_slug: str
    organization_name: str
    organization_type: str
    permissions: list[str]

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


@router.get("", response_model=ProfileResponse)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(get_current_user),
) -> ProfileResponse:
    """Get the current user's full profile including organization details."""
    result = await db.execute(select(User).where(User.id == current_user.sub))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "User not found."})

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one_or_none()

    return ProfileResponse(
        id=str(user.id),
        full_name=user.full_name or "",
        email=user.email,
        role=current_user.role,
        tenant_id=str(user.tenant_id),
        tenant_slug=tenant.slug if tenant else "",
        organization_name=tenant.name if tenant else "",
        organization_type=tenant.organization_type if tenant else "bank",
        permissions=current_user.permissions,
    )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    request: Request,
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(get_current_user),
) -> ProfileResponse:
    """Update the current user's profile (full name)."""
    result = await db.execute(select(User).where(User.id == current_user.sub))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "User not found."})

    user.full_name = body.full_name
    await db.commit()
    await db.refresh(user)

    await log_action(
        db=db, request=request, current_user=current_user,
        action="profile.update", resource_type="user", resource_id=str(user.id),
        details={"updated_fields": ["full_name"]},
    )
    await db.commit()

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one_or_none()

    return ProfileResponse(
        id=str(user.id),
        full_name=user.full_name or "",
        email=user.email,
        role=current_user.role,
        tenant_id=str(user.tenant_id),
        tenant_slug=tenant.slug if tenant else "",
        organization_name=tenant.name if tenant else "",
        organization_type=tenant.organization_type if tenant else "bank",
        permissions=current_user.permissions,
    )


@router.put("/password", status_code=200)
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(get_current_user),
) -> dict:
    """Change the current user's password."""
    result = await db.execute(select(User).where(User.id == current_user.sub))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "User not found."})

    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_PASSWORD", "message": "Current password is incorrect."},
        )

    user.hashed_password = hash_password(body.new_password)
    await db.commit()

    await log_action(
        db=db, request=request, current_user=current_user,
        action="profile.password_change", resource_type="user", resource_id=str(user.id),
    )
    await db.commit()

    return {"message": "Password changed successfully."}
