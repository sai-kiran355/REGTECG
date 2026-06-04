"""
Chat API between compliance officers and applicants.

Routes:
  GET  /api/v1/chat/{case_id}/messages  — get all messages for a case
  POST /api/v1/chat/{case_id}/messages  — send a message (officer or applicant)
  PUT  /api/v1/chat/{case_id}/read      — mark messages as read
"""

from __future__ import annotations
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.deps import get_current_user, get_db, require_permission
from models.chat_message import ChatMessage
from models.case import Case
from schemas.auth import JWTClaims
from db.session import AsyncSessionLocal
from core.config import Settings

router = APIRouter(prefix="/chat", tags=["chat"])
settings = Settings()


class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id: str
    case_id: str
    sender_type: str
    sender_name: str
    message: str
    is_read: bool
    created_at: str

    model_config = {"from_attributes": True}


# ── Officer endpoints (requires cases:read permission) ─────────────────────────

@router.get("/{case_id}/messages")
async def get_messages(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> dict:
    """Get all chat messages for a case (officer view)."""
    tenant_id = uuid.UUID(current_user.tenant_id)

    # Verify case belongs to tenant
    case_result = await db.execute(select(Case).where(Case.id == case_id, Case.tenant_id == tenant_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Case not found."})

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.case_id == case_id, ChatMessage.tenant_id == tenant_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()

    return {
        "case_number": case.case_number,
        "subject_name": case.subject_name,
        "messages": [
            {
                "id": str(m.id),
                "sender_type": m.sender_type,
                "sender_name": m.sender_name,
                "message": m.message,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
        "unread_count": sum(1 for m in messages if not m.is_read and m.sender_type == "applicant"),
    }


@router.post("/{case_id}/messages")
async def send_message_officer(
    case_id: uuid.UUID,
    body: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> dict:
    """Officer sends a message to the applicant."""
    tenant_id = uuid.UUID(current_user.tenant_id)

    case_result = await db.execute(select(Case).where(Case.id == case_id, Case.tenant_id == tenant_id))
    if not case_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Case not found."})

    msg = ChatMessage(
        tenant_id=tenant_id,
        case_id=case_id,
        sender_type="officer",
        sender_name=f"Compliance Officer ({current_user.role.capitalize()})",
        message=body.message.strip(),
        is_read=False,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    return {"id": str(msg.id), "created_at": msg.created_at.isoformat(), "message": "Message sent."}


@router.put("/{case_id}/read")
async def mark_read(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> dict:
    """Mark all applicant messages in a case as read."""
    from sqlalchemy import update
    tenant_id = uuid.UUID(current_user.tenant_id)
    await db.execute(
        update(ChatMessage)
        .where(ChatMessage.case_id == case_id, ChatMessage.tenant_id == tenant_id, ChatMessage.sender_type == "applicant")
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "Messages marked as read."}


# ── Applicant endpoints (uses applicant JWT) ──────────────────────────────────

@router.get("/{case_id}/applicant/messages")
async def get_messages_applicant(
    case_id: uuid.UUID,
    request: Request,
) -> dict:
    """Get messages for an applicant (uses applicant JWT)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED"})
    token = auth.split(" ", 1)[1]
    try:
        from jose import jwt
        claims = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if claims.get("type") != "applicant":
            raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED"})
        tenant_id = uuid.UUID(claims["tenant_id"])
    except Exception:
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN"})

    async with AsyncSessionLocal() as db:
        case_result = await db.execute(select(Case).where(Case.id == case_id, Case.tenant_id == tenant_id))
        case = case_result.scalar_one_or_none()
        if not case:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})

        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.case_id == case_id, ChatMessage.tenant_id == tenant_id)
            .order_by(ChatMessage.created_at.asc())
        )
        messages = result.scalars().all()

        # Mark officer messages as read
        from sqlalchemy import update
        await db.execute(
            update(ChatMessage)
            .where(ChatMessage.case_id == case_id, ChatMessage.sender_type == "officer", ChatMessage.is_read == False)
            .values(is_read=True)
        )
        await db.commit()

    return {
        "case_number": case.case_number,
        "messages": [
            {
                "id": str(m.id),
                "sender_type": m.sender_type,
                "sender_name": m.sender_name,
                "message": m.message,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }


@router.post("/{case_id}/applicant/messages")
async def send_message_applicant(
    case_id: uuid.UUID,
    body: SendMessageRequest,
    request: Request,
) -> dict:
    """Applicant sends a message to the compliance officer."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED"})
    token = auth.split(" ", 1)[1]
    try:
        from jose import jwt
        claims = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if claims.get("type") != "applicant":
            raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED"})
        tenant_id = uuid.UUID(claims["tenant_id"])
        applicant_id = claims["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN"})

    async with AsyncSessionLocal() as db:
        from models.applicant_account import ApplicantAccount
        acc_result = await db.execute(select(ApplicantAccount).where(ApplicantAccount.id == applicant_id))
        account = acc_result.scalar_one_or_none()
        sender_name = account.full_name if account else "Applicant"

        case_result = await db.execute(select(Case).where(Case.id == case_id, Case.tenant_id == tenant_id))
        if not case_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})

        msg = ChatMessage(
            tenant_id=tenant_id,
            case_id=case_id,
            sender_type="applicant",
            sender_name=sender_name,
            message=body.message.strip(),
            is_read=False,
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)

    return {"id": str(msg.id), "created_at": msg.created_at.isoformat(), "message": "Message sent."}
