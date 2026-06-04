"""
Pydantic schemas for AML Alert endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


EntityType = Literal["individual", "entity"]
AlertType = Literal[
    "structuring",
    "layering",
    "unusual_pattern",
    "high_risk_country",
    "cash_intensive",
    "round_tripping",
]
AMLStatus = Literal["open", "in_review", "closed", "false_positive"]


class AMLAlertCreate(BaseModel):
    """Request body for creating a new AML alert."""

    case_id: uuid.UUID | None = None
    entity_name: str = Field(..., min_length=1, max_length=255)
    entity_type: EntityType
    alert_type: AlertType
    amount: Decimal = Field(..., ge=0, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    risk_score: int = Field(default=0, ge=0, le=100)
    description: str = Field(..., min_length=1, max_length=10000)


class AMLAlertUpdate(BaseModel):
    """Request body for updating an AML alert."""

    case_id: uuid.UUID | None = None
    entity_name: str | None = Field(default=None, min_length=1, max_length=255)
    entity_type: EntityType | None = None
    alert_type: AlertType | None = None
    amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    risk_score: int | None = Field(default=None, ge=0, le=100)
    status: AMLStatus | None = None
    description: str | None = Field(default=None, min_length=1, max_length=10000)


class AMLAlertResponse(BaseModel):
    """Full AML alert representation returned by the API."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    case_id: uuid.UUID | None
    entity_name: str
    entity_type: str
    alert_type: str
    amount: Decimal
    currency: str
    risk_score: int
    status: str
    description: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AMLAlertListResponse(BaseModel):
    """Paginated list of AML alerts."""

    items: list[AMLAlertResponse]
    total: int
    page: int
    page_size: int
