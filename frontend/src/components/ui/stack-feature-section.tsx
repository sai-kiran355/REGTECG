import { Button } from "./button";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

// Inline vector SVG logos for perfect scaling, fast loading, and zero CORS issues.
function RenderPartnerLogo({ name }: { name: string }) {
  switch (name) {
    case "SBI":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" fill="#00a4e4" />
          <line x1="50" y1="50" x2="50" y2="95" stroke="white" strokeWidth="12" />
          <circle cx="50" cy="50" r="15" fill="white" />
        </svg>
      );
    case "HDFC":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="10" fill="#004c8f" />
          <rect x="25" y="25" width="50" height="50" fill="white" />
          <rect x="37" y="37" width="26" height="26" fill="#004c8f" />
          <rect x="44" y="25" width="12" height="50" fill="#ae1c3f" />
        </svg>
      );
    case "ICICI":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="50" fill="#f27022" />
          <path d="M40 25h20M50 25v50M35 75h30" stroke="white" strokeWidth="14" strokeLinecap="round" />
          <circle cx="50" cy="48" r="8" fill="#bc2026" />
        </svg>
      );
    case "Axis":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="10" fill="#ae1c3f" />
          <path d="M25 75L50 25L75 75H60L50 50L40 75H25z" fill="white" />
        </svg>
      );
    case "Kotak":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="50" fill="#dd1e26" />
          <path d="M30 30v40h12V53l15 17h15L56 47l14-17H56L42 47v-17H30z" fill="white" />
          <circle cx="70" cy="35" r="5" fill="#004c8f" />
        </svg>
      );
    case "Razorpay":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 80L50 20L85 80H65L50 48L35 80H15z" fill="#004c8f" />
          <path d="M35 80L50 48L65 80H50" fill="#00a4e4" />
        </svg>
      );
    case "Google":
      return (
        <svg className="w-3 h-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
      );
    case "Apple":
      return (
        <svg className="w-3.5 h-3.5 text-slate-900" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.49-.62.71-1.16 1.85-1.01 2.96 1.09.09 2.2-.57 2.94-1.39z"/>
        </svg>
      );
    case "CRED":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="50" fill="#121212" />
          <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="6" strokeDasharray="12 6" />
          <circle cx="50" cy="50" r="15" stroke="white" strokeWidth="6" />
        </svg>
      );
    case "Paytm":
      return (
        <div className="flex items-center justify-center font-sans tracking-tighter font-extrabold select-none translate-y-[0.5px]">
          <span className="text-[7.5px] text-[#00baf2] lowercase leading-none">pay</span>
          <span className="text-[7.5px] text-[#002e6e] lowercase leading-none">tm</span>
        </div>
      );
    case "PhonePe":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="24" fill="#5f259f" />
          <path d="M32 25h24c8 0 14 5 14 12.5S64 50 56 50H44v25h-12V25zm24 14v-2c0-1.5-1-2.5-2.5-2.5H44V41h9.5c1.5 0 2.5-1 2.5-2.5z" fill="white" />
          <path d="M44 50h12v12H44z" fill="#ffb400" />
        </svg>
      );
    case "Stripe":
      return (
        <svg className="w-3 h-3.5" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M41 12c-10 0-17 5-17 15 0 15 20 12 20 22 0 4-4 7-10 7-10 0-17-4-23-9v17c6 3 15 5 22 5 18 0 29-8 29-22 0-17-20-13-20-23 0-4 4-6 9-6 8 0 14 3 19 6V17c-6-3-13-5-19-5z" fill="#635bff" />
        </svg>
      );
    default:
      return <span className="text-[10px] font-bold text-gray-500">{name[0]}</span>;
  }
}

export default function PartnerOrbitSection() {
  const orbitCount = 3;
  const orbitGap = 5.5; // compact spacing
  const baseSize = 8.5; // compact base size
  const iconsPerOrbit = 4; // distribute evenly

  // 12 unique logos, completely removing duplicates
  const orbits = [
    ["SBI", "HDFC", "ICICI", "Axis"],
    ["Kotak", "Razorpay", "Paytm", "PhonePe"],
    ["Stripe", "CRED", "Google", "Apple"],
  ];

  return (
    <section className="relative max-w-6xl mx-auto my-20 p-8 flex flex-col md:flex-row items-center justify-between min-h-[30rem] border border-gray-200/80 bg-white overflow-hidden rounded-3xl shadow-lg">
      
      {/* Left side: Heading and Text */}
      <div className="w-full md:w-1/2 z-10 text-center md:text-left md:pl-6 space-y-5">
        <span className="rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-[10px] font-bold text-blue-700 uppercase tracking-widest inline-block">
          Financial Network
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
          Unified Indian Banking & Fintech Integrations
        </h2>
        <p className="text-gray-500 font-medium text-sm leading-relaxed max-w-lg">
          TFG ComplianceOS connects directly with leading institutions. Enable secure identity verifications through top banks (SBI, HDFC, ICICI, Axis, Kotak) and streamline platform pipelines with leading fintech networks (CRED, Stripe, PhonePe, Paytm).
        </p>
        <div className="flex items-center gap-3 justify-center md:justify-start">
          <Link to="/signup">
            <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-xs font-bold shadow-md shadow-blue-500/10">
              Get Started Sandbox
            </Button>
          </Link>
          <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}>
            <Button variant="outline" className="border-gray-200 text-gray-700 rounded-xl px-5 py-2.5 text-xs font-bold hover:bg-gray-50">
              Explore Features
            </Button>
          </button>
        </div>
      </div>

      {/* Right side: Orbit animation cropped to 1/2 */}
      <div className="relative w-full md:w-1/2 h-[340px] md:h-full flex items-center justify-center md:justify-start overflow-hidden pt-8 md:pt-0">
        <div className="relative w-[42rem] h-[42rem] md:translate-x-[25%] flex items-center justify-center">
          
          {/* Center Circle (TFG ComplianceOS Logo) */}
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center z-10 border-4 border-white">
            <ShieldCheck className="w-6 h-6" />
          </div>

          {/* Static Background Orbit Tracks */}
          {[...Array(orbitCount)].map((_, orbitIdx) => {
            const size = `${baseSize + orbitGap * (orbitIdx + 1)}rem`;
            return (
              <div
                key={`track-${orbitIdx}`}
                className="absolute rounded-full border border-slate-200/80 pointer-events-none"
                style={{
                  width: size,
                  height: size,
                }}
              />
            );
          })}

          {/* Generate Orbits (Rotating logo tracks) */}
          {[...Array(orbitCount)].map((_, orbitIdx) => {
            const size = `${baseSize + orbitGap * (orbitIdx + 1)}rem`;
            const angleStep = (2 * Math.PI) / iconsPerOrbit;
            const orbitBrands = orbits[orbitIdx];

            return (
              <div
                key={orbitIdx}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: size,
                  height: size,
                  animation: `${orbitIdx % 2 === 1 ? 'spin-reverse' : 'spin'} ${24 + orbitIdx * 8}s linear infinite`,
                }}
              >
                {orbitBrands.map((name, iconIdx) => {
                  const angle = iconIdx * angleStep;
                  const x = 50 + 50 * Math.cos(angle);
                  const y = 50 + 50 * Math.sin(angle);

                  return (
                    <div
                      key={iconIdx}
                      className="absolute"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {/* Level 2 Wrapper: Hover Scale & Shadow */}
                      <div className="transition-transform duration-300 hover:scale-120 cursor-pointer pointer-events-auto">
                        {/* Level 3 Wrapper: Counter-Rotation Animation so logo stays perfectly upright */}
                        <div
                          className="bg-white rounded-full shadow-sm border border-gray-100/60 flex items-center justify-center w-8 h-8 hover:shadow-md transition-shadow duration-300"
                          style={{
                            animation: `${orbitIdx % 2 === 1 ? 'spin' : 'spin-reverse'} ${24 + orbitIdx * 8}s linear infinite`,
                          }}
                          title={name}
                        >
                          <RenderPartnerLogo name={name} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Animation keyframes injected dynamically */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
      `}</style>
    </section>
  );
}
