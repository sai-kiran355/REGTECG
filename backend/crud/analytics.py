"""
CRUD operations for Performance reviews, Headcount planning, and Attrition risk analysis.
"""

from __future__ import annotations

import datetime
import uuid
from sqlalchemy import select, and_, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.analytics import PerformanceReview, HeadcountPlan, AttritionPrediction
from models.employee import Employee
from models.attendance import AttendanceLog, LeaveRequest
from models.payroll import SalaryStructure


# ── Performance Reviews CRUD ──────────────────────────────────────────────────

async def list_performance_reviews(db: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    """
    List all performance reviews with employee details, sorted by date descending.
    """
    q = (
        select(PerformanceReview, Employee)
        .join(Employee, PerformanceReview.employee_id == Employee.id)
        .where(PerformanceReview.tenant_id == tenant_id)
        .order_by(PerformanceReview.review_date.desc())
    )
    res = await db.execute(q)
    results = []
    for review, emp in res.all():
        results.append({
            "id": str(review.id),
            "tenant_id": str(review.tenant_id),
            "employee_id": str(review.employee_id),
            "employee_name": emp.full_name,
            "department": emp.department,
            "review_date": review.review_date.isoformat(),
            "reviewer_name": review.reviewer_name,
            "rating": review.rating,
            "goals_met_pct": review.goals_met_pct,
            "feedback": review.feedback,
        })
    return results


async def create_performance_review(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID,
    reviewer_name: str,
    rating: float,
    goals_met_pct: float,
    feedback: str | None,
) -> PerformanceReview:
    """
    Create a new performance review record.
    """
    review = PerformanceReview(
        tenant_id=tenant_id,
        employee_id=employee_id,
        review_date=datetime.date.today(),
        reviewer_name=reviewer_name,
        rating=rating,
        goals_met_pct=goals_met_pct,
        feedback=feedback,
    )
    db.add(review)
    return review


async def delete_performance_review(db: AsyncSession, tenant_id: uuid.UUID, review_id: uuid.UUID) -> bool:
    """
    Delete a performance review record.
    """
    q = delete(PerformanceReview).where(
        and_(PerformanceReview.id == review_id, PerformanceReview.tenant_id == tenant_id)
    )
    res = await db.execute(q)
    return res.rowcount > 0


# ── Headcount Plans CRUD ───────────────────────────────────────────────────────

async def list_headcount_plans(db: AsyncSession, tenant_id: uuid.UUID, year: int | None = None) -> list[HeadcountPlan]:
    """
    List headcount plan targets for a tenant.
    """
    q = select(HeadcountPlan).where(HeadcountPlan.tenant_id == tenant_id)
    if year is not None:
        q = q.where(HeadcountPlan.year == year)
    res = await db.execute(q)
    return list(res.scalars().all())


async def configure_headcount_plan(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    department: str,
    year: int,
    target_count: int,
    budget_allocated: float,
) -> HeadcountPlan:
    """
    Configure headcount plan targets (insert or update).
    """
    q = select(HeadcountPlan).where(
        and_(
            HeadcountPlan.tenant_id == tenant_id,
            HeadcountPlan.department == department,
            HeadcountPlan.year == year,
        )
    )
    res = await db.execute(q)
    plan = res.scalars().first()
    if plan:
        plan.target_count = target_count
        plan.budget_allocated = budget_allocated
    else:
        plan = HeadcountPlan(
            tenant_id=tenant_id,
            department=department,
            year=year,
            target_count=target_count,
            budget_allocated=budget_allocated,
        )
        db.add(plan)
    return plan


async def get_headcount_summary(db: AsyncSession, tenant_id: uuid.UUID, year: int) -> list[dict]:
    """
    Get Actual Headcount vs Targets with Budget summary for all departments.
    """
    # 1. Fetch target plans
    plans_q = select(HeadcountPlan).where(
        and_(HeadcountPlan.tenant_id == tenant_id, HeadcountPlan.year == year)
    )
    plans_res = await db.execute(plans_q)
    plans = plans_res.scalars().all()
    plan_map = {p.department: p for p in plans}

    # 2. Fetch actual employee counts grouped by department
    emp_q = (
        select(Employee.department, func.count(Employee.id))
        .where(and_(Employee.tenant_id == tenant_id, Employee.status == "active"))
        .group_by(Employee.department)
    )
    emp_res = await db.execute(emp_q)
    actual_map = {dept: count for dept, count in emp_res.all()}

    # 3. Calculate budget spent per department (using SalaryStructure monthly salaries * 12)
    budget_q = (
        select(Employee.department, func.sum(SalaryStructure.monthly_base_salary + SalaryStructure.allowances))
        .join(SalaryStructure, Employee.id == SalaryStructure.employee_id)
        .where(and_(Employee.tenant_id == tenant_id, Employee.status == "active"))
        .group_by(Employee.department)
    )
    budget_res = await db.execute(budget_q)
    budget_spent_map = {dept: float(total or 0.0) * 12 for dept, total in budget_res.all()}

    # Merge departments
    all_depts = sorted(list(set(list(plan_map.keys()) + list(actual_map.keys()) + list(budget_spent_map.keys()))))
    summary = []
    for dept in all_depts:
        p = plan_map.get(dept)
        target = p.target_count if p else 0
        budget = p.budget_allocated if p else 0.0
        actual = actual_map.get(dept, 0)
        spent = budget_spent_map.get(dept, 0.0)
        
        summary.append({
            "department": dept,
            "actual_count": actual,
            "target_count": target,
            "gap": target - actual,
            "budget_allocated": budget,
            "budget_spent": spent,
        })
        
    return summary


# ── Attrition Predictions CRUD & Logic ────────────────────────────────────────

async def list_attrition_predictions(db: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    """
    List attrition predictions with employee details.
    """
    q = (
        select(AttritionPrediction, Employee)
        .join(Employee, AttritionPrediction.employee_id == Employee.id)
        .where(AttritionPrediction.tenant_id == tenant_id)
        .order_by(AttritionPrediction.risk_score.desc())
    )
    res = await db.execute(q)
    results = []
    for pred, emp in res.all():
        results.append({
            "id": str(pred.id),
            "employee_id": str(pred.employee_id),
            "employee_name": emp.full_name,
            "department": emp.department,
            "job_title": emp.job_title,
            "risk_score": pred.risk_score,
            "risk_level": pred.risk_level,
            "risk_drivers": pred.risk_drivers.split(", ") if pred.risk_drivers else [],
            "recommendations": pred.recommendations,
            "last_updated": pred.last_updated.isoformat(),
        })
    return results


async def recalculate_attrition_predictions(db: AsyncSession, tenant_id: uuid.UUID) -> list[AttritionPrediction]:
    """
    Run the AI/heuristic risk calculation engine for all active employees.
    """
    # 1. Fetch active employees
    employees_q = select(Employee).where(
        and_(Employee.tenant_id == tenant_id, Employee.status == "active")
    )
    employees = (await db.execute(employees_q)).scalars().all()

    # 2. Get department average salaries to evaluate salary competitiveness
    salary_q = (
        select(Employee.department, func.avg(SalaryStructure.monthly_base_salary + SalaryStructure.allowances))
        .join(SalaryStructure, Employee.id == SalaryStructure.employee_id)
        .where(and_(Employee.tenant_id == tenant_id, Employee.status == "active"))
        .group_by(Employee.department)
    )
    salary_res = await db.execute(salary_q)
    dept_avg_salaries = {dept: float(val or 0.0) for dept, val in salary_res.all()}

    predictions = []
    today = datetime.date.today()
    thirty_days_ago = today - datetime.timedelta(days=30)

    for emp in employees:
        score = 0.10  # Baseline risk: 10%
        drivers = []

        # Indicator A: Performance Rating
        review_q = (
            select(PerformanceReview.rating)
            .where(and_(PerformanceReview.employee_id == emp.id, PerformanceReview.tenant_id == tenant_id))
            .order_by(PerformanceReview.review_date.desc())
            .limit(1)
        )
        latest_rating = (await db.execute(review_q)).scalars().first()
        if latest_rating is not None:
            if latest_rating < 3.0:
                score += 0.30
                drivers.append("Low Performance Rating")
            elif latest_rating >= 4.5:
                score -= 0.15
        
        # Indicator B: Attendance Issues (late clocks in last 30 days)
        late_q = select(func.count(AttendanceLog.id)).where(
            and_(
                AttendanceLog.employee_id == emp.id,
                AttendanceLog.tenant_id == tenant_id,
                AttendanceLog.status == "late",
                AttendanceLog.clock_in >= thirty_days_ago,
            )
        )
        late_count = (await db.execute(late_q)).scalar() or 0
        if late_count >= 3:
            score += 0.15
            drivers.append("Frequent Tardiness")

        # Indicator C: Absent/Leave rate in last 30 days
        leave_q = select(func.count(LeaveRequest.id)).where(
            and_(
                LeaveRequest.employee_id == emp.id,
                LeaveRequest.tenant_id == tenant_id,
                LeaveRequest.status != "rejected",
                LeaveRequest.start_date >= thirty_days_ago,
            )
        )
        leave_count = (await db.execute(leave_q)).scalar() or 0
        if leave_count >= 3:
            score += 0.20
            drivers.append("Frequent Leaves")

        # Indicator D: Low Salary Competitiveness
        struct_q = select(SalaryStructure).where(
            and_(SalaryStructure.employee_id == emp.id, SalaryStructure.tenant_id == tenant_id)
        )
        struct = (await db.execute(struct_q)).scalars().first()
        if struct:
            gross = struct.monthly_base_salary + struct.allowances
            dept_avg = dept_avg_salaries.get(emp.department, 0.0)
            if dept_avg > 0 and gross < (dept_avg * 0.85):
                score += 0.15
                drivers.append("Low Salary Competitiveness")

        # Indicator E: Tenure Risk
        tenure_days = (today - emp.hire_date).days
        if tenure_days < 180:  # < 6 months
            score += 0.10
            drivers.append("Recent Hire (Early Onboarding)")
        elif tenure_days > 540:  # > 1.5 years
            # Stagnation factor: if high tenure with no 4.5+ ratings
            if latest_rating is None or latest_rating < 3.8:
                score += 0.15
                drivers.append("High Tenure (Career Fatigue)")

        # Indicator F: KYC Compliance Flagged
        if emp.kyc_status == "flagged":
            score += 0.20
            drivers.append("Flagged KYC Compliance Status")

        # Bounds checking
        score = max(0.05, min(0.95, score))

        # Risk Level Labeling
        if score < 0.35:
            level = "Low"
            recs = "Maintain regular touchpoints. Provide career learning channels."
        elif score <= 0.70:
            level = "Medium"
            recs = "Conduct a proactive one-on-one wellness check. Review salary benchmarks and workload."
        else:
            level = "High"
            recs = "Immediate manager intervention recommended. Discuss retention bonuses, role progression, or work hours adjustments."

        # Update or Insert Attrition Record
        pred_q = select(AttritionPrediction).where(
            and_(AttritionPrediction.employee_id == emp.id, AttritionPrediction.tenant_id == tenant_id)
        )
        pred = (await db.execute(pred_q)).scalars().first()
        if pred:
            pred.risk_score = round(score, 2)
            pred.risk_level = level
            pred.risk_drivers = ", ".join(drivers) if drivers else "None"
            pred.recommendations = recs
            pred.last_updated = datetime.datetime.utcnow()
        else:
            pred = AttritionPrediction(
                tenant_id=tenant_id,
                employee_id=emp.id,
                risk_score=round(score, 2),
                risk_level=level,
                risk_drivers=", ".join(drivers) if drivers else "None",
                recommendations=recs,
            )
            db.add(pred)
        
        predictions.append(pred)

    await db.commit()
    return predictions


# ── AI Insights recommendations ───────────────────────────────────────────────

async def get_ai_workforce_insights(db: AsyncSession, tenant_id: uuid.UUID, year: int) -> list[dict]:
    """
    Generate tactical AI suggestions and alerts based on current headcount targets and attrition predictions.
    """
    insights = []

    # 1. Fetch Headcount Gaps
    h_summary = await get_headcount_summary(db, tenant_id, year)
    for h in h_summary:
        dept = h["department"]
        gap = h["gap"]
        target = h["target_count"]
        actual = h["actual_count"]
        
        if target > 0:
            pct = (actual / target) * 100
            if pct >= 100:
                insights.append({
                    "id": str(uuid.uuid4()),
                    "type": "info",
                    "title": f"{dept} Plan Target Reached",
                    "description": f"Actual headcount ({actual}) meets or exceeds the target plan ({target}). Consider halting new job openings in this department.",
                    "department": dept,
                })
            elif pct < 50:
                insights.append({
                    "id": str(uuid.uuid4()),
                    "type": "warning",
                    "title": f"{dept} Severe Headcount Deficit",
                    "description": f"Currently operating at {actual}/{target} ({pct:.0f}%) of target headcount. Accelerated sourcing and ATS pipeline runs are recommended.",
                    "department": dept,
                })

    # 2. Fetch Attrition risks
    predictions_q = (
        select(AttritionPrediction, Employee)
        .join(Employee, AttritionPrediction.employee_id == Employee.id)
        .where(and_(AttritionPrediction.tenant_id == tenant_id, AttritionPrediction.risk_level == "High"))
    )
    high_risks = (await db.execute(predictions_q)).all()
    for pred, emp in high_risks:
        insights.append({
            "id": str(uuid.uuid4()),
            "type": "danger",
            "title": f"High Attrition Risk: {emp.full_name}",
            "description": f"Risk score is {int(pred.risk_score * 100)}% due to: {pred.risk_drivers}. Intervention: {pred.recommendations}",
            "department": emp.department,
        })

    # 3. Overall Talent density rating
    rating_q = select(func.avg(PerformanceReview.rating)).where(PerformanceReview.tenant_id == tenant_id)
    avg_rating = (await db.execute(rating_q)).scalar()
    if avg_rating:
        insights.append({
            "id": str(uuid.uuid4()),
            "type": "success",
            "title": f"High Talent Density: {avg_rating:.2f}/5.00 Average",
            "description": "The overall workforce performance score is excellent. Focus on retention programs to maintain talent density.",
            "department": "All",
        })
    else:
        insights.append({
            "id": str(uuid.uuid4()),
            "type": "info",
            "title": "Awaiting Performance Cycle data",
            "description": "Establish regular performance reviews on the Performance tab to generate talent density analytics.",
            "department": "All",
        })

    return insights
