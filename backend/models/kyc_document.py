"""
ORM model for storing KYC documents directly in PostgreSQL.
No external storage service needed.
"""

from __future__ import annotations

import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class KYCDocument(Base):
    """Stores binary document data (Aadhaar, PAN, selfie) in PostgreSQL."""

    __tablename__ = "kyc_documents"
    __table_args__ = {"schema": "public"}

    kyc_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.kyc_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_data: Mapped[bytes] = mapped_column(LargeBinary(), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer(), nullable=False)
