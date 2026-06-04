"""
Alembic async environment configuration.

Uses asyncio + run_async_migrations() pattern so that migrations run against
the same async engine (asyncpg) used by the application.

The DATABASE_URL is read directly from the environment variable so that this
file works both locally and in CI without relying on alembic.ini's
sqlalchemy.url (which is intentionally left as a placeholder).
"""

import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

# Load .env file before reading environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Import Base and all models so that autogenerate can discover every table.
# ---------------------------------------------------------------------------
from db.base import Base  # noqa: F401
import models  # noqa: F401 — registers Tenant, Role, RolePermission, User

# ---------------------------------------------------------------------------
# Alembic Config object — gives access to values in alembic.ini.
# ---------------------------------------------------------------------------
config = context.config

# Set up Python logging from the alembic.ini [loggers] section.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------------------------
# Target metadata for autogenerate support.
# ---------------------------------------------------------------------------
target_metadata = Base.metadata

# ---------------------------------------------------------------------------
# Database URL — always read from the environment so that the value in
# alembic.ini is never used (it would require a sync driver).
# ---------------------------------------------------------------------------
DATABASE_URL = os.environ["DATABASE_URL"]


# ---------------------------------------------------------------------------
# Offline mode — emit SQL to stdout without a live DB connection.
# ---------------------------------------------------------------------------
def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Configures the context with just a URL and not an Engine; calls to
    context.execute() emit the SQL to the script output.
    """
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        version_table_schema="public",
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online mode — run migrations against a live async engine.
# ---------------------------------------------------------------------------
def do_run_migrations(connection) -> None:
    """Execute migrations using an existing synchronous-compatible connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_schemas=True,
        version_table_schema="public",
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an async engine and run migrations inside a sync-compatible wrapper."""
    connectable = create_async_engine(DATABASE_URL, echo=False)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online migration mode — runs the async coroutine."""
    asyncio.run(run_async_migrations())


# ---------------------------------------------------------------------------
# Dispatch based on whether Alembic is running in offline or online mode.
# ---------------------------------------------------------------------------
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
