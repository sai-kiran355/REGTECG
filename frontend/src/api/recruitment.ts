/**
 * Recruitment & ATS API client
 */
import { apiClient } from './client'

export interface Job {
  id: string
  tenant_id: string
  title: string
  department: string
  location: string
  employment_type: string
  experience_min: number
  experience_max: number | null
  salary_min: number | null
  salary_max: number | null
  description: string
  requirements: string
  status: 'draft' | 'open' | 'paused' | 'closed'
  created_by: string
  candidate_count: number
  created_at: string
  updated_at: string
}

export interface Candidate {
  id: string
  tenant_id: string
  job_id: string
  full_name: string
  email: string
  phone: string | null
  current_company: string | null
  current_title: string | null
  experience_years: number
  skills: string | null
  stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
  ai_score: number | null
  ai_summary: string | null
  notes: string | null
  source: string
  has_resume: boolean
  created_at: string
  updated_at: string
}

export interface PipelineStats {
  applied: number
  screening: number
  interview: number
  offer: number
  hired: number
  rejected: number
}

export interface AIScreeningResult {
  candidate_id: string
  score: number
  summary: string
  strengths: string[]
  gaps: string[]
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export const recruitmentApi = {
  // Jobs
  listJobs: (params?: { status?: string; department?: string; page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<Job>>('/api/v1/recruitment/jobs', { params }).then(r => r.data),

  getJob: (id: string) =>
    apiClient.get<Job>(`/api/v1/recruitment/jobs/${id}`).then(r => r.data),

  createJob: (data: Partial<Job>) =>
    apiClient.post<Job>('/api/v1/recruitment/jobs', data).then(r => r.data),

  updateJob: (id: string, data: Partial<Job>) =>
    apiClient.put<Job>(`/api/v1/recruitment/jobs/${id}`, data).then(r => r.data),

  deleteJob: (id: string) =>
    apiClient.delete(`/api/v1/recruitment/jobs/${id}`),

  // Candidates
  listCandidates: (jobId: string, params?: { stage?: string; page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<Candidate>>(`/api/v1/recruitment/jobs/${jobId}/candidates`, { params }).then(r => r.data),

  addCandidate: (jobId: string, formData: FormData) =>
    apiClient.post<Candidate>(`/api/v1/recruitment/jobs/${jobId}/candidates`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  getCandidate: (id: string) =>
    apiClient.get<Candidate>(`/api/v1/recruitment/candidates/${id}`).then(r => r.data),

  updateStage: (id: string, stage: string, notes?: string) =>
    apiClient.put<Candidate>(`/api/v1/recruitment/candidates/${id}/stage`, { stage, notes }).then(r => r.data),

  screenCandidate: (id: string) =>
    apiClient.post<AIScreeningResult>(`/api/v1/recruitment/candidates/${id}/screen`).then(r => r.data),

  getResumeUrl: (id: string) =>
    `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}/api/v1/recruitment/candidates/${id}/resume`,

  getPipelineStats: (jobId?: string) =>
    apiClient.get<PipelineStats>('/api/v1/recruitment/pipeline', { params: jobId ? { job_id: jobId } : {} }).then(r => r.data),
}
