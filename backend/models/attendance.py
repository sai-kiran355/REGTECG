"""
ORM models for Attendance tracking, Leave management, and Shift scheduling.
"""

from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Date, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class AttendanceLog(Base):
    """
    Represents a daily clock-in/clock-out attendance entry for an employee.
    """

    __tablename__ = "attendance_logs"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    clock_in: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    clock_out: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    geo_status: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "within_fence", "outside_fence"
    method: Mapped[str] = mapped_column(String(50), default="face_recognition")  # "face_recognition", "manual"
    status: Mapped[str] = mapped_column(String(50), default="present")  # "present", "late", "absent"

    # Relationship
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821


class LeaveRequest(Base):
    """
    Represents a leave request submitted by or for an employee.
    """

    __tablename__ = "leave_requests"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    leave_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "sick", "casual", "earned"
    start_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # "pending", "approved", "rejected"

    # Relationship
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821


class ShiftSchedule(Base):
    """
    Represents shift work schedules assigned to employees.
    """

    __tablename__ = "shift_schedules"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    shift_name: Mapped[str] = mapped_column(String(100), nullable=False)  # "Morning Shift", "Night Shift", "General Shift"
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)  # "09:00"
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)  # "18:00"
    day_of_week: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationship
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
