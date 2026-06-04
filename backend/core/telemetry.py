"""
OpenTelemetry + Prometheus observability setup.

Instruments:
  - FastAPI request tracing
  - SQLAlchemy query tracing
  - Redis operation tracing
  - Prometheus metrics endpoint at /metrics
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def setup_telemetry(app) -> None:
    """
    Configure OpenTelemetry instrumentation and Prometheus metrics.

    Call this once at application startup after the FastAPI app is created.

    Parameters
    ----------
    app:
        The FastAPI application instance.
    """
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        from prometheus_client import make_asgi_app, Counter, Histogram, Gauge
        from starlette.routing import Mount

        # ── Tracer Provider ──────────────────────────────────────────────
        resource = Resource.create({"service.name": "regtech-compliance-os"})
        provider = TracerProvider(resource=resource)
        trace.set_tracer_provider(provider)

        # ── Instrument FastAPI ───────────────────────────────────────────
        FastAPIInstrumentor.instrument_app(app)

        # ── Instrument SQLAlchemy ────────────────────────────────────────
        SQLAlchemyInstrumentor().instrument()

        # ── Instrument Redis ─────────────────────────────────────────────
        RedisInstrumentor().instrument()

        # ── Prometheus metrics endpoint ──────────────────────────────────
        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)

        # ── Custom business metrics ──────────────────────────────────────
        # These are available globally via prometheus_client
        login_attempts = Counter(
            "regtech_login_attempts_total",
            "Total login attempts",
            ["tenant", "result"],
        )
        cases_created = Counter(
            "regtech_cases_created_total",
            "Total compliance cases created",
            ["tenant", "case_type"],
        )
        aml_alerts = Counter(
            "regtech_aml_alerts_total",
            "Total AML alerts generated",
            ["tenant", "alert_type"],
        )
        request_duration = Histogram(
            "regtech_request_duration_seconds",
            "HTTP request duration in seconds",
            ["method", "endpoint", "status"],
        )
        active_sessions = Gauge(
            "regtech_active_sessions",
            "Number of active user sessions",
            ["tenant"],
        )

        logger.info("OpenTelemetry and Prometheus instrumentation configured")

    except ImportError as exc:
        logger.warning(
            "OpenTelemetry packages not installed — observability disabled: %s", exc
        )
    except Exception as exc:
        logger.warning("Failed to configure telemetry: %s", exc)
