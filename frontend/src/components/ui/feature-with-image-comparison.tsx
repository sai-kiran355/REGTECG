import { useState } from "react";
import { Badge } from "./badge";
import { Landmark, Building2, Shield, GripVertical, CheckCircle, AlertTriangle, Activity, MapPin } from "lucide-react";

export function Feature() {
  const [inset, setInset] = useState<number>(50);

  // Dynamic opacity values for the floating labels based on slider position
  const bankOpacity = Math.max(0.3, inset / 100);
  const fintechOpacity = Math.max(0.3, (100 - inset) / 100);

  return (
    <div className="w-full py-24 bg-slate-50 border-t border-b border-gray-150 relative overflow-hidden">
      {/* Subtle decorative grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-60" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col gap-10 max-w-5xl mx-auto">
          
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <Badge variant="outline" className="px-3.5 py-1 text-xs font-bold border-blue-200 text-blue-700 bg-blue-50/50 shadow-sm">
              Interactive Comparison
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Two Environments,<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">One Unified Boundary</span>
            </h2>
            <p className="text-gray-500 font-medium text-sm sm:text-base leading-relaxed">
              TFG ComplianceOS connects bank regulatory environments with fintech staff systems. Drag the slider below to view the workspaces in real-time.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mt-4">
            
            {/* Left/Right Floating Status Labels */}
            <div className="lg:col-span-12 flex justify-between items-center px-4 max-w-[560px] mx-auto w-full text-xs font-bold tracking-wider uppercase">
              <span 
                className="transition-opacity duration-150 flex items-center gap-1.5 text-blue-600"
                style={{ opacity: bankOpacity }}
              >
                <Landmark className="w-3.5 h-3.5" /> Bank RegTech Suite
              </span>
              <span 
                className="transition-opacity duration-150 flex items-center gap-1.5 text-indigo-500"
                style={{ opacity: fintechOpacity }}
              >
                Fintech Ops Hub <Building2 className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Slider Showcase Container */}
            <div className="lg:col-span-12 w-full flex justify-center">
              <div className="relative w-full max-w-[560px] aspect-[4/3] overflow-hidden rounded-[2.5rem] border border-gray-200 shadow-2xl bg-slate-900 select-none">
                
                {/* ── 1. BANK COCKPIT PANEL (Left Side, Clipped Light Mode) ── */}
                <div 
                  className="absolute inset-0 w-full h-full bg-slate-50 text-slate-800 z-10 flex flex-col pointer-events-none"
                  style={{
                    clipPath: "polygon(0 0, " + inset + "% 0, " + inset + "% 100%, 0 100%)",
                  }}
                >
                  {/* Header */}
                  <div className="bg-white border-b border-gray-250/60 px-5 py-4 flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-blue-600 p-1.5 rounded-lg text-white shadow-md shadow-blue-500/10">
                        <Landmark className="w-4 h-4" />
                      </span>
                      <div className="flex flex-col text-left">
                        <span className="text-[11px] font-black text-slate-900 tracking-tight leading-none">Compliance Cockpit</span>
                        <span className="text-[8px] font-bold text-slate-400 mt-0.5">Audit Sandbox Desk</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Nodes Active
                    </span>
                  </div>

                  {/* Body Workspace */}
                  <div className="p-5 flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-4">
                      
                      {/* Top Metric Row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200/80 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                          <div className="relative w-10 h-10 flex items-center justify-center">
                            {/* Compliance Circle SVG Gauge */}
                            <svg className="absolute w-full h-full transform -rotate-90">
                              <circle cx="20" cy="20" r="16" stroke="#f1f5f9" strokeWidth="3.5" fill="transparent" />
                              <circle cx="20" cy="20" r="16" stroke="#2563eb" strokeWidth="3.5" fill="transparent" strokeDasharray="100" strokeDashoffset="12" />
                            </svg>
                            <span className="text-[9px] font-black text-blue-600">88%</span>
                          </div>
                          <div className="text-left">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wide block">Health Index</span>
                            <span className="text-xs font-black text-slate-800">Operational</span>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200/80 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                          <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl border border-amber-100">
                            <Shield className="w-4.5 h-4.5 animate-pulse" />
                          </div>
                          <div className="text-left">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wide block">AML Risk Cases</span>
                            <span className="text-xs font-black text-slate-800">1 Critical Review</span>
                          </div>
                        </div>
                      </div>

                      {/* AML Live Stream Ticker */}
                      <div className="space-y-2.5 text-left">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Audit Review Stream</span>
                        
                        <div className="bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="bg-red-50 text-red-600 p-1.5 rounded-lg border border-red-100">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                            <div className="text-left">
                              <p className="text-[11px] font-black text-slate-900">Kunal Verma</p>
                              <p className="text-[9px] text-slate-400 font-semibold">PEP match identified</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                            Flagged Case
                          </span>
                        </div>

                        <div className="bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-between opacity-85">
                          <div className="flex items-center gap-2.5">
                            <span className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg border border-emerald-100">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </span>
                            <div className="text-left">
                              <p className="text-[11px] font-black text-slate-900">Amit Sharma</p>
                              <p className="text-[9px] text-slate-400 font-semibold">PAN KYC Match ok</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                            Approved
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Bottom Status Ticker */}
                    <div className="border-t border-gray-200/60 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-semibold shrink-0">
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-blue-600" /> Endpoint API check ok</span>
                      <span>v2.4.1</span>
                    </div>

                  </div>
                </div>

                {/* ── 2. FINTECH OPERATIONS PANEL (Right Side, Backdrop Dark Mode) ── */}
                <div className="absolute inset-0 w-full h-full bg-slate-900 text-white z-0 flex flex-col">
                  {/* Header */}
                  <div className="bg-slate-950 border-b border-slate-800 px-5 py-4 flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-md shadow-indigo-500/10">
                        <Building2 className="w-4 h-4" />
                      </span>
                      <div className="flex flex-col text-left">
                        <span className="text-[11px] font-black text-white tracking-tight leading-none">Fintech Operations Hub</span>
                        <span className="text-[8px] font-bold text-slate-500 mt-0.5">Workforce & HR Operations</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-900/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Active Workspace
                    </span>
                  </div>

                  {/* Body Workspace */}
                  <div className="p-5 flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-4">
                      
                      {/* Interactive visual layout */}
                      <div className="grid grid-cols-12 gap-4">
                        
                        {/* Geofence GPS visual widget (8 columns) */}
                        <div className="col-span-7 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 shadow-inner flex flex-col justify-between h-[104px]">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Office Geofence</span>
                            <span className="text-[8px] font-bold text-emerald-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> Inside</span>
                          </div>
                          
                          {/* Pulsing GPS Map Grid representation */}
                          <div className="relative w-full h-12 bg-slate-900 rounded-lg overflow-hidden border border-slate-800/60 flex items-center justify-center">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:10px_10px]" />
                            {/* Radar circular sweep */}
                            <div className="w-10 h-10 rounded-full border border-indigo-500/30 flex items-center justify-center animate-ping absolute" />
                            <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/40 flex items-center justify-center relative">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/40" />
                            </div>
                          </div>

                          <span className="text-[8px] font-bold text-slate-400 text-left">Coordinates: 19.0760° N, 72.8777° E</span>
                        </div>

                        {/* Payroll Disbursal vertical bar widget (5 columns) */}
                        <div className="col-span-5 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 shadow-inner flex flex-col justify-between h-[104px]">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block text-left">Payroll Release</span>
                          <div className="flex items-end justify-between h-10 px-1">
                            <div className="w-2 bg-slate-800 rounded-full h-[30%]" />
                            <div className="w-2 bg-indigo-600 rounded-full h-[60%]" />
                            <div className="w-2 bg-slate-800 rounded-full h-[40%]" />
                            <div className="w-2 bg-indigo-500 rounded-full h-[90%] animate-pulse" />
                          </div>
                          <div className="text-left leading-none">
                            <span className="text-[10px] font-black text-white">₹14.2L</span>
                            <span className="text-[7px] text-slate-500 block mt-0.5">Disbursed June</span>
                          </div>
                        </div>

                      </div>

                      {/* Active employee records */}
                      <div className="space-y-2">
                        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-2.5 flex items-center justify-between text-xs shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-slate-800 rounded-xl flex items-center justify-center font-black text-[9px] text-indigo-400">KK</div>
                            <div className="text-left">
                              <p className="font-bold text-white">Kiran Kumar</p>
                              <p className="text-[8px] text-slate-500 font-semibold">Senior Software Engineer</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md text-emerald-400 bg-emerald-950 border border-emerald-900/40">
                            Active Ops
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Bottom Status Ticker */}
                    <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-semibold shrink-0">
                      <span className="flex items-center gap-1 text-slate-400"><Activity className="w-3 h-3 text-indigo-500" /> Database sync online</span>
                      <span>v1.0.9</span>
                    </div>

                  </div>
                </div>

                {/* ── 3. SLIDER CONTROLLER HANDLE (Centered Glowing Line & Toggle) ── */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 z-30 cursor-ew-resize flex justify-center items-center pointer-events-none shadow-lg shadow-indigo-500/20"
                  style={{
                    left: inset + "%",
                  }}
                >
                  {/* Floating Controller Button */}
                  <div className="bg-white border border-gray-200/80 text-gray-700 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all w-8 h-8 flex justify-center items-center select-none cursor-pointer">
                    <GripVertical className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
                  </div>
                </div>

                {/* ── 4. INVISIBLE INPUT RANGE OVERLAY (Smooth native gestures) ── */}
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={inset}
                  onChange={(e) => setInset(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 z-40 cursor-ew-resize"
                />

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
