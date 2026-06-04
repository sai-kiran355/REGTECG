"""
Integration tests for GET /api/v1/health.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_required_fields(test_client: AsyncClient) -> None:
    """Health response must contain status, version, db, redis fields."""
    response = await test_client.get("/api/v1/health")
    assert response.status_code in (200, 503)
    body = response.json()
    assert "status" in body
    assert "version" in body
    assert "db" in body
    assert "redis" in body


@pytest.mark.asyncio
async def test_health_status_values_are_valid(test_client: AsyncClient) -> None:
    """status, db, redis must be 'ok' or 'degraded'."""
    response = await test_client.get("/api/v1/health")
    body = response.json()
    assert body["status"] in ("ok", "degraded")
    assert body["db"] in ("ok", "degraded")
    assert body["redis"] in ("ok", "degraded")


@pytest.mark.asyncio
async def test_health_no_tenant_header_required(test_client: AsyncClient) -> None:
    """Health endpoint must not require X-Tenant-ID header."""
    response = await test_client.get("/api/v1/health")
    # Should not return 400 MISSING_TENANT_ID
    assert response.status_code != 400
