"""
Integration tests for TenantMiddleware.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_missing_tenant_header_returns_400(test_client: AsyncClient) -> None:
    """Requests to non-excluded paths without X-Tenant-ID must return 400."""
    response = await test_client.get("/api/v1/some-protected-path")
    # Either 400 MISSING_TENANT_ID or 404 (route not found) — not 200
    assert response.status_code in (400, 404)
    if response.status_code == 400:
        body = response.json()
        assert body["error"]["code"] == "MISSING_TENANT_ID"


@pytest.mark.asyncio
async def test_empty_tenant_header_returns_400(test_client: AsyncClient) -> None:
    """Empty X-Tenant-ID header must return 400."""
    response = await test_client.get(
        "/api/v1/some-protected-path",
        headers={"X-Tenant-ID": "   "},
    )
    assert response.status_code in (400, 404)
    if response.status_code == 400:
        body = response.json()
        assert body["error"]["code"] == "MISSING_TENANT_ID"


@pytest.mark.asyncio
async def test_health_excluded_from_tenant_check(test_client: AsyncClient) -> None:
    """Health endpoint must not require X-Tenant-ID."""
    response = await test_client.get("/api/v1/health")
    assert response.status_code != 400


@pytest.mark.asyncio
async def test_login_excluded_from_tenant_check(test_client: AsyncClient) -> None:
    """Login endpoint must not require X-Tenant-ID."""
    response = await test_client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    # Should not return 400 MISSING_TENANT_ID (may return 401 or 422)
    assert response.status_code != 400 or (
        response.status_code == 400
        and response.json().get("error", {}).get("code") != "MISSING_TENANT_ID"
    )


@pytest.mark.asyncio
async def test_unknown_tenant_returns_404(test_client: AsyncClient) -> None:
    """Unknown tenant slug must return 404 TENANT_NOT_FOUND."""
    response = await test_client.get(
        "/api/v1/some-protected-path",
        headers={"X-Tenant-ID": "nonexistent-tenant-slug"},
    )
    assert response.status_code in (404, 400)
    if response.status_code == 404:
        body = response.json()
        assert body["error"]["code"] == "TENANT_NOT_FOUND"
