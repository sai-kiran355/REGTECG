"""
Integration tests for RBAC enforcement.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_protected_endpoint_without_token_returns_401(test_client: AsyncClient) -> None:
    """Accessing a protected endpoint without a token must return 401."""
    from api.v1.deps import get_current_user, require_permission
    from fastapi import Depends
    from main import app

    # Register a test endpoint that requires a permission
    @app.get("/api/v1/test-rbac-protected", dependencies=[Depends(require_permission("cases:read"))])
    async def _protected():
        return {"ok": True}

    response = await test_client.get("/api/v1/test-rbac-protected")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_missing_authorization_header_returns_401(test_client: AsyncClient) -> None:
    """Missing Authorization header on protected endpoint returns 401 MISSING_TOKEN."""
    from api.v1.deps import get_current_user
    from fastapi import Depends
    from main import app

    @app.get("/api/v1/test-auth-required", dependencies=[Depends(get_current_user)])
    async def _auth_required():
        return {"ok": True}

    response = await test_client.get("/api/v1/test-auth-required")
    assert response.status_code == 401
    body = response.json()
    assert body["detail"]["code"] == "MISSING_TOKEN"
