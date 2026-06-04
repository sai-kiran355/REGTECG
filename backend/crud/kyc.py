"""
CRUD helpers for the KYCRecord model.
"""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.kyc_record import KYCRecord


async def create_kyc_record(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    full_name: str,
    date_of_birth: date,
    nationality: str,
    document_type: str,
    document_number: str,
    risk_level: str = "low",
    case_id: uuid.UUID | None = None,
    notes: str | None = None,
) -> KYCRecord:
    """Create and persist a new KYCRecord."""
    record = KYCRecord(
        tenant_id=tenant_id,
        case_id=case_id,
        full_name=full_name,
        date_of_birth=date_of_birth,
        nationality=nationality,
        document_type=document_type,
        document_number=document_number,
        status="pending",
        risk_level=risk_level,
        notes=notes,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def get_kyc_record_by_id(
    db: AsyncSession,
    record_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> KYCRecord | None:
    """Return a KYCRecord by its UUID scoped to a tenant, or None."""
    result = await db.execute(
        select(KYCRecord).where(
            KYCRecord.id == record_id,
            KYCRecord.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def list_kyc_records(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    status: str | None = None,
    risk_level: str | None = None,
    case_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[KYCRecord], int]:
    """
    Return a paginated list of KYC records for a tenant with optional filters.

    Returns (items, total_count).
    """
    query = select(KYCRecord).where(KYCRecord.tenant_id == tenant_id)
    count_query = select(func.count(KYCRecord.id)).where(KYCRecord.tenant_id == tenant_id)

    if status:
        query = query.where(KYCRecord.status == status)
        count_query = count_query.where(KYCRecord.status == status)
    if risk_level:
        query = query.where(KYCRecord.risk_level == risk_level)
        count_query = count_query.where(KYCRecord.risk_level == risk_level)
    if case_id:
        query = query.where(KYCRecord.case_id == case_id)
        count_query = count_query.where(KYCRecord.case_id == case_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    query = query.order_by(KYCRecord.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def update_kyc_record(
    db: AsyncSession,
    record: KYCRecord,
    **kwargs,
) -> KYCRecord:
    """Apply keyword-argument updates to a KYCRecord and flush."""
    for key, value in kwargs.items():
        setattr(record, key, value)
    await db.flush()
    await db.refresh(record)
    return record


async def review_kyc_record(
    db: AsyncSession,
    record: KYCRecord,
    reviewer_id: uuid.UUID,
    status: str,
    notes: str | None = None,
) -> KYCRecord:
    """Submit a review decision on a KYC record.
    
    When status is 'verified' and record has a linked case, automatically closes the case.
    When status is 'rejected', sets the case to closed as well.
    """
    record.status = status
    record.reviewer_id = reviewer_id
    if notes is not None:
        record.notes = notes
    await db.flush()

    # Auto-close or update the linked case based on KYC decision
    if record.case_id is not None and status in ("verified", "rejected"):
        from models.case import Case
        from sqlalchemy import select as _select
        case_result = await db.execute(
            _select(Case).where(Case.id == record.case_id)
        )
        case = case_result.scalar_one_or_none()
        if case:
            if status == "verified":
                case.status = "closed"
            elif status == "rejected":
                case.status = "closed"
            await db.flush()

    await db.refresh(record)
    return record
