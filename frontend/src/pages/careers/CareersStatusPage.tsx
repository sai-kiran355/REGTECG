import { useState, FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, CheckCircle, Clock, Star, XCircle, BriefcaseBusiness } from 'lucide-react'
import { careersApi, ApplicationStatus } from '../../api/careers'
import { Spinner } from '../../components/Spinner'
import { CareersLayout } from './CareersLayout'

const STAGE_ICONS: Record<string, React.ReactNode> = {
  applied:   <Clock className="h-8 w-8 text-blue-500" />,
  screening: <Star className="h-8 w-8 text-yellow-500" />,
  interview: <BriefcaseBusiness className="h-8 w-8 text-purple-500" />,
  offer:     <CheckCircle className="h-8 w-8 text-green-500" />,
  hired:     <CheckCircle className="h-8 w-8 text-green-600" />,
  rejected:  <XCircle className="h-8 w-8 text-red-400" />,
}

const STAGE_COLORS: Record<string, string> = {
  applied:   'bg-blue-50 border-blue-200 text-blue-800',
  screening: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  interview: 'bg-purple-50 border-purple-200 text-purple-800',
  offer:     'bg-green-50 border-green-200 text-green-800',
  hired:     'bg-green-50 border-green-200 text-green-900',
  rejected:  'bg-red-50 border-red-200 text-red-700',
}

const PIPELINE_STEPS = ['applied', 'screening', 'interview', 'offer', 'hired']

export function CareersStatusPage() {
  const [params] = useSearchParams()
  const companySlug = params.get('company') ?? ''

  const [applicationId, setApplicationId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApplicationStatus | null>(null)
  const [error, setError] = useState('')

  const handleCheck = async (e: FormEvent) => {
    e.preventDefault()
    if (!applicationId.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await careersApi.checkStatus(companySlug, applicationId.trim())
      setResult(data)
    } catch (err: any) {
      const code = err?.response?.data?.detail?.code
      if (code === 'APPLICATION_NOT_FOUND') {
        setError('No application found with this ID. Please double-check and try again.')
      } else {
        setError('Failed to fetch status. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const currentStepIndex = result ? PIPELINE_STEPS.indexOf(result.stage) : -1

  return (
    <CareersLayout companyName="Careers" companySlug={companySlug}>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Track Your Application</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your Application ID to check the current status</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <form onSubmit={handleCheck} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Application ID</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="Paste your Application ID here"
                value={applicationId}
                onChange={e => setApplicationId(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {loading ? <Spinner size="sm" /> : <><Search className="h-4 w-4" /> Check Status</>}
            </button>
          </form>
        </div>

        {error && (
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <XCircle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-5">
            {/* Status badge */}
            <div className={`flex items-center gap-4 rounded-xl border p-4 ${STAGE_COLORS[result.stage] ?? 'bg-gray-50 border-gray-200'}`}>
              {STAGE_ICONS[result.stage] ?? <Clock className="h-8 w-8" />}
              <div>
                <p className="text-lg font-bold">{result.stage_label}</p>
                <p className="text-sm opacity-75">{result.full_name} · {result.job_title}</p>
              </div>
            </div>

            {/* Pipeline progress */}
            {result.stage !== 'rejected' && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">Application Progress</p>
                <div className="flex items-center gap-0">
                  {PIPELINE_STEPS.map((step, i) => {
                    const done = i <= currentStepIndex
                    const current = i === currentStepIndex
                    return (
                      <div key={step} className="flex items-center flex-1 last:flex-none">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          done ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-400'
                        } ${current ? 'ring-2 ring-violet-300 ring-offset-1' : ''}`}>
                          {done && i < currentStepIndex ? '✓' : i + 1}
                        </div>
                        {i < PIPELINE_STEPS.length - 1 && (
                          <div className={`h-0.5 flex-1 ${i < currentStepIndex ? 'bg-violet-600' : 'bg-gray-100'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-1.5">
                  {PIPELINE_STEPS.map(step => (
                    <p key={step} className="text-[10px] text-gray-400 capitalize flex-1 first:text-left last:text-right text-center">
                      {step === 'applied' ? 'Applied' : step === 'screening' ? 'AI Review' : step === 'interview' ? 'Interview' : step === 'offer' ? 'Offer' : 'Hired'}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result.stage === 'rejected' && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                <p className="text-sm font-medium text-red-800">Application Not Selected</p>
                <p className="text-xs text-red-600 mt-1">
                  Thank you for your interest. Unfortunately, your application was not shortlisted for this position. We encourage you to apply for other openings.
                </p>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Submitted on {new Date(result.submitted_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
            </div>
          </div>
        )}
      </div>
    </CareersLayout>
  )
}
