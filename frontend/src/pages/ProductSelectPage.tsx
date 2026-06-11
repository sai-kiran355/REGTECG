import { Link } from 'react-router-dom'
import { ShieldCheck, Layers, ArrowRight, CheckCircle } from 'lucide-react'

export function ProductSelectPage() {
  return (
    <div className="min-h-screen w-full bg-slate-50/50 flex flex-col justify-between relative text-slate-800 select-none">
      {/* Ambient background glows (subtle light colored orbs) */}
      <div className="absolute top-[-20%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-30 pointer-events-none" />
      
      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform duration-300">
            <ShieldCheck className="h-5.5 w-5.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-base font-extrabold text-slate-900 tracking-tight leading-none">ComplianceOS</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Threshing Floor Group</span>
          </div>
        </Link>
        <Link
          to="/signup"
          className="text-xs text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1 bg-white border border-slate-200/80 rounded-full px-4 py-2 shadow-sm font-semibold"
        >
          New here? <span className="text-blue-600 font-bold underline underline-offset-2 hover:text-blue-500">Create account</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4">
        
        {/* Heading */}
        <div className="text-center mb-6 space-y-2.5">
          <span className="rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-[9px] font-bold text-blue-700 uppercase tracking-widest inline-block shadow-sm">
            Sign in to
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Which platform are you using?
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Select your product to continue. Each platform has its own secure login.
          </p>
        </div>

        {/* Product cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">

          {/* Compliance */}
          <Link
            to="/login/compliance"
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-7 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 shadow-md shadow-slate-100/40"
          >
            {/* Icon */}
            <div className="mb-4 flex justify-between items-start">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 shadow-inner group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-5.5 w-5.5" text-blue-655="" />
              </div>
              <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-0.5 text-[9px] font-bold text-blue-700">
                For Banks & NBFCs
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-slate-900 mb-1.5">
                Compliance
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-4 font-medium min-h-[36px]">
                AML monitoring, KYC verification, sanctions screening, and regulatory reporting — built for RBI-regulated institutions.
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {['KYC Verification', 'AML Monitoring', 'Sanctions Screening', 'Audit Trail'].map(f => (
                  <li key={f} className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-blue-500/80 shrink-0" />
                    <span className="text-[10px] font-semibold text-slate-600">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs font-extrabold text-slate-500 group-hover:text-blue-600 transition-colors">
                Sign in to Compliance
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 border border-slate-200 group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:text-white transition-all text-slate-500 duration-300">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Hover glow */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: 'radial-gradient(350px at 50% 0%, rgba(59,130,246,0.04), transparent)' }} />
          </Link>

          {/* Fintech */}
          <Link
            to="/login/fintech"
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-7 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-300 shadow-md shadow-slate-100/40"
          >
            {/* Icon */}
            <div className="mb-4 flex justify-between items-start">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 border border-violet-100 shadow-inner group-hover:scale-105 transition-transform">
                <Layers className="h-5.5 w-5.5" text-violet-650="" />
              </div>
              <span className="rounded-full bg-violet-50 border border-violet-100 px-3 py-0.5 text-[9px] font-bold text-violet-700">
                For Tech Companies
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-slate-900 mb-1.5">
                Fintech
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-4 font-medium min-h-[36px]">
                AI-powered recruitment, employee lifecycle management, attendance tracking, and workforce intelligence.
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {['AI ATS & Jobs', 'Employee Records', 'Attendance & Payroll', 'HR Analytics'].map(f => (
                  <li key={f} className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-violet-500/80 shrink-0" />
                    <span className="text-[10px] font-semibold text-slate-600">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs font-extrabold text-slate-500 group-hover:text-violet-600 transition-colors">
                Sign in to Fintech
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 border border-slate-200 group-hover:bg-violet-600 group-hover:border-violet-500 group-hover:text-white transition-all text-slate-500 duration-300">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Hover glow */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: 'radial-gradient(350px at 50% 0%, rgba(139,92,246,0.04), transparent)' }} />
          </Link>

        </div>

        {/* Bottom note */}
        <p className="mt-6 text-[10px] text-slate-500 text-center">
          Don't have an account?{' '}
          <Link to="/signup" className="text-slate-700 hover:text-blue-600 underline underline-offset-2 transition-colors font-bold">
            Get started free — no credit card required
          </Link>
        </p>

      </main>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-5 flex items-center justify-between border-t border-slate-200/50 text-[10px] text-slate-550 shrink-0 font-medium text-slate-500">
        <p>© 2026 ComplianceOS Pvt. Ltd.</p>
        <div className="flex gap-4 font-bold">
          <a href="#" className="hover:text-slate-800 transition-colors">Privacy</a>
          <a href="#" className="hover:text-slate-800 transition-colors">Terms</a>
          <a href="#" className="hover:text-slate-800 transition-colors">Security</a>
        </div>
      </footer>

    </div>
  )
}
