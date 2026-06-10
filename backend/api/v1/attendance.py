"""
API endpoints for Attendance tracking, Leaves, and Shifts scheduling.
"""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.deps import get_db, require_permission
from crud.attendance import (
    clock_in_employee, clock_out_employee, list_attendance_logs,
    create_leave_request, update_leave_status, list_leave_requests,
    assign_shift_schedule, list_shift_schedules,
    delete_attendance_log, delete_shift_schedule, delete_leave_request
)
from schemas.auth import JWTClaims
from schemas.attendance import (
    AttendanceClockIn, AttendanceClockOut, AttendanceLogResponse, AttendanceLogListResponse,
    LeaveRequestCreate, LeaveRequestResponse, LeaveRequestStatusUpdate, LeaveRequestListResponse,
    ShiftScheduleCreate, ShiftScheduleResponse, ShiftScheduleListResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["attendance"])


# ── Attendance logs ───────────────────────────────────────────────────────────

@router.get("", response_model=AttendanceLogListResponse)
async def list_attendance_logs_endpoint(
    employee_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> AttendanceLogListResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    items, total = await list_attendance_logs(
        db, tenant_id=tenant_id, employee_id=employee_id, page=page, page_size=page_size
    )
    # Map raw dict list to Pydantic responses
    resp_items = [AttendanceLogResponse(**x) for x in items]
    return AttendanceLogListResponse(items=resp_items, total=total)


@router.post("/clock-in", response_model=AttendanceLogResponse)
async def clock_in_endpoint(
    body: AttendanceClockIn,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> AttendanceLogResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    log = await clock_in_employee(
        db,
        tenant_id=tenant_id,
        employee_id=body.employee_id,
        latitude=body.latitude,
        longitude=body.longitude,
        method=body.method,
    )
    await db.commit()
    
    # We query the details back so employee_name is filled
    items, _ = await list_attendance_logs(db, tenant_id=tenant_id, employee_id=body.employee_id, page=1, page_size=1)
    if items:
        return AttendanceLogResponse(**items[0])
    
    return AttendanceLogResponse(
        id=log.id,
        tenant_id=log.tenant_id,
        employee_id=log.employee_id,
        clock_in=log.clock_in.replace(tzinfo=timezone.utc) if log.clock_in.tzinfo is None else log.clock_in,
        clock_out=log.clock_out.replace(tzinfo=timezone.utc) if (log.clock_out and log.clock_out.tzinfo is None) else log.clock_out,
        latitude=log.latitude,
        longitude=log.longitude,
        geo_status=log.geo_status,
        method=log.method,
        status=log.status,
        employee_name=""
    )


@router.post("/clock-out", response_model=AttendanceLogResponse)
async def clock_out_endpoint(
    body: AttendanceClockOut,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> AttendanceLogResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    log = await clock_out_employee(
        db,
        tenant_id=tenant_id,
        employee_id=body.employee_id,
        latitude=body.latitude,
        longitude=body.longitude,
    )
    if not log:
        raise HTTPException(
            status_code=400,
            detail={"code": "NO_ACTIVE_CLOCK_IN", "message": "No active clock-in log found for this employee today."}
        )
    await db.commit()
    
    items, _ = await list_attendance_logs(db, tenant_id=tenant_id, employee_id=body.employee_id, page=1, page_size=1)
    if items:
        return AttendanceLogResponse(**items[0])
    
    return AttendanceLogResponse(
        id=log.id,
        tenant_id=log.tenant_id,
        employee_id=log.employee_id,
        clock_in=log.clock_in.replace(tzinfo=timezone.utc) if log.clock_in.tzinfo is None else log.clock_in,
        clock_out=log.clock_out.replace(tzinfo=timezone.utc) if (log.clock_out and log.clock_out.tzinfo is None) else log.clock_out,
        latitude=log.latitude,
        longitude=log.longitude,
        geo_status=log.geo_status,
        method=log.method,
        status=log.status,
        employee_name=""
    )


# ── Leave requests ────────────────────────────────────────────────────────────

@router.get("/leaves", response_model=LeaveRequestListResponse)
async def list_leaves_endpoint(
    employee_id: uuid.UUID | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> LeaveRequestListResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    items, total = await list_leave_requests(
        db, tenant_id=tenant_id, employee_id=employee_id, status=status
    )
    resp_items = [LeaveRequestResponse(**x) for x in items]
    return LeaveRequestListResponse(items=resp_items, total=total)


@router.post("/leaves", response_model=LeaveRequestResponse, status_code=201)
async def create_leave_endpoint(
    body: LeaveRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> LeaveRequestResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    req = await create_leave_request(
        db,
        tenant_id=tenant_id,
        employee_id=body.employee_id,
        leave_type=body.leave_type,
        start_date=body.start_date,
        end_date=body.end_date,
        reason=body.reason,
    )
    await db.commit()
    
    items, _ = await list_leave_requests(db, tenant_id=tenant_id, employee_id=body.employee_id)
    # Find matching created ID
    for item in items:
        if item["id"] == req.id:
            return LeaveRequestResponse(**item)
            
    return LeaveRequestResponse(
        id=req.id,
        tenant_id=req.tenant_id,
        employee_id=req.employee_id,
        leave_type=req.leave_type,
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason,
        status=req.status,
        employee_name=""
    )


@router.put("/leaves/{request_id}/status", response_model=LeaveRequestResponse)
async def update_leave_status_endpoint(
    request_id: uuid.UUID,
    body: LeaveRequestStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> LeaveRequestResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    req = await update_leave_status(
        db, tenant_id=tenant_id, request_id=request_id, status=body.status
    )
    if not req:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Leave request not found."}
        )
    await db.commit()
    
    items, _ = await list_leave_requests(db, tenant_id=tenant_id, employee_id=req.employee_id)
    for item in items:
        if item["id"] == req.id:
            return LeaveRequestResponse(**item)
            
    return LeaveRequestResponse(
        id=req.id,
        tenant_id=req.tenant_id,
        employee_id=req.employee_id,
        leave_type=req.leave_type,
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason,
        status=req.status,
        employee_name=""
    )


# ── Shift Schedules ───────────────────────────────────────────────────────────

@router.get("/shifts", response_model=ShiftScheduleListResponse)
async def list_shifts_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> ShiftScheduleListResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    items, total = await list_shift_schedules(db, tenant_id=tenant_id)
    resp_items = [ShiftScheduleResponse(**x) for x in items]
    return ShiftScheduleListResponse(items=resp_items, total=total)


@router.post("/shifts", response_model=ShiftScheduleResponse, status_code=201)
async def assign_shift_endpoint(
    body: ShiftScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> ShiftScheduleResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    sched = await assign_shift_schedule(
        db,
        tenant_id=tenant_id,
        employee_id=body.employee_id,
        shift_name=body.shift_name,
        start_time=body.start_time,
        end_time=body.end_time,
        day_of_week=body.day_of_week,
    )
    await db.commit()
    
    items, _ = await list_shift_schedules(db, tenant_id=tenant_id)
    for item in items:
        if item["id"] == sched.id:
            return ShiftScheduleResponse(**item)
            
    return ShiftScheduleResponse(
        id=sched.id,
        tenant_id=sched.tenant_id,
        employee_id=sched.employee_id,
        shift_name=sched.shift_name,
        start_time=sched.start_time,
        end_time=sched.end_time,
        day_of_week=sched.day_of_week,
        employee_name=""
    )


# ── Deletion routes ───────────────────────────────────────────────────────────

@router.delete("/{log_id}", status_code=204)
async def delete_attendance_log_endpoint(
    log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
):
    tenant_id = uuid.UUID(current_user.tenant_id)
    success = await delete_attendance_log(db, tenant_id=tenant_id, log_id=log_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Attendance log entry not found."}
        )
    await db.commit()
    return None


@router.delete("/shifts/{shift_id}", status_code=204)
async def delete_shift_endpoint(
    shift_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
):
    tenant_id = uuid.UUID(current_user.tenant_id)
    success = await delete_shift_schedule(db, tenant_id=tenant_id, shift_id=shift_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Shift schedule roster not found."}
        )
    await db.commit()
    return None


@router.delete("/leaves/{leave_id}", status_code=204)
async def delete_leave_endpoint(
    leave_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
):
    tenant_id = uuid.UUID(current_user.tenant_id)
    success = await delete_leave_request(db, tenant_id=tenant_id, leave_id=leave_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Leave application not found."}
        )
    await db.commit()
    return None
