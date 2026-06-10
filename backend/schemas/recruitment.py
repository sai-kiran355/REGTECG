"""
Pydantic schemas for Recruitment ATS endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

EmploymentType = Literal["full_time", "part_time", "contract", "internship"]
JobStatus = Literal["draft", "open", "paused", "closed"]
CandidateStage = Literal["applied", "screening", "interview", "offer", "hired", "rejected"]
CandidateSource = Literal["portal", "linkedin", "referral", "job_board", "other"]


# ── Job schemas ───────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    department: str = Field(..., min_length=1, max_length=100)
    location: str = Field(default="Remote", max_length=100)
    employment_type: EmploymentType = "full_time"
    experience_min: int = Field(default=0, ge=0, le=40)
    experience_max: int | None = Field(default=None, ge=0, le=40)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    description: str = Field(..., min_length=10, max_length=50000)
    requirements: str = Field(..., min_length=10, max_length=20000)
    status: JobStatus = "open"


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    department: str | None = Field(default=None, min_length=1, max_length=100)
    location: str | None = Field(default=None, max_length=100)
    employment_type: EmploymentType | None = None
    experience_min: int | None = Field(default=None, ge=0, le=40)
    experience_max: int | None = Field(default=None, ge=0, le=40)
    salary_min: int | None = None
    salary_max: int | None = None
    description: str | None = Field(default=None, min_length=10, max_length=50000)
    requirements: str | None = Field(default=None, min_length=10, max_length=20000)
    status: JobStatus | None = None


class JobResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    title: str
    department: str
    location: str
    employment_type: str
    experience_min: int
    experience_max: int | None
    salary_min: int | None
    salary_max: int | None
    description: str
    requirements: str
    status: str
    created_by: uuid.UUID
    candidate_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    items: list[JobResponse]
    total: int
    page: int
    page_size: int


# ── Candidate schemas ─────────────────────────────────────────────────────────

class CandidateCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    current_company: str | None = Field(default=None, max_length=255)
    current_title: str | None = Field(default=None, max_length=255)
    experience_years: int = Field(default=0, ge=0, le=50)
    skills: str | None = Field(default=None, max_length=2000)
    source: CandidateSource = "portal"


class CandidateStageUpdate(BaseModel):
    stage: CandidateStage
    notes: str | None = Field(default=None, max_length=5000)


class CandidateResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    job_id: uuid.UUID
    full_name: str
    email: str
    phone: str | None
    current_company: str | None
    current_title: str | None
    experience_years: int
    skills: str | None
    stage: str
    ai_score: float | None
    ai_summary: str | None
    notes: str | None
    source: str
    has_resume: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CandidateListResponse(BaseModel):
    items: list[CandidateResponse]
    total: int
    page: int
    page_size: int


class PipelineStats(BaseModel):
    applied: int = 0
    screening: int = 0
    interview: int = 0
    offer: int = 0
    hired: int = 0
    rejected: int = 0


class AIScreeningResponse(BaseModel):
    candidate_id: uuid.UUID
    score: float
    summary: str
    strengths: list[str]
    gaps: list[str]
    recommendation: Literal["strong_yes", "yes", "maybe", "no"]


# ── Employee schemas ──────────────────────────────────────────────────────────

from datetime import date

EmployeeStatus = Literal["onboarding", "active", "suspended", "terminated"]
KYCStatus = Literal["pending", "verified", "flagged"]

class EmployeeCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    department: str = Field(..., min_length=1, max_length=100)
    job_title: str = Field(..., min_length=1, max_length=100)
    status: EmployeeStatus = "active"
    kyc_status: KYCStatus = "pending"
    manager_name: str | None = Field(default=None, max_length=255)
    hire_date: date | None = None


class EmployeeUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    department: str | None = Field(default=None, min_length=1, max_length=100)
    job_title: str | None = Field(default=None, min_length=1, max_length=100)
    status: EmployeeStatus | None = None
    kyc_status: KYCStatus | None = None
    manager_name: str | None = Field(default=None, max_length=255)
    hire_date: date | None = None


class EmployeeResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    full_name: str
    email: str
    phone: str | None
    department: str
    job_title: str
    status: str
    kyc_status: str
    manager_name: str | None
    hire_date: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmployeeListResponse(BaseModel):
    items: list[EmployeeResponse]
    total: int
    page: int
    page_size: int


class EmployeeStatusStats(BaseModel):
    total: int = 0
    active: int = 0
    onboarding: int = 0
    flagged: int = 0

