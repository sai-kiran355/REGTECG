"""
Pydantic schemas for Salary Structures and Payroll processing.
"""

from __future__ import annotations

import datetime
import uuid
from pydantic import BaseModel, Field


# ── Salary Structure ──────────────────────────────────────────────────────────

class SalaryStructureCreate(BaseModel):
    employee_id: uuid.UUID
    monthly_base_salary: float = Field(..., ge=0.0)
    allowances: float = Field(0.0, ge=0.0)
    pf_opt_in: bool = True
    esi_opt_in: bool = True
    pan_number: str | None = Field(default=None, max_length=50)


class SalaryStructureResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    employee_id: uuid.UUID
    monthly_base_salary: float
    allowances: float
    pf_opt_in: bool
    esi_opt_in: bool
    pan_number: str | None = None
    employee_name: str | None = None

    model_config = {"from_attributes": True}


class SalaryStructureListResponse(BaseModel):
    items: list[SalaryStructureResponse]
    total: int


# ── Payroll Logs ──────────────────────────────────────────────────────────────

class PayrollProcessRequest(BaseModel):
    pay_period: str = Field(..., min_length=3, max_length=50)  # e.g., "June 2026"


class PayrollLogResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    employee_id: uuid.UUID
    pay_period: str
    base_salary: float
    allowances: float
    deductions_tds: float
    deductions_pf: float
    deductions_esi: float
    net_salary: float
    payment_status: str
    processed_at: datetime.datetime
    employee_name: str | None = None

    model_config = {"from_attributes": True}


class PayrollLogListResponse(BaseModel):
    items: list[PayrollLogResponse]
    total: int
