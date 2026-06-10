"""
ORM models for Salary Structure and Payroll Logs.
"""

from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class SalaryStructure(Base):
    """
    Stores individual monthly base salary and compliance configs for employees.
    """

    __tablename__ = "salary_structures"
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
        unique=True,
        index=True,
    )
    monthly_base_salary: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    allowances: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    pf_opt_in: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    esi_opt_in: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    pan_number: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821


class PayrollLog(Base):
    """
    Persists historical processed payroll registers and payslip line items.
    """

    __tablename__ = "payroll_logs"
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
    pay_period: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # "June 2026"
    base_salary: Mapped[float] = mapped_column(Float, nullable=False)
    allowances: Mapped[float] = mapped_column(Float, nullable=False)
    deductions_tds: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    deductions_pf: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    deductions_esi: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    net_salary: Mapped[float] = mapped_column(Float, nullable=False)
    payment_status: Mapped[str] = mapped_column(String(20), default="processed")  # "processed", "pending", "failed"
    processed_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
