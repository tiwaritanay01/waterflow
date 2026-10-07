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
  FileCheck,
  Search,
  Calendar
} from "lucide-react";

export default function LandingPage({
  onNavigateToLogin,
  onOpenPortalDirectly,
}) {
  const [lang, setLang] = useState("en");
  const [modalContent, setModalContent] = useState(null);

  const getModalInfo = () => {
    switch(modalContent) {
      case "Sitemap": return { title: "Sitemap", body: "Explore the comprehensive structure of WaterFlow OS. Main sections include Citizen Portal, SCADA Command Center, Field Operations, and Analytics. Navigate seamlessly across municipal domains." };
      case "FAQs": return { title: "Frequently Asked Questions", body: "Q: What is WaterFlow OS?\nA: A unified municipal water governance platform for Mumbai.\n\nQ: How do I report a water shortage?\nA: Use the Citizen Portal to file a deficit report which algorithms use to dispatch tankers." };
      case "Downloads": return { title: "Downloads", body: "• WaterFlow Citizen App (APK)\n• Field Worker Terminal (APK)\n• SCADA Operator Manual (PDF)\n• Annual Water Report 2026 (PDF)" };
      case "Help": return { title: "Help & Support", body: "For technical assistance, please contact the BMC IT Cell.\n24/7 Helpline: +91 8369978764\nEmail: support@waterflow-mcgm.gov.in" };
      case "Disclaimer": return { title: "Disclaimer & Policies", body: "All data displayed on WaterFlow OS is property of the Government of Maharashtra and BMC. The information is provided for municipal operations and civic transparency. Unauthorized access to the SCADA Command Center is strictly prohibited and subject to prosecution." };
      case "Accessibility": return { title: "Accessibility Statement", body: "WaterFlow OS is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone, and applying the relevant accessibility standards." };
      case "Internet": return { title: "Web Portal", body: "The WaterFlow OS is fully accessible via any modern web browser. No app download is necessary for standard citizen services." };
      default: return null;
    }
  };

  const modalData = getModalInfo();

  return (
    <div className="min-h-screen w-full bg-[#f5faff] font-sans text-slate-800 antialiased selection:bg-sky-100 flex flex-col">
      
      {/* ============================================================
          FIXED MUNICIPAL HEADER
          ============================================================ */}
      <header className="sticky top-0 left-0 right-0 h-16 bg-[#003f87] z-40 flex items-center justify-between px-4 xl:px-8 shadow-md border-b border-[#002f6c]">
        
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div className="bg-white rounded-full p-0.5 shadow-sm">
            <img src="/logo.jpg" alt="WaterFlow OS Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0" />
          </div>
          <span className="font-extrabold text-[15px] sm:text-base tracking-tight text-white whitespace-nowrap">
            WaterFlow OS
          </span>
        </div>

        {/* Center Navigation Links (Hidden on mobile/tablet) */}
        <nav className="hidden lg:flex items-center justify-center gap-4 xl:gap-6 text-white text-[13px] font-medium whitespace-nowrap mx-4">
          <a href="#" className="hover:text-sky-200 transition-colors">Home</a>
          <button onClick={() => onOpenPortalDirectly("citizen")} className="hover:text-sky-200 transition-colors cursor-pointer">Citizens</button>
          <button onClick={() => onOpenPortalDirectly("command")} className="hover:text-sky-200 transition-colors cursor-pointer">Command Center</button>
          <button onClick={() => onOpenPortalDirectly("worker")} className="hover:text-sky-200 transition-colors cursor-pointer">Field Operations</button>
          <a href="#" className="hover:text-sky-200 transition-colors">Analytics</a>
          <a href="#" className="hover:text-sky-200 transition-colors">About Us</a>
          <a href="#" className="hover:text-sky-200 transition-colors">Help & Support</a>
        </nav>

        {/* Right Actions: Search & Login CTA */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <button
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#003f87] hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
            aria-label="Search"
          >
            <Search className="w-4 h-4 stroke-[2.5px]" />
          </button>
          
          <button
            onClick={onNavigateToLogin}
            className="inline-flex items-center justify-center px-5 sm:px-7 py-1.5 sm:py-2 rounded bg-white text-[#003f87] font-bold text-[13px] sm:text-sm hover:bg-slate-50 transition-all shadow-sm cursor-pointer whitespace-nowrap"
          >
            Login
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2 px-3 py-2 sm:py-1 rounded-xl sm:rounded-full bg-white text-sky-900 shadow-2xs border border-sky-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0 mt-1 sm:mt-0"></span>
              <span className="uppercase tracking-wider text-[10px] sm:text-[10.5px] leading-snug">
                MUNICIPAL WATER COMMAND &amp; CIVIC EQUITY PLATFORM · SCADA v4.12
              </span>
            </div>

            <a
              href="tel:+918369978764"
              className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-3 py-2 sm:py-1 rounded-xl sm:rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold shadow-2xs transition"
            >
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Emergency Helpline: +91 8369978764</span>
              </div>
              <span className="hidden sm:inline text-rose-300">•</span>
              <span className="font-mono font-bold text-[10px] sm:text-[11px] opacity-90 pl-5 sm:pl-0">24/7 AI Bot &amp; Call Queue</span>
            </a>
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
                  <span>Citizen Water Portal (⭐ 145 Civic Credits)</span>
                </button>

                <button
                  onClick={() => onOpenPortalDirectly("worker")}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-amber-800 border border-amber-300 font-bold text-xs sm:text-sm hover:bg-amber-50 transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-amber-600" />
                  <span>Worker Field Terminal (⭐ 120 Cr · T-08)</span>
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
                  Citizen Grievance &amp; Tracking App
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mobile app for residents to report water shortage, view location on map, track dispatched relief tankers, and receive secure 4-digit OTPs.
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
                  Worker Logistics &amp; Field App
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
      <footer className="mt-auto bg-[#003f87] py-8 px-4 sm:px-8 text-white text-center border-t border-[#002f6c]">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 text-[13px]">
          
          {/* Top Links */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 items-center font-medium">
            <button onClick={() => window.scrollTo(0, 0)} className="hover:text-sky-200 transition cursor-pointer">Home</button>
            <span className="text-white/40">|</span>
            <button onClick={() => setModalContent("Sitemap")} className="hover:text-sky-200 transition cursor-pointer">Sitemap</button>
            <span className="text-white/40">|</span>
            <button onClick={() => setModalContent("FAQs")} className="hover:text-sky-200 transition cursor-pointer">FAQs</button>
            <span className="text-white/40">|</span>
            <button onClick={() => setModalContent("Downloads")} className="hover:text-sky-200 transition cursor-pointer">Downloads</button>
            <span className="text-white/40">|</span>
            <button onClick={() => setModalContent("Help")} className="hover:text-sky-200 transition cursor-pointer">Help</button>
            <span className="text-white/40">|</span>
            <button onClick={() => setModalContent("Disclaimer")} className="hover:text-sky-200 transition cursor-pointer">Disclaimer & Policies</button>
            <span className="text-white/40">|</span>
            <button onClick={() => setModalContent("Accessibility")} className="hover:text-sky-200 transition cursor-pointer">Accessibility Statement</button>
          </div>

          {/* Connect & Apps */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
            <span className="text-sm font-semibold">Connect Us with</span>
            <div className="flex gap-4">
              <button onClick={() => setModalContent("Internet")} className="text-white hover:text-slate-300 transition-colors cursor-pointer" aria-label="Web Portal">
                <Globe className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="h-px w-full max-w-4xl bg-white/10 my-1"></div>

          {/* Legal / Disclaimers */}
          <div className="text-[11px] text-white/70 leading-relaxed max-w-4xl mx-auto">
            A digital initiative of the Government of Maharashtra for efficient, transparent and equitable water resource allocation.<br />
            Supporting informed decision-making and sustainable water management through technology.
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold mt-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Page updated on: 07/10/2026</span>
          </div>

        </div>
      </footer>

      {/* Dynamic Info Modal */}
      {modalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-[#003f87] px-5 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">{modalData.title}</h3>
              <button onClick={() => setModalContent(null)} className="text-white/70 hover:text-white transition cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {modalData.body}
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setModalContent(null)} className="px-5 py-2 bg-[#003f87] hover:bg-[#002f6c] text-white font-semibold rounded-lg transition cursor-pointer">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
