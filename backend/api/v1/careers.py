"""
Public Careers Portal API — no JWT required.

Routes:
  GET  /api/v1/careers/jobs                    — list open jobs for a company
  GET  /api/v1/careers/jobs/{job_id}           — get job details
  POST /api/v1/careers/jobs/{job_id}/apply     — submit application with resume
  GET  /api/v1/careers/application/{id}/status — check application status
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from crud.recruitment import (
    create_candidate, get_job_by_id, list_jobs, save_resume, update_candidate,
)
from db.session import AsyncSessionLocal
from models.job import Job
from models.candidate import Candidate
from models.tenant import Tenant

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/careers", tags=["careers"])

_ALLOWED_RESUME_MIME = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
_MAX_RESUME_SIZE = 10 * 1024 * 1024  # 10 MB


async def _resolve_fintech_tenant(request: Request):
    """Resolve an active fintech tenant from X-Company-Slug header."""
    slug = request.headers.get("X-Company-Slug", "").strip()
    if not slug:
        raise HTTPException(
            status_code=400,
            detail={"code": "MISSING_COMPANY", "message": "X-Company-Slug header is required."},
        )
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Tenant).where(
                Tenant.slug == slug,
                Tenant.status == "active",
                Tenant.organization_type == "fintech",
            )
        )
        tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(
            status_code=404,
            detail={"code": "COMPANY_NOT_FOUND", "message": f"Company '{slug}' not found."},
        )
    return tenant


class PublicJobResponse(BaseModel):
    id: str
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
    created_at: str


class ApplicationStatusResponse(BaseModel):
    application_id: str
    full_name: str
    job_title: str
    stage: str
    stage_label: str
    submitted_at: str


STAGE_LABELS = {
    "applied":   "Application Received",
    "screening": "Under AI Review",
    "interview": "Interview Scheduled",
    "offer":     "Offer Extended",
    "hired":     "Hired",
    "rejected":  "Not Selected",
}


@router.get("/jobs")
async def list_public_jobs(request: Request) -> dict:
    """List all open jobs for a company. Public endpoint."""
    tenant = await _resolve_fintech_tenant(request)
    async with AsyncSessionLocal() as db:
        jobs, total = await list_jobs(db, tenant.id, status="open", page_size=100)
    return {
        "company": tenant.name,
        "company_slug": tenant.slug,
        "total": total,
        "jobs": [
            PublicJobResponse(
                id=str(j.id),
                title=j.title,
                department=j.department,
                location=j.location,
                employment_type=j.employment_type,
                experience_min=j.experience_min,
                experience_max=j.experience_max,
                salary_min=j.salary_min,
                salary_max=j.salary_max,
                description=j.description,
                requirements=j.requirements,
                status=j.status,
                created_at=j.created_at.isoformat(),
            ).model_dump()
            for j in jobs
        ],
    }


@router.get("/jobs/{job_id}")
async def get_public_job(job_id: uuid.UUID, request: Request) -> dict:
    """Get a single job's details. Public endpoint."""
    tenant = await _resolve_fintech_tenant(request)
    async with AsyncSessionLocal() as db:
        job = await get_job_by_id(db, job_id, tenant.id)
    if not job or job.status not in ("open", "paused"):
        raise HTTPException(
            status_code=404,
            detail={"code": "JOB_NOT_FOUND", "message": "Job not found or no longer accepting applications."},
        )
    return {
        "company": tenant.name,
        "company_slug": tenant.slug,
        "job": PublicJobResponse(
            id=str(job.id),
            title=job.title,
            department=job.department,
            location=job.location,
            employment_type=job.employment_type,
            experience_min=job.experience_min,
            experience_max=job.experience_max,
            salary_min=job.salary_min,
            salary_max=job.salary_max,
            description=job.description,
            requirements=job.requirements,
            status=job.status,
            created_at=job.created_at.isoformat(),
        ).model_dump(),
    }


@router.post("/jobs/{job_id}/apply", status_code=201)
async def apply_for_job(
    job_id: uuid.UUID,
    request: Request,
    # Application fields
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str | None = Form(default=None),
    current_company: str | None = Form(default=None),
    current_title: str | None = Form(default=None),
    experience_years: int = Form(default=0),
    skills: str | None = Form(default=None),
    cover_letter: str | None = Form(default=None),
    resume: UploadFile | None = None,
) -> dict:
    """
    Submit a job application. Public endpoint — no login required.
    Automatically triggers Gemini AI screening if resume is provided.
    """
    tenant = await _resolve_fintech_tenant(request)

    # Validate resume if provided
    resume_data: bytes | None = None
    resume_name: str | None = None
    resume_ct: str | None = None

    if resume:
        content = await resume.read()
        if len(content) > _MAX_RESUME_SIZE:
            raise HTTPException(
                status_code=422,
                detail={"code": "FILE_TOO_LARGE", "message": "Resume must be under 10 MB."},
            )
        ct = resume.content_type or "application/pdf"
        if ct not in _ALLOWED_RESUME_MIME:
            raise HTTPException(
                status_code=422,
                detail={"code": "UNSUPPORTED_FILE_TYPE", "message": "Resume must be PDF or Word document."},
            )
        resume_data = content
        resume_name = resume.filename or "resume.pdf"
        resume_ct = ct

    async with AsyncSessionLocal() as db:
        async with db.begin():
            # Verify job exists and is open
            job = await get_job_by_id(db, job_id, tenant.id)
            if not job or job.status != "open":
                raise HTTPException(
                    status_code=404,
                    detail={"code": "JOB_NOT_FOUND", "message": "This position is no longer accepting applications."},
                )

            # Create candidate
            candidate = await create_candidate(
                db,
                tenant_id=tenant.id,
                job_id=job_id,
                full_name=full_name.strip(),
                email=email.strip().lower(),
                phone=phone,
                current_company=current_company,
                current_title=current_title,
                experience_years=experience_years,
                skills=skills,
                source="portal",
            )

            if cover_letter:
                candidate.notes = f"Cover Letter:\n{cover_letter.strip()}"

            has_resume = False
            if resume_data:
                await save_resume(db, candidate.id, tenant.id, resume_name, resume_ct, resume_data)
                has_resume = True

    # Auto-trigger Gemini AI screening in background if resume uploaded
    if has_resume and resume_data:
        try:
            from api.v1.recruitment import _run_gemini_screening
            result = await _run_gemini_screening(
                resume_bytes=resume_data,
                resume_content_type=resume_ct,
                job_title=job.title,
                job_requirements=job.requirements,
                job_description=job.description,
            )
            async with AsyncSessionLocal() as db:
                async with db.begin():
                    # Refresh candidate
                    from sqlalchemy import select as sa_select
                    cand_result = await db.execute(
                        sa_select(Candidate).where(Candidate.id == candidate.id)
                    )
                    cand = cand_result.scalar_one_or_none()
                    if cand:
                        cand.ai_score = result["score"]
                        cand.ai_summary = result["summary"]
                        cand.stage = "screening"
            logger.info("Auto AI screening completed for candidate %s — score: %s", candidate.id, result["score"])
        except Exception as exc:
            logger.warning("Auto AI screening failed for candidate %s: %s", candidate.id, exc)

    return {
        "application_id": str(candidate.id),
        "reference": str(candidate.id)[:8].upper(),
        "message": f"Your application for '{job.title}' at {tenant.name} has been received. We'll be in touch!",
        "submitted_at": candidate.created_at.isoformat(),
    }


@router.get("/application/{application_id}/status")
async def check_application_status(
    application_id: uuid.UUID,
    request: Request,
) -> ApplicationStatusResponse:
    """Check the status of a submitted application. Public endpoint."""
    tenant = await _resolve_fintech_tenant(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Candidate).where(
                Candidate.id == application_id,
                Candidate.tenant_id == tenant.id,
            )
        )
        candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(
            status_code=404,
            detail={"code": "APPLICATION_NOT_FOUND", "message": "No application found with this ID."},
        )

    return ApplicationStatusResponse(
        application_id=str(candidate.id),
        full_name=candidate.full_name,
        job_title=candidate.job.title if candidate.job else "—",
        stage=candidate.stage,
        stage_label=STAGE_LABELS.get(candidate.stage, candidate.stage),
        submitted_at=candidate.created_at.isoformat(),
    )
