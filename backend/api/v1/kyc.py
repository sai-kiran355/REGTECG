"""
KYC Records API endpoints.

Routes:
  GET    /api/v1/kyc              — list KYC records
  POST   /api/v1/kyc              — create KYC record
  GET    /api/v1/kyc/{id}         — get KYC detail
  PUT    /api/v1/kyc/{id}         — update KYC record
  POST   /api/v1/kyc/{id}/review  — submit review decision
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.deps import get_db, require_permission
from core.audit import log_action
from crud.kyc import (
    create_kyc_record,
    get_kyc_record_by_id,
    list_kyc_records,
    review_kyc_record,
    update_kyc_record,
)
from schemas.auth import JWTClaims
from schemas.kyc import (
    KYCListResponse,
    KYCRecordCreate,
    KYCRecordResponse,
    KYCRecordUpdate,
    KYCReviewRequest,
)

router = APIRouter(prefix="/kyc", tags=["kyc"])


@router.get("", response_model=KYCListResponse)
async def list_kyc_endpoint(
    status: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    case_id: uuid.UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("kyc:read")),
) -> KYCListResponse:
    """List KYC records for the current tenant with optional filters."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    items, total = await list_kyc_records(
        db=db,
        tenant_id=tenant_id,
        status=status,
        risk_level=risk_level,
        case_id=case_id,
        page=page,
        page_size=page_size,
    )
    return KYCListResponse(
        items=[KYCRecordResponse.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=KYCRecordResponse, status_code=201)
async def create_kyc_endpoint(
    request: Request,
    body: KYCRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("kyc:write")),
) -> KYCRecordResponse:
    """Create a new KYC record."""
    tenant_id = uuid.UUID(current_user.tenant_id)

    record = await create_kyc_record(
        db=db,
        tenant_id=tenant_id,
        full_name=body.full_name,
        date_of_birth=body.date_of_birth,
        nationality=body.nationality,
        document_type=body.document_type,
        document_number=body.document_number,
        risk_level=body.risk_level,
        case_id=body.case_id,
        notes=body.notes,
    )
    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="kyc.create",
        resource_type="kyc_record",
        resource_id=str(record.id),
        details={"full_name": record.full_name, "document_type": record.document_type},
    )
    await db.commit()
    await db.refresh(record)
    return KYCRecordResponse.model_validate(record)


@router.get("/{record_id}", response_model=KYCRecordResponse)
async def get_kyc_endpoint(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("kyc:read")),
) -> KYCRecordResponse:
    """Get a single KYC record by ID."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    record = await get_kyc_record_by_id(db, record_id, tenant_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"KYC record '{record_id}' not found."},
        )
    return KYCRecordResponse.model_validate(record)


@router.put("/{record_id}", response_model=KYCRecordResponse)
async def update_kyc_endpoint(
    record_id: uuid.UUID,
    request: Request,
    body: KYCRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("kyc:write")),
) -> KYCRecordResponse:
    """Update an existing KYC record."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    record = await get_kyc_record_by_id(db, record_id, tenant_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"KYC record '{record_id}' not found."},
        )

    updates = body.model_dump(exclude_unset=True)
    record = await update_kyc_record(db, record, **updates)
    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="kyc.update",
        resource_type="kyc_record",
        resource_id=str(record.id),
        details={"updated_fields": list(updates.keys())},
    )
    await db.commit()
    await db.refresh(record)
    return KYCRecordResponse.model_validate(record)


@router.post("/{record_id}/review", response_model=KYCRecordResponse)
async def review_kyc_endpoint(
    record_id: uuid.UUID,
    request: Request,
    body: KYCReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("kyc:write")),
) -> KYCRecordResponse:
    """Submit a review decision on a KYC record."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    record = await get_kyc_record_by_id(db, record_id, tenant_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"KYC record '{record_id}' not found."},
        )

    reviewer_id = uuid.UUID(current_user.sub)
    record = await review_kyc_record(
        db=db,
        record=record,
        reviewer_id=reviewer_id,
        status=body.status,
        notes=body.notes,
    )
    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="kyc.review",
        resource_type="kyc_record",
        resource_id=str(record.id),
        details={"decision": body.status},
    )
    await db.commit()
    await db.refresh(record)
    return KYCRecordResponse.model_validate(record)


@router.delete("/{record_id}/permanent", status_code=200)
async def delete_kyc_permanently(
    record_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("admin:users")),
) -> dict:
    """Permanently delete a KYC record (admin only — for testing/cleanup)."""
    from sqlalchemy import delete as sql_delete
    from models.kyc_record import KYCRecord as KYCModel
    from models.kyc_document import KYCDocument

    tenant_id = uuid.UUID(current_user.tenant_id)
    record = await get_kyc_record_by_id(db, record_id, tenant_id)
    if record is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "KYC record not found."})

    name = record.full_name
    # Delete documents first (FK constraint)
    await db.execute(sql_delete(KYCDocument).where(KYCDocument.kyc_record_id == record_id))
    await db.execute(sql_delete(KYCModel).where(KYCModel.id == record_id))
    await db.commit()

    await log_action(
        db=db, request=request, current_user=current_user,
        action="kyc.delete", resource_type="kyc_record",
        resource_id=str(record_id), details={"full_name": name},
    )
    await db.commit()
    return {"message": f"KYC record for {name} deleted."}
