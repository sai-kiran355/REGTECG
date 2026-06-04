"""
ORM model for the tenant_{slug}.users table.

Users belong to a single tenant and are assigned exactly one role. The email
address is unique within a tenant (but the same email may exist across different
tenants). Passwords are stored as bcrypt hashes — never in plaintext.
"""

import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class User(Base):
    """
    Represents an authenticated user within a tenant.

    Columns
    -------
    id              : UUID PK (inherited from Base).
    tenant_id       : FK → public.tenants.id, CASCADE on delete.
    email           : User's email address (RFC 5321, max 254 chars).
                      Unique within the tenant (enforced by UniqueConstraint).
    hashed_password : bcrypt hash of the user's password (max 255 chars).
    role_id         : FK → public.roles.id, RESTRICT on delete (a role cannot
                      be deleted while users are assigned to it).
    created_at      : UTC timestamp set on INSERT (inherited from Base).
    updated_at      : UTC timestamp set on INSERT and updated on every UPDATE
                      (inherited from Base).

    Constraints
    -----------
    uq_users_tenant_email : UNIQUE (tenant_id, email) — the same email address
                            may exist in different tenants but not within one.
    """

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
        {"schema": "public"},
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="",
        server_default="",
    )
    email: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.roles.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(  # noqa: F821
        "Tenant",
        lazy="selectin",
    )
    role: Mapped["Role"] = relationship(  # noqa: F821
        "Role",
        lazy="selectin",
    )
