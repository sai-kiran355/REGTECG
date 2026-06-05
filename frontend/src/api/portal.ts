/**
 * Portal API client — public endpoints, no JWT required.
 * Uses plain axios without the authenticated apiClient interceptor.
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export interface PortalSubmitPayload {
  // Step 1 — Personal details
  full_name: string
  date_of_birth: string       // YYYY-MM-DD
  gender: 'Male' | 'Female' | 'Other'
  mobile: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  application_purpose: string
  // Step 2 — Identity
  aadhaar_number: string
  pan_number: string
  // Documents
  aadhaar_front: File
  aadhaar_back: File
  pan_card: File
  selfie: File
}

export interface PortalSubmitResponse {
  reference_number: string
  kyc_record_id: string
  submitted_at: string
}

export interface PortalStatusResponse {
  reference_number: string
  case_status: string
  kyc_status: string
  applicant_label: string
  submitted_at: string
}

/**
 * Submit a KYC application.
 * Sends multipart/form-data with all fields and document files.
 */
export async function submitApplication(
  tenantSlug: string,
  payload: PortalSubmitPayload,
): Promise<PortalSubmitResponse> {
  const form = new FormData()

  // Text fields
  form.append('full_name', payload.full_name)
  form.append('date_of_birth', payload.date_of_birth)
  form.append('gender', payload.gender)
  form.append('mobile', payload.mobile)
  form.append('email', payload.email)
  form.append('address', payload.address)
  form.append('city', payload.city)
  form.append('state', payload.state)
  form.append('pincode', payload.pincode)
  if (payload.application_purpose) {
    form.append('application_purpose', payload.application_purpose)
  }
  form.append('aadhaar_number', payload.aadhaar_number)
  form.append('pan_number', payload.pan_number)

  // Files
  form.append('aadhaar_front', payload.aadhaar_front)
  form.append('aadhaar_back', payload.aadhaar_back)
  form.append('pan_card', payload.pan_card)
  form.append('selfie', payload.selfie)

  const res = await axios.post<PortalSubmitResponse>(
    `${BASE_URL}/api/v1/portal/submit`,
    form,
    {
      headers: {
        'X-Tenant-ID': tenantSlug,
        // Content-Type is set automatically by axios for FormData
      },
    },
  )
  return res.data
}

/**
 * Check application status by reference number.
 */
export async function getApplicationStatus(
  tenantSlug: string,
  referenceNumber: string,
): Promise<PortalStatusResponse> {
  const res = await axios.get<PortalStatusResponse>(
    `${BASE_URL}/api/v1/portal/status/${encodeURIComponent(referenceNumber)}`,
    {
      headers: { 'X-Tenant-ID': tenantSlug },
    },
  )
  return res.data
}
