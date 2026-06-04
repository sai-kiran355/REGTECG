"""
ORM model for the public.role_permissions table.

Each row maps a role to a single permission string (e.g. 'cases:read').
A role's full permission set is the collection of all RolePermission rows
whose role_id matches that role's id.
"""

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class RolePermission(Base):
    """
    Represents a single permission granted to a role.

    Columns
    -------
    id          : UUID PK (inherited from Base).
    role_id     : FK → public.roles.id, CASCADE on delete.
    permission  : Permission string, e.g. 'cases:read', 'kyc:write' (max 100 chars).
    created_at  : UTC timestamp set on INSERT (inherited from Base).
    updated_at  : UTC timestamp set on INSERT and updated on every UPDATE
                  (inherited from Base, present but semantically unused here).
    """

    __tablename__ = "role_permissions"
    __table_args__ = {"schema": "public"}

    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.roles.id", ondelete="CASCADE"),
        nullable=False,
    )
    permission: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # Relationships
    role: Mapped["Role"] = relationship(  # noqa: F821
        "Role",
        back_populates="permissions",
    )
