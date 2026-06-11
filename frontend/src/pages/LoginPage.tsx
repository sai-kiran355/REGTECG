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

  const Icon      = isFintech ? Layers : ShieldCheck
  const iconBg    = isFintech ? 'bg-violet-50 border-violet-100 text-violet-650' : 'bg-blue-50 border-blue-100 text-blue-650'
  const iconColor = isFintech ? 'text-violet-600' : 'text-blue-600'
  const accentGlow = isFintech ? 'bg-violet-500/5' : 'bg-blue-500/5'
  const btnClass  = isFintech
    ? 'bg-violet-600 hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-500/10 focus:ring-violet-500'
    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/10 focus:ring-blue-500'
  const productName = isFintech ? 'Fintech Platform' : 'Compliance Platform'
  const productSub  = isFintech ? 'HR · Recruitment · Attendance · Payroll' : 'AML · KYC · Sanctions · Audit'

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 relative text-slate-800 select-none font-sans bg-slate-50/50 overflow-y-auto">
      {/* Ambient background glows */}
      <div className={`absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full ${accentGlow} blur-[120px] pointer-events-none`} />
      <div className={`absolute bottom-[10%] right-[10%] w-[30rem] h-[30rem] rounded-full ${accentGlow} blur-[120px] pointer-events-none`} />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-35 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center gap-6 py-6">
        
        {/* Brand/App Header */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform duration-300">
            <ShieldCheck className="h-5.5 w-5.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-base font-extrabold text-slate-900 tracking-tight leading-none">ComplianceOS</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Threshing Floor Group</span>
          </div>
        </Link>

        {/* Centered Login Card */}
        <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xl shadow-slate-100/50 space-y-6">
          
          {/* Header copy with Product Icon */}
          <div className="space-y-3.5 text-center">
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${iconBg} shadow-sm`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">{productName}</h1>
              <p className="text-xs text-slate-500 mt-1.5 font-semibold leading-relaxed">{productSub}</p>
            </div>
          </div>

          {error && <Alert variant="error" message={error} />}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Email address
              </label>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-950 placeholder-slate-400 focus:border-slate-350 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all font-semibold"
                placeholder="you@yourcompany.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                <button type="button" className="text-[10px] font-bold text-slate-400 hover:text-slate-650 transition-colors uppercase tracking-widest">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-xs text-slate-950 placeholder-slate-400 focus:border-slate-350 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all font-semibold"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 shadow-md ${btnClass}`}
            >
              {loading ? <Spinner size="sm" /> : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Bottom Actions Row */}
        <div className="flex flex-col items-center gap-3 w-full text-center shrink-0">
          <p className="text-xs text-slate-500 font-semibold font-sans">
            Don't have an account?{' '}
            <Link to="/signup" className="text-slate-700 hover:text-blue-600 underline underline-offset-2 transition-colors font-bold">
              Get started free
            </Link>
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/login"
              replace
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white border border-slate-200/80 rounded-full px-4 py-2 shadow-sm font-sans"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Switch product
            </Link>
          </div>
        </div>

        {/* Security & Copyright info */}
        <footer className="text-center text-[9px] text-slate-400 font-bold pt-2 font-sans">
          <p>© 2026 TFG ComplianceOS. Protected by bank-grade security protocols.</p>
        </footer>

      </div>
    </div>
  )
}
