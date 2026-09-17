import React, { useState } from "react";
import {
  Droplet,
  ShieldCheck,
  Building2,
  Truck,
  User,
  CheckCircle2,
  ArrowRight,
  Phone,
  BarChart3,
  MapPin,
  Clock,
  Navigation,
  Globe,
  Activity,
  Layers,
  Sparkles,
  Scale,
  Compass,
  FileCheck
} from "lucide-react";

export default function LandingPage({
  onNavigateToLogin,
  onOpenPortalDirectly,
}) {
  const [lang, setLang] = useState("en");

  return (
    <div className="min-h-screen w-full bg-[#f5faff] font-sans text-slate-800 antialiased selection:bg-sky-100 flex flex-col">
      
      {/* ============================================================
          FIXED MUNICIPAL HEADER
          ============================================================ */}
      <header className="sticky top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md z-40 flex items-center justify-between px-4 sm:px-8 border-b border-slate-200 shadow-2xs">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#003f87] flex items-center justify-center text-white shadow-xs">
            <Droplet className="w-5 h-5 fill-sky-200 text-sky-200" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-base tracking-tight text-[#003f87] leading-tight flex items-center gap-1">
              <span>WaterFlow</span>
              <span className="text-[#0060ab]">OS</span>
            </span>
            <span className="text-[9.5px] font-mono font-semibold uppercase text-slate-500">
              MCGM / BMC SCADA Control
            </span>
          </div>
        </div>

        {/* Center Grid Status (Hidden on small mobile) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-600 font-medium">Metropolitan Water Command Center</span>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-emerald-700 font-bold text-[11px]">SCADA 99.4% Grid Stable</span>
        </div>

        {/* Right Actions: Language & Login CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "en" ? "mr" : "en")}
            className="text-slate-600 hover:text-slate-900 text-xs font-bold px-2 py-1 rounded border border-slate-200 bg-slate-50 transition"
          >
            {lang === "en" ? "मराठी" : "English"}
          </button>

          <button
            onClick={onNavigateToLogin}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#0056b3] text-white font-bold text-xs tracking-wide uppercase hover:bg-sky-800 transition-all shadow-xs cursor-pointer"
          >
            <span>Sign In / Portal Access</span>
          </button>
        </div>
      </header>

      {/* ============================================================
          HERO & MISSION COMMAND INTEL SECTION
          ============================================================ */}
      <section className="relative w-full px-4 sm:px-8 pt-8 pb-10 bg-gradient-to-b from-white via-sky-50/40 to-[#f5faff] overflow-hidden border-b border-slate-200">
        
        {/* Ambient Backdrop Geometric Grid Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <svg className="w-full h-full text-slate-300" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern height="48" id="scada-grid" patternUnits="userSpaceOnUse" width="48">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.75"></path>
                <circle cx="24" cy="24" fill="currentColor" opacity="0.3" r="1"></circle>
              </pattern>
            </defs>
            <rect fill="url(#scada-grid)" height="100%" width="100%"></rect>
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto flex flex-col gap-6">
          
          {/* Top Badges & Emergency Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-sky-900 shadow-2xs border border-sky-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="uppercase tracking-wider text-[10.5px]">
                MUNICIPAL WATER COMMAND &amp; CIVIC EQUITY PLATFORM · SCADA v4.12
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold shadow-2xs">
              <Phone className="w-3.5 h-3.5 text-rose-600" />
              <span>Emergency Grievance: Dial 1916</span>
              <span className="text-rose-300">•</span>
              <span className="font-mono font-bold text-[11px]">24/7 BMC Water Helpline</span>
            </div>
          </div>

          {/* Hero Header & High Impact Copy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
            
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="inline-flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#0056b3] text-white font-mono text-[10.5px] font-bold">
                  MCGM / BMC SCADA
                </span>
                <span className="font-mono text-[11px] text-slate-500 font-medium">
                  BHANDUP-PANJRAPUR COMPLEX TELEMETRY
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Algorithmic Water Allocation &amp;{" "}
                <span className="text-[#0056b3]">Transparent Municipal Command</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed font-normal">
                WaterFlow OS transforms municipal water governance across Mumbai’s 24 BMC wards. By analyzing real-time SCADA pressure, vulnerability indices, and citizen deficit reports, it guarantees mathematically equitable water distribution and coordinated emergency tanker dispatch.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onOpenPortalDirectly("command")}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0056b3] text-white font-bold text-xs sm:text-sm hover:bg-sky-800 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Activity className="w-4 h-4" />
                  <span>Explore Live Command Center</span>
                </button>

                <button
                  onClick={() => onOpenPortalDirectly("citizen")}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-sky-800 border border-sky-300 font-bold text-xs sm:text-sm hover:bg-sky-50 transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Droplet className="w-4 h-4 text-sky-600" />
                  <span>Citizen Water Portal</span>
                </button>

                <button
                  onClick={() => onOpenPortalDirectly("worker")}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-amber-800 border border-amber-300 font-bold text-xs sm:text-sm hover:bg-amber-50 transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-amber-600" />
                  <span>Worker Field Terminal</span>
                </button>
              </div>

              {/* Quick Auto-Detect Ward Action */}
              <div className="pt-1">
                <button
                  onClick={() => onOpenPortalDirectly("citizen")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 shadow-2xs transition-all cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>Auto-Detect My Ward &amp; View Local Water Timetable</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-slate-500 text-xs pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Zero VIP Intervention Protocol · PostGIS Automated Routing
                </span>
              </div>
            </div>

            {/* Hero Graphic: SCADA Flow Dial & Ward Equilibrium Monitor */}
            <div className="lg:col-span-4">
              <div className="relative p-5 rounded-2xl bg-white shadow-sm border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-700" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                      Algorithmic Balance Core
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                    OPTIMAL FLOW
                  </span>
                </div>

                {/* SVG Circular SCADA Telemetry Visualization */}
                <div className="relative flex items-center justify-center py-2">
                  <svg className="w-44 h-44 -rotate-90" viewBox="0 0 120 120">
                    <circle className="text-slate-100" cx="60" cy="60" fill="none" r="50" stroke="currentColor" strokeWidth="8"></circle>
                    <circle className="text-[#0056b3]" cx="60" cy="60" fill="none" r="50" stroke="currentColor" strokeDasharray="314.159" strokeDashoffset="18.8" strokeLinecap="round" strokeWidth="8"></circle>
                    <circle className="text-sky-400" cx="60" cy="60" fill="none" opacity="0.6" r="40" stroke="currentColor" strokeDasharray="251.3" strokeDashoffset="40" strokeLinecap="round" strokeWidth="3"></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-2xl font-black text-slate-900">94.2%</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Equity Parity</span>
                    <span className="font-mono text-[10px] text-emerald-600 mt-0.5 font-bold">±0.4 bar Variance</span>
                  </div>
                </div>

                {/* Mini Live Feeds */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs font-mono">
                    <span className="text-slate-500">Bhandup Reservoir Outflow</span>
                    <span className="text-sky-800 font-bold">2,140 MLD</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs font-mono">
                    <span className="text-slate-500">Panjrapur Feeder Line</span>
                    <span className="text-sky-800 font-bold">1,710 MLD</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs font-mono">
                    <span className="text-slate-500">G/North Ward Pressure Avg</span>
                    <span className="text-emerald-700 font-bold">1.82 Bar (Nominal)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Live Telemetry Ticker across the bottom of the hero */}
          <div className="mt-4 p-4 rounded-xl bg-white shadow-2xs border border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-center">
              
              {/* Metric 1 */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Wards</span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  24 / 24 <span className="text-xs text-emerald-600 font-semibold">Synced</span>
                </span>
                <span className="text-[10.5px] text-slate-500">A to T Wards Mumbai</span>
              </div>

              {/* Metric 2 */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Real-Time Flow</span>
                <span className="text-lg font-black text-[#0056b3] font-mono">
                  3,850 <span className="text-xs font-sans font-bold">MLD</span>
                </span>
                <span className="text-[10.5px] text-slate-500">Target: 3,900 MLD City Cap</span>
              </div>

              {/* Metric 3 */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Equity Index</span>
                <span className="text-lg font-black text-emerald-600 font-mono">
                  94% <span className="text-xs font-sans font-bold">Parity</span>
                </span>
                <span className="text-[10.5px] text-slate-500">Slum vs High-Rise Ratio</span>
              </div>

              {/* Metric 4 */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Relief Fleet</span>
                <span className="text-lg font-black text-amber-600 font-mono">
                  15 / 25 <span className="text-xs font-sans font-bold text-slate-500">Active</span>
                </span>
                <span className="text-[10.5px] text-slate-500">GPS-locked Tankers</span>
              </div>

              {/* Metric 5 */}
              <div className="flex flex-col col-span-2 md:col-span-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Deficit Cleared</span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  810 <span className="text-xs font-sans font-bold text-[#0056b3]">KL Today</span>
                </span>
                <span className="text-[10.5px] text-slate-500">Dry Tap Relieved</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ============================================================
          SECTION 2: THREE-TIER CIVIC ECOSYSTEM
          ============================================================ */}
      <section className="w-full px-4 sm:px-8 py-10 max-w-7xl mx-auto flex flex-col gap-6">
        
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold text-[#0056b3] uppercase tracking-widest font-mono">
            Role-Based Access Architecture
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Unified Water Intelligence Ecosystem
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Three interconnected, synchronized portals powering end-to-end municipal governance from telemetry to tap.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          {/* Card 1: Municipal Command Center */}
          <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all group">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-[#0056b3] flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-sky-800 uppercase tracking-wider">
                  Tier 1 · Admin &amp; Engineers
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Municipal Command Center
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Full-screen interactive Leaflet GIS choropleth across all 24 BMC wards, priority queue ranking, SCADA telemetry, and automated fleet dispatching.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>24 Ward OpenStreetMap boundaries</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Algorithmic priority queue explainability</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Live depot reservoir monitoring</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenPortalDirectly("command")}
              className="mt-5 w-full py-2.5 rounded-lg bg-[#0056b3] hover:bg-sky-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Access Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Citizen Water Portal */}
          <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all group">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-[#0060ab] flex items-center justify-center font-bold">
                <Droplet className="w-6 h-6 fill-sky-200" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-sky-700 uppercase tracking-wider">
                  Tier 2 · Mumbai Residents
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Citizen Grievance &amp; Tracking PWA
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mobile-first PWA for residents to report water deficit, verify WGS84 GPS coordinates, track dispatched relief tankers, and receive secure 4-digit OTPs.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Bilingual English / मराठी interface</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>One-Time Delivery PIN verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Live ETA &amp; driver liaison direct dial</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenPortalDirectly("citizen")}
              className="mt-5 w-full py-2.5 rounded-lg bg-[#0060ab] hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Launch Citizen Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3: Worker Logistics Terminal */}
          <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all group">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider">
                  Tier 3 · Drivers &amp; Crews
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Worker Logistics &amp; Valve PWA
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Outdoor high-contrast field terminal with turn-by-turn route navigation, 3-state logistics toggle (En Route, Arrived, Dispensing), and 4-digit PIN keypad.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Anti-theft PIN proof of delivery</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Offline SCADA service worker cache</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>GPS Geofence radius validation</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenPortalDirectly("worker")}
              className="mt-5 w-full py-2.5 rounded-lg bg-[#d97706] hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Open Driver Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* ============================================================
          MUNICIPAL CIVIC FOOTER
          ============================================================ */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#003f87] flex items-center justify-center text-white font-bold text-xs">
              MCGM
            </div>
            <div>
              <p className="font-bold text-slate-800">
                Brihanmumbai Municipal Corporation (BMC) · Water Engineering Dept
              </p>
              <p className="text-[11px] text-slate-400">
                WaterFlow OS SCADA Algorithmic Grid Telemetry v4.12 · 24 Administrative Wards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>CERT-In Audited</span>
            <span>•</span>
            <span>STQC Cert #4491-MCGM</span>
            <span>•</span>
            <span>24/7 Helpline: 1916</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
