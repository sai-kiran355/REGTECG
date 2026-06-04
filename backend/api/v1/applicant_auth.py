"""
Applicant (customer) authentication endpoints.

Routes:
  POST /api/v1/applicant/signup           — register a new applicant account
  POST /api/v1/applicant/login            — sign in as an applicant
  GET  /api/v1/applicant/me              — get current applicant profile
  PUT  /api/v1/applicant/me              — update name
  PUT  /api/v1/applicant/me/password     — change password
  PUT  /api/v1/applicant/me/email        — change email
  GET  /api/v1/applicant/applications    — list applicant's own KYC applications
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings
from core.redis import REFRESH_PREFIX, get_redis
from core.security import hash_password, verify_password
from db.session import AsyncSessionLocal
from models.applicant_account import ApplicantAccount
from models.kyc_record import KYCRecord
from models.case import Case

import redis.asyncio as aioredis

router = APIRouter(prefix="/applicant", tags=["applicant"])
settings = Settings()

APPLICANT_PREFIX = "applicant_refresh:"


@router.get("/banks", response_model=list[dict])
async def list_active_banks() -> list[dict]:
    """Public endpoint — list all active banks/fintechs for the customer dropdown."""
    async with AsyncSessionLocal() as db:
        from models.tenant import Tenant
        result = await db.execute(
            select(Tenant).where(Tenant.status == "active").order_by(Tenant.name)
        )
        tenants = result.scalars().all()
    return [{"slug": t.slug, "name": t.name} for t in tenants]


class ApplicantSignupRequest(BaseModel):
    tenant_slug: str = Field(..., description="Your bank's identifier (e.g. demo-bank)")
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    mobile: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=8, max_length=128)


class ApplicantLoginRequest(BaseModel):
    tenant_slug: str
    email: EmailStr
    password: str


class ApplicantTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    applicant_id: str
    full_name: str
    email: str


class ApplicantProfileResponse(BaseModel):
    id: str
    full_name: str
    email: str
    mobile: str | None
    tenant_slug: str
    created_at: str


class UpdateApplicantProfileRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)


class ChangeApplicantPasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangeApplicantEmailRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_email: EmailStr


def _create_applicant_token(applicant_id: str, tenant_id: str) -> str:
    """Create a simple JWT for applicant using the same SECRET_KEY."""
    from jose import jwt
    import uuid
    now = int(datetime.now(timezone.utc).timestamp())
    payload = {
        "sub": applicant_id,
        "tenant_id": tenant_id,
        "role": "applicant",
        "type": "applicant",
        "iat": now,
        "exp": now + 60 * 60 * 24,  # 24 hour TTL for applicants
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def _decode_applicant_token(request: Request) -> dict:
    """Decode and validate an applicant JWT from the Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED", "message": "Login required."})
    token = auth.split(" ", 1)[1]
    try:
        from jose import jwt as _jwt
        claims = _jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if claims.get("type") != "applicant":
            raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED"})
        return claims
    except Exception:
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN", "message": "Token is invalid or expired."})


async def _resolve_tenant(slug: str):
    async with AsyncSessionLocal() as session:
        from models.tenant import Tenant
        result = await session.execute(
            select(Tenant).where(Tenant.slug == slug, Tenant.status == "active")
        )
        return result.scalar_one_or_none()


@router.post("/signup", response_model=ApplicantTokenResponse, status_code=201)
async def applicant_signup(
    body: ApplicantSignupRequest,
    redis: aioredis.Redis = Depends(get_redis),
) -> ApplicantTokenResponse:
    """Register a new applicant account and return auth tokens."""
    tenant = await _resolve_tenant(body.tenant_slug)
    if not tenant:
        raise HTTPException(status_code=404, detail={"code": "TENANT_NOT_FOUND", "message": f"Bank '{body.tenant_slug}' not found."})

    async with AsyncSessionLocal() as db:
        async with db.begin():
            # Check email not taken
            existing = await db.execute(
                select(ApplicantAccount).where(
                    ApplicantAccount.tenant_id == tenant.id,
                    ApplicantAccount.email == body.email,
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=409, detail={"code": "EMAIL_EXISTS", "message": "An account with this email already exists."})

            account = ApplicantAccount(
                tenant_id=tenant.id,
                email=body.email,
                hashed_password=hash_password(body.password),
                full_name=body.full_name,
                mobile=body.mobile,
            )
            db.add(account)
            await db.flush()
            await db.refresh(account)

            access_token = _create_applicant_token(str(account.id), str(tenant.id))
            refresh_token = secrets.token_hex(32)
            await redis.setex(
                f"{APPLICANT_PREFIX}{refresh_token}",
                settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
                str(account.id),
            )

        return ApplicantTokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            applicant_id=str(account.id),
            full_name=account.full_name,
            email=account.email,
        )


@router.post("/login", response_model=ApplicantTokenResponse)
async def applicant_login(
    body: ApplicantLoginRequest,
    redis: aioredis.Redis = Depends(get_redis),
) -> ApplicantTokenResponse:
    """Sign in as an applicant."""
    tenant = await _resolve_tenant(body.tenant_slug)
    if not tenant:
        raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Invalid credentials."})

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ApplicantAccount).where(
                ApplicantAccount.tenant_id == tenant.id,
                ApplicantAccount.email == body.email,
            )
        )
        account = result.scalar_one_or_none()

    if not account or not verify_password(body.password, account.hashed_password):
        raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Invalid credentials."})

    access_token = _create_applicant_token(str(account.id), str(tenant.id))
    refresh_token = secrets.token_hex(32)
    await redis.setex(
        f"{APPLICANT_PREFIX}{refresh_token}",
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        str(account.id),
    )

    return ApplicantTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        applicant_id=str(account.id),
        full_name=account.full_name,
        email=account.email,
    )


@router.get("/applications")
async def get_applicant_applications(
    request: Request,
    authorization: str | None = None,
) -> dict:
    """Get all KYC applications submitted by this applicant's email."""
    from fastapi import Header
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED", "message": "Login required."})

    token = auth.split(" ", 1)[1]
    try:
        from jose import jwt
        claims = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if claims.get("type") != "applicant":
            raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED"})
        applicant_id = claims["sub"]
        tenant_id = claims["tenant_id"]
    except Exception:
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN"})

    async with AsyncSessionLocal() as db:
        # Get applicant email
        account_result = await db.execute(select(ApplicantAccount).where(ApplicantAccount.id == applicant_id))
        account = account_result.scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})

        # Match cases by email OR mobile OR full name — portal submission may use different email
        from sqlalchemy import or_
        cases_result = await db.execute(
            select(Case).where(
                Case.tenant_id == tenant_id,
                or_(
                    Case.description.icontains(account.email),
                    Case.description.icontains(account.mobile or ""),
                    Case.subject_name.ilike(f"%{account.full_name}%"),
                ),
            ).order_by(Case.created_at.desc())
        )
        cases = cases_result.scalars().all()

    status_map = {
        "open": "Under Review",
        "in_review": "Additional Verification Required",
        "pending": "Processing",
        "closed": "Completed",
    }

    return {
        "applicant": {
            "id": str(account.id),
            "full_name": account.full_name,
            "email": account.email,
        },
        "applications": [
            {
                "reference_number": c.case_number,
                "case_id": str(c.id),
                "subject_name": c.subject_name,
                "case_type": c.case_type,
                "status": c.status,
                "status_label": status_map.get(c.status, "Under Review"),
                "risk_level": c.risk_level,
                "submitted_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
            }
            for c in cases
        ],
    }


@router.get("/me", response_model=ApplicantProfileResponse)
async def get_applicant_me(request: Request) -> ApplicantProfileResponse:
    """Get current applicant's profile."""
    claims = _decode_applicant_token(request)
    applicant_id = claims["sub"]
    tenant_id = claims["tenant_id"]

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ApplicantAccount).where(ApplicantAccount.id == applicant_id))
        account = result.scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})

        # Get tenant slug
        from models.tenant import Tenant
        import uuid as _uuid
        tenant_result = await db.execute(select(Tenant).where(Tenant.id == _uuid.UUID(tenant_id)))
        tenant = tenant_result.scalar_one_or_none()

    return ApplicantProfileResponse(
        id=str(account.id),
        full_name=account.full_name,
        email=account.email,
        mobile=account.mobile,
        tenant_slug=tenant.slug if tenant else "",
        created_at=account.created_at.isoformat(),
    )


@router.put("/me", response_model=ApplicantProfileResponse)
async def update_applicant_profile(
    request: Request,
    body: UpdateApplicantProfileRequest,
) -> ApplicantProfileResponse:
    """Update applicant's full name."""
    claims = _decode_applicant_token(request)
    applicant_id = claims["sub"]
    tenant_id = claims["tenant_id"]

    async with AsyncSessionLocal() as db:
        async with db.begin():
            result = await db.execute(select(ApplicantAccount).where(ApplicantAccount.id == applicant_id))
            account = result.scalar_one_or_none()
            if not account:
                raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})
            account.full_name = body.full_name
            await db.flush()
            await db.refresh(account)

        from models.tenant import Tenant
        import uuid as _uuid
        async with AsyncSessionLocal() as db2:
            tenant_result = await db2.execute(select(Tenant).where(Tenant.id == _uuid.UUID(tenant_id)))
            tenant = tenant_result.scalar_one_or_none()

    return ApplicantProfileResponse(
        id=str(account.id),
        full_name=account.full_name,
        email=account.email,
        mobile=account.mobile,
        tenant_slug=tenant.slug if tenant else "",
        created_at=account.created_at.isoformat(),
    )


@router.put("/me/password", status_code=200)
async def change_applicant_password(
    request: Request,
    body: ChangeApplicantPasswordRequest,
) -> dict:
    """Change applicant's password — requires current password to verify."""
    claims = _decode_applicant_token(request)
    applicant_id = claims["sub"]

    async with AsyncSessionLocal() as db:
        async with db.begin():
            result = await db.execute(select(ApplicantAccount).where(ApplicantAccount.id == applicant_id))
            account = result.scalar_one_or_none()
            if not account:
                raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})
            if not verify_password(body.current_password, account.hashed_password):
                raise HTTPException(
                    status_code=400,
                    detail={"code": "INVALID_PASSWORD", "message": "Current password is incorrect."},
                )
            account.hashed_password = hash_password(body.new_password)

    return {"message": "Password changed successfully."}


@router.put("/me/email", status_code=200)
async def change_applicant_email(
    request: Request,
    body: ChangeApplicantEmailRequest,
) -> dict:
    """Change applicant's email — requires current password to verify."""
    claims = _decode_applicant_token(request)
    applicant_id = claims["sub"]
    tenant_id = claims["tenant_id"]

    import uuid as _uuid
    async with AsyncSessionLocal() as db:
        async with db.begin():
            result = await db.execute(select(ApplicantAccount).where(ApplicantAccount.id == applicant_id))
            account = result.scalar_one_or_none()
            if not account:
                raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})
            if not verify_password(body.current_password, account.hashed_password):
                raise HTTPException(
                    status_code=400,
                    detail={"code": "INVALID_PASSWORD", "message": "Current password is incorrect."},
                )
            # Check new email not taken in this tenant
            existing = await db.execute(
                select(ApplicantAccount).where(
                    ApplicantAccount.tenant_id == _uuid.UUID(tenant_id),
                    ApplicantAccount.email == body.new_email,
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=409,
                    detail={"code": "EMAIL_EXISTS", "message": "This email is already in use."},
                )
            account.email = body.new_email

    return {"message": "Email updated successfully."}
