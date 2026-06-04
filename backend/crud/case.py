"""
CRUD helpers for the Case model.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.case import Case


async def get_next_case_number(db: AsyncSession, tenant_id: uuid.UUID) -> str:
    """
    Generate the next sequential case number for a tenant.

    Returns a string like 'CASE-001', 'CASE-042', etc.
    """
    result = await db.execute(
        select(func.count(Case.id)).where(Case.tenant_id == tenant_id)
    )
    count = result.scalar_one() or 0
    return f"CASE-{count + 1:03d}"


async def create_case(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    created_by: uuid.UUID,
    subject_name: str,
    subject_type: str,
    case_type: str,
    risk_level: str = "medium",
    description: str | None = None,
    assigned_to: uuid.UUID | None = None,
) -> Case:
    """Create and persist a new Case."""
    case_number = await get_next_case_number(db, tenant_id)
    case = Case(
        tenant_id=tenant_id,
        case_number=case_number,
        subject_name=subject_name,
        subject_type=subject_type,
        case_type=case_type,
        status="open",
        risk_level=risk_level,
        description=description,
        assigned_to=assigned_to,
        created_by=created_by,
    )
    db.add(case)
    await db.flush()
    await db.refresh(case)
    return case


async def get_case_by_id(
    db: AsyncSession,
    case_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> Case | None:
    """Return a Case by its UUID scoped to a tenant, or None."""
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def list_cases(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    status: str | None = None,
    case_type: str | None = None,
    risk_level: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Case], int]:
    """
    Return a paginated list of cases for a tenant with optional filters.

    Returns (items, total_count).
    """
    query = select(Case).where(Case.tenant_id == tenant_id)
    count_query = select(func.count(Case.id)).where(Case.tenant_id == tenant_id)

    if status:
        query = query.where(Case.status == status)
        count_query = count_query.where(Case.status == status)
    if case_type:
        query = query.where(Case.case_type == case_type)
        count_query = count_query.where(Case.case_type == case_type)
    if risk_level:
        query = query.where(Case.risk_level == risk_level)
        count_query = count_query.where(Case.risk_level == risk_level)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    query = query.order_by(Case.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def update_case(
    db: AsyncSession,
    case: Case,
    **kwargs,
) -> Case:
    """Apply keyword-argument updates to a Case and flush."""
    for key, value in kwargs.items():
        if value is not None or key in ("description", "assigned_to"):
            setattr(case, key, value)
    await db.flush()
    await db.refresh(case)
    return case


async def close_case(db: AsyncSession, case: Case) -> Case:
    """Set a case status to 'closed'."""
    case.status = "closed"
    await db.flush()
    await db.refresh(case)
    return case
