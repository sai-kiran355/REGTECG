import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, Building2, Landmark } from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { Alert } from '../components/Alert'
import { Spinner } from '../components/Spinner'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export function SignUpPage() {
  const navigate = useNavigate()
  const { setTokens, setTenantSlug } = useAuthStore()

  const [orgName, setOrgName]       = useState('')
  const [orgType, setOrgType]       = useState<'bank' | 'fintech'>('bank')
  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await axios.post(`${BASE_URL}/api/v1/auth/signup`, {
        organization_name: orgName,
        organization_type: orgType,
        full_name: fullName,
        email,
        password,
      })
      setTokens(res.data.access_token, res.data.refresh_token)
      // Derive slug from org name — same logic as backend _slugify
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      setTenantSlug(slug)
      // Fetch real profile to get org name etc
      try {
        const { apiClient } = await import('../api/client')
        const profile = await apiClient.get('/api/v1/profile')
        const store = (await import('../store/authStore')).useAuthStore.getState()
        store.setUser({
          ...store.user!,
          full_name: profile.data.full_name,
          email: profile.data.email,
          organization_name: profile.data.organization_name,
          organization_type: profile.data.organization_type,
        })
      } catch { /* non-critical */ }
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.detail?.message ?? 'Sign up failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <ShieldCheck className="h-9 w-9 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">ComplianceOS</h1>
          <p className="mt-1 text-slate-400">AML · KYC · Sanctions Compliance Platform</p>
        </div>

        <div className="card p-8">
          <h2 className="mb-1 text-xl font-semibold text-gray-900">Create your account</h2>
          <p className="mb-6 text-sm text-gray-500">Set up your organization and get started in minutes.</p>

          {error && <Alert variant="error" message={error} className="mb-4" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization type */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Organization Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrgType('bank')}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
                    orgType === 'bank'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Landmark className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Bank</p>
                    <p className="text-xs text-gray-500">Commercial or retail bank</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setOrgType('fintech')}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
                    orgType === 'fintech'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building2 className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Fintech</p>
                    <p className="text-xs text-gray-500">Payment or financial service</p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Organization Name</label>
              <input
                type="text"
                className="input"
                placeholder={orgType === 'bank' ? 'e.g. Acme Bank' : 'e.g. FastPay Solutions'}
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                required
                minLength={2}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Your Full Name</label>
              <input
                type="text"
                className="input"
                placeholder="John Smith"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                minLength={2}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Work Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@yourcompany.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? <Spinner size="sm" /> : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
