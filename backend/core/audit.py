"""
Audit logging helper.

Provides a single async function `log_action` that writes an entry to the
audit_logs table. Call this from all write endpoints after a successful
database operation.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from crud.audit import create_audit_log
from schemas.auth import JWTClaims


def _get_client_ip(request: Request) -> str | None:
    """
    Extract the client IP address from the request.

    Checks X-Forwarded-For first (for reverse-proxy deployments), then falls
    back to the direct client address.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For may contain a comma-separated list; take the first.
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


async def log_action(
    db: AsyncSession,
    request: Request,
    current_user: JWTClaims,
    action: str,
    resource_type: str,
    resource_id: str,
    result: str = "success",
    details: dict[str, Any] | None = None,
    user_email: str | None = None,
) -> None:
    """
    Write an audit log entry for a user action.

    Parameters
    ----------
    db:
        Active async database session (the same session used for the
        business operation so the audit log is committed atomically).
    request:
        The current FastAPI request (used to extract the client IP).
    current_user:
        Decoded JWT claims for the authenticated user.
    action:
        Dot-notation action string, e.g. 'case.create', 'kyc.review'.
    resource_type:
        Type of resource affected, e.g. 'case', 'kyc_record'.
    resource_id:
        UUID or identifier of the affected resource.
    result:
        'success', 'failure', or 'denied'. Defaults to 'success'.
    details:
        Optional JSON-serialisable dict with additional context.
    user_email:
        Optional email override. When not provided, the user UUID (sub)
        is stored as a fallback identifier for historical accuracy.
    """
    tenant_id = uuid.UUID(current_user.tenant_id)
    user_id: uuid.UUID | None = None
    try:
        user_id = uuid.UUID(current_user.sub)
    except (ValueError, AttributeError):
        pass

    # Use provided email or fall back to the user UUID string.
    stored_email = user_email or current_user.sub

    await create_audit_log(
        db=db,
        tenant_id=tenant_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        user_email=stored_email,
        user_id=user_id,
        ip_address=_get_client_ip(request),
        result=result,
        details=details,
    )
