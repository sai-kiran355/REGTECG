"""
Role assignment service with session invalidation.

Provides:
  assign_role — update user.role_id and invalidate active sessions
"""

from __future__ import annotations

import logging

import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.redis import REFRESH_PREFIX
from crud.role import get_role_by_name
from models.user import User

logger = logging.getLogger(__name__)


class RoleAssignmentError(Exception):
    """Raised when role assignment fails."""


async def assign_role(
    db: AsyncSession,
    redis: aioredis.Redis,
    user_id: str,
    role_name: str,
) -> None:
    """
    Assign a new role to a user and invalidate all active sessions.

    Parameters
    ----------
    db:
        Active async database session.
    redis:
        Async Redis client.
    user_id:
        UUID string of the user to update.
    role_name:
        Name of the role to assign (must be a valid built-in role).

    Raises
    ------
    RoleAssignmentError
        If the role name is invalid or a DB error occurs.
        The user's existing role is left unchanged on failure.
    """
    # Validate role name.
    role = await get_role_by_name(db, role_name)
    if role is None:
        raise RoleAssignmentError(f"Role '{role_name}' does not exist.")

    # Fetch user.
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise RoleAssignmentError(f"User '{user_id}' does not exist.")

    # Update role — keep original on failure.
    original_role_id = user.role_id
    try:
        user.role_id = role.id
        await db.commit()
        await db.refresh(user)
    except Exception as exc:
        await db.rollback()
        user.role_id = original_role_id
        logger.error("Role assignment failed for user %s: %s", user_id, exc)
        raise RoleAssignmentError(f"Failed to assign role: {exc}") from exc

    # Invalidate active sessions by purging refresh tokens for this user.
    # Scan for all refresh: keys and delete those belonging to this user.
    # This is best-effort; sessions expire naturally within 7 days.
    try:
        cursor = 0
        pattern = f"{REFRESH_PREFIX}*"
        while True:
            cursor, keys = await redis.scan(cursor, match=pattern, count=100)
            for key in keys:
                val = await redis.get(key)
                if val == user_id:
                    await redis.delete(key)
            if cursor == 0:
                break
        logger.info("Invalidated sessions for user %s after role change", user_id)
    except Exception as exc:
        # Non-fatal — log but don't fail the assignment.
        logger.warning("Could not fully invalidate sessions for user %s: %s", user_id, exc)
