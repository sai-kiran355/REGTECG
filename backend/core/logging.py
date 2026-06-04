"""
Structured JSON logging configuration for the RegTech Compliance OS backend.

Uses structlog with JSONRenderer as the final processor. Standard library
logging is redirected through structlog so all log output is consistently
formatted as JSON.

Usage
-----
Call ``setup_logging(log_level)`` once at application startup (before the
FastAPI app is created), then obtain loggers via ``get_logger(name)``.

    from core.logging import setup_logging, get_logger

    setup_logging("INFO")
    logger = get_logger(__name__)
    logger.info("server_started", env="production")
"""

from __future__ import annotations

import logging
import logging.config
import sys

import structlog


def setup_logging(log_level: str = "INFO") -> None:
    """
    Configure structlog and the standard library logging to emit JSON.

    Processor chain
    ---------------
    1. ``add_log_level``       — adds the ``level`` key
    2. ``add_logger_name``     — adds the ``logger`` key
    3. ``TimeStamper``         — adds ``timestamp`` in ISO 8601 UTC
    4. ``StackInfoRenderer``   — renders stack_info if present
    5. ``format_exc_info``     — renders exc_info as a string
    6. ``JSONRenderer``        — serialises the event dict to JSON

    Standard library logging is bridged into structlog via
    ``ProcessorFormatter`` so that third-party libraries (SQLAlchemy,
    uvicorn, etc.) also emit JSON.

    Parameters
    ----------
    log_level:
        The minimum log level to emit (e.g. ``"DEBUG"``, ``"INFO"``,
        ``"WARNING"``).  Defaults to ``"INFO"``.
    """
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # Shared processors used by both structlog and the stdlib bridge.
    shared_processors: list[structlog.types.Processor] = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    # Configure structlog itself.
    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Build the stdlib formatter that renders the final JSON.
    formatter = structlog.stdlib.ProcessorFormatter(
        # Foreign (non-structlog) log records pass through these processors
        # before the final renderer.
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.JSONRenderer(),
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(numeric_level)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """
    Return a structlog logger bound to *name*.

    Parameters
    ----------
    name:
        Typically ``__name__`` of the calling module.

    Returns
    -------
    structlog.stdlib.BoundLogger
        A structlog logger that emits JSON via the configured processor chain.
    """
    return structlog.get_logger(name)
