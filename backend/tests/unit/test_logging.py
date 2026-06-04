"""
Unit tests for backend/core/logging.py

Validates:
- setup_logging() configures structlog without raising
- get_logger() returns a usable BoundLogger
- Log output is valid JSON with required fields
"""

from __future__ import annotations

import io
import json
import logging

import pytest
import structlog

from core.logging import get_logger, setup_logging


class TestSetupLogging:
    """Tests for the setup_logging() function."""

    def test_setup_logging_does_not_raise(self) -> None:
        """setup_logging() should complete without raising any exception."""
        setup_logging("INFO")

    def test_setup_logging_accepts_debug_level(self) -> None:
        """setup_logging() should accept DEBUG as a valid log level."""
        setup_logging("DEBUG")
        assert logging.getLogger().level == logging.DEBUG

    def test_setup_logging_accepts_warning_level(self) -> None:
        """setup_logging() should accept WARNING as a valid log level."""
        setup_logging("WARNING")
        assert logging.getLogger().level == logging.WARNING

    def test_setup_logging_defaults_to_info(self) -> None:
        """setup_logging() with no argument should default to INFO level."""
        setup_logging()
        assert logging.getLogger().level == logging.INFO

    def test_setup_logging_sets_stream_handler(self) -> None:
        """setup_logging() should configure a StreamHandler on the root logger."""
        setup_logging("INFO")
        root = logging.getLogger()
        assert any(isinstance(h, logging.StreamHandler) for h in root.handlers)


class TestGetLogger:
    """Tests for the get_logger() function."""

    def test_get_logger_returns_bound_logger(self) -> None:
        """get_logger() should return a structlog logger (BoundLogger or proxy)."""
        setup_logging("INFO")
        logger = get_logger(__name__)
        # structlog returns a BoundLoggerLazyProxy that wraps BoundLogger;
        # verify it has the expected logging methods rather than checking exact type.
        assert hasattr(logger, "info")
        assert hasattr(logger, "error")
        assert hasattr(logger, "warning")
        assert hasattr(logger, "debug")

    def test_get_logger_with_module_name(self) -> None:
        """get_logger() should accept a module name string without raising."""
        setup_logging("INFO")
        logger = get_logger("core.middleware")
        assert logger is not None

    def test_get_logger_can_emit_info(self) -> None:
        """Logger returned by get_logger() should be able to emit an info log."""
        setup_logging("INFO")
        logger = get_logger(__name__)
        # Should not raise
        logger.info("test_event", key="value")

    def test_get_logger_can_emit_error(self) -> None:
        """Logger returned by get_logger() should be able to emit an error log."""
        setup_logging("INFO")
        logger = get_logger(__name__)
        # Should not raise
        logger.error("test_error_event", error="something went wrong")


class TestJsonOutput:
    """Tests that log output is valid JSON with required fields."""

    def test_log_output_is_valid_json(self, capsys: pytest.CaptureFixture[str]) -> None:
        """Each log entry should be parseable as JSON."""
        setup_logging("INFO")
        logger = get_logger(__name__)
        logger.info("test_json_event", foo="bar")

        captured = capsys.readouterr()
        # There may be multiple lines; find the one with our event
        for line in captured.out.strip().splitlines():
            if line.strip():
                data = json.loads(line)
                assert isinstance(data, dict)

    def test_log_output_contains_timestamp(self, capsys: pytest.CaptureFixture[str]) -> None:
        """Each log entry should contain a 'timestamp' field."""
        setup_logging("INFO")
        logger = get_logger(__name__)
        logger.info("test_timestamp_event")

        captured = capsys.readouterr()
        for line in captured.out.strip().splitlines():
            if line.strip():
                data = json.loads(line)
                if data.get("event") == "test_timestamp_event":
                    assert "timestamp" in data
                    break

    def test_log_output_contains_level(self, capsys: pytest.CaptureFixture[str]) -> None:
        """Each log entry should contain a 'level' field."""
        setup_logging("INFO")
        logger = get_logger(__name__)
        logger.info("test_level_event")

        captured = capsys.readouterr()
        for line in captured.out.strip().splitlines():
            if line.strip():
                data = json.loads(line)
                if data.get("event") == "test_level_event":
                    assert "level" in data
                    assert data["level"] == "info"
                    break

    def test_log_output_contains_extra_fields(self, capsys: pytest.CaptureFixture[str]) -> None:
        """Extra keyword arguments should appear as fields in the JSON output."""
        setup_logging("INFO")
        logger = get_logger(__name__)
        logger.info("test_extra_fields", request_id="abc-123", status_code=200)

        captured = capsys.readouterr()
        for line in captured.out.strip().splitlines():
            if line.strip():
                data = json.loads(line)
                if data.get("event") == "test_extra_fields":
                    assert data.get("request_id") == "abc-123"
                    assert data.get("status_code") == 200
                    break
