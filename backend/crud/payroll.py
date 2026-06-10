"""
CRUD operations for Salary Structures and monthly Payroll Processing.
"""

from __future__ import annotations

import datetime
import uuid

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models.payroll import SalaryStructure, PayrollLog
from models.employee import Employee


# ── Tax slabs calculation ─────────────────────────────────────────────────────

def calculate_monthly_tds(monthly_gross: float) -> float:
    """
    Computes monthly TDS based on standard FY 2025-26 Indian New Tax slabs.
    Annualizes the gross income, computes slab tax, and divides by 12.
    """
    annual_gross = monthly_gross * 12
    annual_tax = 0.0

    if annual_gross <= 300000:
        annual_tax = 0.0
    elif annual_gross <= 600000:
        annual_tax = (annual_gross - 300000) * 0.05
    elif annual_gross <= 900000:
        annual_tax = 15000.0 + (annual_gross - 600000) * 0.10
    elif annual_gross <= 1200000:
        annual_tax = 45000.0 + (annual_gross - 900000) * 0.15
    elif annual_gross <= 1500000:
        annual_tax = 90000.0 + (annual_gross - 1200000) * 0.20
    else:
        annual_tax = 150000.0 + (annual_gross - 1500000) * 0.30

    # Return monthly TDS rounded to two decimals
    return round(annual_tax / 12, 2)


# ── Salary Structure CRUD ──────────────────────────────────────────────────────

async def configure_salary_structure(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID,
    monthly_base_salary: float,
    allowances: float,
    pf_opt_in: bool = True,
    esi_opt_in: bool = True,
    pan_number: str | None = None,
) -> SalaryStructure:
    """
    Create or update an employee's salary structure.
    """
    query = select(SalaryStructure).where(
        and_(
            SalaryStructure.employee_id == employee_id,
            SalaryStructure.tenant_id == tenant_id
        )
    )
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        existing.monthly_base_salary = monthly_base_salary
        existing.allowances = allowances
        existing.pf_opt_in = pf_opt_in
        existing.esi_opt_in = esi_opt_in
        existing.pan_number = pan_number
        await db.flush()
        await db.refresh(existing)
        return existing

    structure = SalaryStructure(
        tenant_id=tenant_id,
        employee_id=employee_id,
        monthly_base_salary=monthly_base_salary,
        allowances=allowances,
        pf_opt_in=pf_opt_in,
        esi_opt_in=esi_opt_in,
        pan_number=pan_number,
    )
    db.add(structure)
    await db.flush()
    await db.refresh(structure)
    return structure


async def list_salary_structures(
    db: AsyncSession,
    tenant_id: uuid.UUID,
) -> tuple[list[dict], int]:
    """
    List employee salary structures under a tenant, joining employee details.
    """
    query = select(SalaryStructure, Employee.full_name).join(
        Employee, SalaryStructure.employee_id == Employee.id
    ).where(SalaryStructure.tenant_id == tenant_id)

    count_q = select(func.count(SalaryStructure.id)).where(SalaryStructure.tenant_id == tenant_id)
    total = (await db.execute(count_q)).scalar_one()

    res = await db.execute(query)
    items = []
    for row in res.all():
        struct, emp_name = row
        items.append({
            "id": struct.id,
            "tenant_id": struct.tenant_id,
            "employee_id": struct.employee_id,
            "monthly_base_salary": struct.monthly_base_salary,
            "allowances": struct.allowances,
            "pf_opt_in": struct.pf_opt_in,
            "esi_opt_in": struct.esi_opt_in,
            "pan_number": struct.pan_number,
            "employee_name": emp_name,
        })
    return items, total


# ── Payroll Logs CRUD ─────────────────────────────────────────────────────────

async def process_payroll_run(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    pay_period: str,
) -> list[PayrollLog]:
    """
    Automated payroll run processing.
    Finds all active employees, checks if they have a configured salary structure,
    calculates PF/ESI/TDS deductions, and inserts payroll logs.
    """
    # Delete any existing processed logs for this period to prevent duplicate runs
    delete_q = select(PayrollLog).where(
        and_(PayrollLog.tenant_id == tenant_id, PayrollLog.pay_period == pay_period)
    )
    existing_logs = (await db.execute(delete_q)).scalars().all()
    for log in existing_logs:
        await db.delete(log)
    await db.flush()

    # Find active employees
    emp_q = select(Employee).where(
        and_(Employee.tenant_id == tenant_id, Employee.status == "active")
    )
    employees = (await db.execute(emp_q)).scalars().all()

    processed_logs = []
    for emp in employees:
        # Fetch salary structure
        struct_q = select(SalaryStructure).where(
            and_(SalaryStructure.employee_id == emp.id, SalaryStructure.tenant_id == tenant_id)
        )
        struct = (await db.execute(struct_q)).scalar_one_or_none()

        if not struct:
            # Skip employees who don't have salary structures configured
            continue

        base_pay = struct.monthly_base_salary
        allowances = struct.allowances
        gross = base_pay + allowances

        # Basic pay is 50% of monthly base
        basic = base_pay * 0.50

        # PF contribution (12% of basic)
        deduction_pf = round(basic * 0.12, 2) if struct.pf_opt_in else 0.0

        # ESI contribution (0.75% of gross, only if gross monthly <= 21,000)
        deduction_esi = round(gross * 0.0075, 2) if (struct.esi_opt_in and gross <= 21000.0) else 0.0

        # Monthly TDS computation
        deduction_tds = calculate_monthly_tds(gross)

        # Net salary computation
        net_pay = round(gross - (deduction_tds + deduction_pf + deduction_esi), 2)

        log = PayrollLog(
            tenant_id=tenant_id,
            employee_id=emp.id,
            pay_period=pay_period,
            base_salary=base_pay,
            allowances=allowances,
            deductions_tds=deduction_tds,
            deductions_pf=deduction_pf,
            deductions_esi=deduction_esi,
            net_salary=net_pay,
            payment_status="processed",
            processed_at=datetime.datetime.utcnow(),
        )
        db.add(log)
        processed_logs.append(log)

    await db.flush()
    return processed_logs


async def list_payroll_logs(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    pay_period: str | None = None,
) -> tuple[list[dict], int]:
    """
    Retrieve processed monthly payroll registers, joining employee details.
    """
    query = select(PayrollLog, Employee.full_name).join(
        Employee, PayrollLog.employee_id == Employee.id
    ).where(PayrollLog.tenant_id == tenant_id)

    count_q = select(func.count(PayrollLog.id)).where(PayrollLog.tenant_id == tenant_id)

    if pay_period:
        query = query.where(PayrollLog.pay_period == pay_period)
        count_q = count_q.where(PayrollLog.pay_period == pay_period)

    total = (await db.execute(count_q)).scalar_one()
    query = query.order_by(PayrollLog.processed_at.desc())

    res = await db.execute(query)
    items = []
    for row in res.all():
        log, emp_name = row
        items.append({
            "id": log.id,
            "tenant_id": log.tenant_id,
            "employee_id": log.employee_id,
            "pay_period": log.pay_period,
            "base_salary": log.base_salary,
            "allowances": log.allowances,
            "deductions_tds": log.deductions_tds,
            "deductions_pf": log.deductions_pf,
            "deductions_esi": log.deductions_esi,
            "net_salary": log.net_salary,
            "payment_status": log.payment_status,
            "processed_at": log.processed_at,
            "employee_name": emp_name,
        })
    return items, total


async def delete_payroll_log(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    log_id: uuid.UUID,
) -> bool:
    """
    Delete a processed payroll record.
    """
    query = select(PayrollLog).where(
        and_(PayrollLog.id == log_id, PayrollLog.tenant_id == tenant_id)
    )
    result = await db.execute(query)
    log = result.scalar_one_or_none()
    if not log:
        return False
    await db.delete(log)
    await db.flush()
    return True
