"""
CRUD helpers for the SanctionsScreening model.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.sanctions_screening import SanctionsScreening


def _simulate_screening(entity_name: str, sanctions_list: str) -> tuple[str, int, str]:
    """
    Simulate a sanctions screening result.

    In production this calls real OFAC/EU/UN/HMT APIs.
    For simulation: only flag as high-risk if the name contains
    known test patterns. All real Indian names default to no_match.
    """
    # Known test patterns for demo purposes
    HIGH_RISK_PATTERNS = ["test", "sanction", "blocked", "terror", "ofac"]
    name_lower = entity_name.lower()

    # Check for test patterns
    for pattern in HIGH_RISK_PATTERNS:
        if pattern in name_lower:
            seed = sum(ord(c) for c in entity_name + sanctions_list)
            score = 85 + (seed % 10)
            return "confirmed", score, "hit"

    # All real names → no_match with low score
    seed = sum(ord(c) for c in entity_name + sanctions_list)
    score = 5 + (seed % 20)  # 5-25 range — clearly no match
    return "no_match", score, "clear"


async def create_screening(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    entity_name: str,
    entity_type: str,
    sanctions_list: str,
    screened_by: uuid.UUID | None = None,
) -> SanctionsScreening:
    """Run a sanctions screening and persist the result."""
    match_type, match_score, status = _simulate_screening(entity_name, sanctions_list)

    screening = SanctionsScreening(
        tenant_id=tenant_id,
        entity_name=entity_name,
        entity_type=entity_type,
        sanctions_list=sanctions_list,
        match_type=match_type,
        match_score=match_score,
        status=status,
        screened_by=screened_by,
    )
    db.add(screening)
    await db.flush()
    await db.refresh(screening)
    return screening


async def get_screening_by_id(
    db: AsyncSession,
    screening_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> SanctionsScreening | None:
    """Return a SanctionsScreening by its UUID scoped to a tenant, or None."""
    result = await db.execute(
        select(SanctionsScreening).where(
            SanctionsScreening.id == screening_id,
            SanctionsScreening.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def list_screenings(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    status: str | None = None,
    match_type: str | None = None,
    sanctions_list: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[SanctionsScreening], int]:
    """
    Return a paginated list of screenings for a tenant with optional filters.

    Returns (items, total_count).
    """
    query = select(SanctionsScreening).where(SanctionsScreening.tenant_id == tenant_id)
    count_query = select(func.count(SanctionsScreening.id)).where(
        SanctionsScreening.tenant_id == tenant_id
    )

    if status:
        query = query.where(SanctionsScreening.status == status)
        count_query = count_query.where(SanctionsScreening.status == status)
    if match_type:
        query = query.where(SanctionsScreening.match_type == match_type)
        count_query = count_query.where(SanctionsScreening.match_type == match_type)
    if sanctions_list:
        query = query.where(SanctionsScreening.sanctions_list == sanctions_list)
        count_query = count_query.where(SanctionsScreening.sanctions_list == sanctions_list)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    query = query.order_by(SanctionsScreening.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total
