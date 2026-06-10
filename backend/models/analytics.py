"""
ORM models for Workforce Analytics, Performance Reviews, Headcount Planning, and Attrition Risk.
"""

from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class PerformanceReview(Base):
    """
    Represents performance reviews/ratings history for an employee.
    """

    __tablename__ = "performance_reviews"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    review_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    reviewer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    rating: Mapped[float] = mapped_column(Float, nullable=False, default=3.0)  # e.g., 1.0 to 5.0
    goals_met_pct: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)  # e.g., 0 to 100
    feedback: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Relationship
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821


class HeadcountPlan(Base):
    """
    Represents targets and budget plans for department headcount.
    """

    __tablename__ = "headcount_plans"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    target_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    budget_allocated: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)


class AttritionPrediction(Base):
    """
    Stores AI-simulated and calculated attrition risk predictions for employees.
    """

    __tablename__ = "attrition_predictions"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.employees.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.1)  # 0.0 to 1.0
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="Low")  # "Low", "Medium", "High"
    risk_drivers: Mapped[str | None] = mapped_column(String(500), nullable=True)  # e.g., "Low performance reviews, high absent rate"
    recommendations: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    last_updated: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    # Relationship
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
