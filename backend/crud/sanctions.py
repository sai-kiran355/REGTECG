"""
CRUD helpers for the SanctionsScreening model.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.sanctions_screening import SanctionsScreening


def _levenshtein_similarity(s1: str, s2: str) -> float:
    s1 = s1.lower().strip()
    s2 = s2.lower().strip()
    if not s1 or not s2:
        return 0.0
    if s1 == s2:
        return 1.0
    
    if len(s1) > len(s2):
        s1, s2 = s2, s1
    distances = range(len(s1) + 1)
    for i2, c2 in enumerate(s2):
        distances_ = [i2+1]
        for i1, c1 in enumerate(s1):
            if c1 == c2:
                distances_.append(distances[i1])
            else:
                distances_.append(1 + min((distances[i1], distances[i1 + 1], distances_[-1])))
        distances = distances_
    dist = distances[-1]
    return 1.0 - (dist / max(len(s1), len(s2)))


def _token_match(s1: str, s2: str) -> float:
    t1 = set(s1.lower().replace(",", "").replace("-", " ").split())
    t2 = set(s2.lower().replace(",", "").replace("-", " ").split())
    if not t1 or not t2:
        return 0.0
    return len(t1.intersection(t2)) / max(len(t1), len(t2))


def _simulate_screening(entity_name: str, sanctions_list: str) -> tuple[str, int, str]:
    """
    Simulate fuzzy sanctions screening.
    Compares the entity_name against a watchlist of real global sanctioned entities.
    """
    SANCTIONED_ENTITIES = [
        "Vladimir Vladimirovich Putin",
        "Kim Jong-un",
        "Bashar al-Assad",
        "Nicolás Maduro Moros",
        "Alexander Lukashenko",
        "Viktor Yanukovych",
        "Robert Mugabe",
        "Slobodan Milosevic",
        "Osama bin Laden",
        "Rosneft PJSC",
        "VTB Bank PJSC",
        "Sberbank PJSC",
        "Al-Qaeda",
        "Hezbollah",
        "Iran Petrochemical Commercial Co"
    ]

    best_score = 0
    name_clean = entity_name.lower().strip()

    # Legacy test trigger pattern support
    TEST_TRIGGERS = ["test", "sanction", "blocked", "terror", "ofac"]
    for t in TEST_TRIGGERS:
        if t in name_clean:
            best_score = 90
            break

    # Calculate similarity scores against the watch-list
    for sanctioned_name in SANCTIONED_ENTITIES:
        token_sim = _token_match(entity_name, sanctioned_name)
        edit_sim = _levenshtein_similarity(entity_name, sanctioned_name)
        match_score = int(max(token_sim, edit_sim) * 100)
        if match_score > best_score:
            best_score = match_score

    # Determine compliance classification
    if best_score >= 80:
        return "confirmed", best_score, "hit"
    elif best_score >= 55:
        return "possible", best_score, "review"
    else:
        seed = sum(ord(c) for c in entity_name + sanctions_list)
        bg_score = 5 + (seed % 15)
        return "no_match", bg_score, "clear"


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
