"""
CRUD helpers for Recruitment ATS — Jobs and Candidates.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.job import Job
from models.candidate import Candidate, CandidateResume


# ── Jobs ──────────────────────────────────────────────────────────────────────

async def create_job(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    created_by: uuid.UUID,
    title: str,
    department: str,
    location: str,
    employment_type: str,
    description: str,
    requirements: str,
    experience_min: int = 0,
    experience_max: int | None = None,
    salary_min: int | None = None,
    salary_max: int | None = None,
    status: str = "open",
) -> Job:
    job = Job(
        tenant_id=tenant_id,
        created_by=created_by,
        title=title,
        department=department,
        location=location,
        employment_type=employment_type,
        description=description,
        requirements=requirements,
        experience_min=experience_min,
        experience_max=experience_max,
        salary_min=salary_min,
        salary_max=salary_max,
        status=status,
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)
    return job


async def get_job_by_id(db: AsyncSession, job_id: uuid.UUID, tenant_id: uuid.UUID) -> Job | None:
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def list_jobs(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    status: str | None = None,
    department: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Job], int]:
    query = select(Job).where(Job.tenant_id == tenant_id)
    count_q = select(func.count(Job.id)).where(Job.tenant_id == tenant_id)

    if status:
        query = query.where(Job.status == status)
        count_q = count_q.where(Job.status == status)
    if department:
        query = query.where(Job.department == department)
        count_q = count_q.where(Job.department == department)

    total = (await db.execute(count_q)).scalar_one()
    offset = (page - 1) * page_size
    query = query.order_by(Job.created_at.desc()).offset(offset).limit(page_size)
    items = list((await db.execute(query)).scalars().all())
    return items, total


async def update_job(db: AsyncSession, job: Job, **kwargs) -> Job:
    for key, value in kwargs.items():
        setattr(job, key, value)
    await db.flush()
    await db.refresh(job)
    return job


async def delete_job(db: AsyncSession, job: Job) -> None:
    await db.delete(job)
    await db.flush()


# ── Candidates ────────────────────────────────────────────────────────────────

async def create_candidate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    job_id: uuid.UUID,
    full_name: str,
    email: str,
    phone: str | None = None,
    current_company: str | None = None,
    current_title: str | None = None,
    experience_years: int = 0,
    skills: str | None = None,
    source: str = "portal",
) -> Candidate:
    candidate = Candidate(
        tenant_id=tenant_id,
        job_id=job_id,
        full_name=full_name,
        email=email,
        phone=phone,
        current_company=current_company,
        current_title=current_title,
        experience_years=experience_years,
        skills=skills,
        stage="applied",
        source=source,
    )
    db.add(candidate)
    await db.flush()
    await db.refresh(candidate)
    return candidate


async def get_candidate_by_id(
    db: AsyncSession, candidate_id: uuid.UUID, tenant_id: uuid.UUID
) -> Candidate | None:
    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id, Candidate.tenant_id == tenant_id
        )
    )
    return result.scalar_one_or_none()


async def list_candidates(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    job_id: uuid.UUID | None = None,
    stage: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Candidate], int]:
    query = select(Candidate).where(Candidate.tenant_id == tenant_id)
    count_q = select(func.count(Candidate.id)).where(Candidate.tenant_id == tenant_id)

    if job_id:
        query = query.where(Candidate.job_id == job_id)
        count_q = count_q.where(Candidate.job_id == job_id)
    if stage:
        query = query.where(Candidate.stage == stage)
        count_q = count_q.where(Candidate.stage == stage)

    total = (await db.execute(count_q)).scalar_one()
    offset = (page - 1) * page_size
    query = query.order_by(Candidate.ai_score.desc().nullslast(), Candidate.created_at.desc()).offset(offset).limit(page_size)
    items = list((await db.execute(query)).scalars().all())
    return items, total


async def update_candidate(db: AsyncSession, candidate: Candidate, **kwargs) -> Candidate:
    for key, value in kwargs.items():
        setattr(candidate, key, value)
    await db.flush()
    await db.refresh(candidate)
    return candidate


async def save_resume(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    tenant_id: uuid.UUID,
    file_name: str,
    content_type: str,
    file_data: bytes,
) -> CandidateResume:
    # Delete existing resume if any
    existing = await db.execute(
        select(CandidateResume).where(CandidateResume.candidate_id == candidate_id)
    )
    old = existing.scalar_one_or_none()
    if old:
        await db.delete(old)

    resume = CandidateResume(
        candidate_id=candidate_id,
        tenant_id=tenant_id,
        file_name=file_name,
        content_type=content_type,
        file_size=len(file_data),
        file_data=file_data,
    )
    db.add(resume)
    await db.flush()
    await db.refresh(resume)
    return resume


async def get_resume(
    db: AsyncSession, candidate_id: uuid.UUID, tenant_id: uuid.UUID
) -> CandidateResume | None:
    result = await db.execute(
        select(CandidateResume).where(
            CandidateResume.candidate_id == candidate_id,
            CandidateResume.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def get_pipeline_stats(
    db: AsyncSession, tenant_id: uuid.UUID, job_id: uuid.UUID | None = None
) -> dict[str, int]:
    """Return count of candidates per stage."""
    query = select(Candidate.stage, func.count(Candidate.id)).where(
        Candidate.tenant_id == tenant_id
    )
    if job_id:
        query = query.where(Candidate.job_id == job_id)
    query = query.group_by(Candidate.stage)
    result = await db.execute(query)
    return {row[0]: row[1] for row in result.all()}
