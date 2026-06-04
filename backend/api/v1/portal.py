"""
Public Customer Onboarding Portal API.

Routes (no JWT required — public endpoints):
  POST /api/v1/portal/submit              — submit KYC application
  GET  /api/v1/portal/status/{ref_number} — check application status
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Form, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.redis import get_redis
from crud.audit import create_audit_log
from crud.case import create_case
from crud.kyc import create_kyc_record, update_kyc_record
from crud.sanctions import create_screening
from db.session import AsyncSessionLocal
from models.case import Case
from models.kyc_record import KYCRecord
from models.user import User
from schemas.portal import PortalStatusResponse, PortalSubmitResponse
from services.verifier import parse_aadhaar, verify_aadhaar, verify_pan

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portal", tags=["portal"])

# Allowed MIME types for document uploads
_ALLOWED_MIME = {"image/jpeg", "image/png", "application/pdf"}
_MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

# Status label mapping
_STATUS_LABELS = {
    "open": "Under Review",
    "in_review": "Additional Verification Required",
    "pending": "Processing",
    "closed": "Completed",
}


async def _resolve_tenant(request: Request):
    """Resolve tenant from X-Tenant-ID header (slug or UUID)."""
    tenant_header = request.headers.get("X-Tenant-ID", "").strip()
    if not tenant_header:
        raise HTTPException(
            status_code=400,
            detail={"code": "MISSING_TENANT_ID", "message": "X-Tenant-ID header is required."},
        )

    async with AsyncSessionLocal() as session:
        from crud.tenant import get_active_tenant_by_slug
        import uuid as _uuid

        tenant = None
        # Try UUID lookup first
        try:
            tenant_uuid = _uuid.UUID(tenant_header)
            from models.tenant import Tenant
            result = await session.execute(
                select(Tenant).where(Tenant.id == tenant_uuid, Tenant.status == "active")
            )
            tenant = result.scalar_one_or_none()
        except (ValueError, Exception):
            pass

        # Fall back to slug lookup
        if tenant is None:
            tenant = await get_active_tenant_by_slug(session, tenant_header)

    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "TENANT_NOT_FOUND", "message": f"Tenant '{tenant_header}' not found."},
        )
    return tenant


async def _check_rate_limit(request: Request, redis: aioredis.Redis) -> None:
    """Enforce 10 submissions per IP per 60 seconds."""
    client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    if not client_ip and request.client:
        client_ip = request.client.host
    client_ip = client_ip or "unknown"

    key = f"ratelimit:portal:submit:{client_ip}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)
    if count > 10:
        ttl = await redis.ttl(key)
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests. Please wait."},
            headers={"Retry-After": str(max(ttl, 1))},
        )


async def _validate_file(file: UploadFile, field_name: str) -> bytes:
    """Read and validate a single uploaded file. Returns file bytes."""
    content = await file.read()
    if len(content) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=422,
            detail={"code": "FILE_TOO_LARGE", "message": f"{field_name} exceeds 5 MB limit."},
        )
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "UNSUPPORTED_FILE_TYPE",
                "message": f"{field_name} must be JPEG, PNG, or PDF.",
            },
        )
    return content


def _get_extension(content_type: str) -> str:
    return {"image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf"}.get(
        content_type, "bin"
    )


@router.post("/submit", response_model=PortalSubmitResponse, status_code=201)
async def submit_application(
    request: Request,
    # Personal details
    full_name: str = Form(...),
    date_of_birth: str = Form(...),
    gender: str = Form(...),
    mobile: str = Form(...),
    email: str = Form(...),
    address: str = Form(...),
    city: str = Form(...),
    state: str = Form(...),
    pincode: str = Form(...),
    # Identity
    aadhaar_number: str = Form(...),
    pan_number: str = Form(...),
    # Documents
    aadhaar_front: UploadFile = None,
    aadhaar_back: UploadFile = None,
    pan_card: UploadFile = None,
    selfie: UploadFile = None,
    redis: aioredis.Redis = Depends(get_redis),
) -> PortalSubmitResponse:
    """
    Submit a KYC application. Public endpoint — no JWT required.
    Creates KYCRecord + Case + SanctionsScreening in a single transaction.
    """
    # Rate limiting
    await _check_rate_limit(request, redis)

    # Resolve tenant
    tenant = await _resolve_tenant(request)
    tenant_id = tenant.id

    # Validate files
    files_data: dict[str, tuple[bytes, str]] = {}
    for field_name, upload in [
        ("aadhaar_front", aadhaar_front),
        ("aadhaar_back", aadhaar_back),
        ("pan_card", pan_card),
        ("selfie", selfie),
    ]:
        if upload is None:
            raise HTTPException(
                status_code=422,
                detail={"code": "MISSING_FILE", "message": f"{field_name} is required."},
            )
        content = await _validate_file(upload, field_name)
        files_data[field_name] = (content, upload.content_type or "application/octet-stream")

    # Validate and parse Aadhaar
    try:
        cleaned_aadhaar = parse_aadhaar(aadhaar_number)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_AADHAAR_FORMAT", "message": "Aadhaar must be 12 numeric digits."},
        )

    # Determine KYC risk based on verification
    aadhaar_ok = verify_aadhaar(cleaned_aadhaar)
    pan_ok = verify_pan(pan_number.strip().upper())

    if aadhaar_ok and pan_ok:
        kyc_status = "pending"
        risk_level = "low"
    else:
        kyc_status = "in_review"
        risk_level = "high"

    # Parse date_of_birth
    from datetime import date as _date
    try:
        dob = _date.fromisoformat(date_of_birth)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_DATE", "message": "date_of_birth must be YYYY-MM-DD."},
        )

    # Single transaction: KYCRecord + Case + SanctionsScreening
    async with AsyncSessionLocal() as db:
        async with db.begin():
            # Find a system user (first admin in tenant) for created_by
            user_result = await db.execute(
                select(User).where(User.tenant_id == tenant_id).limit(1)
            )
            system_user = user_result.scalar_one_or_none()
            if system_user is None:
                raise HTTPException(
                    status_code=500,
                    detail={"code": "NO_SYSTEM_USER", "message": "No users found in tenant."},
                )
            system_user_id = system_user.id

            # Create KYCRecord
            kyc_record = await create_kyc_record(
                db=db,
                tenant_id=tenant_id,
                full_name=full_name.strip(),
                date_of_birth=dob,
                nationality="IN",
                document_type="national_id",
                document_number=cleaned_aadhaar,
                risk_level=risk_level,
                notes=None,
            )
            kyc_record.status = kyc_status

            # Create Case
            case = await create_case(
                db=db,
                tenant_id=tenant_id,
                created_by=system_user_id,
                subject_name=full_name.strip(),
                subject_type="individual",
                case_type="kyc",
                risk_level=risk_level,
                description=(
                    f"Portal KYC submission — Mobile: {mobile}, Email: {email}, "
                    f"City: {city}, State: {state}"
                ),
            )

            # Link KYC record to case
            kyc_record.case_id = case.id

            # Sanctions screening
            screening = await create_screening(
                db=db,
                tenant_id=tenant_id,
                entity_name=full_name.strip(),
                entity_type="individual",
                sanctions_list="OFAC_SDN",
            )

            # Update case based on sanctions result
            if screening.match_type in ("confirmed", "possible"):
                case.risk_level = "high"
                case.status = "in_review"
            else:
                case.status = "open"

            # Save documents to PostgreSQL directly (no external storage needed)
            from models.kyc_document import KYCDocument
            doc_keys: dict[str, str] = {}
            for doc_type, (content, content_type) in files_data.items():
                doc = KYCDocument(
                    kyc_record_id=kyc_record.id,
                    tenant_id=tenant_id,
                    document_type=doc_type,
                    file_name=f"{doc_type}.{_get_extension(content_type)}",
                    content_type=content_type,
                    file_data=content,
                    file_size=len(content),
                )
                db.add(doc)
                doc_keys[doc_type] = f"db:{doc_type}"
                logger.info("Saved document to database: %s for KYC %s", doc_type, kyc_record.id)

            # Store document keys in notes
            if doc_keys:
                kyc_record.notes = json.dumps(doc_keys)

            # Audit log
            await create_audit_log(
                db=db,
                tenant_id=tenant_id,
                action="portal.onboarding.submit",
                resource_type="kyc_record",
                resource_id=str(kyc_record.id),
                user_email="portal-system",
                user_id=None,
                ip_address=request.client.host if request.client else None,
                result="success",
                details={
                    "full_name": full_name.strip(),
                    "aadhaar_verified": aadhaar_ok,
                    "pan_verified": pan_ok,
                    "sanctions_result": screening.match_type,
                },
            )

            submitted_at = case.created_at or datetime.now(timezone.utc)

        return PortalSubmitResponse(
            reference_number=case.case_number,
            kyc_record_id=kyc_record.id,
            submitted_at=submitted_at,
        )


@router.get("/status/{reference_number}", response_model=PortalStatusResponse)
async def get_application_status(
    reference_number: str,
    request: Request,
) -> PortalStatusResponse:
    """
    Check application status by reference number. Public endpoint — no JWT required.
    """
    tenant = await _resolve_tenant(request)
    tenant_id = tenant.id

    async with AsyncSessionLocal() as db:
        # Find case by case_number scoped to tenant
        case_result = await db.execute(
            select(Case).where(
                Case.case_number == reference_number,
                Case.tenant_id == tenant_id,
            )
        )
        case = case_result.scalar_one_or_none()

        if case is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "APPLICATION_NOT_FOUND",
                    "message": f"No application found with reference number '{reference_number}'.",
                },
            )

        # Find linked KYC record
        kyc_result = await db.execute(
            select(KYCRecord).where(KYCRecord.case_id == case.id)
        )
        kyc_record = kyc_result.scalar_one_or_none()
        kyc_status = kyc_record.status if kyc_record else "unknown"

        applicant_label = _STATUS_LABELS.get(case.status, "Under Review")

        return PortalStatusResponse(
            reference_number=reference_number,
            case_status=case.status,
            kyc_status=kyc_status,
            applicant_label=applicant_label,
            submitted_at=case.created_at,
        )


@router.get("/documents/{kyc_record_id}/{doc_type}")
async def get_document(
    kyc_record_id: uuid.UUID,
    doc_type: str,
    request: Request,
) -> None:
    """
    Download a KYC document stored in PostgreSQL.
    Used by compliance officers to view uploaded Aadhaar/PAN/selfie files.
    """
    from fastapi.responses import Response
    from models.kyc_document import KYCDocument

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(KYCDocument).where(
                KYCDocument.kyc_record_id == kyc_record_id,
                KYCDocument.document_type == doc_type,
            )
        )
        doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "DOCUMENT_NOT_FOUND", "message": "Document not found."},
        )

    from fastapi.responses import Response as FastAPIResponse
    return FastAPIResponse(
        content=doc.file_data,
        media_type=doc.content_type,
        headers={"Content-Disposition": f'inline; filename="{doc.file_name}"'},
    )
