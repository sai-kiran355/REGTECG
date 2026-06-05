import { useState, FormEvent } from 'react'
import { CheckCircle, ChevronLeft, Send, AlertCircle } from 'lucide-react'
import { Spinner } from '../../components/Spinner'
import { submitApplication, PortalSubmitResponse } from '../../api/portal'
import type { Step1Data } from './Step1PersonalDetails'
import type { Step2Data } from './Step2Documents'

const PURPOSE_LABELS: Record<string, string> = {
  personal_loan:  'Personal Loan',
  home_loan:      'Home Loan',
  car_loan:       'Car / Vehicle Loan',
  credit_card:    'Credit Card',
  investment:     'Investment / Mutual Funds',
  insurance:      'Insurance',
  forex:          'Forex / Remittance',
  other:          'Other',
}

interface Props {
  step1: Step1Data
  step2: Step2Data
  tenantSlug: string
  onBack: () => void
  onSuccess: (response: PortalSubmitResponse) => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
    </div>
  )
}

export function Step3Review({ step1, step2, tenantSlug, onBack, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const response = await submitApplication(tenantSlug, {
        ...step1,
        gender: step1.gender as 'Male' | 'Female' | 'Other',
        aadhaar_number: step2.aadhaar_number,
        pan_number: step2.pan_number,
        aadhaar_front: step2.aadhaar_front!,
        aadhaar_back: step2.aadhaar_back!,
        pan_card: step2.pan_card!,
        selfie: step2.selfie!,
      })
      onSuccess(response)
    } catch (err: any) {
      const msg = err?.response?.data?.detail?.message ?? 'Submission failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const maskedAadhaar = step2.aadhaar_number.replace(/\d(?=\d{4})/g, 'X')

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Review Your Application</h2>
            <p className="text-xs text-gray-500">Please verify all details before submitting</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Personal Details</p>
          <Row label="Full Name" value={step1.full_name} />
          <Row label="Date of Birth" value={step1.date_of_birth} />
          <Row label="Gender" value={step1.gender} />
          <Row label="Mobile" value={step1.mobile} />
          <Row label="Email" value={step1.email} />
          {step1.application_purpose && (
            <Row label="Purpose of Application" value={PURPOSE_LABELS[step1.application_purpose] ?? step1.application_purpose} />
          )}
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Address</p>
          <Row label="Address" value={step1.address} />
          <Row label="City" value={step1.city} />
          <Row label="State" value={step1.state} />
          <Row label="Pincode" value={step1.pincode} />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Identity Documents</p>
          <Row label="Aadhaar Number" value={maskedAadhaar} />
          <Row label="PAN Number" value={step2.pan_number} />
          <Row label="Aadhaar Front" value={step2.aadhaar_front?.name ?? '—'} />
          <Row label="Aadhaar Back" value={step2.aadhaar_back?.name ?? '—'} />
          <Row label="PAN Card" value={step2.pan_card?.name ?? '—'} />
          <Row label="Selfie" value={step2.selfie?.name ?? '—'} />
        </div>
      </div>

      {error && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Submission Failed</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-medium">Declaration</p>
        <p className="mt-1 text-xs">I hereby declare that the information provided is true and correct to the best of my knowledge. I consent to the verification of my identity documents.</p>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} disabled={loading} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold text-white shadow-sm disabled:opacity-50" style={{ backgroundColor: '#1a3c6e' }}>
          {loading ? <Spinner size="sm" /> : <><Send className="h-5 w-5" /> Submit Application</>}
        </button>
      </div>
    </form>
  )
}
