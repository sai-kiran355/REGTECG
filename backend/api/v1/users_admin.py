"""
Admin user management API endpoints.

Routes:
  GET  /api/v1/admin/users              — list users in tenant
  POST /api/v1/admin/users              — create user
  PUT  /api/v1/admin/users/{id}/role    — change user role
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.deps import get_db, require_permission
from core.audit import log_action
from core.security import hash_password
from crud.role import get_role_by_name
from models.user import User
from schemas.auth import JWTClaims
from schemas.user_admin import (
    UserCreateRequest,
    UserListResponse,
    UserResponse,
    UserRoleUpdateRequest,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _user_to_response(user: User) -> UserResponse:
    """Convert a User ORM object to a UserResponse schema."""
    role_name = user.role.name if user.role else None
    return UserResponse(
        id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        role_id=user.role_id,
        role_name=role_name,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/users", response_model=UserListResponse)
async def list_users_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("admin:users")),
) -> UserListResponse:
    """List all users within the current tenant."""
    tenant_id = uuid.UUID(current_user.tenant_id)

    count_result = await db.execute(
        select(func.count(User.id)).where(User.tenant_id == tenant_id)
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(User)
        .where(User.tenant_id == tenant_id)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    users = list(result.scalars().all())

    return UserListResponse(
        items=[_user_to_response(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user_endpoint(
    request: Request,
    body: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("admin:users")),
) -> UserResponse:
    """Create a new user within the current tenant."""
    tenant_id = uuid.UUID(current_user.tenant_id)

    # Validate role exists.
    role = await get_role_by_name(db, body.role_name)
    if role is None:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_ROLE", "message": f"Role '{body.role_name}' does not exist."},
        )

    # Check for duplicate email within tenant.
    existing = await db.execute(
        select(User).where(User.tenant_id == tenant_id, User.email == body.email)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "EMAIL_CONFLICT",
                "message": f"A user with email '{body.email}' already exists in this tenant.",
            },
        )

    user = User(
        tenant_id=tenant_id,
        email=body.email,
        hashed_password=hash_password(body.password),
        role_id=role.id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="admin.user.create",
        resource_type="user",
        resource_id=str(user.id),
        details={"email": user.email, "role": body.role_name},
    )
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role_endpoint(
    user_id: uuid.UUID,
    request: Request,
    body: UserRoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("admin:users")),
) -> UserResponse:
    """Change the role assigned to a user within the current tenant."""
    tenant_id = uuid.UUID(current_user.tenant_id)

    # Fetch user scoped to tenant.
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"User '{user_id}' not found."},
        )

    # Validate new role.
    role = await get_role_by_name(db, body.role_name)
    if role is None:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_ROLE", "message": f"Role '{body.role_name}' does not exist."},
        )

    old_role = user.role.name if user.role else None
    user.role_id = role.id
    await db.flush()
    await db.refresh(user)

    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="admin.user.role_change",
        resource_type="user",
        resource_id=str(user.id),
        details={"old_role": old_role, "new_role": body.role_name},
    )
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)
