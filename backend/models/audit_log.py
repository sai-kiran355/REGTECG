"""
ORM model for the public.audit_logs table.

Audit logs provide an immutable record of all significant actions performed
within the platform. They are append-only — never updated or deleted.
"""

from __future__ import annotations

import uuid

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class AuditLog(Base):
    """
    Represents an immutable audit log entry.

    Columns
    -------
    id             : UUID PK (inherited from Base).
    tenant_id      : FK → public.tenants.id, CASCADE on delete.
    user_id        : FK → public.users.id (nullable), SET NULL on delete.
    user_email     : Email stored at time of action for historical accuracy.
    action         : Dot-notation action string, e.g. 'case.create'.
    resource_type  : Type of resource affected, e.g. 'case', 'kyc_record'.
    resource_id    : UUID or identifier of the affected resource.
    ip_address     : Client IP address (nullable).
    result         : 'success', 'failure', or 'denied'.
    details        : Arbitrary JSON payload with additional context (nullable).
    created_at     : UTC timestamp set on INSERT (inherited from Base).
    updated_at     : UTC timestamp set on INSERT (inherited from Base, unused).

    Note: updated_at is inherited from Base but audit logs are never updated.
    """

    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_email: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
    )
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    resource_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    resource_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )
    result: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="success",
        server_default="success",
    )
    details: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(  # noqa: F821
        "Tenant",
        foreign_keys=[tenant_id],
        lazy="selectin",
    )
    user: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        foreign_keys=[user_id],
        lazy="selectin",
    )
