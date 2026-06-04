"""
CRUD helpers for the User model.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User


async def get_user_by_email(
    db: AsyncSession,
    email: str,
    tenant_id: str,
) -> User | None:
    """
    Return the User with the given email within the specified tenant, or None.

    Parameters
    ----------
    db:
        Active async database session.
    email:
        Email address to look up (case-sensitive).
    tenant_id:
        UUID string of the tenant to scope the lookup.

    Returns
    -------
    User | None
    """
    result = await db.execute(
        select(User).where(
            User.email == email,
            User.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()
