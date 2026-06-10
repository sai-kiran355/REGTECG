/**
 * Public Careers Portal API — no auth required.
 * Uses company slug header instead of tenant ID.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL && !import.meta.env.VITE_API_BASE_URL.includes('localhost')
  ? import.meta.env.VITE_API_BASE_URL
  : (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000')

export interface PublicJob {
  id: string
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
  status: string
  created_at: string
}

export interface ApplicationStatus {
  application_id: string
  full_name: string
  job_title: string
  stage: string
  stage_label: string
  submitted_at: string
}

function headers(companySlug: string) {
  return { 'X-Company-Slug': companySlug }
}

export const careersApi = {
  listJobs: (companySlug: string) =>
    axios.get<{ company: string; company_slug: string; total: number; jobs: PublicJob[] }>(
      `${BASE_URL}/api/v1/careers/jobs`,
      { headers: headers(companySlug) }
    ).then(r => r.data),

  getJob: (companySlug: string, jobId: string) =>
    axios.get<{ company: string; company_slug: string; job: PublicJob }>(
      `${BASE_URL}/api/v1/careers/jobs/${jobId}`,
      { headers: headers(companySlug) }
    ).then(r => r.data),

  apply: (companySlug: string, jobId: string, formData: FormData) =>
    axios.post<{ application_id: string; reference: string; message: string; submitted_at: string }>(
      `${BASE_URL}/api/v1/careers/jobs/${jobId}/apply`,
      formData,
      { headers: { ...headers(companySlug), 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data),

  checkStatus: (companySlug: string, applicationId: string) =>
    axios.get<ApplicationStatus>(
      `${BASE_URL}/api/v1/careers/application/${applicationId}/status`,
      { headers: headers(companySlug) }
    ).then(r => r.data),
}
