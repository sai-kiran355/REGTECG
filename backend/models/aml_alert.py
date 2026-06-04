"""
ORM model for the public.aml_alerts table.

AML alerts are generated when suspicious transaction patterns are detected.
Each alert may optionally be linked to a compliance case.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class AMLAlert(Base):
    """
    Represents an Anti-Money Laundering alert.

    Columns
    -------
    id            : UUID PK (inherited from Base).
    tenant_id     : FK → public.tenants.id, CASCADE on delete.
    case_id       : FK → public.cases.id (nullable), SET NULL on delete.
    entity_name   : Name of the individual or entity flagged.
    entity_type   : 'individual' or 'entity'.
    alert_type    : One of 'structuring', 'layering', 'unusual_pattern',
                    'high_risk_country', 'cash_intensive', 'round_tripping'.
    amount        : Transaction amount (15 digits, 2 decimal places).
    currency      : ISO 4217 currency code (default 'USD').
    risk_score    : Integer risk score 0–100.
    status        : 'open', 'in_review', 'closed', or 'false_positive'.
    description   : Free-text description of the alert.
    created_at    : UTC timestamp set on INSERT (inherited from Base).
    updated_at    : UTC timestamp set on INSERT and updated on every UPDATE
                    (inherited from Base).
    """

    __tablename__ = "aml_alerts"
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
    entity_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    alert_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    amount: Mapped[float] = mapped_column(
        Numeric(15, 2),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD",
        server_default="USD",
    )
    risk_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="open",
        server_default="open",
        index=True,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
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
