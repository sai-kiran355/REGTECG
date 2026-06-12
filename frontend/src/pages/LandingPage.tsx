import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Landmark, Building2,
  FileSearch, AlertTriangle, Shield, ClipboardList, BarChart3,
  Zap, Menu, X, ArrowRight
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

// Import premium components
import { Hero } from "../components/ui/animated-hero"
import DisplayCards from "../components/ui/display-cards"
import { StackedCardsInteraction } from "../components/ui/stacked-cards-interaction"
import PartnerOrbitSection from "../components/ui/stack-feature-section"
import { Feature } from "../components/ui/feature-with-image-comparison"
import { StickyFeatureSection } from "../components/ui/sticky-scroll-cards-section"
import { Pricing } from "../components/ui/pricing-cards"
import { Testimonials } from "../components/ui/testimonials-columns-1"
import { LobbyAssistant } from '../components/LobbyAssistant'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// ── Navbar ────────────────────────────────────────────────────────────────────
interface NavbarProps {
  activeTab: string
  onNavClick: (id: string, label: string) => void
}

function Navbar({ activeTab, onNavClick }: NavbarProps) {
  const [open, setOpen] = useState(false)
  const links = [
    { id: 'partners', label: 'Network' },
    { id: 'ecosystem', label: 'Ecosystem' },
    { id: 'features', label: 'Features' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'pricing', label: 'Pricing' },
  ]
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-lg font-bold text-gray-900 tracking-tight leading-none">ComplianceOS</span>
            <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Threshing Floor Group</span>
          </div>
        </div>
        
        {/* Desktop Tubelight Menu */}
        <div className="hidden md:flex items-center gap-3 bg-slate-50/70 border border-slate-200/50 rounded-full p-1.5 relative shadow-inner">
          {links.map(l => {
            const isActive = activeTab === l.label
            return (
              <button
                key={l.id}
                onClick={() => onNavClick(l.id, l.label)}
                className={cn(
                  "relative cursor-pointer text-xs font-bold px-6 py-2.5 rounded-full transition-all duration-300 select-none outline-none z-10 tracking-tight",
                  isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <span>{l.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="header-lamp"
                    className="absolute inset-0 w-full bg-blue-50/70 rounded-full -z-10 border border-blue-100/60 shadow-sm"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 140,
                      damping: 18,
                    }}
                  >
                    {/* Glowing indicator line */}
                    <div className="absolute -top-[1.5px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-blue-600 rounded-t-full shadow-[0_0_10px_#3b82f6]">
                      <div className="absolute w-12 h-4 bg-blue-500/20 rounded-full blur-md -top-2 -left-2" />
                      <div className="absolute w-8 h-3 bg-blue-500/25 rounded-full blur-xs -top-1" />
                    </div>
                  </motion.div>
                )}
              </button>
            )
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors px-3 py-2">
            Sign in
          </Link>
          <Link to="/signup"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 duration-150">
            Get Started Free
          </Link>
        </div>

        <button className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-5 space-y-4 animate-in fade-in slide-in-from-top-5 duration-200">
          {links.map(l => (
            <button key={l.id} onClick={() => { onNavClick(l.id, l.label); setOpen(false) }}
              className="block w-full text-left text-sm font-semibold text-gray-600 hover:text-blue-600 py-2">
              {l.label}
            </button>
          ))}
          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <Link to="/login" className="flex-1 text-center rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Sign in</Link>
            <Link to="/signup" className="flex-1 text-center rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700">Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── Ecosystem Cards (Comparative Dual Stacks) ──────────────────────────────
function EcosystemSection() {
  const bankCards = [
    {
      image: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=800&auto=format&fit=crop&q=60",
      title: "KYC Case Cockpit",
      description: "Automated Aadhaar/PAN checks, live analyst dashboard, and real-time chat workspace for customer document updates.",
    },
    {
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=60",
      title: "AML Screening Engine",
      description: "Evaluate transaction patterns, flag layered actions, and check AML risks to maintain safe transfers.",
    },
    {
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=60",
      title: "Sanctions Match Desk",
      description: "Screen against OFAC, PEP, and international lists with advanced phonetic mapping checks.",
    },
  ]

  const fintechCards = [
    {
      image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop&q=60",
      title: "Workforce Directory",
      description: "Launch employee self-onboarding flows, manage positions, and handle details from a clean operations workspace.",
    },
    {
      image: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&auto=format&fit=crop&q=60",
      title: "GPS Geofenced Attendance",
      description: "Track logs and attendance metrics. Automatically flag clock-ins outside of established office coordinates.",
    },
    {
      image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=60",
      title: "Automated Payroll Runs",
      description: "Generate monthly salary reports, calculate EPF/TDS professional tax withholdings, and release payslips.",
    },
  ]

  return (
    <section id="ecosystem" className="py-24 px-6 bg-gray-50 border-t border-gray-100">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Double Environment Infrastructure</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Two Services Built for Connected Environments</h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto text-base">
            TFG ComplianceOS links bank compliance verification workflows with fintech operations. 
            Hover over the stacks below to explore each environment.
          </p>
        </div>

        {/* Dynamic Stack Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Bank Side Stack */}
          <div className="flex flex-col items-center text-center lg:text-left lg:items-start space-y-6 bg-white p-8 rounded-3xl border border-gray-200/60 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <span className="bg-blue-100 text-blue-700 p-2.5 rounded-xl"><Landmark className="h-5 w-5" /></span>
              <div>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">RegTech Environment</span>
                <h3 className="text-xl font-bold text-gray-950">Compliance Cockpit for Banks</h3>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-md">
              Handle high-volume customer risk evaluations. Run real-time screening, resolve flagged alerts, and export audit logs for inspections.
            </p>
            <div className="w-full pt-4 flex justify-center">
              <StackedCardsInteraction cards={bankCards} spreadDistance={60} rotationAngle={8} />
            </div>
            <div className="w-full pt-6 flex justify-between items-center border-t border-gray-100 text-xs">
              <span className="text-gray-400 font-medium">For Risk Officers, Analysts & Auditors</span>
              <Link to="/login/compliance" className="text-blue-600 font-bold hover:underline flex items-center gap-1">Enter Bank Cockpit &rarr;</Link>
            </div>
          </div>

          {/* Fintech Side Stack */}
          <div className="flex flex-col items-center text-center lg:text-left lg:items-start space-y-6 bg-white p-8 rounded-3xl border border-gray-200/60 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <span className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl"><Building2 className="h-5 w-5" /></span>
              <div>
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Operations Environment</span>
                <h3 className="text-xl font-bold text-gray-950">Workforce Hub for Fintechs</h3>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-md">
              Optimize internal structures. Collect worker credentials during onboarding, logs geofenced coordinates, and run monthly payroll.
            </p>
            <div className="w-full pt-4 flex justify-center">
              <StackedCardsInteraction cards={fintechCards} spreadDistance={60} rotationAngle={8} />
            </div>
            <div className="w-full pt-6 flex justify-between items-center border-t border-gray-100 text-xs">
              <span className="text-gray-400 font-medium">For HR Managers, Developers & Teams</span>
              <Link to="/login/fintech" className="text-indigo-600 font-bold hover:underline flex items-center gap-1">Launch Fintech Hub &rarr;</Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Features (DisplayCards — White Cards, Dark Section) ─────────────────────
function FeaturesSection() {
  const bankCards = [
    {
      icon: <FileSearch className="size-4 text-blue-600" />,
      title: "AI KYC Verification",
      description: "Parse Aadhaar, PAN & passports via OCR",
      date: "KYC Cockpit",
      iconClassName: "bg-blue-50 border border-blue-100/80 text-blue-600",
      titleClassName: "text-slate-800",
    },
    {
      icon: <AlertTriangle className="size-4 text-amber-600" />,
      title: "AML Detection Logs",
      description: "Real-time anomalous transfer alerts",
      date: "Transaction Screen",
      iconClassName: "bg-amber-50 border border-amber-100/80 text-amber-600",
      titleClassName: "text-slate-800",
    },
    {
      icon: <Shield className="size-4 text-emerald-600" />,
      title: "Sanctions Scanners",
      description: "OFAC & PEP phonetic name matching",
      date: "Lists Reviewer",
      iconClassName: "bg-emerald-50 border border-emerald-100/80 text-emerald-600",
      titleClassName: "text-slate-800",
    },
  ]

  const fintechCards = [
    {
      icon: <ClipboardList className="size-4 text-indigo-600" />,
      title: "Frictionless Onboarding",
      description: "Self-service portals with Aadhaar e-KYC",
      date: "Workforce Directory",
      iconClassName: "bg-indigo-50 border border-indigo-100/80 text-indigo-600",
      titleClassName: "text-slate-800",
    },
    {
      icon: <Zap className="size-4 text-cyan-600" />,
      title: "GPS Geofence Tracking",
      description: "Auto clock-in at designated coordinates",
      date: "Coordinates Validator",
      iconClassName: "bg-cyan-50 border border-cyan-100/80 text-cyan-600",
      titleClassName: "text-slate-800",
    },
    {
      icon: <BarChart3 className="size-4 text-purple-600" />,
      title: "Automated Payroll Run",
      description: "EPF/TDS calculation & payslip release",
      date: "Disbursal Engine",
      iconClassName: "bg-purple-50 border border-purple-100/80 text-purple-600",
      titleClassName: "text-slate-800",
    },
  ]

  return (
    <section
      id="features"
      className="py-24 px-6 bg-slate-900 relative overflow-hidden"
    >
      {/* Background matrix */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      {/* Ambient glows */}
      <div className="absolute -top-12 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-12 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-4 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Key Features Directory
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-200 tracking-tight leading-tight">
            Ecosystem Architecture Features
          </h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            TFG ComplianceOS provides unique services for both banking regulatory platforms and fintech internal suites.
          </p>
        </div>

        {/* Two Platform Panels Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── Bank RegTech Suite ── */}
          <div className="relative rounded-3xl border border-slate-800 bg-slate-950/40 backdrop-blur-sm px-8 pt-8 pb-8 flex flex-col gap-6 overflow-visible hover:border-blue-500/30 hover:bg-slate-950/70 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(59,130,246,0.04)] group">
            {/* Glowing Accent Top Line */}
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-blue-500/50 via-blue-500/10 to-transparent" />
            
            <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-inner">
                  <Shield className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Bank RegTech Suite</span>
                  <h3 className="text-sm font-bold text-white leading-tight">Compliance Verification Features</h3>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full bg-slate-900/50">3 Services Active</span>
            </div>

            {/* DisplayCards stacked deck */}
            <div className="flex items-center justify-center min-h-[300px] md:min-h-[320px] pt-4 w-full">
              <DisplayCards cards={bankCards} />
            </div>

            {/* Panel Footer */}
            <div className="mt-auto pt-5 border-t border-slate-900 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Verify sandbox APIs</span>
              <span className="text-xs font-bold text-blue-400 hover:text-blue-300 group-hover:translate-x-1 transition-transform flex items-center gap-1 cursor-pointer">
                Access Sandbox &rarr;
              </span>
            </div>
          </div>

          {/* ── Fintech Operations Hub ── */}
          <div className="relative rounded-3xl border border-slate-800 bg-slate-950/40 backdrop-blur-sm px-8 pt-8 pb-8 flex flex-col gap-6 overflow-visible hover:border-indigo-500/30 hover:bg-slate-950/70 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(99,102,241,0.04)] group">
            {/* Glowing Accent Top Line */}
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-indigo-500/50 via-indigo-500/10 to-transparent" />
            
            <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                  <BarChart3 className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Fintech Operations Hub</span>
                  <h3 className="text-sm font-bold text-white leading-tight">HR Ops & Platform Capabilities</h3>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full bg-slate-900/50">Disbursal Ready</span>
            </div>

            {/* DisplayCards stacked deck */}
            <div className="flex items-center justify-center min-h-[300px] md:min-h-[320px] pt-4 w-full">
              <DisplayCards cards={fintechCards} />
            </div>

            {/* Panel Footer */}
            <div className="mt-auto pt-5 border-t border-slate-900 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Configure operations</span>
              <span className="text-xs font-bold text-indigo-400 hover:text-indigo-300 group-hover:translate-x-1 transition-transform flex items-center gap-1 cursor-pointer">
                Launch Hub &rarr;
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── CTASection ───────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-24 px-6 bg-slate-900 relative overflow-hidden border-b border-slate-800">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <div className="mx-auto max-w-4xl text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-5">Ready to Automate Your Verification and Operations?</h2>
        <p className="mb-10 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-semibold text-slate-300 font-medium">
          Join 200+ financial firms using TFG ComplianceOS. Setup your developer keys and workforce sandbox dashboard in minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/signup" className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white hover:bg-blue-700 transition-all hover:shadow-lg active:scale-95 duration-150">
            Start Free Trial <ArrowRight className="h-5 w-5" />
          </Link>
          <a href="mailto:sales@complianceos.in" className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 text-white px-8 py-4 text-base font-bold hover:bg-slate-700/60 transition-colors">
            Talk to Sales
          </a>
        </div>
      </div>
    </section>
  )
}

// ── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-950 px-6 py-16 text-slate-400">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2 space-y-4 text-left">
            <div className="flex items-center gap-2.5">
              <div className="bg-slate-800 p-2 rounded-lg text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-base font-bold text-white leading-none">ComplianceOS</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Threshing Floor Group</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed max-w-sm text-slate-500">
              TFG ComplianceOS is India's leading unified RegTech and workforce operations OS. 
              Designed to connect compliant bank desks with fintech platform structures.
            </p>
            <div className="text-[10px] text-slate-650 space-y-0.5">
              <p>CIN: U74999MH2024PTC123456</p>
              <p>GSTIN: 27AABCC1234A1Z5</p>
            </div>
          </div>
          {[
            { title: 'Product Suite', links: ['Compliance Cockpit', 'Workforce Ops', 'Developer APIs', 'Sanctions Database', 'Geofenced GPS logs'] },
            { title: 'Resources', links: ['Developer Guides', 'RBI Compliance Guidelines', 'SEBI Rules Onboarding', 'Careers Onboarding', 'Status Check'] },
            { title: 'TFG Corporate', links: ['About Threshing Floor Group', 'Security Controls', 'Terms of Service', 'Privacy Policy', 'Contact Support'] },
          ].map(col => (
            <div key={col.title} className="space-y-3 text-left">
              <p className="text-xs font-bold text-white uppercase tracking-wider">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map(l => {
                  const slug = l
                    .toLowerCase()
                    .replace(/ & /g, "-")
                    .replace(/ /g, "-")
                    .replace(/[^a-z0-9-]/g, "");
                  return (
                    <li key={l}>
                      <Link
                        to={`/info/${slug}`}
                        className="text-xs hover:text-white transition-colors font-medium text-left"
                      >
                        {l}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <p>© 2026 Threshing Floor Group (TFG) ComplianceOS. All rights reserved.</p>
          <div className="flex flex-wrap gap-5 text-slate-600">
            <span>📞 +91 22 4567 8900</span>
            <span>✉️ support@complianceos.in</span>
            <span>📍 BKC, Mumbai 400051</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function LandingPage() {
  const [activeTab, setActiveTab] = useState("")
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sectionsRef = useRef<{ id: string; name: string; element: HTMLElement | null }[]>([])

  useEffect(() => {
    // Cache the DOM references once on mount
    const sections = [
      { id: "partners", name: "Network" },
      { id: "ecosystem", name: "Ecosystem" },
      { id: "features", name: "Features" },
      { id: "pipeline", name: "Pipeline" },
      { id: "pricing", name: "Pricing" },
    ]
    sectionsRef.current = sections.map(s => ({
      ...s,
      element: document.getElementById(s.id)
    }))

    const handleScroll = () => {
      // If we are currently running a click smooth scroll, bypass tracking updates
      if (isScrollingRef.current) return

      const scrollPos = window.scrollY
      let currentSection = ""

      for (const sec of sectionsRef.current) {
        const el = sec.element
        if (el) {
          const offsetTop = el.offsetTop - 180
          const offsetHeight = el.offsetHeight
          if (scrollPos >= offsetTop && scrollPos < offsetTop + offsetHeight) {
            currentSection = sec.name
            break
          }
        }
      }
      setActiveTab(currentSection)
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  const handleNavClick = (id: string, label: string) => {
    // Instantly highlight the clicked tab
    setActiveTab(label)

    // Set scroll lock flag
    isScrollingRef.current = true
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)

    // Trigger smooth scroll animation
    scrollTo(id)

    // Release lock once scroll finishes (usually ~800ms)
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false
    }, 850)
  }

  return (
    <div className="font-sans antialiased text-gray-900 bg-white min-h-screen selection:bg-blue-500 selection:text-white">
      <Navbar activeTab={activeTab} onNavClick={handleNavClick} />

      <div id="hero">
        <Hero />
      </div>
      <div id="partners">
        <PartnerOrbitSection />
      </div>
      <EcosystemSection />
      <Feature />
      <FeaturesSection />
      <StickyFeatureSection />
      <div id="pricing">
        <Pricing />
      </div>
      <div id="testimonials">
        <Testimonials />
      </div>
      <CTASection />
      <Footer />
      <LobbyAssistant />
    </div>
  )
}
