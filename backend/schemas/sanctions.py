"""
Pydantic schemas for Sanctions Screening endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


EntityType = Literal["individual", "entity"]
SanctionsList = Literal["OFAC_SDN", "EU_SANCTIONS", "UN_SANCTIONS", "HMT"]
MatchType = Literal["confirmed", "possible", "no_match"]
ScreeningStatus = Literal["hit", "review", "clear"]


class SanctionsScreenRequest(BaseModel):
    """Request body for running a new sanctions screening."""

    entity_name: str = Field(..., min_length=1, max_length=255)
    entity_type: EntityType
    sanctions_list: SanctionsList


class SanctionsScreeningResponse(BaseModel):
    """Full sanctions screening representation returned by the API."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    entity_name: str
    entity_type: str
    sanctions_list: str
    match_type: str
    match_score: int
    status: str
    screened_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SanctionsScreeningListResponse(BaseModel):
    """Paginated list of sanctions screenings."""

    items: list[SanctionsScreeningResponse]
    total: int
    page: int
    page_size: int
