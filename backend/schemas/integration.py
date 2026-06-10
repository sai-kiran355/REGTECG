"""
Pydantic schemas for Integrations, API Keys, and Webhook Subscriptions.
"""

from __future__ import annotations

import datetime
import uuid
from pydantic import BaseModel, Field


class IntegrationConfigCreate(BaseModel):
    service: str = Field(..., max_length=50)  # "slack", "teams", "google", "zoho"
    config_data: dict = Field(default_factory=dict)
    is_enabled: bool = True


class IntegrationConfigResponse(BaseModel):
    id: str
    tenant_id: str
    service: str
    config_data: dict
    is_enabled: bool


class SlackTestRequest(BaseModel):
    webhook_url: str = Field(..., max_length=1000)
    message: str | None = Field(default=None, max_length=500)


class ApiKeyCreate(BaseModel):
    name: str = Field(..., max_length=255)
    scopes: str = Field(default="*")  # e.g., "recruitment:read, employees:read" or "*"


class ApiKeyResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    key_prefix: str
    scopes: str
    expires_at: str | None
    last_used_at: str | None


class ApiKeyCreatedSecretResponse(BaseModel):
    key: ApiKeyResponse
    raw_key: str


class WebhookSubscriptionCreate(BaseModel):
    target_url: str = Field(..., max_length=500)
    event_types: str = Field(..., max_length=500)  # e.g. "employee.activated, attendance.breach"
    is_enabled: bool = True


class WebhookSubscriptionResponse(BaseModel):
    id: str
    tenant_id: str
    target_url: str
    event_types: str
    secret_token: str
    is_enabled: bool


class WebhookDeliveryLogResponse(BaseModel):
    id: str
    subscription_id: str
    target_url: str
    event_type: str
    payload: str
    response_status: int | None
    response_body: str | None
    delivered_at: str


class WebhookTestRequest(BaseModel):
    event_type: str = Field(..., max_length=100)
    payload: dict | None = None
