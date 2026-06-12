"""
AML Alerts API endpoints.

Routes:
  GET  /api/v1/aml/alerts        — list AML alerts
  POST /api/v1/aml/alerts        — create alert
  GET  /api/v1/aml/alerts/{id}   — get alert detail
  PUT  /api/v1/aml/alerts/{id}   — update alert status
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.deps import get_db, require_permission
from core.audit import log_action
from crud.aml import (
    create_aml_alert,
    get_aml_alert_by_id,
    list_aml_alerts,
    update_aml_alert,
    delete_aml_alert,
)
from schemas.aml import (
    AMLAlertCreate,
    AMLAlertListResponse,
    AMLAlertResponse,
    AMLAlertUpdate,
)
from schemas.auth import JWTClaims

router = APIRouter(prefix="/aml", tags=["aml"])


@router.get("/alerts", response_model=AMLAlertListResponse)
async def list_alerts_endpoint(
    status: str | None = Query(default=None),
    alert_type: str | None = Query(default=None),
    case_id: uuid.UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("aml:read")),
) -> AMLAlertListResponse:
    """List AML alerts for the current tenant with optional filters."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    items, total = await list_aml_alerts(
        db=db,
        tenant_id=tenant_id,
        status=status,
        alert_type=alert_type,
        case_id=case_id,
        page=page,
        page_size=page_size,
    )
    return AMLAlertListResponse(
        items=[AMLAlertResponse.model_validate(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/alerts", response_model=AMLAlertResponse, status_code=201)
async def create_alert_endpoint(
    request: Request,
    body: AMLAlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("aml:write")),
) -> AMLAlertResponse:
    """Create a new AML alert."""
    tenant_id = uuid.UUID(current_user.tenant_id)

    alert = await create_aml_alert(
        db=db,
        tenant_id=tenant_id,
        entity_name=body.entity_name,
        entity_type=body.entity_type,
        alert_type=body.alert_type,
        amount=body.amount,
        description=body.description,
        currency=body.currency,
        risk_score=body.risk_score,
        case_id=body.case_id,
    )
    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="aml.create",
        resource_type="aml_alert",
        resource_id=str(alert.id),
        details={"alert_type": alert.alert_type, "risk_score": alert.risk_score},
    )
    await db.commit()
    await db.refresh(alert)
    return AMLAlertResponse.model_validate(alert)


@router.get("/alerts/{alert_id}", response_model=AMLAlertResponse)
async def get_alert_endpoint(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("aml:read")),
) -> AMLAlertResponse:
    """Get a single AML alert by ID."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    alert = await get_aml_alert_by_id(db, alert_id, tenant_id)
    if alert is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"AML alert '{alert_id}' not found."},
        )
    return AMLAlertResponse.model_validate(alert)


@router.put("/alerts/{alert_id}", response_model=AMLAlertResponse)
async def update_alert_endpoint(
    alert_id: uuid.UUID,
    request: Request,
    body: AMLAlertUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("aml:write")),
) -> AMLAlertResponse:
    """Update an AML alert's status or other fields."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    alert = await get_aml_alert_by_id(db, alert_id, tenant_id)
    if alert is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"AML alert '{alert_id}' not found."},
        )

    updates = body.model_dump(exclude_unset=True)
    alert = await update_aml_alert(db, alert, **updates)
    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="aml.update",
        resource_type="aml_alert",
        resource_id=str(alert.id),
        details={"updated_fields": list(updates.keys())},
    )
    await db.commit()
    await db.refresh(alert)
    return AMLAlertResponse.model_validate(alert)


@router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert_endpoint(
    alert_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("aml:write")),
):
    """Delete an AML alert."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    alert = await get_aml_alert_by_id(db, alert_id, tenant_id)
    if alert is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"AML alert '{alert_id}' not found."},
        )

    await delete_aml_alert(db, alert)
    await log_action(
        db=db,
        request=request,
        current_user=current_user,
        action="aml.delete",
        resource_type="aml_alert",
        resource_id=str(alert.id),
        details={"entity_name": alert.entity_name, "alert_type": alert.alert_type},
    )
    await db.commit()
    return None
