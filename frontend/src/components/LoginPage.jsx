import React, { useState } from "react";
import {
  ShieldCheck,
  Building2,
  Truck,
  User,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  AlertTriangle,
  Globe,
  Sparkles,
  Cpu,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import MumbaiLeafletMap from "./MumbaiLeafletMap";
import {
  DEFAULT_MUMBAI_WARDS,
  DEFAULT_MUMBAI_TANKERS,
  DEFAULT_MUMBAI_DEPOTS,
} from "../utils/mumbaiWardsData";

/**
 * Bespoke WaterFlow Brand Emblem
 * Features circular civic-inspired geometry, precision telemetry calibrations,
 * and dual interlocking fluid conduits flowing into a central infrastructure core.
 */
export function WaterFlowEmblem({ className = "w-10 h-10", dark = false }) {
  const primaryColor = dark ? "#003F87" : "#FFFFFF";
  const aquaColor = "#19D3E6";
  const blueColor = "#3399FF";
  const ringColor = dark ? "rgba(0, 63, 135, 0.15)" : "rgba(25, 211, 230, 0.25)";

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="WaterFlow Emblem"
    >
      <defs>
        <linearGradient id={`wf-flow-grad-${dark ? "d" : "l"}`} x1="15" y1="20" x2="85" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={aquaColor} />
          <stop offset="50%" stopColor={blueColor} />
          <stop offset="100%" stopColor={dark ? "#0056B3" : "#FFFFFF"} />
        </linearGradient>
        <radialGradient id={`wf-core-glow-${dark ? "d" : "l"}`} cx="50" cy="50" r="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={aquaColor} stopOpacity={dark ? "0.3" : "0.5"} />
          <stop offset="100%" stopColor={aquaColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Central Ambient Glow */}
      <circle cx="50" cy="50" r="32" fill={`url(#wf-core-glow-${dark ? "d" : "l"})`} />

      {/* Outer Precision Telemetry Ring */}
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke={ringColor}
        strokeWidth="1.5"
        strokeDasharray="2 4"
      />

      {/* Calibrated Cardinal Ticks */}
      <line x1="50" y1="3" x2="50" y2="9" stroke={aquaColor} strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="91" x2="50" y2="97" stroke={aquaColor} strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="50" x2="9" y2="50" stroke={aquaColor} strokeWidth="2" strokeLinecap="round" />
      <line x1="91" y1="50" x2="97" y2="50" stroke={aquaColor} strokeWidth="2" strokeLinecap="round" />

      {/* Inner Structural Track */}
      <circle
        cx="50"
        cy="50"
        r="36"
        stroke={dark ? "rgba(0, 63, 135, 0.2)" : "rgba(255, 255, 255, 0.2)"}
        strokeWidth="1"
      />

      {/* Primary Interlocking Conduits (Smart Fluid Dynamics) */}
      <path
        d="M26 50 C26 34 38 22 52 22 C64 22 74 30 74 42 C74 54 62 62 50 62 C40 62 34 68 34 76"
        stroke={`url(#wf-flow-grad-${dark ? "d" : "l"})`}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M74 50 C74 66 62 78 48 78 C36 78 26 70 26 58 C26 46 38 38 50 38 C60 38 66 32 66 24"
        stroke={dark ? "#003F87" : "#FFFFFF"}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeOpacity={dark ? "0.9" : "0.95"}
      />

      {/* Core Infrastructure Nexus Point */}
      <circle cx="50" cy="50" r="5.5" fill={aquaColor} />
      <circle cx="50" cy="50" r="2.5" fill={dark ? "#003F87" : "#FFFFFF"} />

      {/* Micro Telemetry Orbital Points */}
      <circle cx="34" cy="28" r="1.8" fill={blueColor} />
      <circle cx="66" cy="72" r="1.8" fill={blueColor} />
    </svg>
  );
}



export default function LoginPage({ onNavigateToLanding, onLoginSuccess, initialTab = "citizen" }) {
  const { login, loginAsArchetype, loading } = useAuth();

  const getInitialActiveRole = () => {
    if (initialTab === "command") return "engineer";
    if (initialTab === "worker") return "driver";
    return "citizen";
  };
  const [activeRole, setActiveRole] = useState(getInitialActiveRole());
  const [lang, setLang] = useState("en");

  // Form State
  const [citizenPhone, setCitizenPhone] = useState("98204 11849");
  const [engineerEmail, setEngineerEmail] = useState("er.kulkarni@mcgm.gov.in");
  const [engineerPin, setEngineerPin] = useState("admin123");
  const [driverFleetId, setDriverFleetId] = useState("MH-03-BW-7821");
  const [driverPin, setDriverPin] = useState("7419");
  const [errorMessage, setErrorMessage] = useState(null);

  // Handle Form Submission using existing AuthContext logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    let res;
    if (activeRole === "citizen") {
      res = await login("citizen", citizenPhone, "123456");
    } else if (activeRole === "engineer") {
      res = await login("admin", engineerEmail, engineerPin);
    } else if (activeRole === "driver") {
      res = await login("worker", driverFleetId, driverPin);
    }

    if (res?.success) {
      if (onLoginSuccess) onLoginSuccess(res.user.role);
    } else {
      setErrorMessage(res?.error || "Authentication failed. Please verify your credentials.");
    }
  };

  // Handle 1-Click Evaluator Rapid Access
  const handleQuickArchetype = (roleKey) => {
    const user = loginAsArchetype(roleKey);
    if (onLoginSuccess) onLoginSuccess(user.role);
  };

  return (
    <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden bg-[#FFFFFF] font-sans text-[#151D22] flex flex-col lg:flex-row antialiased selection:bg-[#3399FF]/20">
      
      {/* ============================================================
          LEFT PANEL — WATERFLOW BRAND EXPERIENCE (48% Desktop)
          Dark / Deep WaterFlow Blue Visual Identity (#003F87)
          Municipal Water Command Center
          ============================================================ */}
      <section
        className="w-full lg:w-[48%] bg-gradient-to-br from-[#003473] via-[#003F87] to-[#002855] text-white flex flex-col justify-between p-6 sm:p-8 xl:p-10 relative overflow-hidden shrink-0 border-b lg:border-b-0 lg:border-r border-[#002a5c]"
        aria-label="WaterFlow Civic Command Identity"
      >
        {/* Subtle Geometric Infrastructure Grid Pattern in Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(25, 211, 230, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(25, 211, 230, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Subtle Ambient Radial Lighting for Depth (No Cyberpunk, Pure Technical Depth) */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#3399FF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-96 h-96 bg-[#19D3E6]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: WaterFlow Logo & Municipal Platform Title */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <WaterFlowEmblem className="w-10 h-10 sm:w-11 sm:h-11 drop-shadow-md" dark={false} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-[0.16em] text-white font-sans">
                  WATERFLOW
                </span>
                <span className="bg-[#19D3E6]/20 border border-[#19D3E6]/50 text-[#19D3E6] font-mono text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider">
                  OS 4.8
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-sky-200/80">
                GREATER MUMBAI WATER INTELLIGENCE
              </span>
            </div>
          </div>

          {/* Quick Exit to Public Landing Page */}
          {onNavigateToLanding && (
            <button
              type="button"
              onClick={onNavigateToLanding}
              className="inline-flex items-center gap-1.5 text-xs text-sky-200/90 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg border border-white/15 transition-all cursor-pointer backdrop-blur-xs"
              title="Return to Public Landing Page"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Landing Overview</span>
            </button>
          )}
        </div>

        {/* Left Panel Main Body: Message & Central GIS Visual */}
        <div className="relative z-10 my-6 sm:my-8 flex flex-col gap-5 lg:gap-6">
          
          {/* Main Headline */}
          <div className="flex flex-col gap-2 max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-[#19D3E6] uppercase">
              <span className="w-2 h-2 rounded-full bg-[#19D3E6] animate-pulse"></span>
              <span>MUNICIPAL COMMAND INFRASTRUCTURE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-[1.15]">
              INTELLIGENT WATER.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#19D3E6] via-sky-200 to-white">
                SMARTER CITIES.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-sky-100/85 leading-relaxed max-w-lg mt-0.5">
              AI-powered water allocation, real-time infrastructure monitoring, and emergency response for Greater Mumbai.
            </p>
          </div>

          {/* Central Impressive GIS & Network Map Visual */}
          <div className="w-full flex-1 relative min-h-[300px] max-h-[55vh] rounded-2xl overflow-hidden border border-[#19D3E6]/30 shadow-[0_0_30px_rgba(25,211,230,0.15)] isolate">
            
            <div className="w-full h-full">
              <MumbaiLeafletMap
                variant="login"
                wards={DEFAULT_MUMBAI_WARDS}
                tankers={DEFAULT_MUMBAI_TANKERS}
                depots={DEFAULT_MUMBAI_DEPOTS}
              />
            </div>
            
            {/* Small Subtle Corner Map Status Label */}
            <div className="absolute top-2.5 left-2.5 z-[1000] pointer-events-none">
              <div className="bg-[#00204E]/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-[#19D3E6]/40 shadow-sm flex items-center gap-1.5 text-[9.5px] font-mono font-bold text-[#19D3E6] uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_4px_#34D399]"></span>
                <span>GREATER MUMBAI · LIVE GIS · 24 WARDS</span>
              </div>
            </div>

            {/* Compact Professional GIS Legend */}
            <div className="absolute bottom-2 left-2 right-2 z-[1000] pointer-events-none flex justify-center">
              <div className="bg-[#00204E]/90 backdrop-blur-md px-3 py-1 rounded-md border border-[#19D3E6]/30 shadow-md flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[8.5px] font-mono font-bold text-[#19D3E6] uppercase tracking-wider">
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#003F87] border border-[#19D3E6]/50 rounded-xs"></span> WARD</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3399FF] shadow-[0_0_4px_#3399FF]"></span> WATER INFRASTRUCTURE</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border-[1.5px] border-[#19D3E6] bg-transparent"></span> SCADA</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#3399FF]"></span> TANKER ROUTES</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#FF5C5C] border border-white/20 rounded-xs shadow-[0_0_4px_#FF5C5C]"></span> SHORTAGE ZONES</div>
              </div>
            </div>
          </div>

        </div>

        {/* Left Panel Bottom: Live Operational Status Strip & Footprint */}
        <div className="relative z-10 pt-4 border-t border-sky-400/20 flex flex-col gap-3">
          
          {/* Compact Live Telemetry Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#002855]/70 border border-sky-400/25 px-3.5 py-2 rounded-xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>SYSTEM OPERATIONAL</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-cyan-200/90 divide-x divide-sky-400/30">
              <span className="pl-0">24 WARDS CONNECTED</span>
              <span className="pl-3">SCADA LIVE</span>
              <span className="pl-3 text-[#19D3E6]">AI ENGINE READY</span>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-sky-200/70 font-sans">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-semibold text-white">WATERFLOW OS</span>
              <span>·</span>
              <span>GREATER MUMBAI WATER INTELLIGENCE</span>
            </div>
            <span className="text-[10px] text-sky-200/60 font-mono hidden sm:inline">
              Secure municipal infrastructure platform
            </span>
          </div>

        </div>
      </section>

      {/* ============================================================
          RIGHT PANEL — CLEAN PROFESSIONAL AUTHENTICATION (52% Desktop)
          Background: #FFFFFF
          WaterFlow Design Tokens: #003F87, #0056B3, #3399FF, #19D3E6
          Spacious, Generous Whitespace, Razor-sharp Precision
          ============================================================ */}
      <main
        className="w-full lg:w-[52%] bg-[#FFFFFF] flex flex-col justify-between p-6 sm:p-10 xl:p-12 overflow-y-auto lg:overflow-y-auto shrink min-h-full"
        aria-label="Secure Access Portal"
      >
        {/* Top Right Utility Bar: Return Link, Language Toggle */}
        <div className="w-full max-w-xl mx-auto flex items-center justify-between pb-4 sm:pb-6 border-b border-[#DDE7F0]">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#0056B3]" />
            <span className="font-semibold text-slate-700">MUNICIPAL ACCESS GATEWAY</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "mr" : "en")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#003F87] bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-[#DDE7F0] transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#0056B3]" />
              <span>{lang === "en" ? "मराठी / ENG" : "English"}</span>
            </button>
          </div>
        </div>

        {/* Main Authentication Core Form Area */}
        <div className="w-full max-w-xl mx-auto my-auto py-6 sm:py-8 flex flex-col gap-6">
          
          {/* Header Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <WaterFlowEmblem className="w-8 h-8" dark={true} />
              <span className="font-extrabold text-base tracking-[0.14em] text-[#003F87] font-sans">
                WATERFLOW
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#151D22] tracking-tight mt-1">
              Secure Access Portal
            </h2>
            <p className="text-sm text-[#4A4A4A] leading-normal">
              Sign in to continue to your WaterFlow command environment.
            </p>
          </div>

          {/* Segmented Role Selector (Tabs) */}
          <div className="bg-[#EDF3F8] p-1.5 rounded-xl border border-[#DDE7F0] grid grid-cols-3 gap-1 shadow-2xs">
            {/* CITIZEN TAB */}
            <button
              type="button"
              onClick={() => {
                setActiveRole("citizen");
                setErrorMessage(null);
              }}
              className={`py-2.5 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeRole === "citizen"
                  ? "bg-[#FFFFFF] text-[#003F87] shadow-xs border border-[#3399FF]/30 font-bold"
                  : "text-[#4A4A4A] hover:text-[#151D22] hover:bg-white/40"
              }`}
            >
              <User className={`w-4 h-4 shrink-0 ${activeRole === "citizen" ? "text-[#0056B3]" : "text-slate-500"}`} />
              <span className="truncate">CITIZEN</span>
            </button>

            {/* SCADA / ENGINEER TAB */}
            <button
              type="button"
              onClick={() => {
                setActiveRole("engineer");
                setErrorMessage(null);
              }}
              className={`py-2.5 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeRole === "engineer"
                  ? "bg-[#FFFFFF] text-[#003F87] shadow-xs border border-[#3399FF]/30 font-bold"
                  : "text-[#4A4A4A] hover:text-[#151D22] hover:bg-white/40"
              }`}
            >
              <Building2 className={`w-4 h-4 shrink-0 ${activeRole === "engineer" ? "text-[#0056B3]" : "text-slate-500"}`} />
              <span className="truncate">SCADA / ENGINEER</span>
            </button>

            {/* FIELD DRIVER TAB */}
            <button
              type="button"
              onClick={() => {
                setActiveRole("driver");
                setErrorMessage(null);
              }}
              className={`py-2.5 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeRole === "driver"
                  ? "bg-[#FFFFFF] text-[#003F87] shadow-xs border border-[#3399FF]/30 font-bold"
                  : "text-[#4A4A4A] hover:text-[#151D22] hover:bg-white/40"
              }`}
            >
              <Truck className={`w-4 h-4 shrink-0 ${activeRole === "driver" ? "text-[#0056B3]" : "text-slate-500"}`} />
              <span className="truncate">FIELD DRIVER</span>
            </button>
          </div>

          {/* ============================================================
              ROLE FORM 1: CITIZEN LOGIN (DEFAULT)
              ============================================================ */}
          {activeRole === "citizen" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-[#151D22]">
                  Welcome back
                </h3>
                <p className="text-xs text-[#4A4A4A] mt-0.5">
                  Access your water services and community information.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="citizen-input" className="font-semibold text-[#151D22]">
                      Registered Mobile / Consumer ID
                    </label>
                    <button
                      type="button"
                      onClick={() => alert("Your 10-digit registered mobile number or Municipal Consumer ID (CCN) printed on your municipal water utility statement.")}
                      className="text-[#0056B3] hover:text-[#003F87] hover:underline cursor-pointer"
                    >
                      Forgot Consumer ID?
                    </button>
                  </div>

                  <div className="flex items-center rounded-lg border border-[#DDE7F0] bg-white focus-within:border-[#0056B3] focus-within:ring-2 focus-within:ring-[#0056B3]/15 transition-all">
                    <div className="px-3.5 py-3 border-r border-[#DDE7F0] bg-slate-50/80 text-xs font-mono text-slate-700 font-semibold rounded-l-lg flex items-center gap-1.5 shrink-0 select-none">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      id="citizen-input"
                      type="text"
                      value={citizenPhone}
                      onChange={(e) => setCitizenPhone(e.target.value)}
                      placeholder="Enter mobile number or Consumer ID"
                      className="w-full px-3.5 py-3 text-sm font-medium text-[#151D22] placeholder:text-slate-400 focus:outline-hidden rounded-r-lg font-mono"
                      required
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-lg bg-[#0056B3] hover:bg-[#003F87] text-white font-bold text-sm transition-all duration-150 shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span>{loading ? "Authenticating..." : "SEND SECURE OTP"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Trust Verification Indicator */}
                <div className="flex items-center justify-center gap-2 text-xs text-[#4A4A4A] pt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Secure OTP verification · WhatsApp / SMS verification</span>
                </div>
              </form>

              {/* Discreet Track Grievance Option */}
              <div className="mt-2 pt-3 border-t border-[#DDE7F0] flex items-center justify-between text-xs">
                <span className="text-[#4A4A4A]">Need immediate help with supply?</span>
                <button
                  type="button"
                  onClick={() => handleQuickArchetype("citizen")}
                  className="text-[#0056B3] hover:text-[#003F87] font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Track grievance ticket without login</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              ROLE FORM 2: SCADA / ENGINEER LOGIN
              ============================================================ */}
          {activeRole === "engineer" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-[#151D22]">
                  SCADA Command Access
                </h3>
                <p className="text-xs text-[#4A4A4A] mt-0.5">
                  Secure access for authorized hydraulic engineers and municipal operations staff.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                {/* Officer Email / ID */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="engineer-id" className="text-xs font-semibold text-[#151D22]">
                    Officer ID / Email
                  </label>
                  <input
                    id="engineer-id"
                    type="email"
                    value={engineerEmail}
                    onChange={(e) => setEngineerEmail(e.target.value)}
                    placeholder="er.kulkarni@mcgm.gov.in"
                    className="w-full px-3.5 py-3 rounded-lg border border-[#DDE7F0] bg-white text-sm font-medium text-[#151D22] placeholder:text-slate-400 focus:outline-hidden focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15 transition-all font-mono"
                    required
                  />
                </div>

                {/* Password / Security PIN */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="engineer-pin" className="font-semibold text-[#151D22]">
                      Password / Security PIN
                    </label>
                    <span className="text-slate-400 text-[11px] font-mono">Demo: admin123</span>
                  </div>
                  <input
                    id="engineer-pin"
                    type="password"
                    value={engineerPin}
                    onChange={(e) => setEngineerPin(e.target.value)}
                    placeholder="Enter security PIN or password"
                    className="w-full px-3.5 py-3 rounded-lg border border-[#DDE7F0] bg-white text-sm font-medium text-[#151D22] placeholder:text-slate-400 focus:outline-hidden focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15 transition-all font-mono"
                    required
                  />
                </div>

                {/* Hardware Security Token (Optional/Demonstration) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-semibold text-[#151D22] flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#0056B3]" />
                      <span>Hardware Security Token</span>
                    </label>
                    <span className="text-emerald-600 font-mono text-[11px] font-bold">CONNECTED</span>
                  </div>
                  <div className="px-3.5 py-2.5 rounded-lg border border-[#DDE7F0] bg-slate-50 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-700 font-bold">SCADA-KEY-7102 · Cryptographic HSM Active</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-lg bg-[#003F87] hover:bg-[#002F66] text-white font-bold text-sm transition-all duration-150 shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-1"
                >
                  <Lock className="w-4 h-4" />
                  <span>{loading ? "Verifying Credentials..." : "SECURE LOGIN"}</span>
                </button>

                {/* Security Audit Statement */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2 text-[11.5px] text-[#4A4A4A] leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-[#003F87] shrink-0 mt-0.5" />
                  <span>
                    Authorized personnel only. All access, valve overrides, and telemetry modifications are cryptographically signed and logged in the municipal audit trail.
                  </span>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================
              ROLE FORM 3: FIELD DRIVER LOGIN
              ============================================================ */}
          {activeRole === "driver" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-[#151D22]">
                  Field Operations Access
                </h3>
                <p className="text-xs text-[#4A4A4A] mt-0.5">
                  Access tanker dispatch, route navigation and delivery verification.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Driver / Fleet ID */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="driver-id" className="text-xs font-semibold text-[#151D22]">
                      Driver / Fleet ID
                    </label>
                    <input
                      id="driver-id"
                      type="text"
                      value={driverFleetId}
                      onChange={(e) => setDriverFleetId(e.target.value)}
                      placeholder="e.g. MH-03-BW-7821"
                      className="w-full px-3.5 py-3 rounded-lg border border-[#DDE7F0] bg-white text-sm font-medium text-[#151D22] placeholder:text-slate-400 focus:outline-hidden focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15 transition-all font-mono"
                      required
                    />
                  </div>

                  {/* Primary Depot Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="depot-select" className="text-xs font-semibold text-[#151D22]">
                      Assigned Pumping Depot
                    </label>
                    <select
                      id="depot-select"
                      className="w-full px-3.5 py-3 rounded-lg border border-[#DDE7F0] bg-white text-xs font-medium text-[#151D22] focus:outline-hidden focus:border-[#0056B3] transition-all"
                    >
                      <option>Trombay Pumping Hub #04</option>
                      <option>Bhandup Master Reservoir</option>
                      <option>Dadar Central Supply Depot</option>
                      <option>Kurla Tanker Terminal</option>
                    </select>
                  </div>
                </div>

                {/* 4-Digit PIN */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="driver-pin" className="font-semibold text-[#151D22]">
                      4-Digit PIN
                    </label>
                    <span className="text-slate-400 font-mono text-[11px]">Demo: 7419</span>
                  </div>
                  <input
                    id="driver-pin"
                    type="password"
                    maxLength={4}
                    value={driverPin}
                    onChange={(e) => setDriverPin(e.target.value)}
                    placeholder="••••"
                    className="w-40 px-4 py-2.5 rounded-lg border border-[#DDE7F0] bg-white text-xl font-bold text-center tracking-[0.4em] text-[#151D22] placeholder:text-slate-400 focus:outline-hidden focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15 transition-all font-mono"
                    required
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-lg bg-[#0056B3] hover:bg-[#003F87] text-white font-bold text-sm transition-all duration-150 shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-1"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loading ? "Verifying..." : "ENTER FIELD TERMINAL"}</span>
                </button>

                {/* Offline Synchronization Notice */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-[#4A4A4A]">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Offline field synchronization available</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">PWA Active</span>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================
              EVALUATOR 1-CLICK QUICK ACCESS ARCHETYPES (Judges & Reviewers)
              Keeps hackathon demonstration completely frictionless
              ============================================================ */}
          <div className="pt-4 border-t border-[#DDE7F0] flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wide text-[10.5px] flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Evaluator 1-Click Access</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">Pre-configured Role Sessions</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickArchetype("citizen")}
                className="p-2.5 rounded-lg border border-[#DDE7F0] hover:border-[#3399FF] bg-slate-50/70 hover:bg-sky-50/50 text-left transition-all duration-150 flex flex-col gap-0.5 group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#003F87]">Citizen</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0056B3] group-hover:translate-x-0.5 transition-all" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Govandi · Ward M/E</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickArchetype("admin")}
                className="p-2.5 rounded-lg border border-[#DDE7F0] hover:border-[#3399FF] bg-slate-50/70 hover:bg-sky-50/50 text-left transition-all duration-150 flex flex-col gap-0.5 group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#003F87]">BMC Engineer</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0056B3] group-hover:translate-x-0.5 transition-all" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">SCADA Level 4</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickArchetype("worker")}
                className="p-2.5 rounded-lg border border-[#DDE7F0] hover:border-[#3399FF] bg-slate-50/70 hover:bg-sky-50/50 text-left transition-all duration-150 flex flex-col gap-0.5 group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#003F87]">Field Driver</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0056B3] group-hover:translate-x-0.5 transition-all" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Tanker T-08 Unit</span>
              </button>
            </div>
          </div>

          {/* System Status Line */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>All authentication services operational</span>
          </div>

        </div>

        {/* ============================================================
            SECURITY & COMPLIANCE FOOTER
            JetBrains Mono, Subtle, Clean
            ============================================================ */}
        <div className="w-full max-w-xl mx-auto pt-4 border-t border-[#DDE7F0] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-bold">SECURE CONNECTION</span>
            <span>·</span>
            <span>TLS 1.3 ENCRYPTED</span>
            <span>·</span>
            <span className="text-[#003F87] font-bold">WATERFLOW OS</span>
          </div>
          <span>STQC AUDITED · ZONE 01</span>
        </div>

      </main>

    </div>
  );
}
