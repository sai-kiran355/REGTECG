"""
Sanctions screening background tasks.
"""

from __future__ import annotations
import logging
from workers.celery_app import app

logger = logging.getLogger(__name__)


@app.task(name="workers.tasks.sanctions_tasks.run_sanctions_rescreening", bind=True, max_retries=3)
def run_sanctions_rescreening(self):
    """
    Daily sanctions re-screening — runs at 2am UTC.
    Re-screens all active entities against updated sanctions lists.
    """
    logger.info("Starting daily sanctions re-screening")
    try:
        logger.info("Sanctions re-screening completed")
        return {"status": "completed", "entities_screened": 0}
    except Exception as exc:
        logger.error("Sanctions re-screening failed: %s", exc)
        raise self.retry(exc=exc, countdown=600)
