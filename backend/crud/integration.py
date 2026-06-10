"""
CRUD operations for Developer API Keys, Webhook subscriptions, Integration configs, and Webhook dispatching.
"""

from __future__ import annotations

import datetime
import uuid
import secrets
import hashlib
import hmac
import json
import logging
import httpx
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from models.integration import IntegrationConfig, ApiKey, WebhookSubscription, WebhookDeliveryLog
from db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)


# ── API Key Management ────────────────────────────────────────────────────────

def _hash_key(raw_key: str) -> str:
    """Helper to hash raw keys using SHA-256 for secure DB lookup."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


async def list_api_keys(db: AsyncSession, tenant_id: uuid.UUID) -> list[ApiKey]:
    """List all API keys registered for a tenant."""
    q = select(ApiKey).where(ApiKey.tenant_id == tenant_id).order_by(ApiKey.expires_at.desc())
    res = await db.execute(q)
    return list(res.scalars().all())


async def create_api_key(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    name: str,
    scopes: str = "recruitment:read",
) -> tuple[ApiKey, str]:
    """
    Generate a new developer API key.
    Returns the saved ORM model and the raw secret key (shown only once).
    """
    token = secrets.token_hex(18)
    raw_key = f"rt_live_{token}"
    hashed = _hash_key(raw_key)
    prefix = raw_key[:12]  # "rt_live_abc1"

    # Default expiry: 365 days
    expiry = datetime.datetime.utcnow() + datetime.timedelta(days=365)

    key = ApiKey(
        tenant_id=tenant_id,
        name=name,
        key_prefix=prefix,
        hashed_key=hashed,
        scopes=scopes,
        expires_at=expiry,
    )
    db.add(key)
    return key, raw_key


async def delete_api_key(db: AsyncSession, tenant_id: uuid.UUID, key_id: uuid.UUID) -> bool:
    """Delete (revoke) an API key."""
    q = delete(ApiKey).where(and_(ApiKey.id == key_id, ApiKey.tenant_id == tenant_id))
    res = await db.execute(q)
    return res.rowcount > 0


async def verify_api_key(db: AsyncSession, raw_key: str) -> ApiKey | None:
    """
    Verify a raw API key against database hashes.
    If valid, updates last_used_at and returns key claims.
    """
    hashed = _hash_key(raw_key)
    q = select(ApiKey).where(ApiKey.hashed_key == hashed)
    res = await db.execute(q)
    key = res.scalars().first()
    if key:
        # Check expiry
        if key.expires_at and key.expires_at < datetime.datetime.utcnow():
            return None
        key.last_used_at = datetime.datetime.utcnow()
        await db.commit()
        return key
    return None


# ── Integration Configs ───────────────────────────────────────────────────────

async def list_integration_configs(db: AsyncSession, tenant_id: uuid.UUID) -> list[IntegrationConfig]:
    """Get all connected app configurations for a tenant."""
    q = select(IntegrationConfig).where(IntegrationConfig.tenant_id == tenant_id)
    res = await db.execute(q)
    return list(res.scalars().all())


async def save_integration_config(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    service: str,
    config_data: dict,
    is_enabled: bool = True,
) -> IntegrationConfig:
    """Create or update config credentials for a service (Slack, Teams, etc)."""
    q = select(IntegrationConfig).where(
        and_(IntegrationConfig.tenant_id == tenant_id, IntegrationConfig.service == service)
    )
    res = await db.execute(q)
    config = res.scalars().first()
    if config:
        config.config_data = config_data
        config.is_enabled = is_enabled
    else:
        config = IntegrationConfig(
            tenant_id=tenant_id,
            service=service,
            config_data=config_data,
            is_enabled=is_enabled,
        )
        db.add(config)
    return config


# ── Webhook Subscriptions ─────────────────────────────────────────────────────

async def list_webhook_subscriptions(db: AsyncSession, tenant_id: uuid.UUID) -> list[WebhookSubscription]:
    """List webhook target URLs registered for a tenant."""
    q = select(WebhookSubscription).where(WebhookSubscription.tenant_id == tenant_id)
    res = await db.execute(q)
    return list(res.scalars().all())


async def create_webhook_subscription(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    target_url: str,
    event_types: str,
    is_enabled: bool = True,
) -> WebhookSubscription:
    """Register a new webhook listener URL."""
    secret = f"whsec_{secrets.token_hex(16)}"
    sub = WebhookSubscription(
        tenant_id=tenant_id,
        target_url=target_url,
        event_types=event_types,
        secret_token=secret,
        is_enabled=is_enabled,
    )
    db.add(sub)
    return sub


async def delete_webhook_subscription(db: AsyncSession, tenant_id: uuid.UUID, sub_id: uuid.UUID) -> bool:
    """Revoke a webhook subscription."""
    q = delete(WebhookSubscription).where(
        and_(WebhookSubscription.id == sub_id, WebhookSubscription.tenant_id == tenant_id)
    )
    res = await db.execute(q)
    return res.rowcount > 0


async def list_webhook_delivery_logs(db: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    """Get all webhook dispatches with subscription URLs for auditing."""
    q = (
        select(WebhookDeliveryLog, WebhookSubscription)
        .join(WebhookSubscription, WebhookDeliveryLog.subscription_id == WebhookSubscription.id)
        .where(WebhookDeliveryLog.tenant_id == tenant_id)
        .order_by(WebhookDeliveryLog.delivered_at.desc())
        .limit(100)
    )
    res = await db.execute(q)
    results = []
    for log, sub in res.all():
        results.append({
            "id": str(log.id),
            "subscription_id": str(log.subscription_id),
            "target_url": sub.target_url,
            "event_type": log.event_type,
            "payload": log.payload,
            "response_status": log.response_status,
            "response_body": log.response_body,
            "delivered_at": log.delivered_at.isoformat(),
        })
    return results


# ── Webhook Outbound Dispatcher ───────────────────────────────────────────────

async def dispatch_webhook_event(
    tenant_id: uuid.UUID,
    event_type: str,
    payload: dict,
) -> None:
    """
    Asynchronously dispatches outbound HTTP POST webhook payloads to active listeners.
    Operates in a background thread to prevent blocking main database transaction runs.
    """
    # Open an independent session scoped to this background task
    async with AsyncSessionLocal() as session:
        try:
            # Query all enabled subscriptions for this tenant
            q = select(WebhookSubscription).where(
                and_(
                    WebhookSubscription.tenant_id == tenant_id,
                    WebhookSubscription.is_enabled == True
                )
            )
            res = await session.execute(q)
            subscriptions = res.scalars().all()

            # Filter subscriptions matching the event type
            targets = []
            for sub in subscriptions:
                subscribed_events = [x.strip() for x in sub.event_types.split(",")]
                if "*" in subscribed_events or event_type in subscribed_events:
                    targets.append(sub)

            if not targets:
                return

            payload_json = json.dumps(payload)

            async with httpx.AsyncClient(timeout=5.0) as client:
                for sub in targets:
                    # Calculate HMAC SHA-256 signature for verification header
                    sig = hmac.new(
                        sub.secret_token.encode(),
                        payload_json.encode(),
                        hashlib.sha256
                    ).hexdigest()

                    headers = {
                        "Content-Type": "application/json",
                        "X-RegTech-Signature": f"sha256={sig}",
                        "X-RegTech-Event": event_type,
                        "User-Agent": "RegTech-Webhook-Dispatcher/1.0"
                    }

                    status_code = None
                    resp_body = None

                    try:
                        resp = await client.post(sub.target_url, content=payload_json, headers=headers)
                        status_code = resp.status_code
                        resp_body = resp.text[:1000]  # Cap response body log size
                    except Exception as err:
                        status_code = 599  # Custom code for local connection timeouts/network errors
                        resp_body = str(err)[:1000]

                    # Commit delivery outcome to audit log
                    log_entry = WebhookDeliveryLog(
                        tenant_id=tenant_id,
                        subscription_id=sub.id,
                        event_type=event_type,
                        payload=payload_json,
                        response_status=status_code,
                        response_body=resp_body
                    )
                    session.add(log_entry)

            await session.commit()

        except Exception as e:
            logger.error(f"Error dispatching webhook event {event_type} for tenant {tenant_id}: {str(e)}")
