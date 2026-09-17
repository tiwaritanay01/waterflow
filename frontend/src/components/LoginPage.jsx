import React, { useState } from "react";
import {
  Droplet,
  ShieldCheck,
  Building2,
  Truck,
  User,
  CheckCircle2,
  Lock,
  ArrowRight,
  Phone,
  FileText,
  KeyRound,
  AlertTriangle,
  Globe,
  ArrowLeft,
  Sparkles,
  Info
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage({ onNavigateToLanding, onLoginSuccess }) {
  const { login, loginAsArchetype, loading } = useAuth();

  // Active Role Tab: "citizen" | "engineer" | "driver"
  const [activeTab, setActiveTab] = useState("citizen");
  const [lang, setLang] = useState("en");

  // Form inputs
  const [citizenPhone, setCitizenPhone] = useState("98204 11849");
  const [engineerEmail, setEngineerEmail] = useState("er.kulkarni@mcgm.gov.in");
  const [engineerPin, setEngineerPin] = useState("admin123");
  const [driverFleetId, setDriverFleetId] = useState("MH-03-BW-7821");
  const [driverPin, setDriverPin] = useState("7419");
  const [errorMessage, setErrorMessage] = useState(null);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    let res;
    if (activeTab === "citizen") {
      res = await login("citizen", citizenPhone, "123456");
    } else if (activeTab === "engineer") {
      res = await login("admin", engineerEmail, engineerPin);
    } else if (activeTab === "driver") {
      res = await login("worker", driverFleetId, driverPin);
    }

    if (res?.success) {
      if (onLoginSuccess) onLoginSuccess(res.user.role);
    } else {
      setErrorMessage(res?.error || "Authentication failed. Please verify your credentials.");
    }
  };

  // Handle 1-Click Evaluator Archetype
  const handleQuickArchetype = (roleKey) => {
    const user = loginAsArchetype(roleKey);
    if (onLoginSuccess) onLoginSuccess(user.role);
  };

  return (
    <div className="w-full min-h-screen bg-[#f5faff] font-sans text-slate-800 antialiased selection:bg-sky-100 flex flex-col justify-between p-3 sm:p-6">
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-4">
        
        {/* ============================================================
            TOP SYSTEM TELEMETRY BAR
            ============================================================ */}
        <div className="w-full bg-[#edf5fc] px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2 shadow-2xs border border-slate-200">
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <button
              onClick={onNavigateToLanding}
              className="inline-flex items-center gap-1 text-sky-800 hover:text-sky-950 font-bold mr-2 text-[11px] px-2 py-0.5 rounded bg-sky-100/70 border border-sky-300 transition"
              title="Return to Public Landing Page"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Landing Page</span>
            </button>

            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold font-mono text-[11px]">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>GATEWAY 04-B ONLINE</span>
            </div>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider hidden sm:inline">
              TLS 1.3 · 256-BIT CRYPTOGRAPHIC LEDGER
            </span>
            <span className="text-slate-300 hidden md:inline">/</span>
            <span className="text-[10.5px] text-slate-600 hidden md:inline">
              Ward Distribution Grid A-12
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-sky-800 text-[10.5px] hidden sm:inline">
              SCADA Node SYNC: 14:02:18 IST
            </span>
            <button
              onClick={() => setLang(lang === "en" ? "mr" : "en")}
              className="text-sky-700 hover:text-sky-900 font-sans text-xs font-bold flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-sky-200 shadow-2xs transition"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === "en" ? "मराठी / ENG" : "English"}</span>
            </button>
          </div>
        </div>

        {/* ============================================================
            MAIN CIVIC GATEWAY MOSAIC SPLIT
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* LEFT ANCHOR: Civic Authority & System Status Architecture */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white p-5 sm:p-7 rounded-xl shadow-xs border border-slate-200 relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col gap-5 relative z-10">
              
              {/* Municipal Seal & Authority Header */}
              <div className="flex items-start gap-3.5">
                <div className="w-13 h-13 rounded-xl bg-[#003f87] flex items-center justify-center text-white shadow-sm shrink-0">
                  <Droplet className="w-7 h-7 fill-sky-200 text-sky-200" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-sky-900 uppercase tracking-widest font-mono">
                      WaterFlow OS
                    </span>
                    <span className="bg-sky-100 text-sky-800 text-[10px] font-mono px-1.5 py-0.2 rounded font-bold border border-sky-200">
                      v4.8.2
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight mt-0.5">
                    Municipal Water Command
                  </h2>
                  <p className="text-xs text-slate-500">
                    MCGM / BMC Unified SCADA &amp; Dispatch Gateway
                  </p>
                </div>
              </div>

              {/* Security Directive Notice */}
              <div className="bg-[#edf5fc] p-3.5 rounded-lg border border-sky-100">
                <div className="flex items-center gap-1.5 text-sky-900 mb-1">
                  <ShieldCheck className="w-4 h-4 text-sky-700" />
                  <span className="text-[11px] uppercase font-bold tracking-tight">
                    RBAC Cryptographic Ledger
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  Every valve operation, grievance resolution, and tanker dispatch telemetry is signed with civic asymmetric keys for tamper-evident municipal audit compliance.
                </p>
              </div>

              {/* Live Municipal Telemetry Preview Sparklines */}
              <div className="flex flex-col gap-2 bg-[#f8fafc] p-3.5 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-[10.5px] text-slate-500 uppercase font-bold tracking-wider">
                    Regional Flow Nominality
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-600">
                    99.4% Flow Cap
                  </span>
                </div>

                {/* Realtime Telemetry Sparkline */}
                <div className="w-full h-12 flex items-end gap-1.5 pt-2">
                  <div className="flex-1 bg-sky-200 hover:bg-sky-700 transition-all rounded-t" style={{ height: "60%" }}></div>
                  <div className="flex-1 bg-sky-200 hover:bg-sky-700 transition-all rounded-t" style={{ height: "72%" }}></div>
                  <div className="flex-1 bg-sky-200 hover:bg-sky-700 transition-all rounded-t" style={{ height: "85%" }}></div>
                  <div className="flex-1 bg-sky-300 hover:bg-sky-700 transition-all rounded-t" style={{ height: "90%" }}></div>
                  <div className="flex-1 bg-sky-400 hover:bg-sky-700 transition-all rounded-t" style={{ height: "78%" }}></div>
                  <div className="flex-1 bg-sky-500 hover:bg-sky-700 transition-all rounded-t" style={{ height: "94%" }}></div>
                  <div className="flex-1 bg-[#0056b3] hover:bg-sky-900 transition-all rounded-t" style={{ height: "88%" }}></div>
                  <div className="flex-1 bg-[#0056b3] hover:bg-sky-900 transition-all rounded-t" style={{ height: "96%" }}></div>
                  <div className="flex-1 bg-[#003f87] rounded-t" style={{ height: "99%" }}></div>
                </div>

                <div className="flex justify-between items-center text-slate-400 font-mono text-[10px] pt-0.5">
                  <span>Bhandup Intake (T-0)</span>
                  <span>Dadar Trunk (+4h)</span>
                </div>
              </div>

              {/* Municipal Operational Highlights */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Water Network</span>
                  <span className="font-bold text-slate-800">4,120 km Mains</span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">Automated SCADA</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Municipal Wards</span>
                  <span className="font-bold text-slate-800">24 BMC Wards</span>
                  <span className="text-[10px] text-sky-600 block mt-0.5">A to T PostGIS Map</span>
                </div>
              </div>

            </div>

            {/* Municipal Authority Credentials Footer */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="w-5 h-5 text-sky-700" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-900 leading-tight">CERT-In Audited</span>
                  <span className="text-[10px] font-mono text-slate-500">STQC Cert #4491-MCGM</span>
                </div>
              </div>
              <span className="font-mono text-[10.5px] text-slate-400">
                Zone 01 · Greater Mumbai
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: The Unified Secure Portal Switcher & Action Panels */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Role Switching Segmented Rail */}
            <div className="bg-[#e1e9f0] p-1.5 rounded-xl shadow-2xs flex flex-col sm:flex-row gap-1">
              <button
                type="button"
                onClick={() => { setActiveTab("citizen"); setErrorMessage(null); }}
                className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
                  activeTab === "citizen"
                    ? "bg-white text-[#003f87] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Citizen &amp; Resident</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("engineer"); setErrorMessage(null); }}
                className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
                  activeTab === "engineer"
                    ? "bg-white text-[#003f87] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>SCADA &amp; Engineer</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("driver"); setErrorMessage(null); }}
                className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
                  activeTab === "driver"
                    ? "bg-white text-[#003f87] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Field Driver &amp; Valve PWA</span>
              </button>
            </div>

            {/* Dynamic Portal Authentication Containers */}
            <div className="bg-white p-5 sm:p-7 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between flex-1">
              
              {/* TAB 1: CITIZEN AUTHENTICATION */}
              {activeTab === "citizen" && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] text-[#0060ab] font-bold uppercase tracking-wider">
                        Citizen Identity Gateway
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                        Resident Water Services Login
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Instant verification via mobile OTP or Municipal Consumer Number (CCN).
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                      <Droplet className="w-6 h-6 fill-sky-300 text-sky-600" />
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-700 flex justify-between">
                        <span>Registered Mobile or Consumer ID</span>
                        <span className="text-sky-700 font-normal hover:underline cursor-pointer">Find Consumer No?</span>
                      </label>
                      <div className="flex gap-2 items-center">
                        <div className="bg-slate-100 px-3 py-2.5 rounded-lg flex items-center gap-1.5 font-mono text-xs text-slate-700 border border-slate-200">
                          <span>🇮🇳 +91</span>
                        </div>
                        <input
                          type="tel"
                          value={citizenPhone}
                          onChange={(e) => setCitizenPhone(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-sky-500 transition-all"
                          placeholder="Enter 10-digit mobile or CCN"
                          required
                        />
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#0056b3] hover:bg-sky-800 text-white py-3 rounded-lg font-bold text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Send 6-Digit Secure OTP / Direct Access</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp / SMS verification ready · No static password required</span>
                    </div>
                  </form>

                  {/* Citizen Rapid Utility Actions */}
                  <div className="pt-3 mt-1 flex flex-col sm:flex-row gap-2 justify-between bg-sky-50/60 p-3 rounded-lg border border-sky-100 text-xs">
                    <button
                      onClick={() => handleQuickArchetype("citizen")}
                      className="flex items-center gap-1.5 text-sky-800 hover:text-sky-950 font-medium text-left"
                    >
                      <FileText className="w-4 h-4 text-sky-700 shrink-0" />
                      <span>Track Grievance Ticket Without Login</span>
                    </button>
                    <span className="text-slate-400 hidden sm:inline">|</span>
                    <span className="text-slate-600">Ward M-East Rationing Timetable: Active</span>
                  </div>
                </div>
              )}

              {/* TAB 2: SCADA & ENGINEER AUTHENTICATION */}
              {activeTab === "engineer" && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] text-sky-800 font-bold uppercase tracking-wider">
                        Hydraulic Command Station
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                        MCGM Officer &amp; SCADA Console
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Multi-factor gateway for telemetry control, valve actuation, and GIS dispatch.
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-sky-700" />
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Government SSO Identifier (@mcgm.gov.in / @waterflow.gov)
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={engineerEmail}
                          onChange={(e) => setEngineerEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 pl-3.5 pr-4 py-2.5 rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-sky-500 transition-all"
                          placeholder="Officer Email or SCADA Badge ID"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-700">
                          NIC e-Parichay / Security PIN
                        </label>
                        <input
                          type="password"
                          value={engineerPin}
                          onChange={(e) => setEngineerPin(e.target.value)}
                          className="bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-lg font-mono text-xs text-slate-900 focus:outline-hidden focus:bg-white"
                          placeholder="PIN / Password"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Hardware Keycard Token
                        </label>
                        <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg flex items-center justify-between text-slate-600">
                          <span className="font-mono text-xs font-bold text-sky-800">SCADA-KEY-7102</span>
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#003f87] hover:bg-sky-900 text-white py-3 rounded-lg font-bold text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Authenticate Parichay SSO Session</span>
                    </button>
                  </form>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2 text-amber-900 text-xs">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Access is restricted to authorized municipal hydraulic engineers. Valve signals are logged under the National Critical Information Infrastructure Protection Centre (NCIIPC).
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: FIELD DRIVER & VALVE OPERATOR (PWA) */}
              {activeTab === "driver" && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider">
                        Fleet Terminal PWA
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                        Tanker &amp; Valve Operator Dispatch
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        High-contrast rapid authentication for route navigation and digital delivery vouchers.
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                      <Truck className="w-6 h-6" />
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Tanker Fleet ID or Driver Badge
                        </label>
                        <input
                          type="text"
                          value={driverFleetId}
                          onChange={(e) => setDriverFleetId(e.target.value)}
                          className="bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-hidden focus:bg-white"
                          placeholder="e.g. MH-03-BW-7821"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Primary Depot Station
                        </label>
                        <select className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden">
                          <option>Trombay Pumping Hub #04</option>
                          <option>Bhandup Master Reservoir</option>
                          <option>Dadar Central Supply Depot</option>
                          <option>Kurla Tanker Terminal</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-700">
                        4-Digit Driver PIN
                      </label>
                      <input
                        type="password"
                        value={driverPin}
                        onChange={(e) => setDriverPin(e.target.value)}
                        maxLength={4}
                        className="w-36 tracking-widest text-center bg-slate-50 border border-slate-200 py-2.5 rounded-lg font-mono text-lg font-bold text-slate-900 focus:outline-hidden"
                        placeholder="••••"
                        required
                      />
                    </div>

                    {errorMessage && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#d97706] hover:bg-amber-700 text-white py-3 rounded-lg font-bold text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Authorize Field Terminal Session</span>
                    </button>
                  </form>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono text-[11px]">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Offline GPS Voucher Cache Active</span>
                    </span>
                    <span>Hub Sync: 100%</span>
                  </div>
                </div>
              )}

              {/* DEMO / REVIEWER RAPID ACCESS PALETTE (Requirement #3 from Stitch) */}
              <div className="mt-5 pt-3.5 bg-[#f0f6fc] p-3.5 rounded-xl border border-sky-100 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-slate-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Evaluator 1-Click Access Archetypes</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">Preset Role Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Archetype 1: Citizen */}
                  <button
                    type="button"
                    onClick={() => handleQuickArchetype("citizen")}
                    className="text-left bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 p-2.5 rounded-lg transition-all flex flex-col gap-0.5 shadow-2xs group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-800">Govandi Citizen</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">Ward M-East (#98204)</span>
                  </button>

                  {/* Archetype 2: Engineer (Admin) */}
                  <button
                    type="button"
                    onClick={() => handleQuickArchetype("admin")}
                    className="text-left bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 p-2.5 rounded-lg transition-all flex flex-col gap-0.5 shadow-2xs group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-800">BMC Hydraulic Eng</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">SCADA Level 4 Access</span>
                  </button>

                  {/* Archetype 3: Worker Driver */}
                  <button
                    type="button"
                    onClick={() => handleQuickArchetype("worker")}
                    className="text-left bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 p-2.5 rounded-lg transition-all flex flex-col gap-0.5 shadow-2xs group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800">Tanker T-08 Driver</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">MH-03-BW-7821</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Civic Assurance & Transparency Footer (Requirement #4 from Stitch) */}
        <div className="mt-2 p-3.5 bg-white rounded-xl shadow-2xs border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 items-center text-center sm:text-left text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-900 uppercase">Zero Data Monetization</span>
              <span className="text-[10px] text-slate-500">Public Civic Trust Charter</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-900 uppercase">24x7 MCGM Helpline</span>
              <span className="text-[10px] text-slate-500">Dial 1916 / Grievance Cell</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-900 uppercase">Bilingual Access</span>
              <span className="text-[10px] text-slate-500">English &amp; मराठी Supported</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-900 uppercase">Open Telemetry</span>
              <span className="text-[10px] text-slate-500">Tamper-Evident SCADA Audit</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
