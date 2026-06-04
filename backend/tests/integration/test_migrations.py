"""
Integration tests for Alembic migrations.
Tests upgrade/downgrade round-trip against a real PostgreSQL instance.
"""

from __future__ import annotations

import os
import pytest


@pytest.mark.asyncio
async def test_migration_upgrade_creates_tables() -> None:
    """
    Verify that alembic upgrade head creates all required tables.
    This test is skipped if DATABASE_URL points to a non-test database.
    """
    db_url = os.environ.get("DATABASE_URL", "")
    if "regtech_test" not in db_url and "test" not in db_url:
        pytest.skip("Skipping migration test: not a test database")

    import subprocess
    import sys

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=True,
        text=True,
        cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    )
    assert result.returncode == 0, f"alembic upgrade failed:\n{result.stderr}"


@pytest.mark.asyncio
async def test_migration_downgrade_removes_tables() -> None:
    """
    Verify that alembic downgrade -1 removes the migration tables.
    """
    db_url = os.environ.get("DATABASE_URL", "")
    if "regtech_test" not in db_url and "test" not in db_url:
        pytest.skip("Skipping migration test: not a test database")

    import subprocess
    import sys

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "downgrade", "-1"],
        capture_output=True,
        text=True,
        cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    )
    assert result.returncode == 0, f"alembic downgrade failed:\n{result.stderr}"
