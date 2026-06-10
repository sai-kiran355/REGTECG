/**
 * Attendance & Workforce API client
 */
import { apiClient } from './client'

export interface AttendanceLog {
  id: string
  tenant_id: string
  employee_id: string
  clock_in: string
  clock_out: string | null
  latitude: number | null
  longitude: number | null
  geo_status: 'within_fence' | 'outside_fence' | null
  method: 'face_recognition' | 'manual'
  status: 'present' | 'late' | 'absent'
  employee_name: string | null
}

export interface AttendanceLogListResponse {
  items: AttendanceLog[]
  total: number
}

export interface LeaveRequest {
  id: string
  tenant_id: string
  employee_id: string
  leave_type: 'sick' | 'casual' | 'earned'
  start_date: string
  end_date: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  employee_name: string | null
}

export interface LeaveRequestListResponse {
  items: LeaveRequest[]
  total: number
}

export interface ShiftSchedule {
  id: string
  tenant_id: string
  employee_id: string
  shift_name: string
  start_time: string
  end_time: string
  day_of_week: string | null
  employee_name: string | null
}

export interface ShiftScheduleListResponse {
  items: ShiftSchedule[]
  total: number
}

export const attendanceApi = {
  listAttendanceLogs: (params?: { employee_id?: string; page?: number; page_size?: number }) =>
    apiClient.get<AttendanceLogListResponse>('/api/v1/attendance', { params }).then(r => r.data),

  clockIn: (data: { employee_id: string; latitude?: number; longitude?: number; method?: string }) =>
    apiClient.post<AttendanceLog>('/api/v1/attendance/clock-in', data).then(r => r.data),

  clockOut: (data: { employee_id: string; latitude?: number; longitude?: number }) =>
    apiClient.post<AttendanceLog>('/api/v1/attendance/clock-out', data).then(r => r.data),

  listLeaveRequests: (params?: { employee_id?: string; status?: string }) =>
    apiClient.get<LeaveRequestListResponse>('/api/v1/attendance/leaves', { params }).then(r => r.data),

  createLeaveRequest: (data: {
    employee_id: string
    leave_type: 'sick' | 'casual' | 'earned'
    start_date: string
    end_date: string
    reason?: string
  }) =>
    apiClient.post<LeaveRequest>('/api/v1/attendance/leaves', data).then(r => r.data),

  updateLeaveStatus: (requestId: string, status: 'approved' | 'rejected') =>
    apiClient.put<LeaveRequest>(`/api/v1/attendance/leaves/${requestId}/status`, { status }).then(r => r.data),

  listShiftSchedules: () =>
    apiClient.get<ShiftScheduleListResponse>('/api/v1/attendance/shifts').then(r => r.data),

  assignShift: (data: {
    employee_id: string
    shift_name: string
    start_time: string
    end_time: string
    day_of_week?: string
  }) =>
    apiClient.post<ShiftSchedule>('/api/v1/attendance/shifts', data).then(r => r.data),

  deleteAttendanceLog: (id: string) =>
    apiClient.delete(`/api/v1/attendance/${id}`).then(r => r.data),

  deleteShift: (id: string) =>
    apiClient.delete(`/api/v1/attendance/shifts/${id}`).then(r => r.data),

  deleteLeaveRequest: (id: string) =>
    apiClient.delete(`/api/v1/attendance/leaves/${id}`).then(r => r.data),
}
