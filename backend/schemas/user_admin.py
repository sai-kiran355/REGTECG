"""
Pydantic schemas for admin user management endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreateRequest(BaseModel):
    """Request body for creating a new user within a tenant."""

    email: EmailStr = Field(..., max_length=254)
    password: str = Field(..., min_length=8, max_length=128)
    role_name: str = Field(..., description="Role name, e.g. 'analyst', 'auditor', 'viewer'")


class UserRoleUpdateRequest(BaseModel):
    """Request body for changing a user's role."""

    role_name: str = Field(..., description="New role name to assign")


class UserResponse(BaseModel):
    """User representation returned by the API."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    role_id: uuid.UUID
    role_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """Paginated list of users."""

    items: list[UserResponse]
    total: int
    page: int
    page_size: int
