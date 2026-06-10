/**
 * Payroll & Compensation API Client
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

export interface SalaryStructure {
  id: string
  tenant_id: string
  employee_id: string
  monthly_base_salary: number
  allowances: number
  pf_opt_in: boolean
  esi_opt_in: boolean
  pan_number: string | null
  employee_name: string | null
}

export interface SalaryStructureListResponse {
  items: SalaryStructure[]
  total: number
}

export interface PayrollLog {
  id: string
  tenant_id: string
  employee_id: string
  pay_period: string
  base_salary: number
  allowances: number
  deductions_tds: number
  deductions_pf: number
  deductions_esi: number
  net_salary: number
  payment_status: string
  processed_at: string
  employee_name: string | null
}

export interface PayrollLogListResponse {
  items: PayrollLog[]
  total: number
}

export const payrollApi = {
  listSalaryStructures: () =>
    apiClient.get<SalaryStructureListResponse>('/api/v1/payroll/structures').then(r => r.data),

  saveSalaryStructure: (data: {
    employee_id: string
    monthly_base_salary: number
    allowances: number
    pf_opt_in: boolean
    esi_opt_in: boolean
    pan_number?: string
  }) =>
    apiClient.post<SalaryStructure>('/api/v1/payroll/structures', data).then(r => r.data),

  listPayrollLogs: (params?: { pay_period?: string }) =>
    apiClient.get<PayrollLogListResponse>('/api/v1/payroll/logs', { params }).then(r => r.data),

  processPayroll: (data: { pay_period: string }) =>
    apiClient.post<PayrollLogListResponse>('/api/v1/payroll/process', data).then(r => r.data),

  deletePayrollLog: (id: string) =>
    apiClient.delete(`/api/v1/payroll/logs/${id}`).then(r => r.data),

  getPayslipUrl: (id: string, token: string) => {
    const baseUrl = getApiBaseUrl()
    return `${baseUrl}/api/v1/payroll/slips/${id}?token=${token}`
  }
}
