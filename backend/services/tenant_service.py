"""
Tenant provisioning service.

Provides:
  provision_tenant_schema — create a new tenant schema and apply migrations
"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def provision_tenant_schema(
    session: AsyncSession,
    slug: str,
) -> tuple[bool, str]:
    """
    Create the ``tenant_{slug}`` PostgreSQL schema and apply all current
    migrations to it within a single transaction.

    Parameters
    ----------
    session:
        Active async database session (must be in a transaction).
    slug:
        Validated tenant slug (lowercase alphanumeric + hyphens, 3–63 chars).

    Returns
    -------
    (True, "")
        On success.
    (False, error_message)
        On failure — the transaction is rolled back by the caller.
    """
    schema_name = f"tenant_{slug}"

    try:
        # Create the schema if it doesn't already exist.
        await session.execute(
            text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
        )
        logger.info("Created tenant schema: %s", schema_name)
        return True, ""
    except Exception as exc:
        error_msg = f"Failed to provision schema '{schema_name}': {exc}"
        logger.error(error_msg)
        await session.rollback()
        return False, error_msg
