import { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, MapPin, Mail, UserCheck } from 'lucide-react';

const features = [
  {
    title: "1. Initiate Onboarding (Fintech Desk)",
    description: "Fintech HR managers invite workers. Candidates submit Aadhaar, PAN, and selfie credentials directly from their mobile devices using a white-labeled onboarding portal.",
    bgColor: "bg-blue-50/95 border border-blue-200/60 text-blue-950",
    textColor: "text-blue-900/80"
  },
  {
    title: "2. Real-Time Security Screening",
    description: "The compliance engine instantly scans international sanctions, runs PEP check, extracts document data via OCR, and assigns an initial risk score.",
    bgColor: "bg-indigo-50/95 border border-indigo-200/60 text-indigo-950",
    textColor: "text-indigo-900/80"
  },
  {
    title: "3. Case verification (Bank Cockpit)",
    description: "Connected bank compliance desks review high-risk flags in the Case Cockpit. Analysts can chat directly with applicants for document updates and sign off approvals.",
    bgColor: "bg-slate-50/95 border border-slate-200/80 text-slate-950",
    textColor: "text-slate-700"
  },
  {
    title: "4. Release Operations & Payroll",
    description: "Cleared credentials sync back to fintech dashboards. Track GPS geofenced attendance logs for the Bangalore HQ and process monthly payroll checks in one click.",
    bgColor: "bg-emerald-50/95 border border-emerald-200/60 text-emerald-950",
    textColor: "text-emerald-900/80"
  },
];

// Custom vector CSS dashboards to replace external images, removing all copyright concerns.
function RenderStepVisualizer({ step }: { step: number }) {
  switch (step) {
    case 0: // Onboarding Form
      return (
        <div className="w-full h-full bg-white rounded-2xl border border-blue-100 shadow-sm p-4 flex flex-col justify-between text-left">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-[10px] font-black text-blue-600 tracking-wider uppercase">TFG Secure Onboard</span>
              <span className="text-[8px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">Mobile view</span>
            </div>
            <p className="text-[11px] font-bold text-gray-800">Submit Verification Info</p>
            
            <div className="space-y-1.5 text-[10px]">
              <div>
                <label className="text-[8px] font-bold text-gray-400 block mb-0.5">Aadhaar Card Number</label>
                <div className="bg-gray-50 border border-gray-100 rounded px-2 py-1 text-gray-700 font-mono">XXXX-XXXX-8920</div>
              </div>
              <div>
                <label className="text-[8px] font-bold text-gray-400 block mb-0.5">PAN Card Number</label>
                <div className="bg-gray-50 border border-gray-100 rounded px-2 py-1 text-gray-700 font-mono">ABCDE1234F</div>
              </div>
              <div className="border border-dashed border-gray-200 rounded p-2 flex items-center justify-center gap-1.5 text-blue-600 bg-blue-50/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[8px] font-bold">Selfie Scan Uploaded</span>
              </div>
            </div>
          </div>
          
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-1.5 text-[10px] font-bold shadow-sm mt-3">
            Submit Credentials
          </button>
        </div>
      );
    case 1: // AML / PEP scanner
      return (
        <div className="w-full h-full bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-sm p-4 flex flex-col justify-between text-left font-mono">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="text-[9px] font-bold text-indigo-400">Compliance Engines</span>
              <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 rounded px-1.5 py-0.5">Scanning</span>
            </div>
            
            <div className="space-y-1 text-[10px] text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span>1. Global PEP Check</span>
                <span className="text-emerald-400 font-bold">Safe (0 hits)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span>2. OFAC Sanctions</span>
                <span className="text-emerald-400 font-bold">Cleared</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>3. PAN OCR Validation</span>
                <span className="text-emerald-400 font-bold">100% Match</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-800 rounded-lg p-2 bg-slate-900/50 mt-2 flex items-center justify-between">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Screening Index</span>
            <span className="text-[10px] font-bold text-emerald-400">Risk Score: 12%</span>
          </div>
        </div>
      );
    case 2: // Case reviewers cockpit
      return (
        <div className="w-full h-full bg-slate-50 text-slate-800 rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col justify-between text-left">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-gray-150 pb-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Reviewer Panel</span>
              <span className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" /> Flagged
              </span>
            </div>
            
            <div className="space-y-1.5">
              <div className="bg-white border border-gray-200/80 rounded-lg p-2 text-[10px]">
                <p className="font-extrabold text-slate-900">Applicant: Kunal Verma</p>
                <p className="text-[8px] font-medium text-slate-400 mt-0.5">Action: Verify Aadhaar Card image blur</p>
              </div>
              <div className="bg-blue-50 border border-blue-100/50 rounded-lg p-2 text-[9px] text-blue-800">
                <p className="font-bold flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> Reviewer Chat:</p>
                <p className="font-medium mt-0.5">"Please re-upload a clear selfie in well-lit conditions."</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3 pt-2 border-t border-gray-150">
            <button className="flex-1 bg-emerald-600 text-white rounded py-1 text-[9px] font-bold shadow-sm">Approve KYC</button>
            <button className="flex-1 bg-red-600 text-white rounded py-1 text-[9px] font-bold shadow-sm">Reject</button>
          </div>
        </div>
      );
    case 3: // Disbursal payroll logs
      return (
        <div className="w-full h-full bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 flex flex-col justify-between text-left">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-[9px] font-black text-emerald-600 tracking-widest uppercase">June Payroll Run</span>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Disbursed</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-gray-50 border border-gray-100 rounded p-1.5">
                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest block">Net Salaries</span>
                <span className="font-bold text-gray-800">₹6,42,000</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded p-1.5">
                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest block">Geofence validation</span>
                <span className="font-bold text-emerald-600 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> Approved</span>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-emerald-50 border border-emerald-100/50 rounded-lg p-2.5 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="bg-emerald-600 text-white p-1 rounded-full"><UserCheck className="w-3.5 h-3.5" /></span>
              <div>
                <p className="font-bold text-emerald-950">Employee Records Synced</p>
                <p className="text-[8px] text-emerald-700">Bank approvals successfully released</p>
              </div>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

// --- Custom Hook for Scroll Animation ---
const useScrollAnimation = () => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, inView] as const;
};

// --- Header Component ---
const AnimatedHeader = () => {
    const [headerRef, headerInView] = useScrollAnimation();
    const [pRef, pInView] = useScrollAnimation();

    return (
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-[10px] font-bold text-blue-700 uppercase tracking-widest inline-block">
              Operations Pipeline
            </span>
            <h2 
                ref={headerRef}
                className={`text-3xl md:text-5xl font-black transition-all duration-700 ease-out text-gray-900 ${headerInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transformStyle: 'preserve-3d' }}
            >
                The Platform Onboarding Pipeline
            </h2>
            <p 
                ref={pRef}
                className={`text-sm md:text-base text-gray-500 font-medium transition-all duration-700 ease-out delay-200 ${pInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transformStyle: 'preserve-3d' }}
            >
                Streamline employee verification and background compliance checks in four stackable steps.
            </p>
        </div>
    );
};

// This is the main component that orchestrates everything.
export function StickyFeatureSection() {
  return (
    <section id="pipeline" className="bg-gray-50/50 py-20 border-t border-b border-gray-100">
      <div className="px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatedHeader />

          {/* The container for the sticky cards */}
          <div className="w-full max-w-4xl mx-auto relative space-y-16">
            {features.map((feature, index) => (
              <div
                  key={index}
                  className={`${feature.bgColor} grid grid-cols-1 md:grid-cols-2 items-center gap-6 md:gap-10 p-8 md:p-10 rounded-3xl sticky shadow-md backdrop-blur-md transition-all duration-300 hover:shadow-lg`}
                  style={{ top: `${120 + index * 20}px` }}
              >
                {/* Card Content */}
                <div className="flex flex-col justify-center text-left space-y-3">
                  <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-950">{feature.title}</h3>
                  <p className={`text-xs md:text-sm font-medium leading-relaxed ${feature.textColor}`}>{feature.description}</p>
                </div>
                
                {/* Custom Vector UI Visualizer (Replaces Unsplash images) */}
                <div className="bg-gray-100/50 rounded-2xl border border-gray-200/10 p-4 w-full h-52 flex items-center justify-center overflow-hidden">
                  <RenderStepVisualizer step={index} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
