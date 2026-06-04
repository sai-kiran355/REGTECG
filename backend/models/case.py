"""
ORM model for the public.cases table.

Cases are the central compliance work items. Each case tracks a subject
(individual or entity) through an AML, KYC, or sanctions workflow.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class Case(Base):
    """
    Represents a compliance case.

    Columns
    -------
    id            : UUID PK (inherited from Base).
    tenant_id     : FK → public.tenants.id, CASCADE on delete.
    case_number   : Human-readable identifier, unique per tenant (e.g. CASE-001).
    subject_name  : Name of the individual or entity under review.
    subject_type  : 'individual' or 'entity'.
    case_type     : 'aml', 'kyc', or 'sanctions'.
    status        : 'open', 'in_review', 'pending', or 'closed'.
    risk_level    : 'low', 'medium', 'high', or 'critical'.
    description   : Free-text description of the case.
    assigned_to   : FK → public.users.id (nullable).
    created_by    : FK → public.users.id.
    created_at    : UTC timestamp set on INSERT (inherited from Base).
    updated_at    : UTC timestamp set on INSERT and updated on every UPDATE
                    (inherited from Base).
    """

    __tablename__ = "cases"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    case_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    subject_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    subject_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    case_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="open",
        server_default="open",
        index=True,
    )
    risk_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="medium",
        server_default="medium",
        index=True,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(  # noqa: F821
        "Tenant",
        foreign_keys=[tenant_id],
        lazy="selectin",
    )
    assignee: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        foreign_keys=[assigned_to],
        lazy="selectin",
    )
    creator: Mapped["User"] = relationship(  # noqa: F821
        "User",
        foreign_keys=[created_by],
        lazy="selectin",
    )
