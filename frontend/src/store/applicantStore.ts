import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ApplicantState {
  accessToken: string | null
  refreshToken: string | null
  applicantId: string | null
  fullName: string | null
  email: string | null
  tenantSlug: string | null
  isAuthenticated: boolean
  setApplicant: (data: { accessToken: string; refreshToken: string; applicantId: string; fullName: string; email: string; tenantSlug: string }) => void
  logout: () => void
}

export const useApplicantStore = create<ApplicantState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      applicantId: null,
      fullName: null,
      email: null,
      tenantSlug: null,
      isAuthenticated: false,

      setApplicant: (data) => set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        applicantId: data.applicantId,
        fullName: data.fullName,
        email: data.email,
        tenantSlug: data.tenantSlug,
        isAuthenticated: true,
      }),

      logout: () => set({
        accessToken: null, refreshToken: null, applicantId: null,
        fullName: null, email: null, tenantSlug: null, isAuthenticated: false,
      }),
    }),
    {
      name: 'regtech-applicant',
    }
  )
)
