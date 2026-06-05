import { Link } from 'react-router-dom'
import { ShieldCheck, Layers, ArrowRight, CheckCircle } from 'lucide-react'

export function ProductSelectPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-10 py-7">
        <Link to="/" className="flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-white" />
          <span className="text-base font-bold text-white tracking-tight">ComplianceOS</span>
        </Link>
        <Link
          to="/signup"
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          New here? <span className="text-white underline underline-offset-2">Create account</span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">

        {/* Heading */}
        <div className="text-center mb-16 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
            Sign in to
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
            Which platform<br />are you using?
          </h1>
          <p className="text-base text-white/40 max-w-sm mx-auto">
            Select your product to continue. Each platform has its own secure login.
          </p>
        </div>

        {/* Product cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">

          {/* Compliance */}
          <Link
            to="/login/compliance"            className="group relative flex flex-col justify-between rounded-3xl border border-white/8 bg-white/4 p-8 hover:bg-white/7 hover:border-white/15 transition-all duration-300"
          >
            {/* Icon */}
            <div className="mb-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 border border-blue-500/20">
                <ShieldCheck className="h-7 w-7 text-blue-400" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl font-bold text-white">Compliance</span>
                <span className="rounded-full bg-blue-500/15 border border-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                  For Banks & NBFCs
                </span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                AML monitoring, KYC verification, sanctions screening, and regulatory reporting — built for RBI-regulated institutions.
              </p>
              <ul className="space-y-2">
                {['KYC Verification', 'AML Monitoring', 'Sanctions Screening', 'Audit Trail'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-blue-400/60 shrink-0" />
                    <span className="text-xs text-white/40">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-8 flex items-center justify-between">
              <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">
                Sign in to Compliance
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 border border-blue-500/20 group-hover:bg-blue-500/25 transition-colors">
                <ArrowRight className="h-4 w-4 text-blue-400" />
              </div>
            </div>

            {/* Hover glow */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'radial-gradient(400px at 50% 0%, rgba(59,130,246,0.06), transparent)' }} />
          </Link>

          {/* Fintech */}
          <Link
            to="/login/fintech"            className="group relative flex flex-col justify-between rounded-3xl border border-white/8 bg-white/4 p-8 hover:bg-white/7 hover:border-white/15 transition-all duration-300"
          >
            {/* Icon */}
            <div className="mb-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/20">
                <Layers className="h-7 w-7 text-violet-400" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl font-bold text-white">Fintech</span>
                <span className="rounded-full bg-violet-500/15 border border-violet-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-400">
                  For Tech Companies
                </span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                AI-powered recruitment, employee lifecycle management, attendance tracking, and workforce intelligence.
              </p>
              <ul className="space-y-2">
                {['AI Recruitment & ATS', 'Employee Management', 'Attendance & Payroll', 'HR Analytics'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-violet-400/60 shrink-0" />
                    <span className="text-xs text-white/40">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-8 flex items-center justify-between">
              <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">
                Sign in to Fintech
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 border border-violet-500/20 group-hover:bg-violet-500/25 transition-colors">
                <ArrowRight className="h-4 w-4 text-violet-400" />
              </div>
            </div>

            {/* Hover glow */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'radial-gradient(400px at 50% 0%, rgba(139,92,246,0.06), transparent)' }} />
          </Link>

        </div>

        {/* Bottom note */}
        <p className="mt-12 text-xs text-white/20 text-center">
          Don't have an account?{' '}
          <Link to="/signup" className="text-white/40 hover:text-white/60 underline underline-offset-2 transition-colors">
            Get started free — no credit card required
          </Link>
        </p>

      </main>

      {/* Footer */}
      <footer className="px-10 py-6 flex items-center justify-between">
        <p className="text-xs text-white/15">© 2024 ComplianceOS Pvt. Ltd.</p>
        <div className="flex gap-5 text-xs text-white/15">
          <a href="#" className="hover:text-white/30 transition-colors">Privacy</a>
          <a href="#" className="hover:text-white/30 transition-colors">Terms</a>
          <a href="#" className="hover:text-white/30 transition-colors">Security</a>
        </div>
      </footer>

    </div>
  )
}
