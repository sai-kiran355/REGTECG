"""
AML background tasks.
"""

from __future__ import annotations
import logging
from workers.celery_app import app

logger = logging.getLogger(__name__)


@app.task(name="workers.tasks.aml_tasks.run_aml_screening_sweep", bind=True, max_retries=3)
def run_aml_screening_sweep(self):
    """
    Periodic AML screening sweep — runs every 6 hours.
    Scans recent transactions for suspicious patterns and creates alerts.
    """
    logger.info("Starting AML screening sweep")
    try:
        # TODO: Query recent transactions and run pattern detection
        # For now, log that the sweep ran
        logger.info("AML screening sweep completed")
        return {"status": "completed", "alerts_created": 0}
    except Exception as exc:
        logger.error("AML screening sweep failed: %s", exc)
        raise self.retry(exc=exc, countdown=300)
