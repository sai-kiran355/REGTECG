import { useState, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import { useApplicantStore } from '../../store/applicantStore'
import { Alert } from '../../components/Alert'
import { Spinner } from '../../components/Spinner'
import { BankPicker } from '../../components/BankPicker'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// Convert any user input to a valid slug: "Swiss Bank" → "swiss-bank"
const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function ApplicantSignupPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Always slugify whatever comes from the URL so "swiss bank" → "swiss-bank"
  const [tenantSlug] = useState(slugify(params.get('tenant') ?? ''))
  const { setApplicant } = useApplicantStore()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await axios.post(`${BASE_URL}/api/v1/applicant/signup`, {
        tenant_slug: tenantSlug,
        full_name: fullName,
        email,
        mobile,
        password,
      })
      setApplicant({
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
        applicantId: res.data.applicant_id,
        fullName: res.data.full_name,
        email: res.data.email,
        tenantSlug,
      })
      navigate(`/apply/home?tenant=${tenantSlug}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail?.message ?? 'Sign up failed.')
    } finally {
      setLoading(false)
    }
  }

  if (!tenantSlug) return (
    <BankPicker
      redirectPath="/apply/signup"
      title="Create Customer Account"
      subtitle="Select your bank to get started"
      backTo="/"
      backLabel="Back to home"
      onSelect={(slug) => { window.location.href = `/apply/signup?tenant=${slug}` }}
    />
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link to={`/apply/login?tenant=${tenantSlug}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">
            Apply for services at <span className="font-medium capitalize">{tenantSlug.replace(/-/g, ' ')}</span>
          </p>
        </div>

        <div className="card p-7">
          {error && <Alert variant="error" message={error} className="mb-4" />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
              <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="As per Aadhaar" required minLength={2} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mobile Number</label>
              <input type="tel" className="input" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit mobile" required minLength={10} maxLength={15} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-10" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? <Spinner size="sm" /> : 'Create Account'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to={`/apply/login?tenant=${tenantSlug}`} className="font-medium text-blue-600 hover:text-blue-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
