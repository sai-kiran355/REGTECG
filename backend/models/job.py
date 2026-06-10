"""
ORM model for the public.jobs table.

Jobs represent open positions posted by a fintech tenant.
Each job has a title, department, description, requirements,
and tracks its hiring pipeline status.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class Job(Base):
    """
    Represents a job posting.

    Columns
    -------
    id              : UUID PK (inherited from Base).
    tenant_id       : FK → public.tenants.id, CASCADE on delete.
    title           : Job title (e.g. 'Senior Python Developer').
    department      : Department name (e.g. 'Engineering').
    location        : Location string (e.g. 'Mumbai', 'Remote').
    employment_type : 'full_time', 'part_time', 'contract', 'internship'.
    experience_min  : Minimum years of experience required.
    experience_max  : Maximum years of experience (nullable).
    salary_min      : Minimum salary (INR, nullable).
    salary_max      : Maximum salary (INR, nullable).
    description     : Full job description (rich text / markdown).
    requirements    : Required skills and qualifications.
    status          : 'draft', 'open', 'paused', 'closed'.
    created_by      : FK → public.users.id.
    created_at      : UTC timestamp (inherited from Base).
    updated_at      : UTC timestamp (inherited from Base).
    """

    __tablename__ = "jobs"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str] = mapped_column(String(100), nullable=False, default="Remote")
    employment_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="full_time", server_default="full_time"
    )
    experience_min: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    experience_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="open", server_default="open", index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", foreign_keys=[tenant_id], lazy="selectin")  # noqa: F821
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by], lazy="selectin")  # noqa: F821
    candidates: Mapped[list["Candidate"]] = relationship("Candidate", back_populates="job", lazy="selectin", cascade="all, delete-orphan", passive_deletes=True)  # noqa: F821
