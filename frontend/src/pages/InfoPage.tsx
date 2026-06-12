import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Calendar, CheckCircle2, ChevronRight, Sparkles, Building2 } from 'lucide-react';

interface InfoSection {
  heading?: string;
  text?: string;
  bullets?: string[];
}

interface InfoContent {
  title: string;
  category: "Product Suite" | "Resources" | "TFG Corporate";
  lastUpdated: string;
  sections: InfoSection[];
}

const INFO_CONTENT: Record<string, InfoContent> = {
  "compliance-cockpit": {
    title: "Compliance Cockpit",
    category: "Product Suite",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "Overview",
        text: "The TFG Compliance Cockpit is an enterprise-grade control center designed for compliance officers and risk auditors to monitor and manage verification pipelines in real-time."
      },
      {
        heading: "Core Capabilities",
        bullets: [
          "Real-time audit log tracking of all OCR identity scans (Aadhaar, PAN, Passports).",
          "Automated PEP and sanctions phonetic match review dashboard.",
          "Single-click PDF/CSV reports export for SEBI and RBI audits.",
          "Custom validation threshold rules manager."
        ]
      }
    ]
  },
  "workforce-ops": {
    title: "Workforce Ops Suite",
    category: "Product Suite",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "Overview",
        text: "Automate and simplify employee operations with banking-grade compliance rails. This suite bridges internal HR functions directly into auditable workforce trails."
      },
      {
        heading: "Key Features",
        bullets: [
          "Self-service onboarding portals with integrated Aadhaar e-KYC.",
          "Coordinates validation using mobile geofencing logs.",
          "Automated monthly payroll run calculations for EPF, TDS, and PT.",
          "Digital payslip distribution with integrated secure signature tags."
        ]
      }
    ]
  },
  "developer-apis": {
    title: "Developer API Reference",
    category: "Product Suite",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "Developer Portal",
        text: "All KYC, AML, and onboarding tools are exposed via RESTful APIs. TFG ComplianceOS APIs are designed with low latency (<200ms) and high reliability (99.99% uptime)."
      },
      {
        heading: "Endpoints Available",
        bullets: [
          "POST /api/v1/ocr/aadhaar - Extract biometric information and verify with government records.",
          "POST /api/v1/aml/sanctions - Phonetic matching check against OFAC, PEP, and domestic watchlists.",
          "POST /api/v1/workforce/payroll - Trigger automated disbursal calculations."
        ]
      }
    ]
  },
  "sanctions-database": {
    title: "Global Sanctions Database",
    category: "Product Suite",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "Overview",
        text: "Our proprietary database aggregates global watchlists and PEP records to keep transaction pipelines secure from regulatory penalties."
      },
      {
        heading: "Data Coverage",
        bullets: [
          "OFAC (US Office of Foreign Assets Control) SDN & consolidated lists.",
          "UN Security Council Consolidated Sanctions List.",
          "Phonetic matching engines for Indian regional names, mitigating spelling variations.",
          "Real-time sync intervals running every 3 hours."
        ]
      }
    ]
  },
  "geofenced-gps-logs": {
    title: "Geofenced GPS Verification",
    category: "Product Suite",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "Overview",
        text: "Ensure accurate, tamper-proof workforce tracking without invasive tracking policies. ComplianceOS logs geofenced coordinates to prevent spoofing."
      },
      {
        heading: "Technical Details",
        bullets: [
          "Cryptographically signed coordinates verification from mobile SDKs.",
          "Automatic clock-in / clock-out logging at designated project sites.",
          "Integration with the Workforce Ops payroll module to verify work locations."
        ]
      }
    ]
  },
  "developer-guides": {
    title: "Developer Quickstart Guides",
    category: "Resources",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "Quick Start",
        text: "Integrate ComplianceOS into your own application in minutes. Check out our quickstart tutorials and SDKs."
      },
      {
        heading: "Steps to Integrate",
        bullets: [
          "Generate API Keys in the ComplianceOS Developer Console.",
          "Install the client library: npm install @tfg/complianceos-node.",
          "Initiate your first client check with client.ocr.verifyPan(params)."
        ]
      }
    ]
  },
  "rbi-compliance-guidelines": {
    title: "RBI Compliance Reference Guide",
    category: "Resources",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "Regulatory Framework",
        text: "TFG ComplianceOS products are designed to strictly align with RBI's Master Direction on KYC (Know Your Customer) and Digital Lending Guidelines."
      },
      {
        heading: "Compliance Alignment",
        bullets: [
          "Strict data localization (all records stored inside onshore AWS Mumbai servers).",
          "Consent-first Aadhaar verification with automated masking.",
          "Audit trail retention for 5 years post-account closure."
        ]
      }
    ]
  },
  "sebi-rules-onboarding": {
    title: "SEBI Rules & Client Onboarding Standards",
    category: "Resources",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "SEBI KYC Mandates",
        text: "Detailed implementation procedures for stockbrokers, depository participants, and mutual fund intermediaries."
      },
      {
        heading: "Highlights",
        bullets: [
          "Real-time checks of clients against the SEBI debarred list.",
          "Automated KRA (KYC Registration Agency) checks and status updates.",
          "Anti-Money Laundering (AML) phonetic verification models."
        ]
      }
    ]
  },
  "careers-onboarding": {
    title: "Careers at Threshing Floor Group",
    category: "Resources",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "Join Our Team",
        text: "We are building the future of regulatory technology for financial ecosystems in India and beyond. Explore open positions in software engineering, compliance analysis, and customer operations."
      },
      {
        heading: "Open Roles",
        bullets: [
          "Senior Nodejs Developer - API Infrastructure (BKC, Mumbai / Hybrid)",
          "RegTech Sales Lead - Banking Partnerships (Mumbai / Delhi)",
          "DevOps Engineer - Security & AWS Compliance (BKC, Mumbai)"
        ]
      }
    ]
  },
  "status-check": {
    title: "System Status Console",
    category: "Resources",
    lastUpdated: "Live Status",
    sections: [
      {
        heading: "System Uptime",
        text: "ComplianceOS monitors API endpoints across regional servers to ensure enterprise reliability."
      },
      {
        heading: "Uptime Metrics",
        bullets: [
          "KYC API: Operational (99.98% 30-day average)",
          "AML Engine: Operational (99.99% 30-day average)",
          "Dashboard & Console: Operational (100% 30-day average)",
          "Database Services: Operational"
        ]
      }
    ]
  },
  "about-threshing-floor-group": {
    title: "About Threshing Floor Group (TFG)",
    category: "TFG Corporate",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "Our Mission",
        text: "Threshing Floor Group is an enterprise software developer specialized in security platforms, financial technology integrations, and regulatory operations software for complex institutions."
      },
      {
        heading: "Corporate Values",
        bullets: [
          "Security First: We believe user privacy and compliance records should be guarded with top-tier security controls.",
          "Scalable Architecture: Building systems that handle millions of verification payloads with zero latency degradation.",
          "Regulatory Partnerships: Partnering directly with banks and NBFCS to build compliant pipelines."
        ]
      }
    ]
  },
  "security-controls": {
    title: "Security & Encryption Controls",
    category: "TFG Corporate",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "Data Protection Policies",
        text: "Security is the foundation of ComplianceOS. We implement robust, layered controls to keep all records safe."
      },
      {
        heading: "Security Features",
        bullets: [
          "AES-256 database encryption at rest, TLS 1.3 encryption in transit.",
          "Compliance with ISO 27001 and SOC 2 Type II controls.",
          "Automated Aadhaar vaulting (masking the first 8 digits of the UID).",
          "Role-based access control (RBAC) with mandated multi-factor authentication (MFA)."
        ]
      }
    ]
  },
  "terms-of-service": {
    title: "Terms of Service",
    category: "TFG Corporate",
    lastUpdated: "January 2026",
    sections: [
      {
        heading: "Agreement Terms",
        text: "By accessing TFG ComplianceOS API networks or portals, you agree to comply with our Terms of Service and data collection rules."
      },
      {
        heading: "Core Obligations",
        bullets: [
          "Use the platform only for legitimate verification purposes under applicable KYC rules.",
          "Keep API credentials secure and do not share them outside registered workspaces.",
          "Responsible disclosure of any discovered bugs or service interruptions."
        ]
      }
    ]
  },
  "privacy-policy": {
    title: "Privacy Policy",
    category: "TFG Corporate",
    lastUpdated: "January 2026",
    sections: [
      {
        heading: "Data Handling Policies",
        text: "We collect and process personal data exclusively to provide automated verification services. We do not sell user data to third parties."
      },
      {
        heading: "Key Privacy Standards",
        bullets: [
          "Consent validation is required before executing any KYC search.",
          "Automated data purging options for sandbox test accounts.",
          "Support for standard data-subject access and rectification requests."
        ]
      }
    ]
  },
  "contact-support": {
    title: "Contact TFG Support",
    category: "TFG Corporate",
    lastUpdated: "June 2026",
    sections: [
      {
        heading: "Reach Out to Us",
        text: "Our dedicated regulatory operations support desk is available to assist you with active integrations, billing questions, or security checks."
      },
      {
        heading: "Support Info",
        bullets: [
          "📞 Support Phone: +91 22 4567 8900 (Mon - Sat, 9 AM - 6 PM IST)",
          "✉️ Support Email: support@complianceos.in (24-hour response SLA)",
          "📍 Main Office: Threshing Floor Group, BKC, Mumbai 400051"
        ]
      }
    ]
  }
};

export function InfoPage() {
  const { topic } = useParams<{ topic: string }>();

  const currentTopic = topic || 'privacy-policy';
  const content = INFO_CONTENT[currentTopic];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTopic]);

  if (!content) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xl max-w-md w-full">
          <ShieldCheck className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Document Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">We couldn't locate the guideline document for "{topic}". It may have been relocated.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-5 rounded-xl transition-all shadow-md">
            <ArrowLeft className="h-4 w-4" /> Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans antialiased text-slate-800">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/50 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all focus:outline-none">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <span className="font-black tracking-tight text-slate-900 text-base">ComplianceOS</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full ml-1">Docs</span>
          </div>
        </div>
        <Link to="/" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1">
          Back to HomeSite &rarr;
        </Link>
      </header>

      {/* Main Single Column Reading Layout */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-6 duration-500">
        
        {/* Document Reader Container */}
        <main className="bg-white border border-slate-200/60 rounded-3xl p-8 md:p-14 shadow-sm flex flex-col gap-8">
          
          {/* Section Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>TFG Platform</span>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span>{content.category}</span>
          </div>

          {/* Document Header */}
          <div className="flex flex-col gap-4 pb-8 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100/50 px-2.5 py-0.5 rounded-full shadow-inner">
                {content.category}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live & Active</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {content.title}
            </h1>
            
            <div className="flex items-center gap-1.5 text-xs text-slate-450 font-bold uppercase tracking-wider pt-1">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>Last Revised: {content.lastUpdated}</span>
            </div>
          </div>

          {/* Document Content Sections */}
          <div className="space-y-10 flex-1">
            {content.sections.map((section, idx) => (
              <div key={idx} className="space-y-4">
                {section.heading && (
                  <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-l-2 border-blue-500 pl-3">
                    {section.heading}
                  </h2>
                )}
                {section.text && (
                  <p className="text-sm md:text-base text-slate-600 leading-relaxed font-medium">
                    {section.text}
                  </p>
                )}
                {section.bullets && (
                  <ul className="space-y-3.5">
                    {section.bullets.map((bullet, bulletIdx) => (
                      <li key={bulletIdx} className="flex items-start gap-3.5 text-sm md:text-base text-slate-650 font-medium leading-relaxed">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Specialized CTAs depending on category type */}
          {content.category === "Product Suite" ? (
            <div className="mt-12 bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden text-left">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="space-y-1 relative z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Enterprise Ready</span>
                </div>
                <h3 className="text-lg font-bold tracking-tight text-white leading-tight">Ready to integrate {content.title}?</h3>
                <p className="text-xs text-slate-400 font-medium max-w-sm">Setup your secure developer keys and run tests in our live sandbox today.</p>
              </div>
              <Link to="/signup" className="relative z-10 shrink-0 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-95 duration-150">
                Get Started Now
              </Link>
            </div>
          ) : content.category === "Resources" ? (
            <div className="mt-12 bg-slate-50 border border-slate-200/50 rounded-2xl p-6 text-left flex items-start gap-4">
              <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Interactive Guideline Advisory</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Need clarifying advisory on SEBI/RBI compliance frameworks? Our advisory desks can guide your dev team through technical implementation. Reach out to <a href="mailto:support@complianceos.in" className="text-blue-600 hover:underline">support@complianceos.in</a>.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-12 bg-slate-50 border border-slate-200/50 rounded-2xl p-6 text-left flex items-start gap-4">
              <Building2 className="h-5 w-5 text-indigo-650 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">ComplianceOS Trust & Security</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  We hold our corporate policies to the highest standards. All customer records, verification history, and logs are encrypted at rest via AES-256 and processed onshore in Mumbai AWS datacenters.
                </p>
              </div>
            </div>
          )}

          {/* Document Footer */}
          <div className="border-t border-slate-100 pt-8 mt-6 flex items-center justify-between text-xs text-slate-400 font-semibold tracking-wider uppercase">
            <span>© 2026 Threshing Floor Group Ltd.</span>
            <Link to="/" className="text-blue-600 font-bold hover:underline">
              Back to Home Site
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
