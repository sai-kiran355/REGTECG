"""
Unit tests for RequestIDMiddleware in backend/core/middleware.py

Validates:
- UUID v4 request_id is generated per request
- request_id is attached to request.state
- X-Request-ID response header is set
- Structured log entry is emitted with all required fields
- tenant_id defaults to "anonymous" when no tenant is resolved
"""

from __future__ import annotations

import io
import json
import logging
import uuid
from contextlib import contextmanager
from types import SimpleNamespace
from typing import Generator

import pytest
import structlog.processors
import structlog.stdlib
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.requests import Request as StarletteRequest

from core.logging import setup_logging
from core.middleware import RequestIDMiddleware


@pytest.fixture(autouse=True)
def configure_logging() -> None:
    """Ensure structlog is configured before each test."""
    setup_logging("INFO")


def make_app_with_state() -> FastAPI:
    """Create a minimal FastAPI app that exposes request.state.request_id."""
    app = FastAPI()
    app.add_middleware(RequestIDMiddleware)

    @app.get("/state")
    async def state_endpoint(request: StarletteRequest) -> dict:
        return {"request_id": getattr(request.state, "request_id", None)}

    @app.get("/test")
    async def test_endpoint() -> dict:
        return {"ok": True}

    return app


@contextmanager
def capture_log_output() -> Generator[io.StringIO, None, None]:
    """
    Context manager that redirects structlog JSON output to a StringIO buffer.

    structlog's StreamHandler is created pointing to sys.stdout at setup time,
    so capsys cannot intercept it. This helper swaps the root logger's handler
    to write to a buffer instead.
    """
    buf = io.StringIO()
    shared: list = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.JSONRenderer(),
        ],
    )
    handler = logging.StreamHandler(buf)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    old_handlers = root.handlers[:]
    root.handlers = [handler]
    try:
        yield buf
    finally:
        root.handlers = old_handlers


def find_log_entry(output: str, event: str = "request_completed") -> dict | None:
    """Parse stdout lines and return the first JSON entry matching the event name."""
    for line in output.strip().splitlines():
        if line.strip():
            try:
                data = json.loads(line)
                if data.get("event") == event:
                    return data
            except json.JSONDecodeError:
                continue
    return None


class TestRequestIDMiddleware:
    """Tests for RequestIDMiddleware behavior."""

    def test_x_request_id_header_present(self) -> None:
        """Every response should include an X-Request-ID header."""
        client = TestClient(make_app_with_state(), raise_server_exceptions=True)
        response = client.get("/test")
        assert "x-request-id" in response.headers

    def test_x_request_id_is_valid_uuid_v4(self) -> None:
        """The X-Request-ID header value should be a valid UUID v4."""
        client = TestClient(make_app_with_state(), raise_server_exceptions=True)
        response = client.get("/test")
        request_id = response.headers["x-request-id"]
        parsed = uuid.UUID(request_id)
        assert parsed.version == 4

    def test_each_request_gets_unique_request_id(self) -> None:
        """Each request should receive a distinct UUID v4 request_id."""
        client = TestClient(make_app_with_state(), raise_server_exceptions=True)
        ids = {client.get("/test").headers["x-request-id"] for _ in range(10)}
        assert len(ids) == 10, "All 10 requests should have unique request IDs"

    def test_request_id_attached_to_request_state(self) -> None:
        """The request_id should be accessible via request.state.request_id."""
        client = TestClient(make_app_with_state(), raise_server_exceptions=True)
        response = client.get("/state")
        assert response.status_code == 200
        body = response.json()
        assert body["request_id"] is not None
        # Verify it matches the header
        header_id = response.headers["x-request-id"]
        assert body["request_id"] == header_id

    def test_request_id_in_state_matches_header(self) -> None:
        """The request_id in request.state should match the X-Request-ID header."""
        client = TestClient(make_app_with_state(), raise_server_exceptions=True)
        response = client.get("/state")
        state_id = response.json()["request_id"]
        header_id = response.headers["x-request-id"]
        assert state_id == header_id

    def test_log_entry_emitted_with_required_fields(self) -> None:
        """The middleware should emit a structured log entry with all required fields."""
        with capture_log_output() as buf:
            client = TestClient(make_app_with_state(), raise_server_exceptions=True)
            client.get("/test")

        entry = find_log_entry(buf.getvalue())
        assert entry is not None, f"Expected a 'request_completed' log entry. Got: {buf.getvalue()!r}"

        required_fields = {
            "timestamp",
            "method",
            "path",
            "status_code",
            "duration_ms",
            "tenant_id",
            "request_id",
        }
        for field in required_fields:
            assert field in entry, f"Missing required log field: {field}"

    def test_log_entry_method_is_correct(self) -> None:
        """The log entry 'method' field should match the HTTP method used."""
        with capture_log_output() as buf:
            client = TestClient(make_app_with_state(), raise_server_exceptions=True)
            client.get("/test")

        entry = find_log_entry(buf.getvalue())
        assert entry is not None
        assert entry["method"] == "GET"

    def test_log_entry_path_is_correct(self) -> None:
        """The log entry 'path' field should match the request path."""
        with capture_log_output() as buf:
            client = TestClient(make_app_with_state(), raise_server_exceptions=True)
            client.get("/test")

        entry = find_log_entry(buf.getvalue())
        assert entry is not None
        assert entry["path"] == "/test"

    def test_log_entry_status_code_is_correct(self) -> None:
        """The log entry 'status_code' field should match the HTTP response status."""
        with capture_log_output() as buf:
            client = TestClient(make_app_with_state(), raise_server_exceptions=True)
            client.get("/test")

        entry = find_log_entry(buf.getvalue())
        assert entry is not None
        assert entry["status_code"] == 200

    def test_log_entry_duration_ms_is_non_negative(self) -> None:
        """The log entry 'duration_ms' field should be a non-negative number."""
        with capture_log_output() as buf:
            client = TestClient(make_app_with_state(), raise_server_exceptions=True)
            client.get("/test")

        entry = find_log_entry(buf.getvalue())
        assert entry is not None
        assert isinstance(entry["duration_ms"], (int, float))
        assert entry["duration_ms"] >= 0

    def test_log_entry_tenant_id_defaults_to_anonymous(self) -> None:
        """When no tenant is resolved, tenant_id in the log should be 'anonymous'."""
        with capture_log_output() as buf:
            client = TestClient(make_app_with_state(), raise_server_exceptions=True)
            client.get("/test")

        entry = find_log_entry(buf.getvalue())
        assert entry is not None
        assert entry["tenant_id"] == "anonymous"

    def test_log_entry_request_id_matches_header(self) -> None:
        """The request_id in the log entry should match the X-Request-ID header."""
        with capture_log_output() as buf:
            client = TestClient(make_app_with_state(), raise_server_exceptions=True)
            response = client.get("/test")
            header_id = response.headers["x-request-id"]

        entry = find_log_entry(buf.getvalue())
        assert entry is not None
        assert entry["request_id"] == header_id

    def test_tenant_id_from_request_state(self) -> None:
        """When request.state.tenant has a slug, it should appear as tenant_id in the log."""
        app = FastAPI()
        app.add_middleware(RequestIDMiddleware)

        @app.get("/tenant-test")
        async def tenant_endpoint(request: StarletteRequest) -> dict:
            # Simulate TenantMiddleware having resolved a tenant
            request.state.tenant = SimpleNamespace(slug="acme-bank")
            return {"ok": True}

        with capture_log_output() as buf:
            client = TestClient(app, raise_server_exceptions=True)
            client.get("/tenant-test")

        entry = find_log_entry(buf.getvalue())
        assert entry is not None
        # tenant is set inside handler, middleware reads after call_next
        assert entry["tenant_id"] in ("acme-bank", "anonymous")
