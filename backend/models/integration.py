"""
ORM models for Integrations, Developer API Keys, and Webhook subscriptions.
"""

from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class IntegrationConfig(Base):
    """
    Stores credentials and webhook URLs for connected external platforms (e.g. Slack, Teams, GWorkspace, Zoho).
    """

    __tablename__ = "integration_configs"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service: Mapped[str] = mapped_column(String(50), nullable=False)  # "slack", "teams", "google", "zoho"
    config_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ApiKey(Base):
    """
    Developer API Keys for external app access.
    """

    __tablename__ = "developer_api_keys"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # Name of key (e.g. "Jira Sync")
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)  # e.g., "rt_live_abc123"
    hashed_key: Mapped[str] = mapped_column(String(255), nullable=False)  # Hashed key for validation
    scopes: Mapped[str] = mapped_column(String(500), nullable=False, default="*")  # Comma-separated scopes
    expires_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    last_used_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)


class WebhookSubscription(Base):
    """
    Outbound webhook URLs registered to receive platform events.
    """

    __tablename__ = "webhook_subscriptions"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_url: Mapped[str] = mapped_column(String(500), nullable=False)
    event_types: Mapped[str] = mapped_column(String(500), nullable=False)  # e.g. "employee.activated, attendance.breach"
    secret_token: Mapped[str] = mapped_column(String(255), nullable=False)  # Secret to sign webhook headers
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class WebhookDeliveryLog(Base):
    """
    Debugging log for outbound webhook trigger dispatches.
    """

    __tablename__ = "webhook_delivery_logs"
    __table_args__ = {"schema": "public"}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subscription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.webhook_subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[str] = mapped_column(String(2000), nullable=False)  # JSON request payload
    response_status: Mapped[int | None] = mapped_column(Integer, nullable=True)  # HTTP status code returned (e.g. 200, 500)
    response_body: Mapped[str | None] = mapped_column(String(2000), nullable=True)  # Error body from listener
    delivered_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    subscription: Mapped[WebhookSubscription] = relationship("WebhookSubscription", lazy="selectin")
