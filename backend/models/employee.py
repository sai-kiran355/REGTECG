"""
ORM model for employees.

Employees represent active or onboarding staff members working under a tenant.
"""

from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class Employee(Base):
    """
    Represents an employee of a fintech tenant.

    Columns
    -------
    id            : UUID PK (inherited from Base).
    tenant_id     : FK → public.tenants.id, CASCADE on delete.
    full_name     : Full name.
    email         : Corporate or personal email.
    phone         : Contact number (nullable).
    department    : Department (Engineering, HR, Product, Sales, Marketing, etc.).
    job_title     : Job title.
    status        : 'onboarding', 'active', 'suspended', 'terminated'.
    kyc_status    : 'pending', 'verified', 'flagged'.
    manager_name  : Name of the employee's manager (nullable).
    hire_date     : Date of hiring.
    created_at    : UTC timestamp (inherited from Base).
    updated_at    : UTC timestamp (inherited from Base).
    """

    __tablename__ = "employees"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    job_title: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active", index=True
    )
    kyc_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending", index=True
    )
    manager_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hire_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)

    dob: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bank_details: Mapped[str | None] = mapped_column(String(500), nullable=True)
    education: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    uploaded_docs: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    # Relationship
    tenant: Mapped["Tenant"] = relationship("Tenant", foreign_keys=[tenant_id], lazy="selectin")  # noqa: F821
