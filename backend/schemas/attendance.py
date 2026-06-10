"""
Pydantic schemas for Attendance, Leaves, and Scheduling.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, Field

GeoStatus = Literal["within_fence", "outside_fence"]
AttendanceMethod = Literal["face_recognition", "manual"]
AttendanceStatus = Literal["present", "late", "absent"]
LeaveType = Literal["sick", "casual", "earned"]
LeaveStatus = Literal["pending", "approved", "rejected"]


# ── Attendance ────────────────────────────────────────────────────────────────

class AttendanceClockIn(BaseModel):
    employee_id: uuid.UUID
    latitude: float | None = None
    longitude: float | None = None
    method: AttendanceMethod = "face_recognition"


class AttendanceClockOut(BaseModel):
    employee_id: uuid.UUID
    latitude: float | None = None
    longitude: float | None = None


class AttendanceLogResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    employee_id: uuid.UUID
    clock_in: datetime.datetime
    clock_out: datetime.datetime | None = None
    latitude: float | None = None
    longitude: float | None = None
    geo_status: str | None = None
    method: str
    status: str
    employee_name: str | None = None

    model_config = {"from_attributes": True}


class AttendanceLogListResponse(BaseModel):
    items: list[AttendanceLogResponse]
    total: int


# ── Leaves ────────────────────────────────────────────────────────────────────

class LeaveRequestCreate(BaseModel):
    employee_id: uuid.UUID
    leave_type: LeaveType
    start_date: datetime.date
    end_date: datetime.date
    reason: str | None = Field(default=None, max_length=500)


class LeaveRequestStatusUpdate(BaseModel):
    status: LeaveStatus


class LeaveRequestResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    employee_id: uuid.UUID
    leave_type: str
    start_date: datetime.date
    end_date: datetime.date
    reason: str | None = None
    status: str
    employee_name: str | None = None

    model_config = {"from_attributes": True}


class LeaveRequestListResponse(BaseModel):
    items: list[LeaveRequestResponse]
    total: int


# ── Shift Schedule ────────────────────────────────────────────────────────────

class ShiftScheduleCreate(BaseModel):
    employee_id: uuid.UUID
    shift_name: str = Field(..., min_length=1, max_length=100)
    start_time: str = Field("09:00", max_length=10)
    end_time: str = Field("18:00", max_length=10)
    day_of_week: str | None = Field(default=None, max_length=50)


class ShiftScheduleResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    employee_id: uuid.UUID
    shift_name: str
    start_time: str
    end_time: str
    day_of_week: str | None = None
    employee_name: str | None = None

    model_config = {"from_attributes": True}


class ShiftScheduleListResponse(BaseModel):
    items: list[ShiftScheduleResponse]
    total: int
