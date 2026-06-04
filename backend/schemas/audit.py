"""
Pydantic schemas for Audit Log endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    """Full audit log entry representation returned by the API."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID | None
    user_email: str
    action: str
    resource_type: str
    resource_id: str
    ip_address: str | None
    result: str
    details: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    """Paginated list of audit log entries."""

    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
