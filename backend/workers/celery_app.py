"""
Celery application configuration.

Workers handle background jobs:
  - Scheduled AML screening sweeps (every 6 hours)
  - Scheduled sanctions re-screening (daily)
  - Report generation (on-demand)
  - Session cleanup (hourly)
"""

from __future__ import annotations

import os
from celery import Celery
from celery.schedules import crontab

# Load Redis URL from environment
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "regtech",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "workers.tasks.aml_tasks",
        "workers.tasks.sanctions_tasks",
        "workers.tasks.report_tasks",
        "workers.tasks.cleanup_tasks",
    ],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Beat schedule — periodic tasks
    beat_schedule={
        # AML screening sweep every 6 hours
        "aml-screening-sweep": {
            "task": "workers.tasks.aml_tasks.run_aml_screening_sweep",
            "schedule": crontab(minute=0, hour="*/6"),
        },
        # Sanctions re-screening daily at 2am UTC
        "sanctions-rescreening": {
            "task": "workers.tasks.sanctions_tasks.run_sanctions_rescreening",
            "schedule": crontab(minute=0, hour=2),
        },
        # Session cleanup hourly
        "session-cleanup": {
            "task": "workers.tasks.cleanup_tasks.cleanup_expired_sessions",
            "schedule": crontab(minute=0),
        },
    },
)
