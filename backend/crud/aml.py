"""
CRUD helpers for the AMLAlert model.
"""

from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.aml_alert import AMLAlert


async def create_aml_alert(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    entity_name: str,
    entity_type: str,
    alert_type: str,
    amount: Decimal,
    description: str,
    currency: str = "USD",
    risk_score: int = 0,
    case_id: uuid.UUID | None = None,
) -> AMLAlert:
    """Create and persist a new AMLAlert."""
    alert = AMLAlert(
        tenant_id=tenant_id,
        case_id=case_id,
        entity_name=entity_name,
        entity_type=entity_type,
        alert_type=alert_type,
        amount=amount,
        currency=currency,
        risk_score=risk_score,
        status="open",
        description=description,
    )
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    return alert


async def get_aml_alert_by_id(
    db: AsyncSession,
    alert_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> AMLAlert | None:
    """Return an AMLAlert by its UUID scoped to a tenant, or None."""
    result = await db.execute(
        select(AMLAlert).where(
            AMLAlert.id == alert_id,
            AMLAlert.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def list_aml_alerts(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    status: str | None = None,
    alert_type: str | None = None,
    case_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[AMLAlert], int]:
    """
    Return a paginated list of AML alerts for a tenant with optional filters.

    Returns (items, total_count).
    """
    query = select(AMLAlert).where(AMLAlert.tenant_id == tenant_id)
    count_query = select(func.count(AMLAlert.id)).where(AMLAlert.tenant_id == tenant_id)

    if status:
        query = query.where(AMLAlert.status == status)
        count_query = count_query.where(AMLAlert.status == status)
    if alert_type:
        query = query.where(AMLAlert.alert_type == alert_type)
        count_query = count_query.where(AMLAlert.alert_type == alert_type)
    if case_id:
        query = query.where(AMLAlert.case_id == case_id)
        count_query = count_query.where(AMLAlert.case_id == case_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    query = query.order_by(AMLAlert.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def update_aml_alert(
    db: AsyncSession,
    alert: AMLAlert,
    **kwargs,
) -> AMLAlert:
    """Apply keyword-argument updates to an AMLAlert and flush."""
    for key, value in kwargs.items():
        setattr(alert, key, value)
    await db.flush()
    await db.refresh(alert)
    return alert


async def delete_aml_alert(
    db: AsyncSession,
    alert: AMLAlert,
) -> None:
    """Delete and remove an AMLAlert from database."""
    await db.delete(alert)
    await db.flush()

