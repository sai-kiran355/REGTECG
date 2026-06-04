"""
CRUD helpers for the Role and RolePermission models.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.role import Role
from models.role_permission import RolePermission


async def get_role_by_name(
    db: AsyncSession,
    name: str,
) -> Role | None:
    """Return the Role with the given name, or None."""
    result = await db.execute(select(Role).where(Role.name == name))
    return result.scalar_one_or_none()


async def get_role_by_id(
    db: AsyncSession,
    role_id: str,
) -> Role | None:
    """Return the Role with the given UUID, or None."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    return result.scalar_one_or_none()


async def get_permissions_for_role(
    db: AsyncSession,
    role_id: str,
) -> list[str]:
    """
    Return the list of permission strings for the given role_id.

    Parameters
    ----------
    db:
        Active async database session.
    role_id:
        UUID string of the role.

    Returns
    -------
    list[str]
        List of permission strings (e.g. ['cases:read', 'kyc:write']).
    """
    result = await db.execute(
        select(RolePermission.permission).where(
            RolePermission.role_id == role_id
        )
    )
    return list(result.scalars().all())
