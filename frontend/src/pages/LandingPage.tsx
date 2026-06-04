import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Zap, BarChart3, Globe, Lock, CheckCircle,
  ArrowRight, ChevronDown, Star, Building2, Landmark,
  FileSearch, AlertTriangle, Shield, ClipboardList, Menu, X,
} from 'lucide-react'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false)
  const links = [
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'use-cases', label: 'Use Cases' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'contact', label: 'Contact' },
  ]
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-blue-600" />
          <span className="text-lg font-bold text-gray-900 tracking-tight">ComplianceOS</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)}
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              {l.label}
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors px-3 py-2">
            Sign in
          </Link>
          <Link to="/signup"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm">
            Get Started Free
          </Link>
        </div>
        <button className="md:hidden p-2 text-gray-600" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
          {links.map(l => (
            <button key={l.id} onClick={() => { scrollTo(l.id); setOpen(false) }}
              className="block w-full text-left text-sm font-medium text-gray-600 py-2">
              {l.label}
            </button>
          ))}
          <div className="flex gap-3 pt-2">
            <Link to="/login" className="flex-1 text-center rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700">Sign in</Link>
            <Link to="/signup" className="flex-1 text-center rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white">Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section id="hero" className="pt-28 pb-20 px-6 bg-gradient-to-b from-blue-50 via-white to-white">
      <div className="mx-auto max-w-5xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
          <Zap className="h-3.5 w-3.5" /> Trusted by 200+ banks and fintechs across India
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
          The Compliance Platform<br />
          <span className="text-blue-600">Built for Indian Finance</span>
        </h1>
        <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Automate AML screening, KYC verification, and sanctions monitoring.
          Stay RBI-audit-ready with a single platform trusted by banks, NBFCs, and fintechs.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/signup"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20">
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
          <button onClick={() => scrollTo('how-it-works')}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-7 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            See Demo <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm text-gray-400">No credit card required · Free 30-day trial · Cancel anytime</p>
      </div>

      {/* Stats */}
      <div className="mx-auto max-w-4xl mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { value: '99.9%', label: 'Platform Uptime' },
          { value: '< 2s', label: 'KYC Verification' },
          { value: '5 Lakh+', label: 'Cases Processed' },
          { value: 'RBI', label: 'Audit Ready' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{s.value}</p>
            <p className="mt-1 text-xs font-medium text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    { icon: FileSearch, color: 'bg-blue-50 text-blue-600', title: 'AI-Powered KYC', desc: 'Verify Aadhaar, PAN, and documents instantly. Reduce manual KYC effort by 80% with intelligent document parsing.' },
    { icon: AlertTriangle, color: 'bg-orange-50 text-orange-600', title: 'AML Detection', desc: 'Monitor transactions in real-time. Detect structuring, layering, and high-risk patterns automatically.' },
    { icon: Shield, color: 'bg-red-50 text-red-600', title: 'Sanctions Screening', desc: 'Screen against OFAC, EU, UN, and HMT lists instantly. Reduce false positives by 60% with smart matching.' },
    { icon: ClipboardList, color: 'bg-green-50 text-green-600', title: 'Case Management', desc: 'Centralize all investigations. Assign, track, add notes, and maintain a complete audit trail for every case.' },
    { icon: BarChart3, color: 'bg-purple-50 text-purple-600', title: 'Regulatory Reports', desc: 'Generate STRs, CTRs, and KYC reports in one click. Formatted exactly as RBI and FIU-IND require.' },
    { icon: Lock, color: 'bg-cyan-50 text-cyan-600', title: 'Immutable Audit Log', desc: 'Every action is recorded permanently. Always inspection-ready for RBI, SEBI, or FIU-IND audits.' },
  ]
  return (
    <section id="features" className="py-20 px-6 bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-3">Platform Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Everything your compliance team needs</h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">Built specifically for Indian financial institutions. One platform for AML, KYC, and sanctions compliance.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="rounded-2xl border border-gray-100 bg-white p-6 hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-default">
              <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How It Works ─────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    { num: '01', title: 'Sign Up Your Organisation', desc: 'Create your bank or fintech account in 2 minutes. Invite your compliance team with role-based access.' },
    { num: '02', title: 'Customer Submits KYC', desc: 'Share your unique portal link. Customers complete a 3-step form and upload Aadhaar, PAN, and selfie from any device.' },
    { num: '03', title: 'Automated Screening', desc: 'The system instantly runs sanctions screening and assigns a risk score. High-risk cases are flagged automatically.' },
    { num: '04', title: 'Compliance Team Reviews', desc: 'Analysts review flagged cases, check documents, and approve or reject. Every decision is logged permanently.' },
    { num: '05', title: 'Reports & Audit Trail', desc: 'Generate regulatory reports on demand. Always ready for RBI or FIU-IND inspections.' },
  ]
  return (
    <section id="how-it-works" className="py-20 px-6 bg-gray-50">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-3">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">From signup to compliance in minutes</h2>
        </div>
        <div className="space-y-6">
          {steps.map((step) => (
            <div key={step.num} className="flex gap-5 rounded-2xl bg-white border border-gray-100 p-6 hover:border-blue-100 hover:shadow-sm transition-all">
              <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm">
                {step.num}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Use Cases ─────────────────────────────────────────────────────────────────
function UseCasesSection() {
  const cases = [
    { icon: Landmark, color: 'bg-blue-50 text-blue-600', tag: 'Banks', title: 'Commercial Banks', desc: 'Handle high-volume KYC for account openings, loan applications, and trade finance. Multi-branch support built for SBI/HDFC scale.', features: ['Bulk KYC processing', 'Branch-level reporting', 'RBI STR/CTR reports', 'Maker-checker workflows'] },
    { icon: Building2, color: 'bg-violet-50 text-violet-600', tag: 'Fintechs', title: 'Fintechs & NBFCs', desc: 'API-first compliance for digital lenders, payment apps, and neobanks. Integrate KYC into your product in hours, not months.', features: ['REST API access', 'Webhook notifications', 'White-label portal', 'Pay-per-verification'] },
    { icon: Globe, color: 'bg-green-50 text-green-600', tag: 'Wealth', title: 'Wealth Management', desc: 'PEP screening and enhanced due diligence for HNI clients. SEBI-aligned workflows for investment advisors.', features: ['PEP & UBO screening', 'Periodic re-KYC alerts', 'Risk-based approach', 'SEBI KYC reports'] },
  ]
  return (
    <section id="use-cases" className="py-20 px-6 bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-3">Use Cases</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Built for every financial institution</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cases.map(c => (
            <div key={c.title} className="rounded-2xl border border-gray-100 bg-white p-6 hover:border-blue-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.color}`}><c.icon className="h-5 w-5" /></div>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{c.tag}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{c.title}</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">{c.desc}</p>
              <ul className="space-y-2">
                {c.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function PricingSection() {
  const plans = [
    { name: 'Starter', price: '₹9,999', period: '/month', desc: 'For growing fintechs and NBFCs', highlight: false, cta: 'Start Free Trial', features: ['Up to 500 KYC verifications/mo', 'AML monitoring', 'Sanctions screening', '3 user seats', 'Email support', '30-day free trial'] },
    { name: 'Growth', price: '₹49,999', period: '/month', desc: 'For mid-size banks and fintechs', highlight: true, cta: 'Start Free Trial', features: ['Up to 5,000 verifications/mo', 'Advanced AML rules', 'PEP screening', '15 user seats', 'API access', 'Priority support', '30-day free trial'] },
    { name: 'Enterprise', price: 'Custom', period: '', desc: 'For large banks and groups', highlight: false, cta: 'Contact Sales', features: ['Unlimited verifications', 'Custom AML workflows', 'White-label portal', 'Unlimited seats', 'Dedicated CSM', 'SLA guarantee', 'On-premise option'] },
  ]
  return (
    <section id="pricing" className="py-20 px-6 bg-gray-50">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
          <p className="mt-3 text-gray-500">Start free. No credit card required. Cancel anytime.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.name}
              className={`rounded-2xl p-6 flex flex-col transition-all duration-200 ${
                plan.highlight
                  ? 'bg-blue-600 border-2 border-blue-600 shadow-xl shadow-blue-600/20 scale-105'
                  : 'bg-white border border-gray-200 hover:border-blue-200 hover:shadow-md'
              }`}>
              <div>
                <p className={`text-sm font-semibold mb-1 ${plan.highlight ? 'text-blue-100' : 'text-gray-500'}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-3xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                  {plan.period && <span className={`text-sm ${plan.highlight ? 'text-blue-200' : 'text-gray-400'}`}>{plan.period}</span>}
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-blue-100' : 'text-gray-500'}`}>{plan.desc}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlight ? 'text-white' : 'text-gray-600'}`}>
                      <CheckCircle className={`h-4 w-4 mt-0.5 shrink-0 ${plan.highlight ? 'text-blue-200' : 'text-green-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto">
                <Link to="/signup"
                  className={`block w-full text-center rounded-xl py-3 text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Testimonials + CTA + Footer ───────────────────────────────────────────────
function TestimonialsSection() {
  const t = [
    { name: 'Rajesh Sharma', role: 'Chief Compliance Officer, Apex Bank', text: 'ComplianceOS cut our KYC processing from 3 days to 4 hours. The audit trail saved us during our last RBI inspection.' },
    { name: 'Priya Nair', role: 'Head of Risk, SwiftPay Fintech', text: 'We went live in 2 days. Our customers love the smooth 3-step KYC experience on mobile.' },
    { name: 'Vikram Mehta', role: 'MD & CEO, Bharat Capital Advisory', text: 'The sanctions screening catches matches we were missing. False-positive rate is remarkably low.' },
  ]
  return (
    <section className="py-20 px-6 bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-3">Customer Stories</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Trusted by compliance professionals</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.map(item => (
            <div key={item.name} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">"{item.text}"</p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">{item.name[0]}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section id="contact" className="py-20 px-6 bg-blue-600">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to automate your compliance?</h2>
        <p className="text-blue-100 mb-8 text-lg">Join 200+ financial institutions already using ComplianceOS. Start your free 30-day trial today.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/signup" className="flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-600 hover:bg-blue-50 transition-colors shadow-sm">
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="mailto:sales@complianceos.in" className="flex items-center justify-center gap-2 rounded-xl border border-blue-400 bg-blue-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-blue-500 transition-colors">
            Talk to Sales
          </a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-gray-900 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-6 w-6 text-blue-400" />
              <span className="text-base font-bold text-white">ComplianceOS</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">India's leading RegTech platform for AML, KYC, and Sanctions compliance.</p>
            <p className="text-xs text-gray-500">CIN: U74999MH2024PTC123456</p>
            <p className="text-xs text-gray-500">GSTIN: 27AABCC1234A1Z5</p>
          </div>
          {[
            { title: 'Product', links: ['Features', 'Pricing', 'API Docs', 'Status'] },
            { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Contact'] },
            { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security', 'GDPR'] },
          ].map(col => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-white mb-3">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map(l => <li key={l}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">© 2024 ComplianceOS Pvt. Ltd. All rights reserved. Registered in Mumbai, Maharashtra.</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>📞 +91 22 4567 8900</span>
            <span>✉️ support@complianceos.in</span>
            <span>📍 BKC, Mumbai 400051</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="font-sans antialiased">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <UseCasesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  )
}
