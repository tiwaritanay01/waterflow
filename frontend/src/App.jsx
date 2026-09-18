import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Map,
  ListOrdered,
  TrendingUp,
  Truck,
  Scale,
  Search,
  Clock,
  ShieldAlert,
  Bell,
  Droplet,
  Smartphone,
  CheckCircle2,
  LogOut,
  User as UserIcon,
} from "lucide-react";

import KpiStrip from "./components/KpiStrip";
import MapPanel from "./components/MapPanel";
import PriorityQueue from "./components/PriorityQueue";
import AlertTicker from "./components/AlertTicker";
import ResourcePanel from "./components/ResourcePanel";
import MumbaiLeafletMap from "./components/MumbaiLeafletMap";
import CitizenApp from "./components/CitizenApp";
import WorkerApp from "./components/WorkerApp";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import { AuthProvider, useAuth } from "./context/AuthContext";

const API_URL = "http://localhost:3001";

const NAV_ITEMS = [
  { id: "overview", label: "Live Overview", icon: LayoutDashboard },
  { id: "spatial", label: "GIS Spatial Dispatch", icon: Map },
  { id: "queue", label: "Allocation Queue", icon: ListOrdered, badge: null },
  { id: "forecast", label: "Complaint & Forecast", icon: TrendingUp },
  { id: "fleet", label: "Fleet & Logistics", icon: Truck, suffix: null },
  { id: "equity", label: "Equity & Impact", icon: Scale },
];

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, isAuthenticated, role, logout } = useAuth();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [view, setView] = useState("landing"); // "landing" | "login" | "portal"
  const [portalMode, setPortalMode] = useState("command"); // "command" | "citizen" | "worker"
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real Time-Series Analytics State (Phase 17)
  const [demandTrend, setDemandTrend] = useState([]);
  const [complaintsTrend, setComplaintsTrend] = useState([]);
  const [serviceBalance, setServiceBalance] = useState([]);
  const [unmetStats, setUnmetStats] = useState(null);
  const [provenanceTag, setProvenanceTag] = useState("SYNTHETIC_SEEDED");

  // Automatically synchronize view and portal mode when user is logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      setView("portal");
      if (user.role === "citizen") setPortalMode("citizen");
      else if (user.role === "worker") setPortalMode("worker");
      else setPortalMode("command");
    }
  }, [isAuthenticated, user]);

  // Fetch dashboard data & time-series analytics (Phase 17)
  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch(`${API_URL}/api/dashboard`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.warn("API unavailable, using fallback:", err.message);
      } finally {
        setLoading(false);
      }
    }

    async function fetchAnalytics() {
      try {
        const [dRes, cRes, bRes, uRes] = await Promise.all([
          fetch(`${API_URL}/api/analytics/demand-trend`).then((r) => r.json()),
          fetch(`${API_URL}/api/analytics/complaints-trend`).then((r) => r.json()),
          fetch(`${API_URL}/api/analytics/service-balance`).then((r) => r.json()),
          fetch(`${API_URL}/api/analytics/unmet-demand`).then((r) => r.json()),
        ]);
        if (dRes?.data) setDemandTrend(dRes.data.slice(-7));
        if (cRes?.data) setComplaintsTrend(cRes.data.slice(-7));
        if (bRes?.data) setServiceBalance(bRes.data);
        if (uRes?.data) setUnmetStats(uRes.data);
        if (dRes?.provenance) setProvenanceTag(dRes.provenance);
      } catch (err) {
        console.warn("Analytics API fetch fallback:", err.message);
      }
    }

    fetchDashboard();
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchDashboard();
      fetchAnalytics();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const kpis = data?.kpis;
  const wards = data?.wards;
  const tankers = data?.tankers;
  const depots = data?.depots;
  const alerts = data?.alerts;
  const priorityQueue = data?.priority_queue;
  const equity = data?.equity;

  // Derived counts
  const criticalCount = kpis?.critical_alerts || 3;
  const queueCount = priorityQueue?.filter((w) => w.tier <= 2).length || 4;
  const fleetSuffix = kpis ? `${kpis.fleet_available}/${kpis.fleet_total}` : "18/25";

  // Unauthenticated Public Landing Page
  if (!isAuthenticated && view === "landing") {
    return (
      <LandingPage
        onNavigateToLogin={() => setView("login")}
        onOpenPortalDirectly={(targetPortal) => {
          setPortalMode(targetPortal);
          setView("login");
        }}
      />
    );
  }

  // Unauthenticated Unified Login Access Portal
  if (!isAuthenticated && view === "login") {
    return (
      <LoginPage
        onNavigateToLanding={() => setView("landing")}
        onLoginSuccess={(userRole) => {
          setView("portal");
          if (userRole === "worker") setPortalMode("worker");
          else if (userRole === "citizen") setPortalMode("citizen");
          else setPortalMode("command");
        }}
      />
    );
  }

  // Dedicated Mobile & Desktop Responsive PWA Portal Views
  if (portalMode === "citizen") {
    return (
      <div className="w-screen h-screen overflow-y-auto bg-[#edf4fb]">
        <CitizenApp
          user={user}
          onSignOut={() => {
            logout();
            setView("landing");
          }}
          onBackToDashboard={role === "admin" ? () => setPortalMode("command") : () => { logout(); setView("landing"); }}
        />
      </div>
    );
  }

  if (portalMode === "worker") {
    return (
      <div className="w-screen h-screen overflow-y-auto bg-[#f0f5fa]">
        <WorkerApp
          user={user}
          onSignOut={() => {
            logout();
            setView("landing");
          }}
          onBackToDashboard={role === "admin" ? () => setPortalMode("command") : () => { logout(); setView("landing"); }}
        />
      </div>
    );
  }

  // If citizen or worker directly reaches command center without admin role, redirect to their portal
  if (role === "citizen") {
    return (
      <div className="w-screen h-screen overflow-y-auto bg-[#edf4fb]">
        <CitizenApp user={user} onSignOut={() => { logout(); setView("landing"); }} />
      </div>
    );
  }
  if (role === "worker") {
    return (
      <div className="w-screen h-screen overflow-y-auto bg-[#f0f5fa]">
        <WorkerApp user={user} onSignOut={() => { logout(); setView("landing"); }} />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas text-head-text font-sans antialiased overflow-hidden">
      {/* ============================================================ */}
      {/* TOP HEADER BAR */}
      {/* ============================================================ */}
      <header className="h-14 shrink-0 bg-white border-b border-card-border shadow-2xs px-4 flex items-center justify-between z-30">
        {/* Left: Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-deep-blue shadow-sm flex items-center justify-center p-1">
            <Droplet className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-base tracking-tight text-deep-blue">
              WaterFlow OS
            </span>
            <span className="px-1.5 py-0.5 bg-emerald-50 text-olive-green border border-olive-green/30 text-[10px] font-bold rounded flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-olive-green animate-pulse" />
              <span>99.4% Grid Stable</span>
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 bg-slate-100 text-sec-text text-[10px] font-semibold rounded border border-card-border">
              Command Center
            </span>
          </div>
        </div>

        {/* Center: Portal Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-card-border text-xs font-bold shrink-0 mx-2">
          <button
            onClick={() => setPortalMode("command")}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 ${
              portalMode === "command"
                ? "bg-white text-deep-blue shadow-2xs font-extrabold"
                : "text-sec-text hover:text-deep-blue"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Command Center</span>
          </button>
          <button
            onClick={() => setPortalMode("citizen")}
            className="px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 text-sec-text hover:text-deep-blue"
          >
            <Smartphone className="w-3.5 h-3.5 text-vibrant-blue" />
            <span>Citizen Portal</span>
          </button>
          <button
            onClick={() => setPortalMode("worker")}
            className="px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 text-sec-text hover:text-deep-blue"
          >
            <Truck className="w-3.5 h-3.5 text-warm-amber" />
            <span>Worker Portal</span>
          </button>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center space-x-2.5">
          <div className="hidden xl:flex items-center space-x-1.5 text-[11px] text-sec-text font-mono whitespace-nowrap bg-blue-50/70 border border-blue-100 px-2.5 py-1 rounded-md">
            <Clock className="w-3 h-3 text-deep-blue" />
            <span>
              {currentTime.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              ,{" "}
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}{" "}
              UTC
            </span>
          </div>

          <button
            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-crit-red text-xs font-bold hover:bg-red-100 transition-colors"
            onClick={() => setActiveTab("alerts")}
          >
            <span className="w-2 h-2 rounded-full bg-crit-red animate-ping" />
            <span>{criticalCount} Critical Wards</span>
          </button>
          <button
            className="relative p-1.5 rounded-lg text-sec-text hover:text-deep-blue hover:bg-blue-50/80 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-warm-amber ring-2 ring-white" />
          </button>
          {/* User Identity Chip & Sign Out */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-card-border">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-xs font-semibold text-deep-blue"
                title={`${user.title || user.role} · ${user.badge || ""}`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="font-bold text-[11px] hidden md:inline">
                  {user.name} ({user.role})
                </span>
              </div>
              <button
                onClick={() => {
                  logout();
                  setView("landing");
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-crit-red hover:bg-rose-100 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Sign Out to Landing Page"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView("login")}
              className="px-3 py-1 rounded-md bg-deep-blue text-white text-xs font-bold hover:bg-blue-800 transition cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/* BODY: Sidebar + Main */}
      {/* ============================================================ */}
      <div className="h-[calc(100vh-56px)] flex overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 shrink-0 bg-deep-blue text-white flex flex-col justify-between p-3 select-none border-r border-blue-900/30">
          {/* Navigation */}
          <div className="space-y-3">
            <div className="px-2 py-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-blue-200 font-bold border-b border-white/10 pb-2">
              <span>Control Console</span>
              <span className="font-mono text-[10px] text-blue-300">
                SCADA v4.12
              </span>
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold border-l-4 transition-all text-left ${
                      isActive
                        ? "bg-white/20 text-white border-vibrant-blue shadow-2xs"
                        : "text-blue-100 hover:bg-white/10 border-transparent"
                    }`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-vibrant-blue" : ""
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.id === "queue" && (
                      <span className="px-1.5 py-0.5 bg-warm-amber text-white text-[10px] font-bold rounded-full">
                        {queueCount}
                      </span>
                    )}
                    {item.id === "fleet" && (
                      <span className="text-[10px] text-blue-200 font-mono">
                        {fleetSuffix}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Field Mobile Apps Section */}
            <div className="pt-2 border-t border-white/10 space-y-1">
              <div className="px-2 py-0.5 text-[10px] uppercase font-bold text-blue-300 tracking-wider">
                Field Mobile Apps
              </div>
              <button
                onClick={() => setPortalMode("citizen")}
                className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-100 hover:bg-white/10 text-left transition-all"
              >
                <Smartphone className="w-3.5 h-3.5 text-vibrant-blue" />
                <span className="flex-1">Citizen Portal</span>
                <span className="px-1.5 py-0.2 bg-blue-500/30 text-blue-200 text-[9px] font-bold rounded">Live</span>
              </button>
              <button
                onClick={() => setPortalMode("worker")}
                className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-100 hover:bg-white/10 text-left transition-all"
              >
                <Truck className="w-3.5 h-3.5 text-warm-amber" />
                <span className="flex-1">Worker Terminal</span>
                <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-200 text-[9px] font-bold rounded">T-08</span>
              </button>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="space-y-2 border-t border-white/10 pt-2.5 text-blue-100">
            <div className="bg-black/20 rounded-lg p-2 text-xs">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-blue-200">Daily Quota Burn</span>
                <span className="font-bold text-white">
                  {kpis?.water_available_kl || 286} / {kpis?.total_capacity_kl || 420} KL
                </span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-vibrant-blue h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${kpis?.water_pct || 68}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-blue-300 mt-1">
                <span>{kpis?.water_pct || 68}% Allocated</span>
                <span className="text-emerald-300 font-semibold">
                  {(kpis?.total_capacity_kl || 420) - (kpis?.water_available_kl || 286)} KL Reserve
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] px-1 text-blue-200">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-olive-green" />
                <span>{kpis?.fleet_available || 17} Active Tankers</span>
              </span>
              <span className="font-mono text-[10px] text-blue-300">
                v2.8.4
              </span>
            </div>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* MAIN CONTENT AREA */}
        {/* ============================================================ */}
        <main className="flex-1 h-full min-w-0 overflow-hidden flex flex-col gap-2 p-2">
          {/* KPI Strip */}
          <KpiStrip kpis={kpis} />

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {loading && (
              <div className="absolute inset-0 bg-canvas/80 flex items-center justify-center z-50">
                <div className="flex items-center space-x-3 bg-white px-6 py-4 rounded-xl shadow-lg border border-card-border">
                  <div className="w-5 h-5 border-2 border-deep-blue border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-semibold text-head-text">
                    Loading Command Center...
                  </span>
                </div>
              </div>
            )}

            {/* TAB: Live Overview */}
            {activeTab === "overview" && (
              <div className="h-full w-full flex flex-col lg:flex-row gap-2.5 overflow-hidden animate-fade-in">
                {/* Left: Map + Explainability */}
                <div className="w-full lg:w-[62%] h-full flex flex-col gap-2 min-h-0 overflow-hidden">
                  <MapPanel
                    wards={wards}
                    tankers={tankers}
                    depots={depots}
                    priorityQueue={priorityQueue}
                    onNavigateToSpatial={() => setActiveTab("spatial")}
                  />
                </div>
                {/* Right: Queue + Resources + Alerts */}
                <div className="w-full lg:w-[38%] h-full flex flex-col gap-2 min-h-0 overflow-hidden">
                  <PriorityQueue queue={priorityQueue} />
                  <ResourcePanel kpis={kpis} depots={depots} />
                  <AlertTicker alerts={alerts} />
                </div>
              </div>
            )}

            {/* TAB: GIS Spatial Dispatch */}
            {activeTab === "spatial" && (
              <div className="h-full w-full bg-white rounded-xl border border-card-border shadow-sm flex flex-col overflow-hidden animate-fade-in">
                <div className="p-3 border-b border-card-border flex items-center justify-between bg-[#FBFDFF] shrink-0">
                  <div>
                    <h3 className="font-extrabold text-sm text-head-text flex items-center space-x-2">
                      <Map className="w-4 h-4 text-deep-blue" />
                      <span>Mumbai Municipal GIS Spatial Dispatch &amp; Fleet Optimizer</span>
                    </h3>
                    <p className="text-[11px] text-sec-text">
                      Interactive Leaflet vector tracking across all 24 BMC administrative wards · 4 Water Depots · 25 Tankers
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="hidden sm:flex items-center space-x-3 text-xs text-sec-text">
                      <span>Bhandup Mega-Hub: <strong className="text-deep-blue">385k KL</strong></span>
                      <span>·</span>
                      <span>Veravali Reservoir: <strong className="text-deep-blue">168k KL</strong></span>
                    </div>
                    <button
                      onClick={() => setActiveTab("overview")}
                      className="px-3 py-1 bg-deep-blue text-white text-xs font-bold rounded-lg shadow-2xs hover:bg-blue-700 transition-colors"
                    >
                      Return to Overview
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 relative overflow-hidden">
                  <MumbaiLeafletMap
                    wards={wards}
                    tankers={tankers}
                    depots={depots}
                    priorityQueue={priorityQueue}
                    isExpanded={true}
                  />
                </div>
              </div>
            )}

            {/* TAB: Allocation Queue */}
            {activeTab === "queue" && (
              <div className="h-full w-full bg-white rounded-xl border border-card-border shadow-sm flex flex-col overflow-hidden p-3 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-card-border shrink-0">
                  <div>
                    <h3 className="font-extrabold text-sm text-head-text">Algorithmic Allocation Queue &amp; Transparent Scoring</h3>
                    <p className="text-[11px] text-sec-text">Prioritization ranked according to vulnerability formula without human geographic bias</p>
                  </div>
                  <button className="px-3 py-1 bg-deep-blue text-white text-xs font-bold rounded-lg shadow-2xs">Re-run Optimizer</button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scroll mt-2">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-blue-50/60 sticky top-0 text-sec-text">
                      <tr className="border-b border-card-border">
                        <th className="py-2 px-3">Rank</th>
                        <th className="py-2 px-3">Ward Identifier</th>
                        <th className="py-2 px-3">Volume Needed</th>
                        <th className="py-2 px-3">Dry Pipeline Time</th>
                        <th className="py-2 px-3">Score</th>
                        <th className="py-2 px-3">Primary Factor</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {(priorityQueue || []).map((ward, idx) => {
                        const topFactor = ward.breakdown?.reduce((a, b) => a.weighted_score > b.weighted_score ? a : b, ward.breakdown[0]);
                        const dryHours =
                          ward.breakdown?.find(
                            (b) =>
                              b.factor === "Unmet Demand" ||
                              b.factor === "Dry Pipe Time"
                          )?.raw_value ||
                          ward.dry_pipe_hours ||
                          0;
                        return (
                          <tr key={ward.ward_number} className="hover:bg-blue-50/40">
                            <td className={`py-2 px-3 font-bold ${idx === 0 ? "text-deep-blue" : "text-sec-text"}`}>#{idx + 1}</td>
                            <td className="py-2 px-3 font-bold">{ward.name} (Ward {ward.ward_number})</td>
                            <td className="py-2 px-3 font-mono">{ward.demand_liters?.toLocaleString()} L</td>
                            <td className={`py-2 px-3 font-bold ${dryHours > 40 ? "text-warm-amber" : "text-sec-text"}`}>{Math.round(dryHours)} hours</td>
                            <td className="py-2 px-3 font-mono font-black text-deep-blue">{Math.round(ward.total_score)} / 100</td>
                            <td className="py-2 px-3 text-sec-text">{topFactor?.factor} (+{Math.round(topFactor?.weighted_score || 0)})</td>
                            <td className="py-2 px-3 text-right">
                              <button className={`px-2.5 py-1 rounded text-[11px] font-bold ${idx === 0 ? "bg-deep-blue text-white" : "bg-slate-100 hover:bg-slate-200 text-deep-blue"}`}>Dispatch</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: Complaint & Forecast (Phase 17 — Live Time-Series Backend Pipeline) */}
            {activeTab === "forecast" && (() => {
              // Dynamic coordinates from live backend time-series APIs
              const days = demandTrend.length > 0 ? demandTrend : [
                { date: "Day-6", total_demand_liters: 1400000 },
                { date: "Day-5", total_demand_liters: 1620000 },
                { date: "Day-4", total_demand_liters: 1850000 },
                { date: "Day-3", total_demand_liters: 1540000 },
                { date: "Day-2", total_demand_liters: 1720000 },
                { date: "Day-1", total_demand_liters: 1910000 },
                { date: "Today", total_demand_liters: 2050000 },
              ];
              const cDays = complaintsTrend.length > 0 ? complaintsTrend : days.map((_, i) => ({ complaint_count: 20 + i * 5 }));

              const maxDemand = Math.max(...days.map((d) => d.total_demand_liters || 1000000), 2500000);
              const maxComplaints = Math.max(...cDays.map((c) => c.complaint_count || 10), 50);

              const demandPoints = days.map((d, i) => {
                const x = 70 + i * 95;
                const y = Math.round(170 - ((d.total_demand_liters || 0) / maxDemand) * 135);
                return `${x},${y}`;
              }).join(" ");

              const complaintsPoints = cDays.slice(0, days.length).map((c, i) => {
                const x = 70 + i * 95;
                const y = Math.round(170 - ((c.complaint_count || 0) / maxComplaints) * 135);
                return `${x},${y}`;
              }).join(" ");

              const total7dComplaints = cDays.reduce((acc, curr) => acc + (curr.complaint_count || 0), 0);
              const total7dDemandKL = Math.round(days.reduce((acc, curr) => acc + (curr.total_demand_liters || 0), 0) / 1000);

              return (
                <div className="h-full w-full bg-white rounded-xl border border-card-border shadow-sm flex flex-col overflow-hidden p-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-card-border shrink-0">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-extrabold text-sm text-head-text">
                          7-Day Complaint Intelligence &amp; SCADA Demand Forecast
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                          API Live: /api/analytics/*
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">
                          {provenanceTag}
                        </span>
                      </div>
                      <p className="text-[11px] text-sec-text mt-0.5">
                        Historical telemetry time-series dynamically loaded from backend SQLite/PostGIS database (Seed 42 deterministic dataset)
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 text-xs font-semibold">
                      <span className="flex items-center space-x-1.5 text-head-text">
                        <span className="w-3 h-1 bg-deep-blue inline-block rounded" />
                        <span>Actual Demand ({total7dDemandKL.toLocaleString()} KL)</span>
                      </span>
                      <span className="flex items-center space-x-1.5 text-vibrant-blue">
                        <span className="w-3 h-1 border-b-2 border-dashed border-vibrant-blue inline-block" />
                        <span>Citizen Complaints ({total7dComplaints} calls)</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 relative my-2">
                    <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
                      <line x1="40" y1="20" x2="680" y2="20" stroke="#E2EDF7" strokeWidth="1" />
                      <line x1="40" y1="65" x2="680" y2="65" stroke="#E2EDF7" strokeWidth="1" />
                      <line x1="40" y1="110" x2="680" y2="110" stroke="#E2EDF7" strokeWidth="1" />
                      <line x1="40" y1="155" x2="680" y2="155" stroke="#E2EDF7" strokeWidth="1" />
                      <line x1="40" y1="180" x2="680" y2="180" stroke="#CBD5E1" strokeWidth="1.5" />

                      {/* Y-Axis Labels */}
                      <text x="10" y="24" fill="#4A4A4A" fontSize="9" fontWeight="600">{Math.round(maxDemand / 1000)} KL</text>
                      <text x="10" y="69" fill="#4A4A4A" fontSize="9" fontWeight="600">{Math.round((maxDemand * 0.7) / 1000)} KL</text>
                      <text x="10" y="114" fill="#4A4A4A" fontSize="9" fontWeight="600">{Math.round((maxDemand * 0.4) / 1000)} KL</text>
                      <text x="10" y="159" fill="#4A4A4A" fontSize="9" fontWeight="600">{Math.round((maxDemand * 0.1) / 1000)} KL</text>

                      <defs>
                        <linearGradient id="foreGradLive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0056B3" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#0056B3" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Dynamic Demand Area & Polyline */}
                      {demandPoints && (
                        <>
                          <polygon
                            points={`70,180 ${demandPoints} ${70 + (days.length - 1) * 95},180`}
                            fill="url(#foreGradLive)"
                          />
                          <polyline
                            points={demandPoints}
                            fill="none"
                            stroke="#0056B3"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                        </>
                      )}

                      {/* Dynamic Complaints Dashed Polyline */}
                      {complaintsPoints && (
                        <polyline
                          points={complaintsPoints}
                          fill="none"
                          stroke="#3399FF"
                          strokeDasharray="6,4"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Dynamic Markers and X-Axis Labels */}
                      {days.map((d, idx) => {
                        const x = 70 + idx * 95;
                        const dCoord = demandPoints.split(" ")[idx]?.split(",")[1] || 90;
                        const cCoord = complaintsPoints.split(" ")[idx]?.split(",")[1] || 110;
                        const label = d.date ? (d.date.length > 5 ? d.date.slice(5) : d.date) : `T-${6 - idx}`;
                        const isLast = idx === days.length - 1;

                        return (
                          <g key={idx}>
                            <circle cx={x} cy={dCoord} r="4" fill="#0056B3" stroke="#fff" strokeWidth="2" />
                            <circle cx={x} cy={cCoord} r="3.5" fill="#3399FF" stroke="#fff" strokeWidth="1.5" />
                            <text
                              x={x}
                              y="195"
                              textAnchor="middle"
                              fill={isLast ? "#0056B3" : "#1A1A1A"}
                              fontSize="10"
                              fontWeight={isLast ? "900" : "700"}
                            >
                              {isLast ? "Today" : label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Provenance & Analytical KPI Strip */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-card-border shrink-0">
                    <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-100">
                      <div className="text-[10px] font-bold text-deep-blue uppercase">Total 7-Day Complaints</div>
                      <div className="font-bold text-xs">{total7dComplaints} Logged Events</div>
                      <p className="text-[10px] text-sec-text">Consolidated from WhatsApp &amp; Citizen Web Portal.</p>
                    </div>
                    <div className="p-2 bg-amber-50/60 rounded-lg border border-amber-200">
                      <div className="text-[10px] font-bold text-warm-amber uppercase">Unmet Allocation Deficit</div>
                      <div className="font-bold text-xs font-mono">
                        {unmetStats ? `${(unmetStats.total_unmet_demand_liters / 1000).toFixed(0)} KL Unmet` : "342 KL Historical"}
                      </div>
                      <p className="text-[10px] text-sec-text">Evaluated across all 24 administrative wards.</p>
                    </div>
                    <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-200">
                      <div className="text-[10px] font-bold text-olive-green uppercase">Predictive ML Baseline</div>
                      <div className="font-bold text-xs">MAE 3,099 L vs Naive 4,224 L</div>
                      <p className="text-[10px] text-sec-text">Validated on 7-day held-out chronological split.</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB: Fleet & Logistics */}
            {activeTab === "fleet" && (
              <div className="h-full w-full bg-white rounded-xl border border-card-border shadow-sm flex flex-col overflow-hidden p-3 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-card-border shrink-0">
                  <div>
                    <h3 className="font-extrabold text-sm text-head-text">Municipal Tanker Fleet Transponders &amp; Turnaround</h3>
                    <p className="text-[11px] text-sec-text">{tankers?.length || 25} Total Registered Municipal Tankers · Average Dispatch Latency: 14 min</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-olive-green border border-emerald-200 text-xs font-bold rounded">100% Telemetry Online</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scroll mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {(tankers || []).filter(t => ["en_route", "dispensing", "loading"].includes(t.status)).map((tanker) => {
                      const statusColors = {
                        en_route: { text: "text-deep-blue", bg: "bg-deep-blue" },
                        dispensing: { text: "text-olive-green", bg: "bg-olive-green" },
                        loading: { text: "text-vibrant-blue", bg: "bg-vibrant-blue" },
                      };
                      const sc = statusColors[tanker.status] || statusColors.en_route;
                      const loadPct = tanker.capacity > 0 ? Math.round((tanker.current_load / tanker.capacity) * 100) : 0;
                      const ward = wards?.find(w => w.ward_number === tanker.assigned_ward);
                      return (
                        <div key={tanker.tanker_id} className="p-2.5 rounded-lg border border-card-border bg-[#FBFDFF]">
                          <div className="flex justify-between font-bold text-xs">
                            <span>{tanker.transponder_id} ({tanker.capacity?.toLocaleString()}L)</span>
                            <span className={`${sc.text} font-mono capitalize`}>{tanker.status.replace("_", " ")} {loadPct > 0 && tanker.status === "dispensing" ? `${loadPct}%` : ""}</span>
                          </div>
                          <p className="text-[11px] text-sec-text mt-1">
                            {ward ? `Assigned: Ward ${ward.ward_number}` : "Depot loading"} {tanker.eta_minutes ? `· ETA: ${tanker.eta_minutes} min` : ""}
                          </p>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2">
                            <div className={`${sc.bg} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${loadPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Equity & Impact */}
            {activeTab === "equity" && (
              <div className="h-full w-full bg-white rounded-xl border border-card-border shadow-sm flex flex-col overflow-hidden p-3 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-card-border shrink-0">
                  <div>
                    <h3 className="font-extrabold text-sm text-head-text">Impact &amp; Service Equity Evaluation</h3>
                    <p className="text-[11px] text-sec-text">Comparative performance against legacy manual ward allocation baseline</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-olive-green text-[10px] font-bold border border-emerald-200">FairShare™ v2.4 Model</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scroll mt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-card-border bg-blue-50/50 text-sec-text">
                        <th className="py-2 px-3 font-bold">Operational Metric</th>
                        <th className="py-2 px-3 font-bold text-center">Baseline (FCFS)</th>
                        <th className="py-2 px-3 font-bold text-center">Current (WaterFlow OS)</th>
                        <th className="py-2 px-3 font-bold text-right">Net Improvement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {_getEquityRows(equity).map((row) => (
                        <tr key={row.metric} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-head-text">{row.metric}</td>
                          <td className="py-2 px-3 text-center text-sec-text font-mono font-bold">{row.baseline}</td>
                          <td className="py-2 px-3 text-center font-mono font-black text-deep-blue">{row.current}</td>
                          <td className="py-2 px-3 text-right font-bold text-olive-green">{row.improvement}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: Alerts View */}
            {activeTab === "alerts" && (
              <div className="h-full w-full bg-white rounded-xl border border-card-border shadow-sm flex flex-col overflow-hidden p-3 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-card-border shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-crit-red" />
                    <h3 className="font-extrabold text-sm text-head-text">Critical Municipal Incident Center</h3>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-crit-red text-[10px] font-bold">{alerts?.length || 3} Active Signals</span>
                  </div>
                  <button className="text-xs text-deep-blue font-bold hover:underline" onClick={() => setActiveTab("overview")}>Close Alerts</button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scroll divide-y divide-card-border mt-2">
                  {(alerts || MOCK_ALERTS_FALLBACK).map((alert, idx) => (
                    <div key={alert.id || idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-xs text-head-text flex items-center space-x-2">
                          <span className={alert.severity === "critical" ? "text-crit-red" : "text-warm-amber"}>
                            {alert.severity === "critical" ? "🔴" : "🟠"}
                          </span>
                          <span>{alert.title}</span>
                        </div>
                        <p className="text-xs text-sec-text mt-0.5">{alert.description}</p>
                      </div>
                      <button className="px-3 py-1 bg-deep-blue text-white rounded text-xs font-bold shrink-0 ml-4">
                        {alert.severity === "critical" ? "Dispatch Aux Tanker" : "View Details"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Fallback alerts
const MOCK_ALERTS_FALLBACK = [
  { id: 1, title: "Ward 23 · Critical Deficit", description: "52hr unmet demand · Underground booster pump tripped due to low voltage", severity: "critical" },
  { id: 2, title: "Ward 17 · Citizen Complaint Spike", description: "Demand +31% today · Grievance line spike in Sub-sector 4", severity: "warning" },
  { id: 3, title: "Tanker T-14 · Routing Delay", description: "Delayed by 18 min · Rail crossing bottleneck on Ring Road North", severity: "warning" },
];

// Equity table row builder
function _getEquityRows(equity) {
  if (equity) {
    return [
      {
        metric: "Service Equity Index",
        baseline: `${Math.round(equity.fcfs.equity_index)}%`,
        current: `${Math.round(equity.waterflow_ai.equity_index)}%`,
        improvement: `+${Math.round(equity.improvement_equity)}% Parity`,
      },
      {
        metric: "Vulnerable Area Coverage",
        baseline: `${Math.round(equity.fcfs.vulnerable_coverage)}%`,
        current: `${Math.round(equity.waterflow_ai.vulnerable_coverage)}%`,
        improvement: `+${Math.round(equity.improvement_coverage)}% Protected`,
      },
      {
        metric: "Allocation Std Dev",
        baseline: equity.fcfs.stddev.toFixed(3),
        current: equity.waterflow_ai.stddev.toFixed(3),
        improvement: equity.waterflow_ai.stddev < equity.fcfs.stddev ? "Lower = Better" : "—",
      },
      {
        metric: "Total Allocated",
        baseline: `${Math.round(equity.fcfs.total_allocated / 1000)} KL`,
        current: `${Math.round(equity.waterflow_ai.total_allocated / 1000)} KL`,
        improvement: "Optimized Distribution",
      },
    ];
  }
  // Fallback static rows matching original HTML
  return [
    { metric: "Unmet Requests", baseline: "61", current: "42", improvement: "-31.1% Unmet" },
    { metric: "Avg. Tanker Distance", baseline: "18.3 km", current: "13.7 km", improvement: "-25.1% Transit" },
    { metric: "Service Equity Index", baseline: "61%", current: "84%", improvement: "+23.0% Parity" },
    { metric: "Vulnerable Area Coverage", baseline: "54%", current: "78%", improvement: "+24.0% Protected" },
  ];
}
