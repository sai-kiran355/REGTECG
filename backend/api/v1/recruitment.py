"""
Recruitment & ATS API — Jobs and Candidates management with Gemini AI screening.

Routes:
  GET    /api/v1/recruitment/jobs                       — list jobs
  POST   /api/v1/recruitment/jobs                       — create job
  GET    /api/v1/recruitment/jobs/{id}                  — get job
  PUT    /api/v1/recruitment/jobs/{id}                  — update job
  DELETE /api/v1/recruitment/jobs/{id}                  — delete job

  GET    /api/v1/recruitment/jobs/{job_id}/candidates   — list candidates for a job
  POST   /api/v1/recruitment/jobs/{job_id}/candidates   — add candidate (with optional resume)
  GET    /api/v1/recruitment/candidates/{id}            — get candidate
  PUT    /api/v1/recruitment/candidates/{id}/stage      — move candidate pipeline stage
  POST   /api/v1/recruitment/candidates/{id}/screen     — trigger Gemini AI screening
  GET    /api/v1/recruitment/candidates/{id}/resume     — download resume
  GET    /api/v1/recruitment/pipeline                   — pipeline stats across all jobs
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.deps import get_db, require_permission
from crud.recruitment import (
    create_job, get_job_by_id, list_jobs, update_job, delete_job,
    create_candidate, get_candidate_by_id, list_candidates,
    update_candidate, save_resume, get_resume, get_pipeline_stats,
)
from schemas.auth import JWTClaims
from schemas.recruitment import (
    JobCreate, JobUpdate, JobResponse, JobListResponse,
    CandidateCreate, CandidateStageUpdate, CandidateResponse,
    CandidateListResponse, PipelineStats, AIScreeningResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recruitment", tags=["recruitment"])

_ALLOWED_RESUME_MIME = {"application/pdf", "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
_MAX_RESUME_SIZE = 10 * 1024 * 1024  # 10 MB


def _job_to_response(job, candidate_count: int = 0) -> JobResponse:
    return JobResponse(
        id=job.id,
        tenant_id=job.tenant_id,
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
        created_by=job.created_by,
        candidate_count=candidate_count,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def _candidate_to_response(candidate, has_resume: bool = False) -> CandidateResponse:
    return CandidateResponse(
        id=candidate.id,
        tenant_id=candidate.tenant_id,
        job_id=candidate.job_id,
        full_name=candidate.full_name,
        email=candidate.email,
        phone=candidate.phone,
        current_company=candidate.current_company,
        current_title=candidate.current_title,
        experience_years=candidate.experience_years,
        skills=candidate.skills,
        stage=candidate.stage,
        ai_score=candidate.ai_score,
        ai_summary=candidate.ai_summary,
        notes=candidate.notes,
        source=candidate.source,
        has_resume=has_resume,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
    )


# ── Jobs ──────────────────────────────────────────────────────────────────────

@router.get("/jobs", response_model=JobListResponse)
async def list_jobs_endpoint(
    status: str | None = None,
    department: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> JobListResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    jobs, total = await list_jobs(db, tenant_id, status=status, department=department,
                                   page=page, page_size=page_size)
    items = []
    for job in jobs:
        _, cnt = await list_candidates(db, tenant_id, job_id=job.id, page=1, page_size=1)
        items.append(_job_to_response(job, cnt))
    return JobListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/jobs", response_model=JobResponse, status_code=201)
async def create_job_endpoint(
    body: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> JobResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    created_by = uuid.UUID(current_user.sub)
    job = await create_job(
        db, tenant_id=tenant_id, created_by=created_by,
        title=body.title, department=body.department, location=body.location,
        employment_type=body.employment_type, description=body.description,
        requirements=body.requirements, experience_min=body.experience_min,
        experience_max=body.experience_max, salary_min=body.salary_min,
        salary_max=body.salary_max, status=body.status,
    )
    await db.commit()
    await db.refresh(job)
    return _job_to_response(job)


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job_endpoint(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> JobResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    job = await get_job_by_id(db, job_id, tenant_id)
    if not job:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Job not found."})
    _, cnt = await list_candidates(db, tenant_id, job_id=job_id, page=1, page_size=1)
    return _job_to_response(job, cnt)


@router.put("/jobs/{job_id}", response_model=JobResponse)
async def update_job_endpoint(
    job_id: uuid.UUID,
    body: JobUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> JobResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    job = await get_job_by_id(db, job_id, tenant_id)
    if not job:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Job not found."})
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    job = await update_job(db, job, **updates)
    await db.commit()
    await db.refresh(job)
    _, cnt = await list_candidates(db, tenant_id, job_id=job_id, page=1, page_size=1)
    return _job_to_response(job, cnt)


@router.delete("/jobs/{job_id}", status_code=200)
async def delete_job_endpoint(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> dict:
    tenant_id = uuid.UUID(current_user.tenant_id)
    job = await get_job_by_id(db, job_id, tenant_id)
    if not job:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Job not found."})
    await delete_job(db, job)
    await db.commit()
    return {"message": "Job deleted."}


# ── Candidates ────────────────────────────────────────────────────────────────

@router.get("/jobs/{job_id}/candidates", response_model=CandidateListResponse)
async def list_candidates_endpoint(
    job_id: uuid.UUID,
    stage: str | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> CandidateListResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    job = await get_job_by_id(db, job_id, tenant_id)
    if not job:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Job not found."})
    candidates, total = await list_candidates(db, tenant_id, job_id=job_id, stage=stage,
                                               page=page, page_size=page_size)
    items = [_candidate_to_response(c, has_resume=c.resume is not None) for c in candidates]
    return CandidateListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/jobs/{job_id}/candidates", response_model=CandidateResponse, status_code=201)
async def add_candidate_endpoint(
    job_id: uuid.UUID,
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str | None = Form(default=None),
    current_company: str | None = Form(default=None),
    current_title: str | None = Form(default=None),
    experience_years: int = Form(default=0),
    skills: str | None = Form(default=None),
    source: str = Form(default="portal"),
    resume: UploadFile | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> CandidateResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    job = await get_job_by_id(db, job_id, tenant_id)
    if not job:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Job not found."})

    resume_data: bytes | None = None
    resume_name: str | None = None
    resume_ct: str | None = None

    if resume:
        content = await resume.read()
        if len(content) > _MAX_RESUME_SIZE:
            raise HTTPException(status_code=422, detail={"code": "FILE_TOO_LARGE", "message": "Resume must be under 10 MB."})
        ct = resume.content_type or ""
        if ct not in _ALLOWED_RESUME_MIME:
            raise HTTPException(status_code=422, detail={"code": "UNSUPPORTED_FILE_TYPE", "message": "Resume must be PDF or Word document."})
        resume_data = content
        resume_name = resume.filename or "resume.pdf"
        resume_ct = ct

    has_resume = False
    candidate = await create_candidate(
        db, tenant_id=tenant_id, job_id=job_id,
        full_name=full_name.strip(), email=email.strip().lower(),
        phone=phone, current_company=current_company,
        current_title=current_title, experience_years=experience_years,
        skills=skills, source=source,
    )
    if resume_data:
        await save_resume(db, candidate.id, tenant_id, resume_name, resume_ct, resume_data)
        has_resume = True
    await db.commit()
    await db.refresh(candidate)

    return _candidate_to_response(candidate, has_resume=has_resume)


@router.get("/candidates/{candidate_id}", response_model=CandidateResponse)
async def get_candidate_endpoint(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> CandidateResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    candidate = await get_candidate_by_id(db, candidate_id, tenant_id)
    if not candidate:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Candidate not found."})
    return _candidate_to_response(candidate, has_resume=candidate.resume is not None)


@router.put("/candidates/{candidate_id}/stage", response_model=CandidateResponse)
async def update_stage_endpoint(
    candidate_id: uuid.UUID,
    body: CandidateStageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> CandidateResponse:
    tenant_id = uuid.UUID(current_user.tenant_id)
    candidate = await get_candidate_by_id(db, candidate_id, tenant_id)
    if not candidate:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Candidate not found."})
    updates: dict = {"stage": body.stage}
    if body.notes is not None:
        updates["notes"] = body.notes
    candidate = await update_candidate(db, candidate, **updates)
    await db.commit()
    await db.refresh(candidate)
    return _candidate_to_response(candidate, has_resume=candidate.resume is not None)


@router.post("/candidates/{candidate_id}/screen", response_model=AIScreeningResponse)
async def screen_candidate_endpoint(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> AIScreeningResponse:
    """
    Trigger Gemini AI screening for a candidate against their job's requirements.
    Requires the candidate to have an uploaded resume.
    """
    tenant_id = uuid.UUID(current_user.tenant_id)
    candidate = await get_candidate_by_id(db, candidate_id, tenant_id)
    if not candidate:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Candidate not found."})

    if not candidate.resume:
        raise HTTPException(
            status_code=422,
            detail={"code": "NO_RESUME", "message": "Upload a resume first before running AI screening."},
        )

    job = candidate.job
    resume_bytes = candidate.resume.file_data
    resume_ct = candidate.resume.content_type

    # Call Gemini AI
    try:
        result = await _run_gemini_screening(
            resume_bytes=resume_bytes,
            resume_content_type=resume_ct,
            job_title=job.title,
            job_requirements=job.requirements,
            job_description=job.description,
        )
    except Exception as exc:
        logger.error("Gemini screening failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail={"code": "AI_ERROR", "message": "AI screening service unavailable. Please try again."},
        )

    # Persist score and summary
    await update_candidate(
        db, candidate,
        ai_score=result["score"],
        ai_summary=result["summary"],
        stage="screening" if candidate.stage == "applied" else candidate.stage,
    )
    await db.commit()

    return AIScreeningResponse(
        candidate_id=candidate_id,
        score=result["score"],
        summary=result["summary"],
        strengths=result["strengths"],
        gaps=result["gaps"],
        recommendation=result["recommendation"],
    )


@router.get("/candidates/{candidate_id}/resume")
async def download_resume_endpoint(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> Response:
    tenant_id = uuid.UUID(current_user.tenant_id)
    resume = await get_resume(db, candidate_id, tenant_id)
    if not resume:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "No resume found."})
    return Response(
        content=resume.file_data,
        media_type=resume.content_type,
        headers={"Content-Disposition": f'inline; filename="{resume.file_name}"'},
    )


@router.get("/pipeline", response_model=PipelineStats)
async def pipeline_stats_endpoint(
    job_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> PipelineStats:
    tenant_id = uuid.UUID(current_user.tenant_id)
    stats = await get_pipeline_stats(db, tenant_id, job_id=job_id)
    return PipelineStats(
        applied=stats.get("applied", 0),
        screening=stats.get("screening", 0),
        interview=stats.get("interview", 0),
        offer=stats.get("offer", 0),
        hired=stats.get("hired", 0),
        rejected=stats.get("rejected", 0),
    )


# ── Gemini AI screening ───────────────────────────────────────────────────────

async def _run_gemini_screening(
    resume_bytes: bytes,
    resume_content_type: str,
    job_title: str,
    job_requirements: str,
    job_description: str,
) -> dict:
    """
    Call Google Gemini to screen a resume against a job.
    Returns a dict with score, summary, strengths, gaps, recommendation.
    """
    import base64
    import json
    import os
    import httpx

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")

    # Encode resume as base64
    resume_b64 = base64.b64encode(resume_bytes).decode("utf-8")
    mime = resume_content_type if resume_content_type in ("application/pdf",) else "application/pdf"

    prompt = f"""You are an expert technical recruiter and talent acquisition specialist.

Analyze the attached resume for the following job position:

JOB TITLE: {job_title}

JOB DESCRIPTION:
{job_description[:2000]}

REQUIREMENTS:
{job_requirements[:2000]}

Please evaluate the candidate and respond in STRICT JSON format with no additional text:

{{
  "score": <number 0-100 representing overall match percentage>,
  "summary": "<2-3 sentence professional summary of the candidate's fit>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "recommendation": "<one of: strong_yes, yes, maybe, no>"
}}

Be objective, specific, and base your assessment only on what is in the resume vs the requirements."""

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime,
                            "data": resume_b64,
                        }
                    },
                    {"text": prompt},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1024,
        },
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()

    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    raw_text = raw_text.strip()

    result = json.loads(raw_text)

    # Validate and clamp score
    score = max(0.0, min(100.0, float(result.get("score", 0))))
    recommendation = result.get("recommendation", "maybe")
    if recommendation not in ("strong_yes", "yes", "maybe", "no"):
        recommendation = "maybe"

    return {
        "score": round(score, 1),
        "summary": str(result.get("summary", "")),
        "strengths": list(result.get("strengths", [])),
        "gaps": list(result.get("gaps", [])),
        "recommendation": recommendation,
    }
