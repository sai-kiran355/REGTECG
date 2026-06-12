"""
Cases API endpoints.

Routes:
  GET    /api/v1/cases          — list cases (filter by status, type, risk)
  POST   /api/v1/cases          — create case
  GET    /api/v1/cases/{id}     — get case detail
  PUT    /api/v1/cases/{id}     — update case
  DELETE /api/v1/cases/{id}     — close case
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.deps import get_current_user, get_db, require_permission
from core.audit import log_action
from crud.case import (
    close_case,
    create_case,
    get_case_by_id,
    list_cases,
    update_case,
)
from schemas.auth import JWTClaims
from schemas.case import (
    CaseCreate,
    CaseListResponse,
    CaseResponse,
    CaseUpdate,
)

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=CaseListResponse)
async def list_cases_endpoint(
    request: Request,
    status: str | None = Query(default=None),
    case_type: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> CaseListResponse:
    """List cases for the current tenant with optional filters."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    items, total = await list_cases(
        db=db,
        tenant_id=tenant_id,
        status=status,
        case_type=case_type,
        risk_level=risk_level,
        page=page,
        page_size=page_size,
    )
    return CaseListResponse(
        items=[CaseResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=CaseResponse, status_code=201)
async def create_case_endpoint(
    request: Request,
    body: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> CaseResponse:
    """Create a new compliance case."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    created_by = uuid.UUID(current_user.sub)

    case = await create_case(
        db=db,
        tenant_id=tenant_id,
        created_by=created_by,
        subject_name=body.subject_name,
        subject_type=body.subject_type,
        case_type=body.case_type,
        risk_level=body.risk_level,
        description=body.description,
        assigned_to=body.assigned_to,
    )
    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="case.create",
        resource_type="case",
        resource_id=str(case.id),
        details={"case_number": case.case_number, "case_type": case.case_type},
    )
    await db.commit()
    await db.refresh(case)
    return CaseResponse.model_validate(case)


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case_endpoint(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> CaseResponse:
    """Get a single case by ID."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    case = await get_case_by_id(db, case_id, tenant_id)
    if case is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"Case '{case_id}' not found."},
        )
    return CaseResponse.model_validate(case)


@router.put("/{case_id}", response_model=CaseResponse)
async def update_case_endpoint(
    case_id: uuid.UUID,
    request: Request,
    body: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> CaseResponse:
    """Update an existing case."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    case = await get_case_by_id(db, case_id, tenant_id)
    if case is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"Case '{case_id}' not found."},
        )

    updates = body.model_dump(exclude_unset=True)
    case = await update_case(db, case, **updates)
    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="case.update",
        resource_type="case",
        resource_id=str(case.id),
        details={"updated_fields": list(updates.keys())},
    )
    await db.commit()
    await db.refresh(case)
    return CaseResponse.model_validate(case)


@router.delete("/{case_id}", response_model=CaseResponse)
async def close_case_endpoint(
    case_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> CaseResponse:
    """Close a case (sets status to 'closed')."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    case = await get_case_by_id(db, case_id, tenant_id)
    if case is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"Case '{case_id}' not found."},
        )

    case = await close_case(db, case)
    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="case.close",
        resource_type="case",
        resource_id=str(case.id),
    )
    await db.commit()
    await db.refresh(case)
    return CaseResponse.model_validate(case)


@router.delete("/{case_id}/permanent", status_code=200)
async def delete_case_permanently(
    case_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("admin:users")),
) -> dict:
    """
    Permanently delete a case (admin only).
    Use only for testing/cleanup — real compliance records should not be deleted.
    """
    from sqlalchemy import delete as sql_delete
    from models.case import Case as CaseModel

    tenant_id = uuid.UUID(current_user.tenant_id)
    case = await get_case_by_id(db, case_id, tenant_id)
    if case is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Case not found."})

    await db.execute(sql_delete(CaseModel).where(CaseModel.id == case_id))
    await db.commit()

    await log_action(
        db=db, request=request, current_user=current_user,
        action="case.delete", resource_type="case",
        resource_id=str(case_id),
        details={"case_number": case.case_number, "subject": case.subject_name},
    )
    await db.commit()
    return {"message": f"Case {case.case_number} deleted."}
