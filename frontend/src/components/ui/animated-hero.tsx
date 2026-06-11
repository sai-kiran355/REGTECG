import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, PhoneCall } from "lucide-react";
import { Button } from "./button";
import { Link } from "react-router-dom";

export function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["Banks", "Fintechs", "NBFCs", "Regulators", "Developers"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full relative py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-white">
      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-20 left-1/4 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-32 right-1/4 w-96 h-96 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex gap-8 items-center justify-center flex-col text-center">
          <div>
            <Button variant="secondary" size="sm" className="gap-2 bg-blue-50 border border-blue-200/50 hover:bg-blue-100/60 rounded-full px-4 text-blue-700 font-bold transition-all text-xs">
              Threshing Floor Group Product <MoveRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex gap-4 flex-col max-w-4xl">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-tight">
              <span>Automated Compliance for</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center h-[52px] md:h-[72px] lg:h-[88px] mt-2 text-blue-600">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
                    initial={{ opacity: 0, y: 50 }}
                    transition={{ type: "spring", stiffness: 80, damping: 15 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -80 : 80,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-base md:text-lg leading-relaxed text-gray-500 max-w-2xl mx-auto mt-4 font-medium">
              TFG ComplianceOS is a secure RegTech and workforce operations suite. 
              We bridge bank-grade audit-ready KYC, AML, and sanctions checks with active fintech 
              employee onboarding, geofenced GPS log trackings, and automated payroll runs.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3.5 mt-4 w-full sm:w-auto">
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl px-7 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition-all">
                Jump to login <PhoneCall className="w-4 h-4 text-gray-400" />
              </Button>
            </Link>
            <Link to="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-7 py-3.5 text-sm font-black shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all">
                Sign up here <MoveRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
