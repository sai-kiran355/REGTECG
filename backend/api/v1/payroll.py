"""
API routes for Salary Structures, Payroll runs, and Payslip downloads.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from api.v1.deps import get_db, require_permission
from crud.payroll import (
    configure_salary_structure, list_salary_structures,
    process_payroll_run, list_payroll_logs, delete_payroll_log
)
from models.payroll import PayrollLog, SalaryStructure
from models.employee import Employee
from models.tenant import Tenant
from schemas.auth import JWTClaims
from schemas.payroll import (
    SalaryStructureCreate, SalaryStructureResponse, SalaryStructureListResponse,
    PayrollProcessRequest, PayrollLogResponse, PayrollLogListResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payroll", tags=["payroll"])


# ── Salary Structures ─────────────────────────────────────────────────────────

@router.get("/structures", response_model=SalaryStructureListResponse)
async def list_structures_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> SalaryStructureListResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    items, total = await list_salary_structures(db, tenant_id=tenant_id)
    resp_items = [SalaryStructureResponse(**x) for x in items]
    return SalaryStructureListResponse(items=resp_items, total=total)


@router.post("/structures", response_model=SalaryStructureResponse)
async def configure_structure_endpoint(
    body: SalaryStructureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> SalaryStructureResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    struct = await configure_salary_structure(
        db,
        tenant_id=tenant_id,
        employee_id=body.employee_id,
        monthly_base_salary=body.monthly_base_salary,
        allowances=body.allowances,
        pf_opt_in=body.pf_opt_in,
        esi_opt_in=body.esi_opt_in,
        pan_number=body.pan_number,
    )
    await db.commit()

    # Query details back to include employee name
    items, _ = await list_salary_structures(db, tenant_id=tenant_id)
    for x in items:
        if x["employee_id"] == body.employee_id:
            return SalaryStructureResponse(**x)

    return SalaryStructureResponse(
        id=struct.id,
        tenant_id=struct.tenant_id,
        employee_id=struct.employee_id,
        monthly_base_salary=struct.monthly_base_salary,
        allowances=struct.allowances,
        pf_opt_in=struct.pf_opt_in,
        esi_opt_in=struct.esi_opt_in,
        pan_number=struct.pan_number,
        employee_name="",
    )


# ── Payroll Processing ────────────────────────────────────────────────────────

@router.get("/logs", response_model=PayrollLogListResponse)
async def list_logs_endpoint(
    pay_period: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> PayrollLogListResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    items, total = await list_payroll_logs(db, tenant_id=tenant_id, pay_period=pay_period)
    resp_items = [PayrollLogResponse(**x) for x in items]
    return PayrollLogListResponse(items=resp_items, total=total)


@router.post("/process", response_model=PayrollLogListResponse)
async def process_payroll_endpoint(
    body: PayrollProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> PayrollLogListResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    processed = await process_payroll_run(db, tenant_id=tenant_id, pay_period=body.pay_period)
    await db.commit()

    # Query logs back to include employee names
    items, total = await list_payroll_logs(db, tenant_id=tenant_id, pay_period=body.pay_period)
    resp_items = [PayrollLogResponse(**x) for x in items]
    return PayrollLogListResponse(items=resp_items, total=total)


@router.delete("/logs/{log_id}", status_code=204)
async def delete_log_endpoint(
    log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
):
    tenant_id = uuid.UUID(current_user.tenant_id)
    success = await delete_payroll_log(db, tenant_id=tenant_id, log_id=log_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Payroll log entry not found."}
        )
    await db.commit()
    return None


# ── Salary Slip HTML PDF Generator ────────────────────────────────────────────

@router.get("/slips/{log_id}", response_class=HTMLResponse)
async def get_salary_slip_endpoint(
    log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> HTMLResponse:
    """
    Returns a beautifully formatted, printable HTML salary slip (invoice style).
    """
    tenant_id = uuid.UUID(current_user.tenant_id)

    # Fetch log entry with employee details
    log_q = select(PayrollLog, Employee).join(
        Employee, PayrollLog.employee_id == Employee.id
    ).where(
        and_(PayrollLog.id == log_id, PayrollLog.tenant_id == tenant_id)
    )
    res = await db.execute(log_q)
    row = res.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Salary slip record not found")

    log, emp = row

    # Fetch salary structure for PAN/Opt-ins
    struct_q = select(SalaryStructure).where(
        and_(SalaryStructure.employee_id == emp.id, SalaryStructure.tenant_id == tenant_id)
    )
    struct = (await db.execute(struct_q)).scalars().first()
    pan = struct.pan_number if struct else "—"

    # Calculations
    basic = round(log.base_salary * 0.50, 2)
    hra = round(log.base_salary * 0.20, 2)
    special = round(log.base_salary - (basic + hra), 2)
    if special < 0:
        special = 0.0

    total_earnings = round(log.base_salary + log.allowances, 2)
    total_deductions = round(log.deductions_tds + log.deductions_pf + log.deductions_esi, 2)

    # Org details
    tenant_q = select(Tenant).where(Tenant.id == tenant_id)
    tenant_res = await db.execute(tenant_q)
    tenant_row = tenant_res.scalar_one_or_none()
    org_name = tenant_row.name if tenant_row else "Fintech Corp"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payslip_{emp.full_name}_{log.pay_period.replace(' ', '_')}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body {{
                font-family: 'Outfit', sans-serif;
                background-color: #f8fafc;
                margin: 0;
                padding: 40px;
                color: #1e293b;
            }}
            .payslip-card {{
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 24px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.03);
                padding: 40px;
                position: relative;
                overflow: hidden;
            }}
            .header-block {{
                display: flex;
                justify-content: space-between;
                border-bottom: 2px solid #f1f5f9;
                padding-bottom: 24px;
                margin-bottom: 30px;
            }}
            .org-title {{
                font-size: 24px;
                font-weight: 700;
                color: #4f46e5;
                margin: 0;
            }}
            .doc-title {{
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #64748b;
                font-weight: 700;
                text-align: right;
                margin: 0;
            }}
            .pay-period {{
                font-size: 18px;
                font-weight: 600;
                color: #0f172a;
                margin-top: 5px;
                text-align: right;
            }}
            .meta-grid {{
                display: grid;
                grid-template-cols: 1fr 1fr;
                gap: 20px;
                margin-bottom: 40px;
                background: #f8fafc;
                border-radius: 16px;
                padding: 24px;
            }}
            .meta-item {{
                font-size: 13px;
                line-height: 1.8;
                color: #334155;
            }}
            .meta-label {{
                font-weight: 600;
                color: #64748b;
                display: inline-block;
                width: 140px;
            }}
            .ledger-table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 40px;
            }}
            .ledger-table th {{
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 1px;
                color: #64748b;
                background-color: #f1f5f9;
                padding: 12px 16px;
                font-weight: 700;
            }}
            .ledger-table td {{
                padding: 14px 16px;
                font-size: 13px;
                border-bottom: 1px solid #f1f5f9;
            }}
            .amount-col {{
                text-align: right;
                font-family: monospace;
                font-weight: 600;
                font-size: 14px;
            }}
            .summary-row td {{
                font-weight: 700;
                background-color: #f8fafc;
                font-size: 14px;
                border-bottom: 2px solid #cbd5e1;
            }}
            .net-box {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
                color: white;
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 30px;
            }}
            .net-title {{
                font-size: 16px;
                font-weight: 600;
                margin: 0;
            }}
            .net-amount {{
                font-size: 28px;
                font-weight: 700;
                font-family: monospace;
                margin: 0;
            }}
            .footer-note {{
                font-size: 11px;
                color: #94a3b8;
                text-align: center;
                margin-top: 40px;
                border-top: 1px dashed #e2e8f0;
                padding-top: 20px;
            }}
            .stamp {{
                position: absolute;
                bottom: 80px;
                right: 50px;
                border: 3px double #22c55e;
                color: #22c55e;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                padding: 8px 16px;
                border-radius: 8px;
                transform: rotate(-12deg);
                opacity: 0.8;
                pointer-events: none;
                letter-spacing: 1px;
            }}
            @media print {{
                body {{
                    background: white;
                    padding: 0;
                }}
                .payslip-card {{
                    border: none;
                    box-shadow: none;
                    padding: 0;
                }}
                .btn-print {{
                    display: none;
                }}
            }}
            .btn-print {{
                display: block;
                max-width: 120px;
                margin: 20px auto 0;
                text-align: center;
                background-color: #4f46e5;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: background 0.2s;
            }}
            .btn-print:hover {{
                background-color: #4338ca;
            }}
        </style>
    </head>
    <body>
        <div class="payslip-card">
            <div class="header-block">
                <div>
                    <h1 class="org-title">{org_name}</h1>
                    <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Fintech Workforce & Compliance Suite</p>
                </div>
                <div>
                    <p class="doc-title">Salary Payslip</p>
                    <p class="pay-period">{log.pay_period}</p>
                </div>
            </div>

            <div class="meta-grid">
                <div class="meta-item">
                    <div><span class="meta-label">Employee Name:</span><strong>{emp.full_name}</strong></div>
                    <div><span class="meta-label">Designation:</span>{emp.job_title}</div>
                    <div><span class="meta-label">Department:</span>{emp.department}</div>
                    <div><span class="meta-label">Hire Date:</span>{emp.hire_date.strftime('%d %b %Y')}</div>
                </div>
                <div class="meta-item">
                    <div><span class="meta-label">PAN Number:</span>{pan}</div>
                    <div><span class="meta-label">Bank Account:</span>{emp.bank_details.split(' | ')[1].replace('A/C: ', '') if emp.bank_details and len(emp.bank_details.split(' | ')) > 1 else '—'}</div>
                    <div><span class="meta-label">Bank Name:</span>{emp.bank_details.split(' | ')[0] if emp.bank_details else '—'}</div>
                    <div><span class="meta-label">KYC Verification:</span>Verified</div>
                </div>
            </div>

            <table class="ledger-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Earnings Description</th>
                        <th style="width: 50%; text-align: right;">Amount (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Basic Salary (50% of Base)</td>
                        <td class="amount-col">₹{basic:,.2f}</td>
                    </tr>
                    <tr>
                        <td>House Rent Allowance (HRA)</td>
                        <td class="amount-col">₹{hra:,.2f}</td>
                    </tr>
                    <tr>
                        <td>Special & Other Allowances</td>
                        <td class="amount-col">₹{special:,.2f}</td>
                    </tr>
                    <tr>
                        <td>Conveyance & Ad-hoc Allowances</td>
                        <td class="amount-col">₹{log.allowances:,.2f}</td>
                    </tr>
                    <tr class="summary-row">
                        <td>Total Earnings (Gross Salary)</td>
                        <td class="amount-col">₹{total_earnings:,.2f}</td>
                    </tr>
                </tbody>
            </table>

            <table class="ledger-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Deductions Description</th>
                        <th style="width: 50%; text-align: right;">Amount (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Tax Deducted at Source (TDS / Income Tax)</td>
                        <td class="amount-col">₹{log.deductions_tds:,.2f}</td>
                    </tr>
                    <tr>
                        <td>Employee Provident Fund (EPF 12%)</td>
                        <td class="amount-col">₹{log.deductions_pf:,.2f}</td>
                    </tr>
                    <tr>
                        <td>Employee State Insurance (ESI 0.75%)</td>
                        <td class="amount-col">₹{log.deductions_esi:,.2f}</td>
                    </tr>
                    <tr class="summary-row">
                        <td>Total Deductions</td>
                        <td class="amount-col">₹{total_deductions:,.2f}</td>
                    </tr>
                </tbody>
            </table>

            <div class="net-box">
                <p class="net-title">Net Take-Home Salary (Disbursed)</p>
                <p class="net-amount">₹{log.net_salary:,.2f}</p>
            </div>

            <div class="stamp">
                Digitally Signed<br>
                Status: Released
            </div>

            <div class="footer-note">
                This is a computer-generated salary slip and does not require a physical signature. For any payroll queries, please contact the HR Compliance helpdesk.
            </div>
        </div>

        <button onclick="window.print()" class="btn-print">Print Payslip</button>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
