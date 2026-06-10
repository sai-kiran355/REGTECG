/**
 * Workforce Analytics API Client
 */
import { apiClient } from './client'

export interface PerformanceReview {
  id: string
  tenant_id: string
  employee_id: string
  employee_name: string
  department: string
  review_date: string
  reviewer_name: string
  rating: number
  goals_met_pct: number
  feedback: string | null
}

export interface HeadcountPlan {
  id: string
  tenant_id: string
  department: string
  year: number
  target_count: number
  budget_allocated: number
}

export interface HeadcountSummary {
  department: string
  actual_count: number
  target_count: number
  gap: number
  budget_allocated: number
  budget_spent: number
}

export interface AttritionPrediction {
  id: string
  employee_id: string
  employee_name: string
  department: string
  job_title: string
  risk_score: number
  risk_level: 'Low' | 'Medium' | 'High'
  risk_drivers: string[]
  recommendations: string | null
  last_updated: string
}

export interface AIInsight {
  id: string
  type: 'info' | 'warning' | 'danger' | 'success'
  title: string
  description: string
  department: string
}

export interface AnalyticsOverview {
  avg_rating: number
  high_risk_pct: number
  headcount_completion_pct: number
  total_budget: number
  total_spent: number
}

export const analyticsApi = {
  getOverview: (year: number = 2026) =>
    apiClient.get<AnalyticsOverview>('/api/v1/analytics/overview', { params: { year } }).then(r => r.data),

  listPerformanceReviews: () =>
    apiClient.get<PerformanceReview[]>('/api/v1/analytics/performance').then(r => r.data),

  createPerformanceReview: (data: {
    employee_id: string
    reviewer_name: string
    rating: number
    goals_met_pct: number
    feedback?: string
  }) =>
    apiClient.post<PerformanceReview>('/api/v1/analytics/performance', data).then(r => r.data),

  deletePerformanceReview: (id: string) =>
    apiClient.delete(`/api/v1/analytics/performance/${id}`).then(r => r.data),

  listHeadcountPlans: (year?: number) =>
    apiClient.get<HeadcountPlan[]>('/api/v1/analytics/headcount', { params: { year } }).then(r => r.data),

  saveHeadcountPlan: (data: {
    department: string
    year: number
    target_count: number
    budget_allocated: number
  }) =>
    apiClient.post<HeadcountPlan>('/api/v1/analytics/headcount', data).then(r => r.data),

  getHeadcountSummary: (year: number = 2026) =>
    apiClient.get<HeadcountSummary[]>('/api/v1/analytics/headcount/summary', { params: { year } }).then(r => r.data),

  listAttritionPredictions: () =>
    apiClient.get<AttritionPrediction[]>('/api/v1/analytics/attrition').then(r => r.data),

  recalculateAttrition: () =>
    apiClient.post<AttritionPrediction[]>('/api/v1/analytics/attrition/recalculate').then(r => r.data),

  listAIInsights: (year: number = 2026) =>
    apiClient.get<AIInsight[]>('/api/v1/analytics/ai-insights', { params: { year } }).then(r => r.data),
}
