"""
Sanctions Screening API endpoints.

Routes:
  GET  /api/v1/sanctions/screenings        — list screenings
  POST /api/v1/sanctions/screen            — run new screening
  GET  /api/v1/sanctions/screenings/{id}   — get screening detail
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.deps import get_db, require_permission
from core.audit import log_action
from crud.sanctions import (
    create_screening,
    get_screening_by_id,
    list_screenings,
)
from schemas.auth import JWTClaims
from schemas.sanctions import (
    SanctionsScreeningListResponse,
    SanctionsScreeningResponse,
    SanctionsScreenRequest,
)

router = APIRouter(prefix="/sanctions", tags=["sanctions"])


@router.get("/screenings", response_model=SanctionsScreeningListResponse)
async def list_screenings_endpoint(
    status: str | None = Query(default=None),
    match_type: str | None = Query(default=None),
    sanctions_list: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("sanctions:read")),
) -> SanctionsScreeningListResponse:
    """List sanctions screenings for the current tenant with optional filters."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    items, total = await list_screenings(
        db=db,
        tenant_id=tenant_id,
        status=status,
        match_type=match_type,
        sanctions_list=sanctions_list,
        page=page,
        page_size=page_size,
    )
    return SanctionsScreeningListResponse(
        items=[SanctionsScreeningResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/screen", response_model=SanctionsScreeningResponse, status_code=201)
async def run_screening_endpoint(
    request: Request,
    body: SanctionsScreenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("sanctions:read")),
) -> SanctionsScreeningResponse:
    """Run a new sanctions screening against the specified watchlist."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    screened_by = uuid.UUID(current_user.sub)

    screening = await create_screening(
        db=db,
        tenant_id=tenant_id,
        entity_name=body.entity_name,
        entity_type=body.entity_type,
        sanctions_list=body.sanctions_list,
        screened_by=screened_by,
    )
    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="sanctions.screen",
        resource_type="sanctions_screening",
        resource_id=str(screening.id),
        details={
            "entity_name": screening.entity_name,
            "sanctions_list": screening.sanctions_list,
            "match_type": screening.match_type,
            "match_score": screening.match_score,
        },
    )
    await db.commit()
    await db.refresh(screening)
    return SanctionsScreeningResponse.model_validate(screening)


@router.get("/screenings/{screening_id}", response_model=SanctionsScreeningResponse)
async def get_screening_endpoint(
    screening_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("sanctions:read")),
) -> SanctionsScreeningResponse:
    """Get a single sanctions screening by ID."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    screening = await get_screening_by_id(db, screening_id, tenant_id)
    if screening is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": f"Sanctions screening '{screening_id}' not found.",
            },
        )
    return SanctionsScreeningResponse.model_validate(screening)
