"""
ORM model for the public.tenants table.

Tenants are the top-level organizational units (banks, fintechs) whose data
is logically isolated within the platform. Each tenant has a unique slug that
is used to derive its dedicated PostgreSQL schema name (tenant_{slug}).
"""

from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class Tenant(Base):
    """
    Represents a tenant (bank or fintech) in the platform.

    Columns
    -------
    id          : UUID PK (inherited from Base)
    slug        : Unique identifier used in schema names and URLs.
                  Must match ^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$ (3–63 chars,
                  lowercase alphanumeric + hyphens, no leading/trailing hyphen).
    name        : Human-readable display name (max 255 chars).
    status      : Lifecycle state — one of 'active', 'inactive', 'suspended'.
    created_at  : UTC timestamp set on INSERT (inherited from Base).
    updated_at  : UTC timestamp set on INSERT and updated on every UPDATE
                  (inherited from Base).
    """

    __tablename__ = "tenants"
    __table_args__ = (
        CheckConstraint(
            r"slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'",
            name="ck_tenants_slug_format",
        ),
        CheckConstraint(
            "status IN ('active', 'inactive', 'suspended')",
            name="ck_tenants_status",
        ),
        {"schema": "public"},
    )

    slug: Mapped[str] = mapped_column(
        String,
        unique=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        server_default="active",
    )
    organization_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="bank",
        server_default="bank",
    )
