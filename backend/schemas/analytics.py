"""
Pydantic schemas for Workforce Analytics, Performance reviews, and Headcount plans.
"""

from __future__ import annotations

import uuid
from pydantic import BaseModel, Field


class PerformanceReviewCreate(BaseModel):
    employee_id: uuid.UUID
    reviewer_name: str = Field(..., max_length=255)
    rating: float = Field(..., ge=1.0, le=5.0)
    goals_met_pct: float = Field(..., ge=0.0, le=100.0)
    feedback: str | None = Field(default=None, max_length=1000)


class PerformanceReviewResponse(BaseModel):
    id: str
    tenant_id: str
    employee_id: str
    employee_name: str
    department: str
    review_date: str
    reviewer_name: str
    rating: float
    goals_met_pct: float
    feedback: str | None


class HeadcountPlanCreate(BaseModel):
    department: str = Field(..., max_length=100)
    year: int
    target_count: int = Field(..., ge=0)
    budget_allocated: float = Field(..., ge=0.0)


class HeadcountPlanResponse(BaseModel):
    id: str
    tenant_id: str
    department: str
    year: int
    target_count: int
    budget_allocated: float


class HeadcountSummaryResponse(BaseModel):
    department: str
    actual_count: int
    target_count: int
    gap: int
    budget_allocated: float
    budget_spent: float


class AttritionPredictionResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    department: str
    job_title: str
    risk_score: float
    risk_level: str
    risk_drivers: list[str]
    recommendations: str | None
    last_updated: str


class AIInsightResponse(BaseModel):
    id: str
    type: str  # "info", "warning", "danger", "success"
    title: str
    description: str
    department: str


class AnalyticsOverviewResponse(BaseModel):
    avg_rating: float
    high_risk_pct: float
    headcount_completion_pct: float
    total_budget: float
    total_spent: float
