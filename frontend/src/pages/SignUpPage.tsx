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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <ShieldCheck className="h-7 w-7 text-blue-400" />
          <span className="text-lg font-bold text-white">ComplianceOS</span>
        </Link>
        <p className="text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300">Sign in</Link>
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">

        {/* ── Step 1: Product chooser ─────────────────────────── */}
        {step === 'choose' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white">Choose your platform</h1>
              <p className="mt-2 text-slate-400">Select the product that fits your organisation. You can always upgrade later.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PRODUCTS.map(product => {
                const Icon = product.icon
                const isBlue = product.color === 'blue'
                return (
                  <button
                    key={product.type}
                    type="button"
                    onClick={() => handleChoose(product.type)}
                    className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-8 text-left hover:bg-white/10 hover:border-white/20 transition-all duration-200 hover:scale-[1.01]"
                  >
                    {/* Icon */}
                    <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${isBlue ? 'bg-blue-500/20' : 'bg-violet-500/20'}`}>
                      <Icon className={`h-7 w-7 ${isBlue ? 'text-blue-400' : 'text-violet-400'}`} />
                    </div>

                    {/* Tag */}
                    <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${isBlue ? 'bg-blue-500/20 text-blue-300' : 'bg-violet-500/20 text-violet-300'}`}>
                      {product.tagline}
                    </span>

                    <h2 className="text-xl font-bold text-white mb-2">{product.name}</h2>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">{product.description}</p>

                    {/* Features */}
                    <ul className="space-y-2 mb-8">
                      {product.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                          <CheckCircle className={`h-4 w-4 shrink-0 ${isBlue ? 'text-blue-400' : 'text-violet-400'}`} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className={`mt-auto flex items-center justify-between rounded-xl px-5 py-3 font-semibold text-sm transition-colors ${isBlue ? 'bg-blue-600 group-hover:bg-blue-500 text-white' : 'bg-violet-600 group-hover:bg-violet-500 text-white'}`}>
                      Get Started Free
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>
                )
              })}
            </div>

            <p className="text-center text-xs text-slate-500">No credit card required · Free 30-day trial · Cancel anytime</p>
          </div>
        )}

        {/* ── Step 2: Registration form ──────────────────────── */}
        {step === 'register' && selectedProduct && (
          <div className="mx-auto max-w-md">
            {/* Back */}
            <button
              type="button"
              onClick={() => { setStep('choose'); setError(null) }}
              className="mb-6 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to product selection
            </button>

            {/* Selected product badge */}
            <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${selectedProduct.color === 'blue' ? 'border-blue-500/30 bg-blue-500/10' : 'border-violet-500/30 bg-violet-500/10'}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${selectedProduct.color === 'blue' ? 'bg-blue-500/20' : 'bg-violet-500/20'}`}>
                <selectedProduct.icon className={`h-5 w-5 ${selectedProduct.color === 'blue' ? 'text-blue-400' : 'text-violet-400'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{selectedProduct.name}</p>
                <p className="text-xs text-slate-400">{selectedProduct.tagline}</p>
              </div>
              <CheckCircle className={`ml-auto h-5 w-5 ${selectedProduct.color === 'blue' ? 'text-blue-400' : 'text-violet-400'}`} />
            </div>

            <div className="rounded-2xl bg-white p-8">
              <h2 className="mb-1 text-xl font-bold text-gray-900">Create your account</h2>
              <p className="mb-6 text-sm text-gray-500">Set up your organisation and get started in minutes.</p>

              {error && <Alert variant="error" message={error} className="mb-4" />}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Organisation Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={selectedProduct.placeholder}
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    required
                    minLength={2}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Your Full Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Rahul Sharma"
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

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${selectedProduct.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-violet-600 hover:bg-violet-700'}`}
                >
                  {loading ? <Spinner size="sm" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-gray-400">
                By signing up, you agree to our{' '}
                <a href="#" className="underline hover:text-gray-600">Terms of Service</a> and{' '}
                <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
