"""
Pytest fixtures for the RegTech Compliance OS backend test suite.

Provides:
  - fakeredis mock
  - httpx.AsyncClient test client
  - pytest-asyncio configuration
"""

from __future__ import annotations

import os

# ---------------------------------------------------------------------------
# Generate fresh RSA test keys at runtime — never hardcode keys in source.
# ---------------------------------------------------------------------------

def _generate_test_keys():
    """Generate a fresh RSA key pair for testing only."""
    try:
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        private_pem = private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        ).decode()
        public_pem = private_key.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode()
        return private_pem, public_pem
    except ImportError:
        # fallback — use SECRET_KEY based HS256 in tests
        return "HS256_MODE", "HS256_MODE"


_TEST_PRIVATE_KEY, _TEST_PUBLIC_KEY = _generate_test_keys()

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/regtech_test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("JWT_PRIVATE_KEY", _TEST_PRIVATE_KEY)
os.environ.setdefault("JWT_PUBLIC_KEY", _TEST_PUBLIC_KEY)
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only-32chars")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("APP_VERSION", "0.0.1-test")

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def fake_redis():
    """In-memory fakeredis instance for unit/property tests."""
    server = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield server
    await server.aclose()


@pytest.fixture
async def test_client(fake_redis):
    """
    httpx.AsyncClient pointed at the FastAPI app with fakeredis injected.
    The lifespan is disabled to avoid requiring live DB/Redis in unit tests.
    """
    from main import app
    from core.redis import get_redis

    app.dependency_overrides[get_redis] = lambda: fake_redis

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()
