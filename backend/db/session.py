"""
Async SQLAlchemy engine and session factory.

Exports:
  engine            — AsyncEngine configured from settings.DATABASE_URL
  AsyncSessionLocal — async_sessionmaker bound to the engine
  get_db            — FastAPI dependency that yields an AsyncSession scoped to
                      the current request, with the tenant search_path applied.
"""

from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from core.config import Settings

if TYPE_CHECKING:
    from fastapi import Request

# ---------------------------------------------------------------------------
# Load settings
# ---------------------------------------------------------------------------
settings = Settings()

# ---------------------------------------------------------------------------
# Async engine
#
# pool_size=10       — steady-state connections kept open
# max_overflow=20    — extra connections allowed above pool_size under load
# pool_pre_ping=True — issue a lightweight "SELECT 1" before handing out a
#                      connection to detect and discard stale ones
# echo               — log all SQL statements except in production
# ---------------------------------------------------------------------------
engine = create_async_engine(
    str(settings.DATABASE_URL),
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=settings.ENVIRONMENT != "production",
)

# ---------------------------------------------------------------------------
# Session factory
#
# expire_on_commit=False — keep ORM objects usable after commit without
#                          triggering lazy-load errors in async context
# ---------------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
async def get_db(request: "Request") -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an AsyncSession for the duration of a single request.

    Tenant schema isolation
    -----------------------
    After the session is opened, we execute:

        SET search_path TO tenant_{slug}, public

    This scopes all subsequent queries in the session to the tenant's private
    schema while still resolving cross-tenant tables (tenants, roles, …) from
    the public schema.

    The tenant slug is read from ``request.state.tenant.slug``, which is
    populated by TenantMiddleware before this dependency runs.

    NOTE: TenantMiddleware is not yet wired — the ``request.state.tenant``
    attribute will be absent on excluded paths (health, auth/login, etc.).
    When the tenant is not present we fall back to the default search_path so
    that health checks and login endpoints continue to work without a tenant
    context.
    """
    async with AsyncSessionLocal() as session:
        # Resolve tenant slug from request state (set by TenantMiddleware).
        tenant = getattr(request.state, "tenant", None)

        if tenant is not None:
            slug = tenant.slug
            # Parameterised SET is not supported by PostgreSQL; the slug is
            # validated by TenantMiddleware to match ^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$
            # so it is safe to interpolate here.
            await session.execute(text(f"SET search_path TO tenant_{slug}, public"))

        yield session
