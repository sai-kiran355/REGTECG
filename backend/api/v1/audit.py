"""
Audit Log API endpoints.

Routes:
  GET /api/v1/audit/logs — list audit logs (requires audit:read)
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.deps import get_db, require_permission
from crud.audit import list_audit_logs
from schemas.audit import AuditLogListResponse, AuditLogResponse
from schemas.auth import JWTClaims

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs", response_model=AuditLogListResponse)
async def list_audit_logs_endpoint(
    action: str | None = Query(default=None),
    resource_type: str | None = Query(default=None),
    user_id: uuid.UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("audit:read")),
) -> AuditLogListResponse:
    """List audit log entries for the current tenant with optional filters."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    items, total = await list_audit_logs(
        db=db,
        tenant_id=tenant_id,
        action=action,
        resource_type=resource_type,
        user_id=user_id,
        page=page,
        page_size=page_size,
    )
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(log) for log in items],
        total=total,
        page=page,
        page_size=page_size,
    )
