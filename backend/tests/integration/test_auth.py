"""
Integration tests for authentication endpoints.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_with_invalid_credentials_returns_401(test_client: AsyncClient) -> None:
    """Login with wrong credentials must return 401 INVALID_CREDENTIALS."""
    response = await test_client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    body = response.json()
    assert body["detail"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_with_short_password_returns_422(test_client: AsyncClient) -> None:
    """Login with password shorter than 8 chars must return 422."""
    response = await test_client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "short"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_with_invalid_email_returns_422(test_client: AsyncClient) -> None:
    """Login with invalid email format must return 422."""
    response = await test_client.post(
        "/api/v1/auth/login",
        json={"email": "not-an-email", "password": "validpassword123"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_refresh_with_invalid_token_returns_401(test_client: AsyncClient) -> None:
    """Refresh with non-existent token must return 401 INVALID_REFRESH_TOKEN."""
    response = await test_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "nonexistent-token-abc123"},
    )
    assert response.status_code == 401
    body = response.json()
    assert body["detail"]["code"] == "INVALID_REFRESH_TOKEN"


@pytest.mark.asyncio
async def test_logout_without_token_returns_401(test_client: AsyncClient) -> None:
    """Logout without Authorization header must return 401."""
    response = await test_client.post("/api/v1/auth/logout")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_with_malformed_token_returns_401(test_client: AsyncClient) -> None:
    """Logout with malformed JWT must return 401 INVALID_TOKEN."""
    response = await test_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": "Bearer not.a.valid.jwt"},
    )
    assert response.status_code == 401
    body = response.json()
    assert body["detail"]["code"] == "INVALID_TOKEN"
