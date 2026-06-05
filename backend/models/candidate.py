"""
ORM models for candidates and their resume documents.

Candidates apply for Jobs. Each candidate has a pipeline stage,
AI screening score, and an optional uploaded resume stored as bytes.
"""

from __future__ import annotations

import uuid

from sqlalchemy import Float, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class Candidate(Base):
    """
    Represents a job applicant.

    Columns
    -------
    id              : UUID PK (inherited from Base).
    tenant_id       : FK → public.tenants.id, CASCADE on delete.
    job_id          : FK → public.jobs.id, CASCADE on delete.
    full_name       : Candidate's full name.
    email           : Candidate's email address.
    phone           : Candidate's phone number (nullable).
    current_company : Current employer (nullable).
    current_title   : Current job title (nullable).
    experience_years: Years of total experience.
    skills          : Comma-separated or JSON skills string.
    stage           : Pipeline stage — 'applied', 'screening', 'interview',
                      'offer', 'hired', 'rejected'.
    ai_score        : Gemini AI match score 0–100 (nullable until screened).
    ai_summary      : Gemini AI screening summary (nullable).
    notes           : Reviewer notes (nullable).
    source          : Where the candidate came from ('portal', 'linkedin', 'referral', 'other').
    created_at      : UTC timestamp (inherited from Base).
    updated_at      : UTC timestamp (inherited from Base).
    """

    __tablename__ = "candidates"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    current_company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    experience_years: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    stage: Mapped[str] = mapped_column(
        String(20), nullable=False, default="applied", server_default="applied", index=True
    )
    ai_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(
        String(30), nullable=False, default="portal", server_default="portal"
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", foreign_keys=[tenant_id], lazy="selectin")  # noqa: F821
    job: Mapped["Job"] = relationship("Job", back_populates="candidates", lazy="selectin")  # noqa: F821
    resume: Mapped["CandidateResume | None"] = relationship(  # noqa: F821
        "CandidateResume", back_populates="candidate", uselist=False, lazy="selectin"
    )


class CandidateResume(Base):
    """
    Stores the raw resume file bytes for a candidate.
    Kept in a separate table to avoid loading binary data on every candidate query.
    """

    __tablename__ = "candidate_resumes"
    __table_args__ = {"schema": "public"}

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.candidates.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    file_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    # Relationship
    candidate: Mapped["Candidate"] = relationship(  # noqa: F821
        "Candidate", back_populates="resume", lazy="selectin"
    )
