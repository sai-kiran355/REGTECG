"""
ORM model for the public.roles table.

Roles define named permission sets that can be assigned to users. The four
built-in roles (admin, analyst, auditor, viewer) are seeded during the initial
migration and are flagged with is_builtin=True to prevent modification.
"""

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class Role(Base):
    """
    Represents a role in the RBAC system.

    Columns
    -------
    id          : UUID PK (inherited from Base).
    name        : Unique role name, e.g. 'admin', 'analyst' (max 50 chars).
    is_builtin  : True for the four platform-defined roles that cannot be
                  modified or deleted by any user or tenant configuration.
    created_at  : UTC timestamp set on INSERT (inherited from Base).
    updated_at  : UTC timestamp set on INSERT and updated on every UPDATE
                  (inherited from Base).
    """

    __tablename__ = "roles"
    __table_args__ = {"schema": "public"}

    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )
    is_builtin: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    # Relationships
    permissions: Mapped[list["RolePermission"]] = relationship(  # noqa: F821
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
