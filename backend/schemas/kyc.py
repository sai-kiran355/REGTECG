"""
Pydantic schemas for KYC Record endpoints.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


DocumentType = Literal["passport", "national_id", "drivers_license"]
KYCStatus = Literal["pending", "in_review", "verified", "rejected"]
KYCRiskLevel = Literal["low", "medium", "high"]


class KYCRecordCreate(BaseModel):
    """Request body for creating a new KYC record."""

    case_id: uuid.UUID | None = None
    full_name: str = Field(..., min_length=1, max_length=255)
    date_of_birth: date
    nationality: str = Field(..., min_length=2, max_length=2)
    document_type: DocumentType
    document_number: str = Field(..., min_length=1, max_length=100)
    risk_level: KYCRiskLevel = "low"
    notes: str | None = Field(default=None, max_length=10000)


class KYCRecordUpdate(BaseModel):
    """Request body for updating a KYC record."""

    case_id: uuid.UUID | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    date_of_birth: date | None = None
    nationality: str | None = Field(default=None, min_length=2, max_length=2)
    document_type: DocumentType | None = None
    document_number: str | None = Field(default=None, min_length=1, max_length=100)
    risk_level: KYCRiskLevel | None = None
    notes: str | None = None


class KYCReviewRequest(BaseModel):
    """Request body for submitting a KYC review decision."""

    status: Literal["verified", "rejected", "in_review"]
    notes: str | None = Field(default=None, max_length=10000)


class KYCRecordResponse(BaseModel):
    """Full KYC record representation returned by the API."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    case_id: uuid.UUID | None
    full_name: str
    date_of_birth: date
    nationality: str
    document_type: str
    document_number: str
    status: str
    risk_level: str
    reviewer_id: uuid.UUID | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class KYCListResponse(BaseModel):
    """Paginated list of KYC records."""

    items: list[KYCRecordResponse]
    total: int
    page: int
    page_size: int
