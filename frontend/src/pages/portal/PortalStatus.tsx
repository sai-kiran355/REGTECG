import { useState, FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { getApplicationStatus, PortalStatusResponse } from '../../api/portal'
import { PortalLayout } from './PortalLayout'
import { Spinner } from '../../components/Spinner'
import { BankPicker } from '../../components/BankPicker'
const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'Under Review': <Clock className="h-8 w-8 text-blue-600" />,
  'Processing': <Clock className="h-8 w-8 text-yellow-600" />,
  'Additional Verification Required': <AlertTriangle className="h-8 w-8 text-orange-600" />,
  'Completed': <CheckCircle className="h-8 w-8 text-green-600" />,
}

const STATUS_COLORS: Record<string, string> = {
  'Under Review': 'bg-blue-50 border-blue-200 text-blue-800',
  'Processing': 'bg-yellow-50 border-yellow-200 text-yellow-800',
  'Additional Verification Required': 'bg-orange-50 border-orange-200 text-orange-800',
  'Completed': 'bg-green-50 border-green-200 text-green-800',
}

export function PortalStatus() {
  const [params] = useSearchParams()
  const tenantSlug = slugify(params.get('tenant') ?? '')

  const [refNumber, setRefNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PortalStatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!tenantSlug) return (
    <BankPicker
      redirectPath="/portal/status"
      title="Track Application"
      subtitle="Select your bank to check your application status"
      backTo="/"
      backLabel="Back to home"
      onSelect={(slug) => { window.location.href = `/portal/status?tenant=${slug}` }}
    />
  )

  const handleCheck = async (e: FormEvent) => {
    e.preventDefault()
    if (!refNumber.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await getApplicationStatus(tenantSlug, refNumber.trim())
      setResult(data)
    } catch (err: any) {
      const code = err?.response?.data?.detail?.code
      if (code === 'APPLICATION_NOT_FOUND') {
        setError('No application found with this reference number. Please check and try again.')
      } else {
        setError('Failed to fetch status. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <PortalLayout tenantName={tenantSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Track Your Application</h1>
          <p className="mt-1 text-gray-500">Enter your reference number to check the status of your KYC application</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleCheck} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reference Number</label>
              <input
                type="text"
                className="input font-mono tracking-wider"
                placeholder="e.g. CASE-001"
                value={refNumber}
                onChange={e => setRefNumber(e.target.value.toUpperCase())}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-lg py-3 font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#1a3c6e' }}>
              {loading ? <Spinner size="sm" /> : <><Search className="h-4 w-4" /> Check Status</>}
            </button>
          </form>
        </div>

        {error && (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="card p-6 space-y-4">
            <div className={`flex items-center gap-4 rounded-xl border p-4 ${STATUS_COLORS[result.applicant_label] ?? 'bg-gray-50 border-gray-200'}`}>
              {STATUS_ICONS[result.applicant_label] ?? <Clock className="h-8 w-8" />}
              <div>
                <p className="text-lg font-bold">{result.applicant_label}</p>
                <p className="text-sm opacity-80">Reference: {result.reference_number}</p>
              </div>
            </div>

            {/* Rejection notice */}
            {result.kyc_status === 'rejected' && (
              <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Application Rejected</p>
                  <p className="text-sm text-red-700 mt-0.5">
                    Your KYC application was not approved. You may apply again after 3 months from the original submission date.
                    If you have questions, please contact your bank branch.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Application Status</span>
                <span className="font-medium capitalize">{result.case_status.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">KYC Status</span>
                <span className={`font-medium capitalize ${result.kyc_status === 'rejected' ? 'text-red-600' : result.kyc_status === 'verified' ? 'text-green-600' : ''}`}>
                  {result.kyc_status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Submitted On</span>
                <span className="font-medium">{new Date(result.submitted_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
