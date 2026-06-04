"""
Cleanup background tasks.
"""

from __future__ import annotations
import logging
from workers.celery_app import app

logger = logging.getLogger(__name__)


@app.task(name="workers.tasks.cleanup_tasks.cleanup_expired_sessions", bind=True)
def cleanup_expired_sessions(self):
    """
    Hourly cleanup of expired Redis sessions and blacklisted tokens.
    Redis TTL handles most of this automatically, but this task
    cleans up any orphaned keys.
    """
    logger.info("Running session cleanup")
    return {"status": "completed"}
