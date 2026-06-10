"""
API routes for Integrations, Developer API Keys, and Outbound Webhooks.
"""

from __future__ import annotations

import logging
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from api.v1.deps import get_db, require_permission
from schemas.auth import JWTClaims
from schemas.integration import (
    IntegrationConfigCreate, IntegrationConfigResponse, SlackTestRequest,
    ApiKeyCreate, ApiKeyResponse, ApiKeyCreatedSecretResponse,
    WebhookSubscriptionCreate, WebhookSubscriptionResponse,
    WebhookDeliveryLogResponse, WebhookTestRequest
)
from crud.integration import (
    list_integration_configs, save_integration_config,
    list_api_keys, create_api_key, delete_api_key,
    list_webhook_subscriptions, create_webhook_subscription, delete_webhook_subscription,
    list_webhook_delivery_logs, dispatch_webhook_event
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["integrations"])


# ── Integration Configs ───────────────────────────────────────────────────────

@router.get("/configs", response_model=list[IntegrationConfigResponse])
async def list_configs_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> list[IntegrationConfigResponse]:
    """List all third-party app configurations (Slack, Teams, Google, Zoho)."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    configs = await list_integration_configs(db, tenant_id)
    return [
        IntegrationConfigResponse(
            id=str(c.id),
            tenant_id=str(c.tenant_id),
            service=c.service,
            config_data=c.config_data,
            is_enabled=c.is_enabled
        )
        for c in configs
    ]


@router.post("/configs", response_model=IntegrationConfigResponse)
async def save_config_endpoint(
    body: IntegrationConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> IntegrationConfigResponse:
    """Save/update a third-party app integration configuration."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    config = await save_integration_config(
        db,
        tenant_id=tenant_id,
        service=body.service,
        config_data=body.config_data,
        is_enabled=body.is_enabled
    )
    await db.commit()
    return IntegrationConfigResponse(
        id=str(config.id),
        tenant_id=str(config.tenant_id),
        service=config.service,
        config_data=config.config_data,
        is_enabled=config.is_enabled
    )


@router.post("/configs/test-slack")
async def test_slack_endpoint(
    body: SlackTestRequest,
    current_user: JWTClaims = Depends(require_permission("cases:write")),
):
    """Dispatch a simulated webhook card to an external Slack/Teams channel."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Simple fallback structure: slack webhooks support {"text": "..."}
            payload = {
                "text": body.message or "🟢 *RegTech Workforce Integrations*\nYour Slack alert channel has been connected successfully!"
            }
            resp = await client.post(body.webhook_url, json=payload)
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=400,
                    detail=f"Webhook target returned HTTP status: {resp.status_code}. Response: {resp.text}"
                )
            return {"success": True, "message": "Test notification dispatched successfully"}
    except Exception as err:
        raise HTTPException(
            status_code=400,
            detail=f"Webhook test delivery failed: {str(err)}"
        )


# ── Developer API Keys ────────────────────────────────────────────────────────

@router.get("/keys", response_model=list[ApiKeyResponse])
async def list_keys_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> list[ApiKeyResponse]:
    """List active developer API keys."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    keys = await list_api_keys(db, tenant_id)
    return [
        ApiKeyResponse(
            id=str(k.id),
            tenant_id=str(k.tenant_id),
            name=k.name,
            key_prefix=k.key_prefix,
            scopes=k.scopes,
            expires_at=k.expires_at.isoformat() if k.expires_at else None,
            last_used_at=k.last_used_at.isoformat() if k.last_used_at else None
        )
        for k in keys
    ]


@router.post("/keys", response_model=ApiKeyCreatedSecretResponse)
async def create_key_endpoint(
    body: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> ApiKeyCreatedSecretResponse:
    """Generate a new developer API key. Returns the raw secret key once."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    key, raw_key = await create_api_key(db, tenant_id, name=body.name, scopes=body.scopes)
    await db.commit()
    
    key_resp = ApiKeyResponse(
        id=str(key.id),
        tenant_id=str(key.tenant_id),
        name=key.name,
        key_prefix=key.key_prefix,
        scopes=key.scopes,
        expires_at=key.expires_at.isoformat() if key.expires_at else None,
        last_used_at=key.last_used_at.isoformat() if key.last_used_at else None
    )
    return ApiKeyCreatedSecretResponse(key=key_resp, raw_key=raw_key)


@router.delete("/keys/{key_id}", status_code=204)
async def delete_key_endpoint(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
):
    """Revoke/delete a developer API key."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    success = await delete_api_key(db, tenant_id, key_id)
    if not success:
        raise HTTPException(status_code=404, detail="API key not found")
    await db.commit()
    return None


# ── Webhook Subscriptions ─────────────────────────────────────────────────────

@router.get("/webhooks", response_model=list[WebhookSubscriptionResponse])
async def list_webhooks_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> list[WebhookSubscriptionResponse]:
    """List registered outbound webhook endpoints."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    subs = await list_webhook_subscriptions(db, tenant_id)
    return [
        WebhookSubscriptionResponse(
            id=str(s.id),
            tenant_id=str(s.tenant_id),
            target_url=s.target_url,
            event_types=s.event_types,
            secret_token=s.secret_token,
            is_enabled=s.is_enabled
        )
        for s in subs
    ]


@router.post("/webhooks", response_model=WebhookSubscriptionResponse)
async def create_webhook_endpoint(
    body: WebhookSubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
) -> WebhookSubscriptionResponse:
    """Create a new outbound webhook listener endpoint."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    sub = await create_webhook_subscription(
        db,
        tenant_id=tenant_id,
        target_url=body.target_url,
        event_types=body.event_types,
        is_enabled=body.is_enabled
    )
    await db.commit()
    return WebhookSubscriptionResponse(
        id=str(sub.id),
        tenant_id=str(sub.tenant_id),
        target_url=sub.target_url,
        event_types=sub.event_types,
        secret_token=sub.secret_token,
        is_enabled=sub.is_enabled
    )


@router.delete("/webhooks/{sub_id}", status_code=204)
async def delete_webhook_endpoint(
    sub_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:write")),
):
    """Revoke/delete an outbound webhook listener."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    success = await delete_webhook_subscription(db, tenant_id, sub_id)
    if not success:
        raise HTTPException(status_code=404, detail="Webhook subscription not found")
    await db.commit()
    return None


@router.get("/webhooks/logs", response_model=list[WebhookDeliveryLogResponse])
async def list_webhook_logs_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: JWTClaims = Depends(require_permission("cases:read")),
) -> list[WebhookDeliveryLogResponse]:
    """Retrieve webhook delivery logs."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    logs = await list_webhook_delivery_logs(db, tenant_id)
    return [WebhookDeliveryLogResponse(**l) for l in logs]


@router.post("/webhooks/test")
async def trigger_test_webhook_endpoint(
    body: WebhookTestRequest,
    current_user: JWTClaims = Depends(require_permission("cases:write")),
):
    """Simulate a platform event trigger to run the background webhook dispatcher."""
    tenant_id = uuid.UUID(current_user.tenant_id)
    event_payload = body.payload or {
        "event": body.event_type,
        "triggered_by": "Developer Console UI Sim",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "mock_data": {
            "employee_id": str(uuid.uuid4()),
            "status": "activated",
            "department": "Engineering"
        }
    }
    
    # Run the background dispatcher task asynchronously
    await dispatch_webhook_event(
        tenant_id=tenant_id,
        event_type=body.event_type,
        payload=event_payload
    )
    
    return {"success": True, "message": f"Simulated {body.event_type} event triggered and queued for dispatching."}
