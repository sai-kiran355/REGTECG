/**
 * Integrations & API Client
 */
import { apiClient } from './client'

export interface IntegrationConfig {
  id: string
  tenant_id: string
  service: string
  config_data: Record<string, any>
  is_enabled: boolean
}

export interface ApiKey {
  id: string
  tenant_id: string
  name: string
  key_prefix: string
  scopes: string
  expires_at: string | null
  last_used_at: string | null
}

export interface ApiKeyCreatedSecretResponse {
  key: ApiKey
  raw_key: string
}

export interface WebhookSubscription {
  id: string
  tenant_id: string
  target_url: string
  event_types: string
  secret_token: string
  is_enabled: boolean
}

export interface WebhookDeliveryLog {
  id: string
  subscription_id: string
  target_url: string
  event_type: string
  payload: string
  response_status: number | null
  response_body: string | null
  delivered_at: string
}

export const integrationApi = {
  listConfigs: () =>
    apiClient.get<IntegrationConfig[]>('/api/v1/integrations/configs').then((r) => r.data),

  saveConfig: (data: { service: string; config_data: Record<string, any>; is_enabled: boolean }) =>
    apiClient.post<IntegrationConfig>('/api/v1/integrations/configs', data).then((r) => r.data),

  testSlackConnection: (data: { webhook_url: string; message?: string }) =>
    apiClient.post<{ success: boolean; message: string }>('/api/v1/integrations/configs/test-slack', data).then((r) => r.data),

  listKeys: () =>
    apiClient.get<ApiKey[]>('/api/v1/integrations/keys').then((r) => r.data),

  createKey: (data: { name: string; scopes?: string }) =>
    apiClient.post<ApiKeyCreatedSecretResponse>('/api/v1/integrations/keys', data).then((r) => r.data),

  deleteKey: (id: string) =>
    apiClient.delete(`/api/v1/integrations/keys/${id}`).then((r) => r.data),

  listWebhooks: () =>
    apiClient.get<WebhookSubscription[]>('/api/v1/integrations/webhooks').then((r) => r.data),

  createWebhook: (data: { target_url: string; event_types: string; is_enabled?: boolean }) =>
    apiClient.post<WebhookSubscription>('/api/v1/integrations/webhooks', data).then((r) => r.data),

  deleteWebhook: (id: string) =>
    apiClient.delete(`/api/v1/integrations/webhooks/${id}`).then((r) => r.data),

  listWebhookLogs: () =>
    apiClient.get<WebhookDeliveryLog[]>('/api/v1/integrations/webhooks/logs').then((r) => r.data),

  triggerTestWebhook: (data: { event_type: string; payload?: any }) =>
    apiClient.post<{ success: boolean; message: string }>('/api/v1/integrations/webhooks/test', data).then((r) => r.data),
}
