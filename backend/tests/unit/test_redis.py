"""
Unit tests for backend/core/redis.py

Validates:
- Connection pool is created with correct parameters (max_connections=20,
  decode_responses=True, socket_connect_timeout=5)
- redis_client is an aioredis.Redis instance backed by the pool
- get_redis() yields the shared redis_client
- Key namespace prefix constants are correct
- check_redis_health() returns "ok" when Redis responds and "degraded" on error
"""

from __future__ import annotations

import pytest
import fakeredis.aioredis as fakeredis

import redis.asyncio as aioredis

from core.redis import (
    BLACKLIST_PREFIX,
    CACHE_PREFIX,
    REFRESH_PREFIX,
    check_redis_health,
    get_redis,
    redis_client,
    redis_pool,
)


class TestConnectionPool:
    """Tests for the module-level connection pool configuration."""

    def test_pool_is_connection_pool_instance(self) -> None:
        """redis_pool should be an aioredis.ConnectionPool."""
        assert isinstance(redis_pool, aioredis.ConnectionPool)

    def test_pool_max_connections(self) -> None:
        """Connection pool should be capped at 20 connections."""
        assert redis_pool.max_connections == 20

    def test_pool_decode_responses(self) -> None:
        """Connection pool should have decode_responses=True."""
        # The connection_kwargs dict holds the per-connection settings
        kwargs = redis_pool.connection_kwargs
        assert kwargs.get("decode_responses") is True

    def test_pool_socket_connect_timeout(self) -> None:
        """Connection pool should have socket_connect_timeout=5 for startup check."""
        kwargs = redis_pool.connection_kwargs
        assert kwargs.get("socket_connect_timeout") == 5

    def test_pool_socket_timeout(self) -> None:
        """Connection pool should have socket_timeout=5."""
        kwargs = redis_pool.connection_kwargs
        assert kwargs.get("socket_timeout") == 5


class TestRedisClient:
    """Tests for the module-level redis_client."""

    def test_redis_client_is_redis_instance(self) -> None:
        """redis_client should be an aioredis.Redis instance."""
        assert isinstance(redis_client, aioredis.Redis)

    def test_redis_client_uses_shared_pool(self) -> None:
        """redis_client should use the module-level redis_pool."""
        assert redis_client.connection_pool is redis_pool


class TestKeyNamespacePrefixes:
    """Tests for the key namespace prefix constants (Requirement 6.4)."""

    def test_blacklist_prefix(self) -> None:
        assert BLACKLIST_PREFIX == "blacklist:"

    def test_refresh_prefix(self) -> None:
        assert REFRESH_PREFIX == "refresh:"

    def test_cache_prefix(self) -> None:
        assert CACHE_PREFIX == "cache:"

    def test_prefixes_are_distinct(self) -> None:
        """All three prefixes must be unique to avoid key collisions."""
        prefixes = {BLACKLIST_PREFIX, REFRESH_PREFIX, CACHE_PREFIX}
        assert len(prefixes) == 3


class TestGetRedisDependency:
    """Tests for the get_redis() FastAPI dependency."""

    @pytest.mark.asyncio
    async def test_get_redis_yields_redis_client(self) -> None:
        """get_redis() should yield the shared redis_client."""
        gen = get_redis()
        client = await gen.__anext__()
        assert client is redis_client
        # Clean up the generator
        try:
            await gen.__anext__()
        except StopAsyncIteration:
            pass

    @pytest.mark.asyncio
    async def test_get_redis_is_async_generator(self) -> None:
        """get_redis() should be an async generator (supports async for)."""
        import inspect
        assert inspect.isasyncgenfunction(get_redis)


class TestCheckRedisHealth:
    """Tests for check_redis_health() using fakeredis."""

    @pytest.mark.asyncio
    async def test_health_returns_ok_when_redis_responds(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """check_redis_health() should return 'ok' when Redis responds to PING."""
        fake_server = fakeredis.FakeServer()

        async def mock_ping(self: aioredis.Redis) -> bool:  # noqa: ANN001
            return True

        # Patch the ConnectionPool.from_url to return a fake pool and the
        # resulting client's ping to succeed.
        fake_client = fakeredis.FakeRedis(server=fake_server, decode_responses=True)

        original_from_url = aioredis.ConnectionPool.from_url

        def patched_from_url(url: str, **kwargs: object) -> fakeredis.FakeRedis:  # type: ignore[return]
            return fake_client  # type: ignore[return-value]

        # We patch at the module level inside check_redis_health
        import core.redis as redis_module

        original_pool_from_url = aioredis.ConnectionPool.from_url

        class _FakePool:
            """Minimal fake pool that satisfies aioredis.ConnectionPool interface."""

            max_connections = 1

            async def aclose(self) -> None:
                pass

        fake_pool = _FakePool()

        original_redis_cls = aioredis.Redis

        class _FakeRedisClient:
            connection_pool = fake_pool

            async def ping(self) -> bool:
                return True

        def patched_pool_from_url(url: str, **kwargs: object) -> _FakePool:
            return fake_pool  # type: ignore[return-value]

        def patched_redis_cls(connection_pool: object) -> _FakeRedisClient:
            return _FakeRedisClient()

        monkeypatch.setattr(aioredis.ConnectionPool, "from_url", staticmethod(patched_pool_from_url))
        monkeypatch.setattr(aioredis, "Redis", patched_redis_cls)

        result = await check_redis_health()
        assert result == "ok"

    @pytest.mark.asyncio
    async def test_health_returns_degraded_on_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """check_redis_health() should return 'degraded' when Redis raises an error."""
        from redis.exceptions import ConnectionError as RedisConnectionError

        class _FailPool:
            max_connections = 1

            async def aclose(self) -> None:
                pass

        class _FailRedisClient:
            connection_pool = _FailPool()

            async def ping(self) -> bool:
                raise RedisConnectionError("Connection refused")

        def patched_pool_from_url(url: str, **kwargs: object) -> _FailPool:
            return _FailPool()  # type: ignore[return-value]

        def patched_redis_cls(connection_pool: object) -> _FailRedisClient:
            return _FailRedisClient()

        monkeypatch.setattr(aioredis.ConnectionPool, "from_url", staticmethod(patched_pool_from_url))
        monkeypatch.setattr(aioredis, "Redis", patched_redis_cls)

        result = await check_redis_health()
        assert result == "degraded"
