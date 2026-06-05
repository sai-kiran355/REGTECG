/**
 * Typed API helpers for all compliance endpoints.
 * All calls inject X-Tenant-ID and Authorization headers via the apiClient interceptor.
 */

import { apiClient } from './client'

// ── Types ──────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface Case {
  id: string
  case_number: string
  subject_name: string
  subject_type: 'individual' | 'entity'
  case_type: 'aml' | 'kyc' | 'sanctions'
  status: 'open' | 'in_review' | 'pending' | 'closed'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  description?: string
  assigned_to?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface KYCRecord {
  id: string
  full_name: string
  date_of_birth: string
  nationality: string
  document_type: string
  document_number: string
  status: 'pending' | 'in_review' | 'verified' | 'rejected'
  risk_level: 'low' | 'medium' | 'high'
  reviewer_id?: string
  application_purpose?: string
  notes?: string
  case_id?: string
  created_at: string
  updated_at: string
}

export interface AMLAlert {
  id: string
  entity_name: string
  entity_type: 'individual' | 'entity'
  alert_type: string
  amount: number
  currency: string
  risk_score: number
  status: 'open' | 'in_review' | 'closed' | 'false_positive'
  description: string
  case_id?: string
  created_at: string
  updated_at: string
}

export interface SanctionsScreening {
  id: string
  entity_name: string
  entity_type: 'individual' | 'entity'
  sanctions_list: string
  match_type: 'confirmed' | 'possible' | 'no_match'
  match_score: number
  status: 'hit' | 'review' | 'clear'
  screened_by?: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_email: string
  action: string
  resource_type: string
  resource_id: string
  ip_address?: string
  result: 'success' | 'failure' | 'denied'
  details?: Record<string, unknown>
  created_at: string
}

export interface AdminUser {
  id: string
  email: string
  role_name: string
  role_id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

// ── Cases ──────────────────────────────────────────────────────────────────

export const casesApi = {
  list: (params?: { status?: string; case_type?: string; risk_level?: string; page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<Case>>('/api/v1/cases', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<Case>(`/api/v1/cases/${id}`).then(r => r.data),

  create: (data: { subject_name: string; subject_type: string; case_type: string; risk_level: string; description?: string }) =>
    apiClient.post<Case>('/api/v1/cases', data).then(r => r.data),

  update: (id: string, data: Partial<Case>) =>
    apiClient.put<Case>(`/api/v1/cases/${id}`, data).then(r => r.data),

  close: (id: string) =>
    apiClient.delete<Case>(`/api/v1/cases/${id}`).then(r => r.data),

  deletePermanently: (id: string) =>
    apiClient.delete(`/api/v1/cases/${id}/permanent`).then(r => r.data),
}

// ── KYC ───────────────────────────────────────────────────────────────────

export const kycApi = {
  list: (params?: { status?: string; risk_level?: string; page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<KYCRecord>>('/api/v1/kyc', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<KYCRecord>(`/api/v1/kyc/${id}`).then(r => r.data),

  create: (data: Omit<KYCRecord, 'id' | 'created_at' | 'updated_at' | 'status'>) =>
    apiClient.post<KYCRecord>('/api/v1/kyc', data).then(r => r.data),

  update: (id: string, data: Partial<KYCRecord>) =>
    apiClient.put<KYCRecord>(`/api/v1/kyc/${id}`, data).then(r => r.data),

  review: (id: string, data: { status: string; notes?: string }) =>
    apiClient.post<KYCRecord>(`/api/v1/kyc/${id}/review`, data).then(r => r.data),

  deletePermanently: (id: string) =>
    apiClient.delete(`/api/v1/kyc/${id}/permanent`).then(r => r.data),
}

// ── AML ───────────────────────────────────────────────────────────────────

export const amlApi = {
  list: (params?: { status?: string; alert_type?: string; page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<AMLAlert>>('/api/v1/aml/alerts', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<AMLAlert>(`/api/v1/aml/alerts/${id}`).then(r => r.data),

  create: (data: Omit<AMLAlert, 'id' | 'created_at' | 'updated_at' | 'status'>) =>
    apiClient.post<AMLAlert>('/api/v1/aml/alerts', data).then(r => r.data),

  update: (id: string, data: Partial<AMLAlert>) =>
    apiClient.put<AMLAlert>(`/api/v1/aml/alerts/${id}`, data).then(r => r.data),
}

// ── Sanctions ─────────────────────────────────────────────────────────────

export const sanctionsApi = {
  list: (params?: { status?: string; match_type?: string; page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<SanctionsScreening>>('/api/v1/sanctions/screenings', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<SanctionsScreening>(`/api/v1/sanctions/screenings/${id}`).then(r => r.data),

  screen: (data: { entity_name: string; entity_type: string; sanctions_list: string }) =>
    apiClient.post<SanctionsScreening>('/api/v1/sanctions/screen', data).then(r => r.data),
}

// ── Audit ─────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: { action?: string; resource_type?: string; page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<AuditLog>>('/api/v1/audit/logs', { params }).then(r => r.data),
}

// ── Admin Users ───────────────────────────────────────────────────────────

export const adminApi = {
  listUsers: (params?: { page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<AdminUser>>('/api/v1/admin/users', { params }).then(r => r.data),

  createUser: (data: { email: string; password: string; role_name: string }) =>
    apiClient.post<AdminUser>('/api/v1/admin/users', data).then(r => r.data),

  updateRole: (userId: string, role_name: string) =>
    apiClient.put<AdminUser>(`/api/v1/admin/users/${userId}/role`, { role_name }).then(r => r.data),
}
