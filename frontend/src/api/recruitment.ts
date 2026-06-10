/**
 * Recruitment & ATS API client
 */
import { apiClient } from './client'

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl
  }
  const host = window.location.hostname
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:8000`
  }
  return envUrl ?? 'http://localhost:8000'
}

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

export interface Employee {
  id: string
  tenant_id: string
  full_name: string
  email: string
  phone: string | null
  department: string
  job_title: string
  status: 'onboarding' | 'active' | 'suspended' | 'terminated'
  kyc_status: 'pending' | 'verified' | 'flagged'
  manager_name: string | null
  hire_date: string
  dob: string | null
  address: string | null
  bank_details: string | null
  education: string | null
  uploaded_docs: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeStats {
  total: number
  active: number
  onboarding: number
  flagged: number
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

  deleteCandidate: (id: string) =>
    apiClient.delete(`/api/v1/recruitment/candidates/${id}`).then(r => r.data),

  screenCandidate: (id: string) =>
    apiClient.post<AIScreeningResult>(`/api/v1/recruitment/candidates/${id}/screen`).then(r => r.data),

  getResumeUrl: (id: string) =>
    `${getApiBaseUrl()}/api/v1/recruitment/candidates/${id}/resume`,

  getPipelineStats: (jobId?: string) =>
    apiClient.get<PipelineStats>('/api/v1/recruitment/pipeline', { params: jobId ? { job_id: jobId } : {} }).then(r => r.data),

  // Employees
  listEmployees: (params?: { search?: string; department?: string; status?: string; page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<Employee>>('/api/v1/recruitment/employees', { params }).then(r => r.data),

  getEmployee: (id: string) =>
    apiClient.get<Employee>(`/api/v1/recruitment/employees/${id}`).then(r => r.data),

  createEmployee: (data: Partial<Employee>) =>
    apiClient.post<Employee>('/api/v1/recruitment/employees', data).then(r => r.data),

  updateEmployee: (id: string, data: Partial<Employee>) =>
    apiClient.put<Employee>(`/api/v1/recruitment/employees/${id}`, data).then(r => r.data),

  deleteEmployee: (id: string) =>
    apiClient.delete(`/api/v1/recruitment/employees/${id}`).then(r => r.data),

  promoteCandidate: (candidateId: string) =>
    apiClient.post<Employee>(`/api/v1/recruitment/candidates/${candidateId}/promote`).then(r => r.data),

  submitPublicOnboarding: (id: string, data: Partial<Employee>) =>
    apiClient.put<Employee>(`/api/v1/recruitment/employees/${id}/public-onboard`, data).then(r => r.data),

  getPublicEmployee: (id: string) =>
    apiClient.get<Employee>(`/api/v1/recruitment/employees/${id}/public`).then(r => r.data),

  uploadEmployeeDoc: (id: string, docType: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<{ message: string; filename: string }>(
      `/api/v1/recruitment/employees/${id}/upload-doc?doc_type=${docType}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data)
  },

  getEmployeeDocUrl: (id: string, docType: string, download?: boolean) => {
    const baseUrl = getApiBaseUrl()
    const query = download ? '?download=true' : ''
    return `${baseUrl}/api/v1/recruitment/employees/${id}/download-doc/${docType}${query}`
  },

  getEmployeeStats: () =>
    apiClient.get<EmployeeStats>('/api/v1/recruitment/employees/stats').then(r => r.data),
}
