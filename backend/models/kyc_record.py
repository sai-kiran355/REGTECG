"""
ORM model for the public.kyc_records table.

KYC records store identity verification data for individuals and entities.
Each record may optionally be linked to a compliance case.
"""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class KYCRecord(Base):
    """
    Represents a Know-Your-Customer identity record.

    Columns
    -------
    id              : UUID PK (inherited from Base).
    tenant_id       : FK → public.tenants.id, CASCADE on delete.
    case_id         : FK → public.cases.id (nullable), SET NULL on delete.
    full_name       : Full legal name of the subject.
    date_of_birth   : Date of birth (ISO 8601 date).
    nationality     : 2-character ISO 3166-1 alpha-2 country code.
    document_type   : 'passport', 'national_id', or 'drivers_license'.
    document_number : Identifier on the document.
    status          : 'pending', 'in_review', 'verified', or 'rejected'.
    risk_level           : 'low', 'medium', or 'high'.
    reviewer_id          : FK → public.users.id (nullable), SET NULL on delete.
    application_purpose  : Purpose of application (e.g. 'loan', 'account_opening') — nullable.
    notes                : Free-text reviewer notes (nullable).
    created_at      : UTC timestamp set on INSERT (inherited from Base).
    updated_at      : UTC timestamp set on INSERT and updated on every UPDATE
                      (inherited from Base).
    """

    __tablename__ = "kyc_records"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.cases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    date_of_birth: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    nationality: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
    )
    document_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    document_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )
    risk_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="low",
        server_default="low",
        index=True,
    )
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    application_purpose: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(  # noqa: F821
        "Tenant",
        foreign_keys=[tenant_id],
        lazy="selectin",
    )
    case: Mapped["Case | None"] = relationship(  # noqa: F821
        "Case",
        foreign_keys=[case_id],
        lazy="selectin",
    )
    reviewer: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        foreign_keys=[reviewer_id],
        lazy="selectin",
    )
