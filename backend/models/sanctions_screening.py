"""
ORM model for the public.sanctions_screenings table.

Sanctions screenings check individuals and entities against global watchlists
such as OFAC SDN, EU Sanctions, UN Sanctions, and HMT.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class SanctionsScreening(Base):
    """
    Represents a sanctions screening result.

    Columns
    -------
    id             : UUID PK (inherited from Base).
    tenant_id      : FK → public.tenants.id, CASCADE on delete.
    entity_name    : Name of the individual or entity screened.
    entity_type    : 'individual' or 'entity'.
    sanctions_list : Watchlist checked, e.g. 'OFAC_SDN', 'EU_SANCTIONS',
                     'UN_SANCTIONS', 'HMT'.
    match_type     : 'confirmed', 'possible', or 'no_match'.
    match_score    : Integer match confidence score 0–100.
    status         : 'hit', 'review', or 'clear'.
    screened_by    : FK → public.users.id (nullable), SET NULL on delete.
    created_at     : UTC timestamp set on INSERT (inherited from Base).
    updated_at     : UTC timestamp set on INSERT and updated on every UPDATE
                     (inherited from Base).
    """

    __tablename__ = "sanctions_screenings"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
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
    sanctions_list: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    match_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )
    match_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="review",
        server_default="review",
        index=True,
    )
    screened_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(  # noqa: F821
        "Tenant",
        foreign_keys=[tenant_id],
        lazy="selectin",
    )
    screener: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        foreign_keys=[screened_by],
        lazy="selectin",
    )
