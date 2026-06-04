"""
Report generation background tasks.
"""

from __future__ import annotations
import logging
from workers.celery_app import app

logger = logging.getLogger(__name__)


@app.task(name="workers.tasks.report_tasks.generate_report", bind=True, max_retries=2)
def generate_report(self, report_type: str, tenant_id: str, period: str):
    """
    Generate a compliance report as a PDF.
    Called on-demand from the reports API endpoint.
    """
    logger.info("Generating %s report for tenant %s", report_type, tenant_id)
    try:
        # TODO: Query data, render HTML template, convert to PDF with WeasyPrint
        # Upload PDF to S3/R2 and return the download URL
        logger.info("Report generation completed: %s", report_type)
        return {"status": "completed", "report_type": report_type, "url": None}
    except Exception as exc:
        logger.error("Report generation failed: %s", exc)
        raise self.retry(exc=exc, countdown=60)
