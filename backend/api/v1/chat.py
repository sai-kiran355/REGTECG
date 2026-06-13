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


@router.get("/unread-count")
async def get_total_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> dict:
    """Get the total count of unread applicant messages across all tenant cases."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    result = await db.execute(
        select(ChatMessage)
        .join(Case, Case.id == ChatMessage.case_id)
        .where(
            ChatMessage.tenant_id == tenant_id,
            ChatMessage.sender_type == "applicant",
            ChatMessage.is_read == False
        )
    )
    unread_messages = result.scalars().all()
    return {"unread_count": len(unread_messages)}


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
        "case_status": case.status,
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


# ── Landing Page AI Chat Assistant (Public Endpoint) ─────────────────────────

class ChatMessageHistoryItem(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class LobbyChatRequest(BaseModel):
    message: str
    history: list[ChatMessageHistoryItem] = []


def _run_local_fallback_chat(message: str) -> str:
    msg = message.lower()
    
    # Greetings
    greetings = {"hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening", "howdy", "welcome"}
    words = set(msg.split())
    if words.intersection(greetings) or msg.strip() in ("", "?"):
        return (
            "Welcome to RegTech ComplianceOS! I am your AI Assistant. ComplianceOS is an enterprise-grade SaaS platform "
            "built to connect compliant banking environments with fast-growing fintech operations.\n\n"
            "What can I help you explore today?\n"
            "- 🏦 **Bank Cockpit & Compliance** (KYC document checks, AML transaction logs, Sanctions screening)\n"
            "- 💼 **Fintech Operations Suite** (Workforce Directory, GPS geofenced attendance, automated Payroll runs)\n"
            "- 💻 **Developer Integrations** (API keys, Webhook subscriptions, third-party syncs)\n"
            "- 🔒 **Security & Audit Controls** (Tamper-proof logs, Role-Based Access Control)"
        )

    # App-related keywords for scoping checks
    app_keywords = [
        "compliance", "regtech", "bank", "fintech", "kyc", "aml", "sanction", "list", 
        "ofac", "pep", "phonetic", "verification", "screen", "directory", "employee", 
        "worker", "attendance", "gps", "geofence", "payroll", "tax", "salary", "epf", 
        "tds", "payslip", "api", "webhook", "key", "integration", "slack", "teams", 
        "zoho", "google", "security", "audit", "rbac", "role", "price", "pricing", 
        "cost", "subscription", "sandbox", "trial", "features", "app", "application",
        "tfg", "threshing floor", "portal"
    ]
    
    has_keyword = any(k in msg for k in app_keywords)
    if not has_keyword:
        return (
            "I apologize, but I can only answer questions related to RegTech ComplianceOS, "
            "its features (such as Bank and Fintech portals), developer APIs, and onboarding workflows. "
            "Please ask me about these topics, and I will be happy to explain how ComplianceOS can benefit your organization!"
        )

    if "pricing" in msg or "cost" in msg or "price" in msg or "subscription" in msg or "trial" in msg:
        return (
            "RegTech ComplianceOS offers flexible pricing tiers designed for startups and large financial institutions alike:\n\n"
            "- **Free Sandbox Tier**: Get full access to developer API keys, webhook simulators, and mock databases to build and test your integrations locally before going live.\n"
            "- **Growth Plan**: Built for scaling fintechs looking to automate internal operations. Includes the Workforce Directory, geofenced GPS clock-in logs, and automated payroll reporting.\n"
            "- **Enterprise Compliance**: Tailored for banks and licensed NBFCs. Unlocks the full KYC (Know Your Customer) Case Cockpit, the real-time AML (Anti-Money Laundering) Screening simulator, and OFAC/PEP phonetic screening desk.\n\n"
            "Which plan fits your organization's current needs?"
        )
    elif "kyc" in msg or "cockpit" in msg:
        return (
            "The **KYC (Know Your Customer) Case Cockpit** is designed to eliminate manual review bottlenecks:\n\n"
            "- **Aadhaar, PAN & Passport OCR**: Automatically extracts names, IDs, dates of birth, and addresses from uploaded documents using Optical Character Recognition, verifying them against regulatory schemas.\n"
            "- **Real-time Applicant Chat**: If a document is blurred or verification fails, the analyst can chat directly with the applicant from inside the cockpit, sending them an instant request with an inline 'Re-upload' button.\n"
            "- **Case Workflow States**: Tracks applications through `pending`, `in_review`, `verified`, or `rejected` states, automatically triggering audit logs and webhook webhooks."
        )
    elif "aml" in msg or "laundering" in msg:
        return (
            "The **AML (Anti-Money Laundering) Screening Simulator** monitors transaction metrics to prevent compliance breaches:\n\n"
            "- **Laundering Scenario Checks**: Automatically flags transaction patterns matching 'structuring' (splitting high-value transfers into small, consecutive deposits) and 'layering' (rapid transfers across multiple entities).\n"
            "- **Alert Resolution Desk**: Compliance officers review alerts, write notes, and resolve them by transitioning their state (`open`, `in_review`, `closed`, `false_positive`).\n"
            "- **Audit Readiness**: Disallows silent overrides; all alert transitions require recorded compliance reasons for bank examiners."
        )
    elif "sanction" in msg or "ofac" in msg or "pep" in msg or "phonetic" in msg:
        return (
            "The **Sanctions Phonetic Match Desk** prevents illegal onboarding of restricted entities:\n\n"
            "- **Watchlist Database**: Screens applicant profiles against active global lists, including Politically Exposed Persons (PEPs) and the US Office of Foreign Assets Control (OFAC) sanctions databases.\n"
            "- **Phonetic Matching Algorithm**: Uses phonetic indexing (like Soundex or Double Metaphone) to catch names that sound similar to sanctioned entities, avoiding bypasses due to spelling variations or typos.\n"
            "- **Override Controls**: Permits compliance managers to mark candidates as approved false-positives or lock matching profiles."
        )
    elif "bank" in msg or "case" in msg:
        return (
            "Our RegTech suite is built to streamline high-volume compliance for banks and licensed entities, ensuring zero-friction audits. It contains three core modules:\n\n"
            "1. **KYC (Know Your Customer) Case Cockpit**: Automates identity verification using OCR (Optical Character Recognition) to parse Aadhaar, PAN, and passport uploads.\n"
            "2. **AML (Anti-Money Laundering) Screening Simulator**: Evaluates incoming transaction patterns for structuring and layering.\n"
            "3. **Sanctions Phonetic Match Desk**: Screens candidate profiles against global OFAC and PEP databases.\n\n"
            "Would you like to learn more about a specific bank module?"
        )
    elif "workforce" in msg or "directory" in msg or "employee" in msg or "candidate" in msg or "resume" in msg:
        return (
            "The **Workforce Directory & Onboarding** module streamlines hiring and HR compliance:\n\n"
            "- **Self-Service Onboarding**: New hires upload document scans, sign corporate agreements, and submit profile details directly, removing HR manual data entry.\n"
            "- **Recruitment Integration**: Features job postings management and automatic candidate resume keyword matching to grade applicant resumes against positions.\n"
            "- **Direct Directory Promotion**: Promotes verified candidates to active employee records with automatic configuration of salary structures and shift schedules."
        )
    elif "attendance" in msg or "gps" in msg or "geofence" in msg:
        return (
            "The **GPS Geofenced Attendance** tracks logs securely without manual registers:\n\n"
            "- **Virtual Geofences**: Allows HR managers to register specific office latitude/longitude coordinates and a permitted boundary radius.\n"
            "- **Distance Validation**: During web app clock-in, the system calculates geographic distance to check if the employee's GPS coordinates are inside office boundaries.\n"
            "- **Anomaly Logging**: Automatically logs out-of-boundary check-ins as geofence breaches, raising alerts on the dashboard and triggering notifications."
        )
    elif "payroll" in msg or "salary" in msg or "tax" in msg or "epf" in msg or "tds" in msg or "payslip" in msg:
        return (
            "The **Automated Payroll Engine** processes payouts and compliance with zero manual calculations:\n\n"
            "- **Statutory Taxes**: Calculates EPF (Employee Provident Fund) contributions, TDS (Tax Deducted at Source), and professional taxes in accordance with Indian tax laws.\n"
            "- **Consolidated Disbursals**: Compiles salary runs and exports bulk payment logs for bank upload.\n"
            "- **Digital Payslips**: Automatically generates detailed digital payslips which employees can access and download from their portals."
        )
    elif "fintech" in msg:
        return (
            "The Fintech Portal handles workforce operations, designed to eliminate manual spreadsheet work for HR teams:\n\n"
            "1. **Workforce Onboarding Directory**: Self-service details and background checks.\n"
            "2. **GPS Geofenced Attendance**: Virtual boundaries to log and verify clock-ins.\n"
            "3. **Automated Payroll Runs**: Epf/Tds tax calculations and digital payslips.\n\n"
            "How does your team currently manage onboarding and payroll?"
        )
    elif "key" in msg or "sandbox" in msg:
        return (
            "ComplianceOS provides developer-first integration sandboxes:\n\n"
            "- **API Keys**: Generate and manage securely hashed tokens to programmatically sync employee details, attendance entries, or payroll calculations.\n"
            "- **Local Sandbox**: Enables full access to mock APIs so engineers can build and test their integrations locally without affecting production databases."
        )
    elif "webhook" in msg or "callback" in msg or "event" in msg:
        return (
            "Our **Webhook Dispatches** stream real-time events to external servers:\n\n"
            "- **Event Subscriptions**: Subscribe to specific platform events like `employee.activated`, `attendance.breach`, or `kyc.verified`.\n"
            "- **Secure Delivery Logs**: Payload dispatches are signed and logged with response codes, payload body details, and automatic retry attempts."
        )
    elif "slack" in msg or "teams" in msg or "zoho" in msg or "google" in msg or "integration" in msg or "integrate" in msg:
        return (
            "We support instant synchronization with corporate workspace apps:\n\n"
            "- **Slack & Microsoft Teams Sync**: Streams real-time compliance alerts, high-risk AML warnings, or onboarding status messages directly into your team channels.\n"
            "- **Zoho & Google Workspace Directory Sync**: Automatically syncs active directory changes, employee profile updates, and leave approvals between systems."
        )
    elif "security" in msg or "secure" in msg or "audit" in msg or "rbac" in msg or "role" in msg:
        return (
            "Security and audit readiness are core priorities for ComplianceOS:\n\n"
            "- **Tamper-Proof Audit Logs**: Every compliance action, document verification state change, and analyst override is recorded in an immutable audit log to ensure smooth regulatory inspections.\n"
            "- **Role-Based Access Control (RBAC)**: Ensure that only authorized personnel can view sensitive personal files, KYC documents, or salary structures.\n"
            "- **Secure Documents Storage**: All document uploads are encrypted at rest and in transit using industry-standard AES-256 encryption.\n\n"
            "Do you have specific compliance standards or audit requirements you need to meet?"
        )
    else:
        return (
            "ComplianceOS is a secure, unified SaaS platform built to connect bank regulatory compliance with fintech operational hubs.\n\n"
            "Which area can I explain in more detail for you?\n"
            "- 🏦 **Bank Cockpit & Compliance** (KYC checks, AML transaction monitoring, PEP/OFAC lists)\n"
            "- 💼 **Fintech Operations Suite** (Workforce onboarding directory, GPS geofenced logs, Payroll calculations)\n"
            "- 💻 **Developer Integrations** (API keys, Webhook triggers, Slack & Zoho syncs)\n"
            "- 🔒 **Security & Audit Controls** (RBAC, Tamper-proof logs)"
        )


@router.post("/lobby-assistant")
async def lobby_assistant(body: LobbyChatRequest) -> dict:
    """Public chat endpoint for visitors interacting with the AI Assistant on the landing page."""
    import httpx
    import os

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        fallback_response = _run_local_fallback_chat(body.message)
        return {"response": fallback_response}

    # Format user history into Gemini content structure
    contents = []
    for h in body.history:
        role = "user" if h.role == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": h.content}]
        })

    # Append current message
    contents.append({
        "role": "user",
        "parts": [{"text": body.message}]
    })

    system_instruction = {
        "parts": [
            {
                "text": (
                    "You are the official RegTech ComplianceOS AI Assistant. Your sole job is to help landing page "
                    "visitors explore and understand the RegTech ComplianceOS SaaS application. You are a highly "
                    "knowledgeable, consultative, and professional sales assistant. Your responses must be clear, "
                    "business value-centric, and structured. Use bullet points or lists to break down complex features.\n\n"
                    "Always define compliance and regulatory acronyms for clarity to prospects (e.g. KYC: 'Know Your Customer', "
                    "AML: 'Anti-Money Laundering', PEP: 'Politically Exposed Person', OFAC: 'Office of Foreign Assets Control', "
                    "RBAC: 'Role-Based Access Control'). Explain the business value (preventing fines, eliminating manual HR administration, "
                    "securing audit trails, proving developer sandboxes, etc.).\n\n"
                    "Here is detailed information about the application:\n"
                    "- **RegTech ComplianceOS**: A unified, secure SaaS platform built to link bank compliance workflows with fintech operations.\n"
                    "- **Bank Portal (RegTech Suite)**: Designed for bank risk officers, compliance analysts, and auditors. Core modules:\n"
                    "  1. KYC (Know Your Customer) Case Cockpit: Automatic verification of identities (Aadhaar, PAN, Passport OCR scanning) and a real-time applicant chat for resolving document issues.\n"
                    "  2. AML (Anti-Money Laundering) Screening Simulator: Monitors transaction flow metrics. Simulates laundering tactics like structuring (splitting high amounts into smaller ones) and layering, alerting analysts before settlement.\n"
                    "  3. Sanctions Phonetic Match Desk: Screens candidate profiles against global watchlists (OFAC, PEP, sanctions) using phonetic algorithms to catch matches regardless of spelling variations.\n"
                    "- **Fintech Portal (Workforce Hub)**: Designed for internal operations and HR managers. Core modules:\n"
                    "  1. Workforce Onboarding Directory: Self-service portal for new employees to upload details, sign contracts, and complete background checks.\n"
                    "  2. GPS Geofenced Attendance: Virtual office boundaries that log clock-in times and automatically flag breaches if coordinates fall outside office parameters.\n"
                    "  3. Automated Payroll Runs: Generates salary structures, calculates statutory deductions (EPF: Employee Provident Fund, TDS: Tax Deducted at Source, professional tax), exports disbursal spreadsheets, and releases digital payslips.\n"
                    "- **Developer Integrations (Fintech panel)**: API Keys generation, Webhook callback subscriptions (e.g. `employee.activated`, `attendance.breach`), and third-party application syncs (Slack, Microsoft Teams, Zoho, Google Workspace).\n"
                    "- **Security & Auditing**: Fully audit-logged actions to satisfy bank examiners, RBAC, and bank-grade document encryption.\n\n"
                    "STRICT SCOPE RULE:\n"
                    "Only answer queries about RegTech ComplianceOS, its features, portals, pricing, security, or integrations. "
                    "If the user asks off-topic questions (e.g., cooking recipes, general programming help, weather, or unrelated chat), "
                    "you must politely decline to answer, restate that you are the ComplianceOS AI, and offer to explain our bank or fintech features instead."
                )
            }
        ]
    }

    payload = {
        "contents": contents,
        "systemInstruction": system_instruction,
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 2048,
            "thinkingConfig": {
                "thinkingBudget": 0
            }
        },
    }


    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        
        # Clean markdown formatting if returned
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()
            
        return {"response": raw_text}
    except Exception as e:
        # Fallback to local matching if Gemini request fails or times out
        fallback_response = _run_local_fallback_chat(body.message)
        return {"response": fallback_response}

