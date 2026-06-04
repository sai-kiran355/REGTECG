"""Applicant (customer) account model for self-service portal login."""

from __future__ import annotations
import uuid
from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.base import Base


class ApplicantAccount(Base):
    __tablename__ = "applicant_accounts"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    tenant: Mapped["Tenant"] = relationship("Tenant", foreign_keys=[tenant_id], lazy="selectin")
