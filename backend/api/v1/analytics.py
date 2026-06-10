"""
API routes for Workforce Analytics (Attrition, Performance, Headcount, and AI insights).
"""

from __future__ import annotations

import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from api.v1.deps import get_db, require_permission
from schemas.auth import JWTClaims
from models.analytics import PerformanceReview, HeadcountPlan, AttritionPrediction
from models.employee import Employee
from schemas.analytics import (
    PerformanceReviewCreate, PerformanceReviewResponse,
    HeadcountPlanCreate, HeadcountPlanResponse, HeadcountSummaryResponse,
    AttritionPredictionResponse, AIInsightResponse, AnalyticsOverviewResponse
)
from crud.analytics import (
    list_performance_reviews, create_performance_review, delete_performance_review,
    list_headcount_plans, configure_headcount_plan, get_headcount_summary,
    list_attrition_predictions, recalculate_attrition_predictions, get_ai_workforce_insights
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_analytics_overview_endpoint(
    year: int = Query(default=2026),
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> AnalyticsOverviewResponse:
    """
    Get aggregated overview widgets data (average review rating, attrition risk stats, budget indicators).
    """
    tenant_id = uuid.UUID(current_user.tenant_id)

    # 1. Average performance rating
    rating_q = select(func.avg(PerformanceReview.rating)).where(PerformanceReview.tenant_id == tenant_id)
    avg_rating = (await db.execute(rating_q)).scalar() or 0.0

    # 2. Attrition Risk percentages (High risk employees count / total active employees count)
    total_q = select(func.count(Employee.id)).where(
        and_(Employee.tenant_id == tenant_id, Employee.status == "active")
    )
    total_active = (await db.execute(total_q)).scalar() or 0

    high_risk_q = select(func.count(AttritionPrediction.id)).where(
        and_(
            AttritionPrediction.tenant_id == tenant_id,
            AttritionPrediction.risk_level == "High"
        )
    )
    high_risk_count = (await db.execute(high_risk_q)).scalar() or 0
    high_risk_pct = (high_risk_count / total_active * 100) if total_active > 0 else 0.0

    # 3. Headcount Completion rate and Budget summaries
    summary = await get_headcount_summary(db, tenant_id, year=year)
    total_target = sum(s["target_count"] for s in summary)
    total_actual = sum(s["actual_count"] for s in summary)
    total_budget = sum(s["budget_allocated"] for s in summary)
    total_spent = sum(s["budget_spent"] for s in summary)

    completion_pct = (total_actual / total_target * 100) if total_target > 0 else 0.0

    return AnalyticsOverviewResponse(
        avg_rating=round(avg_rating, 2),
        high_risk_pct=round(high_risk_pct, 1),
        headcount_completion_pct=round(completion_pct, 1),
        total_budget=round(total_budget, 2),
        total_spent=round(total_spent, 2),
    )


# ── Performance Reviews Routes ───────────────────────────────────────────────

@router.get("/performance", response_model=list[PerformanceReviewResponse])
async def list_reviews_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> list[PerformanceReviewResponse]:
    """
    List all employee performance review entries.
    """
    tenant_id = uuid.UUID(current_user.tenant_id)
    items = await list_performance_reviews(db, tenant_id)
    return [PerformanceReviewResponse(**x) for x in items]


@router.post("/performance", response_model=PerformanceReviewResponse)
async def create_review_endpoint(
    body: PerformanceReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> PerformanceReviewResponse:
    """
    Submit a new employee performance review.
    """
    tenant_id = uuid.UUID(current_user.tenant_id)
    
    # Verify employee exists
    emp_q = select(Employee).where(and_(Employee.id == body.employee_id, Employee.tenant_id == tenant_id))
    emp = (await db.execute(emp_q)).scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    review = await create_performance_review(
        db,
        tenant_id=tenant_id,
        employee_id=body.employee_id,
        reviewer_name=body.reviewer_name,
        rating=body.rating,
        goals_met_pct=body.goals_met_pct,
        feedback=body.feedback,
    )
    await db.commit()

    # Query details back to include employee details
    reviews = await list_performance_reviews(db, tenant_id)
    for x in reviews:
        if x["employee_id"] == str(body.employee_id) and round(x["rating"], 2) == round(body.rating, 2):
            return PerformanceReviewResponse(**x)

    return PerformanceReviewResponse(
        id=str(review.id),
        tenant_id=str(review.tenant_id),
        employee_id=str(review.employee_id),
        employee_name=emp.full_name,
        department=emp.department,
        review_date=review.review_date.isoformat(),
        reviewer_name=review.reviewer_name,
        rating=review.rating,
        goals_met_pct=review.goals_met_pct,
        feedback=review.feedback,
    )


@router.delete("/performance/{review_id}", status_code=204)
async def delete_review_endpoint(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
):
    """
    Delete a performance review entry.
    """
    tenant_id = uuid.UUID(current_user.tenant_id)
    success = await delete_performance_review(db, tenant_id, review_id)
    if not success:
        raise HTTPException(status_code=404, detail="Performance review not found")
    await db.commit()
    return None


# ── Headcount Plans Routes ───────────────────────────────────────────────────

@router.get("/headcount", response_model=list[HeadcountPlanResponse])
async def list_headcount_plans_endpoint(
    year: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> list[HeadcountPlanResponse]:
    """
    List configured headcount plans.
    """
    tenant_id = uuid.UUID(current_user.tenant_id)
    plans = await list_headcount_plans(db, tenant_id, year=year)
    return [
        HeadcountPlanResponse(
            id=str(p.id),
            tenant_id=str(p.tenant_id),
            department=p.department,
            year=p.year,
            target_count=p.target_count,
            budget_allocated=p.budget_allocated,
        )
        for p in plans
    ]


@router.post("/headcount", response_model=HeadcountPlanResponse)
async def configure_headcount_plan_endpoint(
    body: HeadcountPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> HeadcountPlanResponse:
    """
    Create or update a departmental headcount target plan.
    """
    tenant_id = uuid.UUID(current_user.tenant_id)
    p = await configure_headcount_plan(
        db,
        tenant_id=tenant_id,
        department=body.department,
        year=body.year,
        target_count=body.target_count,
        budget_allocated=body.budget_allocated,
    )
    await db.commit()
    return HeadcountPlanResponse(
        id=str(p.id),
        tenant_id=str(p.tenant_id),
        department=p.department,
        year=p.year,
        target_count=p.target_count,
        budget_allocated=p.budget_allocated,
    )


@router.get("/headcount/summary", response_model=list[HeadcountSummaryResponse])
async def get_headcount_summary_endpoint(
    year: int = Query(default=2026),
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> list[HeadcountSummaryResponse]:
    """
    Get Actual Headcount vs Target headcount plans summary.
    """
    tenant_id = uuid.UUID(current_user.tenant_id)
    summary = await get_headcount_summary(db, tenant_id, year=year)
    return [HeadcountSummaryResponse(**s) for s in summary]


# ── Attrition Predictions Routes ─────────────────────────────────────────────

@router.get("/attrition", response_model=list[AttritionPredictionResponse])
async def list_attrition_predictions_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> list[AttritionPredictionResponse]:
    """
    List all employee attrition predictions.
    """
    tenant_id = uuid.UUID(current_user.tenant_id)
    
    # Auto-initialize/compute if table is empty for the tenant
    check_empty = select(func.count(AttritionPrediction.id)).where(AttritionPrediction.tenant_id == tenant_id)
    count = (await db.execute(check_empty)).scalar() or 0
    if count == 0:
        await recalculate_attrition_predictions(db, tenant_id)
        
    items = await list_attrition_predictions(db, tenant_id)
    return [AttritionPredictionResponse(**x) for x in items]


@router.post("/attrition/recalculate", response_model=list[AttritionPredictionResponse])
async def recalculate_attrition_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> list[AttritionPredictionResponse]:
    """
    Trigger a fresh execution of the Attrition Risk calculation heuristic engine.
    """
    tenant_id = uuid.UUID(current_user.tenant_id)
    await recalculate_attrition_predictions(db, tenant_id)
    items = await list_attrition_predictions(db, tenant_id)
    return [AttritionPredictionResponse(**x) for x in items]


# ── AI Insight Alert Cards ───────────────────────────────────────────────────

@router.get("/ai-insights", response_model=list[AIInsightResponse])
async def get_ai_insights_endpoint(
    year: int = Query(default=2026),
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> list[AIInsightResponse]:
    """
    Get list of AI workforce insights and recommendations.
    """
    tenant_id = uuid.UUID(current_user.tenant_id)
    items = await get_ai_workforce_insights(db, tenant_id, year=year)
    return [AIInsightResponse(**x) for x in items]
