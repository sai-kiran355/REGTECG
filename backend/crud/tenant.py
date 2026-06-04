"""
CRUD helpers for the Tenant model.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.tenant import Tenant


async def get_active_tenant_by_slug(
    db: AsyncSession,
    slug: str,
) -> Tenant | None:
    """
    Return the active Tenant with the given slug, or None.

    Parameters
    ----------
    db:
        Active async database session.
    slug:
        Tenant slug to look up.

    Returns
    -------
    Tenant | None
        The tenant record if found with status='active', otherwise None.
    """
    result = await db.execute(
        select(Tenant).where(
            Tenant.slug == slug,
            Tenant.status == "active",
        )
    )
    return result.scalar_one_or_none()
