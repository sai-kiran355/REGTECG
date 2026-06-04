import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { loginApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { Alert } from '../components/Alert'
import { Spinner } from '../components/Spinner'

export function LoginPage() {
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await loginApi(email, password)
      setTokens(data.access_token, data.refresh_token)
      // Fetch profile to get organization name and full name
      try {
        const { apiClient } = await import('../api/client')
        const profile = await apiClient.get('/api/v1/profile')
        const store = useAuthStore.getState()
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
      const code = err?.response?.data?.detail?.code
      if (code === 'RATE_LIMITED') {
        const retryAfter = err.response.headers['retry-after'] ?? '60'
        setError(`Too many failed attempts. Try again in ${retryAfter}s.`)
      } else {
        setError('Invalid email or password. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-blue-400" />
          <span className="text-xl font-bold text-white">ComplianceOS</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight">
            Compliance made<br />simple and secure.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            AML screening, KYC verification, and sanctions monitoring — all in one platform built for banks and fintechs.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: 'AML Alerts', value: 'Real-time' },
              { label: 'KYC Checks', value: 'Automated' },
              { label: 'Sanctions', value: 'OFAC · EU · UN' },
            ].map(item => (
              <div key={item.label} className="rounded-lg bg-white/10 p-4">
                <p className="text-sm font-semibold text-white">{item.value}</p>
                <p className="text-xs text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">© 2024 ComplianceOS. All rights reserved.</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <ShieldCheck className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold text-white">ComplianceOS</span>
          </div>

          <div className="card p-8">
            <h2 className="mb-1 text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mb-6 text-sm text-gray-500">Sign in to your compliance dashboard</p>

            {error && <Alert variant="error" message={error} className="mb-4" />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@yourcompany.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <button type="button" className="text-xs text-blue-600 hover:text-blue-700">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
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

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
                {loading ? <Spinner size="sm" /> : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-700">
                Create one free
              </Link>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Protected by enterprise-grade security · SOC 2 compliant
          </p>
        </div>
      </div>
    </div>
  )
}
