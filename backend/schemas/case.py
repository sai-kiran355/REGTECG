"""
Pydantic schemas for Case endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


SubjectType = Literal["individual", "entity"]
CaseType = Literal["aml", "kyc", "sanctions"]
CaseStatus = Literal["open", "in_review", "pending", "closed"]
RiskLevel = Literal["low", "medium", "high", "critical"]


class CaseCreate(BaseModel):
    """Request body for creating a new case."""

    subject_name: str = Field(..., min_length=1, max_length=255)
    subject_type: SubjectType
    case_type: CaseType
    risk_level: RiskLevel = "medium"
    description: str | None = Field(default=None, max_length=10000)
    assigned_to: uuid.UUID | None = None


class CaseUpdate(BaseModel):
    """Request body for updating an existing case."""

    subject_name: str | None = Field(default=None, min_length=1, max_length=255)
    subject_type: SubjectType | None = None
    case_type: CaseType | None = None
    status: CaseStatus | None = None
    risk_level: RiskLevel | None = None
    description: str | None = None
    assigned_to: uuid.UUID | None = None


class CaseResponse(BaseModel):
    """Full case representation returned by the API."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    case_number: str
    subject_name: str
    subject_type: str
    case_type: str
    status: str
    risk_level: str
    description: str | None
    assigned_to: uuid.UUID | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CaseListResponse(BaseModel):
    """Paginated list of cases."""

    items: list[CaseResponse]
    total: int
    page: int
    page_size: int
