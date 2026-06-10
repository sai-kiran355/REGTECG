import { useState, FormEvent } from 'react'
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, Layers, ArrowLeft } from 'lucide-react'
import { loginApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { Alert } from '../components/Alert'
import { Spinner } from '../components/Spinner'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setTokens, isAuthenticated, user } = useAuthStore()

  const isFintech = location.pathname.includes('fintech')
  const product = isFintech ? 'fintech' : 'compliance'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Already logged in — send to the right dashboard only if product type matches the authenticated user
  if (isAuthenticated && !loading) {
    const isUserFintech = user?.organization_type === 'fintech'
    if (isUserFintech === isFintech) {
      const dest = isUserFintech ? '/fintech/dashboard' : '/dashboard'
      return <Navigate to={dest} replace />
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await loginApi(email, password, product)
      setTokens(data.access_token, data.refresh_token)
      let orgType = isFintech ? 'fintech' : 'bank'
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
          tenant_slug: profile.data.tenant_slug,
        })
        orgType = profile.data.organization_type ?? orgType
      } catch { /* non-critical */ }
      navigate(orgType === 'fintech' ? '/fintech/dashboard' : '/dashboard', { replace: true })
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

  // const accent    = isFintech ? 'violet' : 'blue'
  const Icon      = isFintech ? Layers : ShieldCheck
  const iconBg    = isFintech ? 'bg-violet-500/15 border-violet-500/20' : 'bg-blue-500/15 border-blue-500/20'
  const iconColor = isFintech ? 'text-violet-400' : 'text-blue-400'
  const btnClass  = isFintech
    ? 'bg-violet-600 hover:bg-violet-500 focus:ring-violet-500'
    : 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500'
  const productName = isFintech ? 'Fintech Platform' : 'Compliance Platform'
  const productSub  = isFintech ? 'HR · Recruitment · Attendance · Payroll' : 'AML · KYC · Sanctions · Audit'

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-10 py-7">
        <Link to="/" className="flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-white" />
          <span className="text-base font-bold text-white tracking-tight">ComplianceOS</span>
        </Link>
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Switch product
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-8">

          {/* Product badge */}
          <div className="text-center space-y-5">
            <div className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border ${iconBg}`}>
              <Icon className={`h-8 w-8 ${iconColor}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{productName}</h1>
              <p className="mt-1 text-sm text-white/35">{productSub}</p>
            </div>
          </div>

          {/* Form card */}
          <div className="rounded-3xl border border-white/8 bg-white/4 p-8 backdrop-blur-sm space-y-5">

            {error && <Alert variant="error" message={error} />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-white/50 uppercase tracking-wider">
                  Email address
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"
                  placeholder="you@yourcompany.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Password</label>
                  <button type="button" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder-white/20 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 ${btnClass}`}
              >
                {loading ? <Spinner size="sm" /> : 'Sign in'}
              </button>
            </form>
          </div>

          {/* Bottom */}
          <p className="text-center text-xs text-white/25">
            Don't have an account?{' '}
            <Link to="/signup" className="text-white/45 hover:text-white/70 underline underline-offset-2 transition-colors">
              Get started free
            </Link>
          </p>

        </div>
      </main>

      <footer className="px-10 py-6">
        <p className="text-center text-xs text-white/15">© 2024 ComplianceOS Pvt. Ltd. · Protected by enterprise-grade security</p>
      </footer>

    </div>
  )
}
