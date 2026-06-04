"""
CRUD helpers for the AuditLog model.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.audit_log import AuditLog


async def create_audit_log(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    action: str,
    resource_type: str,
    resource_id: str,
    user_email: str,
    user_id: uuid.UUID | None = None,
    ip_address: str | None = None,
    result: str = "success",
    details: dict[str, Any] | None = None,
) -> AuditLog:
    """Create and persist an audit log entry."""
    log = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        user_email=user_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        result=result,
        details=details,
    )
    db.add(log)
    await db.flush()
    return log


async def list_audit_logs(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    action: str | None = None,
    resource_type: str | None = None,
    user_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[AuditLog], int]:
    """
    Return a paginated list of audit logs for a tenant with optional filters.

    Returns (items, total_count).
    """
    query = select(AuditLog).where(AuditLog.tenant_id == tenant_id)
    count_query = select(func.count(AuditLog.id)).where(AuditLog.tenant_id == tenant_id)

    if action:
        query = query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
        count_query = count_query.where(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
        count_query = count_query.where(AuditLog.user_id == user_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total
