import { useState, FormEvent } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import {
  ShieldCheck, Eye, EyeOff, Building2, Landmark, CheckCircle,
  ArrowRight, ArrowLeft, 
} from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { Alert } from '../components/Alert'
import { Spinner } from '../components/Spinner'

const BASE_URL = import.meta.env.VITE_API_BASE_URL && !import.meta.env.VITE_API_BASE_URL.includes('localhost')
  ? import.meta.env.VITE_API_BASE_URL
  : (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000')

const PRODUCTS = [
  {
    type: 'bank' as const,
    icon: Landmark,
    name: 'Compliance Platform',
    tagline: 'For Banks & NBFCs',
    description: 'AML screening, KYC verification, sanctions monitoring, and regulatory reporting — built for RBI-regulated financial institutions.',
    color: 'blue',
    features: ['KYC Verification', 'AML Monitoring', 'Sanctions Screening', 'Audit Trail & Reports'],
    placeholder: 'e.g. Apex Bank, SwiftPay NBFC',
  },
  {
    type: 'fintech' as const,
    icon: Building2,
    name: 'Fintech Platform',
    tagline: 'For Tech & Software Companies',
    description: 'AI-powered recruitment, employee lifecycle management, attendance tracking, and workforce intelligence — all in one platform.',
    color: 'violet',
    features: ['AI Recruitment & ATS', 'Employee Management', 'Attendance & Payroll', 'HR Analytics'],
    placeholder: 'e.g. Infosys, TechNova Solutions',
  },
]

type Step = 'choose' | 'register'

export function SignUpPage() {
  const navigate = useNavigate()
  const { setTokens, setTenantSlug, isAuthenticated, user } = useAuthStore()

  const [step, setStep]             = useState<Step>('choose')
  const [orgType, setOrgType]       = useState<'bank' | 'fintech' | null>(null)
  const [orgName, setOrgName]       = useState('')
  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const selectedProduct = PRODUCTS.find(p => p.type === orgType)

  // Already logged in — redirect to the correct dashboard
  if (isAuthenticated && !loading) {
    const dest = user?.organization_type === 'fintech' ? '/fintech/dashboard' : '/dashboard'
    return <Navigate to={dest} replace />
  }

  const handleChoose = (type: 'bank' | 'fintech') => {
    setOrgType(type)
    setStep('register')
    setError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!orgType) return
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
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      setTenantSlug(slug)
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
          tenant_slug: profile.data.tenant_slug,
        })
      } catch { /* non-critical */ }
      // Route based on product chosen
      navigate(orgType === 'fintech' ? '/fintech/dashboard' : '/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.detail?.message ?? 'Sign up failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

   return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 relative text-slate-800 select-none font-sans bg-slate-50/50 overflow-y-auto">
      {/* Ambient background glows */}
      <div className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[30rem] h-[30rem] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-35 pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between py-4 border-b border-slate-200/50 mb-6 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform duration-300">
            <ShieldCheck className="h-5.5 w-5.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">ComplianceOS</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Threshing Floor Group</span>
          </div>
        </Link>
        <p className="text-xs text-slate-500 font-semibold font-sans">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-blue-600 hover:text-blue-500 underline underline-offset-2">Sign in</Link>
        </p>
      </div>

      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center py-4">
        {/* Step 1: Product chooser */}
        {step === 'choose' && (
          <div className="space-y-6 w-full max-w-4xl text-center">
            <div className="space-y-2">
              <span className="rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-[9px] font-bold text-blue-700 uppercase tracking-widest inline-block shadow-sm animate-pulse">
                Get Started
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Choose your platform</h1>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">Select the product that fits your organisation. You can always upgrade later.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {PRODUCTS.map(product => {
                const Icon = product.icon
                const isBlue = product.color === 'blue'
                return (
                  <button
                    key={product.type}
                    type="button"
                    onClick={() => handleChoose(product.type)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100/50 transition-all duration-300 hover:scale-[1.01] shadow-md shadow-slate-100/30"
                  >
                    <div>
                      {/* Icon */}
                      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${isBlue ? 'bg-blue-50 border border-blue-100 text-blue-600' : 'bg-violet-50 border border-violet-100 text-violet-650'} shadow-sm`}>
                        <Icon className="h-5.5 w-5.5" />
                      </div>

                      {/* Tag */}
                      <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isBlue ? 'bg-blue-50/80 text-blue-700 border border-blue-100/50' : 'bg-violet-50/80 text-violet-700 border border-violet-100/50'}`}>
                        {product.tagline}
                      </span>

                      <h2 className="text-lg font-bold text-slate-900 mb-1.5">{product.name}</h2>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4 min-h-[36px]">{product.description}</p>

                      {/* Features */}
                      <ul className="space-y-1.5 mb-6">
                        {product.features.map(f => (
                          <li key={f} className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                            <CheckCircle className={`h-4 w-4 shrink-0 ${isBlue ? 'text-blue-500' : 'text-violet-550'}`} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA */}
                    <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 font-bold text-xs transition-all w-full mt-auto shadow-sm ${isBlue ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10' : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/10'}`}>
                      <span>Get Started Free</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </button>
                )
              })}
            </div>

            <p className="text-center text-[10px] text-slate-400 font-semibold pt-2">No credit card required · Free 30-day trial · Cancel anytime</p>
          </div>
        )}

        {/* Step 2: Registration form */}
        {step === 'register' && selectedProduct && (
          <div className="w-full max-w-[420px] space-y-5">
            {/* Back to selector */}
            <button
              type="button"
              onClick={() => { setStep('choose'); setError(null) }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider font-sans"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to platforms
            </button>

            {/* Selected product banner */}
            <div className={`flex items-center gap-3 rounded-2xl border p-4 shadow-sm bg-white ${selectedProduct.color === 'blue' ? 'border-blue-150' : 'border-violet-150'}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${selectedProduct.color === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-violet-50 border-violet-100 text-violet-650'}`}>
                <selectedProduct.icon className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 leading-none">{selectedProduct.name}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{selectedProduct.tagline}</p>
              </div>
              <CheckCircle className={`ml-auto h-5 w-5 ${selectedProduct.color === 'blue' ? 'text-blue-500' : 'text-violet-550'}`} />
            </div>

            {/* Main Form Box */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xl shadow-slate-100/50 space-y-6">
              <div className="text-left space-y-1">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Create your account</h2>
                <p className="text-xs text-slate-500 font-semibold">Set up your organisation and get started in minutes.</p>
              </div>

              {error && <Alert variant="error" message={error} />}

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organisation Name</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-950 placeholder-slate-400 focus:border-slate-350 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all font-semibold"
                    placeholder={selectedProduct.placeholder}
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    required
                    minLength={2}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Full Name</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-950 placeholder-slate-400 focus:border-slate-350 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all font-semibold"
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Email</label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-950 placeholder-slate-400 focus:border-slate-350 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all font-semibold"
                    placeholder="you@yourcompany.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-xs text-slate-950 placeholder-slate-400 focus:border-slate-350 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all font-semibold"
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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 shadow-md ${selectedProduct.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10' : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/10'}`}
                >
                  {loading ? <Spinner size="sm" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <p className="text-center text-[10px] text-slate-400 font-bold leading-normal font-sans pt-2">
                By signing up, you agree to our{' '}
                <a href="#" className="underline hover:text-slate-600">Terms of Service</a> and{' '}
                <a href="#" className="underline hover:text-slate-650">Privacy Policy</a>.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 w-full max-w-4xl text-center py-4 border-t border-slate-200/50 mt-6 text-[9px] text-slate-400 font-bold font-sans">
        <p>© 2026 TFG ComplianceOS. Protected by bank-grade security protocols.</p>
      </footer>
    </div>
  )
}
