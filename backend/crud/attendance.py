"""
CRUD helpers for Attendance tracking, Leaves, and Shifts.
"""

from __future__ import annotations

import datetime
import uuid
import math

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models.attendance import AttendanceLog, LeaveRequest, ShiftSchedule
from models.employee import Employee

# HQ Coordinates for Bangalore
HQ_LAT = 12.9716
HQ_LON = 77.5946
GEO_FENCE_DEGREE_LIMIT = 0.0025  # Approximately 275 meters


def check_geofence(lat: float | None, lon: float | None) -> str:
    """Check if latitude/longitude is within HQ geofence limit."""
    if lat is None or lon is None:
        return "within_fence"  # Default fallback if location not sent
    dist = math.sqrt((lat - HQ_LAT) ** 2 + (lon - HQ_LON) ** 2)
    return "within_fence" if dist <= GEO_FENCE_DEGREE_LIMIT else "outside_fence"


# ── Attendance CRUD ───────────────────────────────────────────────────────────

async def clock_in_employee(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID,
    latitude: float | None,
    longitude: float | None,
    method: str = "face_recognition",
) -> AttendanceLog:
    # Check if employee has an open check-in today
    now = datetime.datetime.utcnow()
    query = select(AttendanceLog).where(
        and_(
            AttendanceLog.employee_id == employee_id,
            AttendanceLog.tenant_id == tenant_id,
            AttendanceLog.clock_out == None,
        )
    )
    result = await db.execute(query)
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    # Geofencing calculation
    geo_status = check_geofence(latitude, longitude)

    # Determine status (present vs late based on 9:30 AM limit)
    # Note: Using local timezone hours or simple UTC check
    # Let's mock a standard check-in hour limit
    punch_time = now + datetime.timedelta(hours=5, minutes=30)  # IST adjustment
    if punch_time.hour > 9 or (punch_time.hour == 9 and punch_time.minute > 30):
        status = "late"
    else:
        status = "present"

    log = AttendanceLog(
        tenant_id=tenant_id,
        employee_id=employee_id,
        clock_in=now,
        latitude=latitude,
        longitude=longitude,
        geo_status=geo_status,
        method=method,
        status=status,
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def clock_out_employee(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID,
    latitude: float | None,
    longitude: float | None,
) -> AttendanceLog | None:
    # Find active clock-in log
    query = select(AttendanceLog).where(
        and_(
            AttendanceLog.employee_id == employee_id,
            AttendanceLog.tenant_id == tenant_id,
            AttendanceLog.clock_out == None,
        )
    ).order_by(AttendanceLog.clock_in.desc())
    
    result = await db.execute(query)
    log = result.scalar_one_or_none()
    if not log:
        return None

    log.clock_out = datetime.datetime.utcnow()
    if latitude is not None:
        log.latitude = latitude
    if longitude is not None:
        log.longitude = longitude
    
    await db.flush()
    await db.refresh(log)
    return log


async def list_attendance_logs(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 100,
) -> tuple[list[dict], int]:
    query = select(AttendanceLog, Employee.full_name).join(
        Employee, AttendanceLog.employee_id == Employee.id
    ).where(AttendanceLog.tenant_id == tenant_id)

    count_q = select(func.count(AttendanceLog.id)).where(AttendanceLog.tenant_id == tenant_id)

    if employee_id:
        query = query.where(AttendanceLog.employee_id == employee_id)
        count_q = count_q.where(AttendanceLog.employee_id == employee_id)

    total = (await db.execute(count_q)).scalar_one()
    offset = (page - 1) * page_size
    query = query.order_by(AttendanceLog.clock_in.desc()).offset(offset).limit(page_size)

    res = await db.execute(query)
    items = []
    for row in res.all():
        log, emp_name = row
        items.append({
            "id": log.id,
            "tenant_id": log.tenant_id,
            "employee_id": log.employee_id,
            "clock_in": log.clock_in,
            "clock_out": log.clock_out,
            "latitude": log.latitude,
            "longitude": log.longitude,
            "geo_status": log.geo_status,
            "method": log.method,
            "status": log.status,
            "employee_name": emp_name
        })
    return items, total


# ── Leaves CRUD ───────────────────────────────────────────────────────────────

async def create_leave_request(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID,
    leave_type: str,
    start_date: datetime.date,
    end_date: datetime.date,
    reason: str | None = None,
) -> LeaveRequest:
    request = LeaveRequest(
        tenant_id=tenant_id,
        employee_id=employee_id,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status="pending",
    )
    db.add(request)
    await db.flush()
    await db.refresh(request)
    return request


async def update_leave_status(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    request_id: uuid.UUID,
    status: str,
) -> LeaveRequest | None:
    query = select(LeaveRequest).where(
        and_(LeaveRequest.id == request_id, LeaveRequest.tenant_id == tenant_id)
    )
    result = await db.execute(query)
    req = result.scalar_one_or_none()
    if not req:
        return None
    
    req.status = status
    await db.flush()
    await db.refresh(req)
    return req


async def list_leave_requests(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID | None = None,
    status: str | None = None,
) -> tuple[list[dict], int]:
    query = select(LeaveRequest, Employee.full_name).join(
        Employee, LeaveRequest.employee_id == Employee.id
    ).where(LeaveRequest.tenant_id == tenant_id)

    count_q = select(func.count(LeaveRequest.id)).where(LeaveRequest.tenant_id == tenant_id)

    if employee_id:
        query = query.where(LeaveRequest.employee_id == employee_id)
        count_q = count_q.where(LeaveRequest.employee_id == employee_id)
    if status:
        query = query.where(LeaveRequest.status == status)
        count_q = count_q.where(LeaveRequest.status == status)

    total = (await db.execute(count_q)).scalar_one()
    query = query.order_by(LeaveRequest.start_date.desc())
    res = await db.execute(query)
    items = []
    for row in res.all():
        req, emp_name = row
        items.append({
            "id": req.id,
            "tenant_id": req.tenant_id,
            "employee_id": req.employee_id,
            "leave_type": req.leave_type,
            "start_date": req.start_date,
            "end_date": req.end_date,
            "reason": req.reason,
            "status": req.status,
            "employee_name": emp_name
        })
    return items, total


# ── Shifts CRUD ───────────────────────────────────────────────────────────────

async def assign_shift_schedule(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID,
    shift_name: str,
    start_time: str,
    end_time: str,
    day_of_week: str | None = None,
) -> ShiftSchedule:
    # Check if there is already a shift for this employee / day
    query = select(ShiftSchedule).where(
        and_(
            ShiftSchedule.employee_id == employee_id,
            ShiftSchedule.tenant_id == tenant_id,
            ShiftSchedule.day_of_week == day_of_week
        )
    )
    result = await db.execute(query)
    existing = result.scalar_one_or_none()
    if existing:
        existing.shift_name = shift_name
        existing.start_time = start_time
        existing.end_time = end_time
        await db.flush()
        await db.refresh(existing)
        return existing

    sched = ShiftSchedule(
        tenant_id=tenant_id,
        employee_id=employee_id,
        shift_name=shift_name,
        start_time=start_time,
        end_time=end_time,
        day_of_week=day_of_week,
    )
    db.add(sched)
    await db.flush()
    await db.refresh(sched)
    return sched


async def list_shift_schedules(
    db: AsyncSession,
    tenant_id: uuid.UUID,
) -> tuple[list[dict], int]:
    query = select(ShiftSchedule, Employee.full_name).join(
        Employee, ShiftSchedule.employee_id == Employee.id
    ).where(ShiftSchedule.tenant_id == tenant_id)

    count_q = select(func.count(ShiftSchedule.id)).where(ShiftSchedule.tenant_id == tenant_id)
    total = (await db.execute(count_q)).scalar_one()
    
    res = await db.execute(query)
    items = []
    for row in res.all():
        sched, emp_name = row
        items.append({
            "id": sched.id,
            "tenant_id": sched.tenant_id,
            "employee_id": sched.employee_id,
            "shift_name": sched.shift_name,
            "start_time": sched.start_time,
            "end_time": sched.end_time,
            "day_of_week": sched.day_of_week,
            "employee_name": emp_name
        })
    return items, total


async def delete_attendance_log(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    log_id: uuid.UUID,
) -> bool:
    query = select(AttendanceLog).where(
        and_(AttendanceLog.id == log_id, AttendanceLog.tenant_id == tenant_id)
    )
    result = await db.execute(query)
    log = result.scalar_one_or_none()
    if not log:
        return False
    await db.delete(log)
    await db.flush()
    return True


async def delete_shift_schedule(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    shift_id: uuid.UUID,
) -> bool:
    query = select(ShiftSchedule).where(
        and_(ShiftSchedule.id == shift_id, ShiftSchedule.tenant_id == tenant_id)
    )
    result = await db.execute(query)
    sched = result.scalar_one_or_none()
    if not sched:
        return False
    await db.delete(sched)
    await db.flush()
    return True


async def delete_leave_request(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    leave_id: uuid.UUID,
) -> bool:
    query = select(LeaveRequest).where(
        and_(LeaveRequest.id == leave_id, LeaveRequest.tenant_id == tenant_id)
    )
    result = await db.execute(query)
    req = result.scalar_one_or_none()
    if not req:
        return False
    await db.delete(req)
    await db.flush()
    return True
