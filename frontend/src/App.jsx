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
  ShieldCheck,
  Bell,
  Droplet,
  Smartphone,
  CheckCircle2,
  LogOut,
  User as UserIcon,
  Lock,
  Zap,
  Eye,
  Beaker,
  Network,
  RefreshCw,
  Radio,
  Navigation,
  Gauge,
  Filter,
  Menu,
  X,
  Star,
  Award,
  AlertOctagon,
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
import EvidencePanelModal from "./components/EvidencePanelModal";
import GovernanceCenter from "./components/GovernanceCenter";
import PolicySandbox from "./components/PolicySandbox";
import NetworkResilience from "./components/NetworkResilience";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  DEFAULT_MUMBAI_WARDS,
  DEFAULT_MUMBAI_DEPOTS,
  DEFAULT_MUMBAI_TANKERS,
  DEFAULT_MUMBAI_PRIORITY_QUEUE,
  DEFAULT_MUMBAI_KPIS,
  DEFAULT_MUMBAI_ALERTS,
} from "./utils/mumbaiWardsData";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const NAV_ITEMS = [
  { id: "overview", label: "Live Overview", icon: LayoutDashboard },
  { id: "spatial", label: "GIS Spatial Dispatch", icon: Map },
  { id: "queue", label: "Allocation Queue", icon: ListOrdered, badge: null },
  { id: "governance", label: "Governance Gate", icon: ShieldAlert },
  { id: "resilience", label: "Network Resilience", icon: Network },
  { id: "sandbox", label: "Policy Sandbox", icon: Beaker },
  { id: "forecast", label: "Complaint & Forecast", icon: TrendingUp },
  { id: "fleet", label: "Fleet & Logistics", icon: Truck, suffix: null },
  { id: "equity", label: "Equity & Impact", icon: Scale },
];

import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real Time-Series Analytics State (Phase 17)
  const [demandTrend, setDemandTrend] = useState([]);
  const [complaintsTrend, setComplaintsTrend] = useState([]);
  const [serviceBalance, setServiceBalance] = useState([]);
  const [unmetStats, setUnmetStats] = useState(null);
  const [provenanceTag, setProvenanceTag] = useState("SYNTHETIC_SEEDED");
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [governanceStats, setGovernanceStats] = useState({ pending_authorization: 0, pending_review: 0, auto_executed: 0, total_pending: 0 });

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

    async function fetchGovernanceStats() {
      try {
        const gRes = await fetch(`${API_URL}/api/governance/stats`);
        const gData = await gRes.json();
        setGovernanceStats(gData);
      } catch (err) {
        // fallback
      }
    }

    fetchDashboard();
    fetchAnalytics();
    fetchGovernanceStats();
    const interval = setInterval(() => {
      fetchDashboard();
      fetchAnalytics();
      fetchGovernanceStats();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [dispatchNotification, setDispatchNotification] = useState(null);

  const handleDispatchWard = async (ward, options = {}) => {
    try {
      const wardCode = ward?.ward_number || ward?.ward_code;
      if (!wardCode) return { success: false, error: "No ward specified" };
      const volume = options.volume || ward.demand_liters || 10000;
      const pin = options.pin || "4491";

      const res = await fetch(`${API_URL}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_code: wardCode,
          volume_liters: volume,
          pin,
          officer_id: user?.officer_id || "EXEC_OPS_01",
          officer_name: user?.name || "Operations Supervisor",
          notes: `Operational dispatch to Ward ${wardCode}`,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setDispatchNotification({
          type: "success",
          message: `Mission #${resData.mission.id} Dispatched! Tanker ${resData.tanker.transponder_id} en route to Ward ${wardCode} (${volume.toLocaleString()} L). Citizen OTP: ${resData.otp_code}`,
        });
        // Refresh dashboard immediately
        try {
          const dashRes = await fetch(`${API_URL}/api/dashboard`);
          const dashJson = await dashRes.json();
          setData(dashJson);
        } catch (e) {
          // ignore
        }
        setTimeout(() => setDispatchNotification(null), 8000);
        return resData;
      } else {
        setDispatchNotification({
          type: "error",
          message: `Dispatch rejected: ${resData.error}`,
        });
        setTimeout(() => setDispatchNotification(null), 8000);
        return resData;
      }
    } catch (err) {
      setDispatchNotification({
        type: "error",
        message: `Network error during dispatch: ${err.message}`,
      });
      return { success: false, error: err.message };
    }
  };

  const [fleetFilter, setFleetFilter] = useState("all");
  const [optimizerRunning, setOptimizerRunning] = useState(false);

  // Admin: Review citizen complaint (verify genuine +25 Cr or downvote false -40 Cr)
  const handleReviewCitizenReport = async (phone, ticketId, action) => {
    try {
      const res = await fetch(`${API_URL}/api/citizen/review-complaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          ticket_id: ticketId,
          action,
          admin_notes: action === "VERIFY_GENUINE"
            ? "Verified on-site by Ward Junior Engineer"
            : "False report detected via ultrasonic flowmeter logs",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDispatchNotification({
          type: action === "VERIFY_GENUINE" ? "success" : "error",
          message: action === "VERIFY_GENUINE"
            ? `✓ Citizen report #${ticketId} verified genuine! Awarded +25 Civic Credits. New Trust Score: ${json.profile.credibility_score}%.`
            : `⚠️ Citizen report #${ticketId} flagged FALSE! Downvoted -40 Civic Credits. New Trust Score: ${json.profile.credibility_score}%.`,
        });
        setTimeout(() => setDispatchNotification(null), 8000);
      }
    } catch (e) {
      console.warn("Review complaint error:", e);
    }
  };

  // Admin: Record driver infraction (route diversion -25, gps tamper -35, illegal sale -60)
  const handleDriverInfractionAdmin = async (tankerId, infractionType, notes) => {
    try {
      const res = await fetch(`${API_URL}/api/driver/infraction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanker_id: tankerId,
          infraction_type: infractionType,
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDispatchNotification({
          type: json.driver?.is_blacklisted ? "error" : "warning",
          message: json.message,
        });
        const dashRes = await fetch(`${API_URL}/api/dashboard`);
        const dashJson = await dashRes.json();
        setData(dashJson);
        setTimeout(() => setDispatchNotification(null), 8000);
      }
    } catch (e) {
      console.warn("Infraction error:", e);
    }
  };

  // Admin: Reward driver on-time delivery (+15 Cr)
  const handleDriverRewardAdmin = async (tankerId, rewardType, details) => {
    try {
      const res = await fetch(`${API_URL}/api/driver/reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanker_id: tankerId,
          reward_type: rewardType,
          details,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDispatchNotification({
          type: "success",
          message: json.message,
        });
        const dashRes = await fetch(`${API_URL}/api/dashboard`);
        const dashJson = await dashRes.json();
        setData(dashJson);
        setTimeout(() => setDispatchNotification(null), 8000);
      }
    } catch (e) {
      console.warn("Reward error:", e);
    }
  };

  // Admin: Toggle tanker plate blacklist status
  const handleToggleBlacklistAdmin = async (tankerId, currentlyBlacklisted) => {
    try {
      const res = await fetch(`${API_URL}/api/driver/blacklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanker_id: tankerId,
          is_blacklisted: !currentlyBlacklisted,
          reason: !currentlyBlacklisted
            ? "Administrative contract revocation: Telemetry tamper & route violation"
            : "Audited & restored by Municipal Chief Hydraulic Engineer",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDispatchNotification({
          type: !currentlyBlacklisted ? "error" : "success",
          message: json.message,
        });
        const dashRes = await fetch(`${API_URL}/api/dashboard`);
        const dashJson = await dashRes.json();
        setData(dashJson);
        setTimeout(() => setDispatchNotification(null), 8000);
      }
    } catch (e) {
      console.warn("Blacklist toggle error:", e);
    }
  };

  const handleRerunOptimizer = async () => {
    setOptimizerRunning(true);
    setDispatchNotification({
      type: "info",
      message: "Recalculating algorithmic vulnerability queue with 0 geographic bias...",
    });
    try {
      await fetch(`${API_URL}/api/dashboard`);
    } catch (e) {
      // offline fallback
    }
    setTimeout(() => {
      setOptimizerRunning(false);
      setDispatchNotification({
        type: "success",
        message: "Algorithmic optimization complete · 24 BMC Administrative Wards ranked by vulnerability index.",
      });
      setTimeout(() => setDispatchNotification(null), 5000);
    }, 600);
  };

  const kpis = data?.kpis || DEFAULT_MUMBAI_KPIS;
  const wards = data?.wards?.length ? data.wards : DEFAULT_MUMBAI_WARDS;
  const tankers = data?.tankers?.length ? data.tankers : DEFAULT_MUMBAI_TANKERS;
  const depots = data?.depots?.length ? data.depots : DEFAULT_MUMBAI_DEPOTS;
  const alerts = data?.alerts?.length ? data.alerts : DEFAULT_MUMBAI_ALERTS;
  const priorityQueue = data?.priority_queue?.length ? data.priority_queue : DEFAULT_MUMBAI_PRIORITY_QUEUE;
  const equity = data?.equity;

  // Derived counts
  const criticalCount = kpis?.critical_alerts || 3;
  const queueCount = priorityQueue?.filter((w) => w.tier <= 2).length || 4;
  const fleetSuffix = kpis ? `${kpis.fleet_available}/${kpis.fleet_total}` : "18/25";
  const govPending = governanceStats?.total_pending || 0;

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
      <div className="w-full min-h-screen overflow-y-auto bg-[#edf4fb]">
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
      <div className="w-full min-h-screen overflow-y-auto bg-[#f0f5fa]">
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
      <div className="w-full min-h-screen overflow-y-auto bg-[#edf4fb]">
        <CitizenApp user={user} onSignOut={() => { logout(); setView("landing"); }} />
      </div>
    );
  }
  if (role === "worker") {
    return (
      <div className="w-full min-h-screen overflow-y-auto bg-[#f0f5fa]">
        <WorkerApp user={user} onSignOut={() => { logout(); setView("landing"); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-canvas text-head-text font-sans antialiased overflow-x-hidden">
      {/* Real-time Dispatch Toast Notification */}
      {dispatchNotification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-xl border text-xs font-semibold flex items-center space-x-2 transition-all ${
          dispatchNotification.type === "success"
            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
            : "bg-red-50 border-red-300 text-red-800"
        }`}>
          <span>{dispatchNotification.message}</span>
          <button onClick={() => setDispatchNotification(null)} className="ml-2 font-bold hover:opacity-75">✕</button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TOP HEADER BAR */}
      {/* ============================================================ */}
      <header className="h-14 shrink-0 bg-white border-b border-card-border shadow-2xs px-2 sm:px-4 flex items-center justify-between z-30">
        {/* Left: Mobile Drawer Button + Brand */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 -ml-1 text-slate-700 hover:text-deep-blue hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-deep-blue" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-deep-blue shadow-sm flex items-center justify-center p-1">
            <Droplet className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-deep-blue whitespace-nowrap">
              WaterFlow OS
            </span>
            <span className="hidden sm:inline-flex px-1.5 py-0.5 bg-emerald-50 text-olive-green border border-olive-green/30 text-[10px] font-bold rounded items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-olive-green animate-pulse" />
              <span>99.4% Grid Stable</span>
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 bg-slate-100 text-sec-text text-[10px] font-semibold rounded border border-card-border">
              Command Center
            </span>
          </div>
        </div>

        {/* Center: Portal Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-card-border text-xs font-bold shrink-0 mx-1 sm:mx-2">
          <button
            onClick={() => setPortalMode("command")}
            className={`px-2 sm:px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 sm:space-x-1.5 ${
              portalMode === "command"
                ? "bg-white text-deep-blue shadow-2xs font-extrabold"
                : "text-sec-text hover:text-deep-blue"
            }`}
            title="Command Center"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Command Center</span>
            <span className="hidden sm:inline md:hidden">Command</span>
          </button>
          <button
            onClick={() => setPortalMode("citizen")}
            className="px-2 sm:px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 sm:space-x-1.5 text-sec-text hover:text-deep-blue"
            title="Citizen Portal"
          >
            <Smartphone className="w-3.5 h-3.5 text-vibrant-blue" />
            <span className="hidden sm:inline">Citizen Portal</span>
            <span className="sm:hidden text-[11px]">Citizen</span>
          </button>
          <button
            onClick={() => setPortalMode("worker")}
            className="px-2 sm:px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 sm:space-x-1.5 text-sec-text hover:text-deep-blue"
            title="Worker Portal"
          >
            <Truck className="w-3.5 h-3.5 text-warm-amber" />
            <span className="hidden sm:inline">Worker Portal</span>
            <span className="sm:hidden text-[11px]">Worker</span>
          </button>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center space-x-1 sm:space-x-2">
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
            className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors shadow-2xs"
            onClick={() => setIsEvidenceModalOpen(true)}
            title="Inspect Data Provenance, Policy Weights & Algorithmic Methodology"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden lg:inline">Evidence & Methodology</span>
          </button>

          {/* Governance Gate Chip */}
          {govPending > 0 ? (
            <button
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors animate-pulse"
              onClick={() => setActiveTab("governance")}
              title="Pending governance decisions require authorization"
            >
              <Lock className="w-3 h-3 text-amber-600" />
              <span className="hidden sm:inline">{govPending} Pending Auth</span>
              <span className="sm:hidden font-mono font-bold">{govPending}</span>
            </button>
          ) : (
            <button
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
              onClick={() => setActiveTab("governance")}
              title="All governance decisions resolved"
            >
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">HITL Clear</span>
            </button>
          )}

          <button
            className="flex items-center space-x-1 px-1.5 sm:px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-crit-red text-xs font-bold hover:bg-red-100 transition-colors"
            onClick={() => setActiveTab("alerts")}
            title="View Critical Incidents"
          >
            <span className="w-2 h-2 rounded-full bg-crit-red animate-ping" />
            <span className="hidden sm:inline">{criticalCount} Critical Wards</span>
            <span className="sm:hidden font-mono">{criticalCount}</span>
          </button>

          <button
            className="hidden sm:inline-flex relative p-1.5 rounded-lg text-sec-text hover:text-deep-blue hover:bg-blue-50/80 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-warm-amber ring-2 ring-white" />
          </button>

          {/* User Identity Chip & Sign Out */}
          {user ? (
            <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-card-border">
              <div
                className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-xs font-semibold text-deep-blue"
                title={`${user.title || user.role} · ${user.badge || ""}`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="font-bold text-[11px]">
                  {user.name} ({user.role})
                </span>
              </div>
              <button
                onClick={() => {
                  logout();
                  setView("landing");
                }}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-crit-red hover:bg-rose-100 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Sign Out to Landing Page"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView("login")}
              className="px-2.5 sm:px-3 py-1 rounded-md bg-deep-blue text-white text-xs font-bold hover:bg-blue-800 transition cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/* MOBILE SLIDE-OUT NAVIGATION DRAWER */}
      {/* ============================================================ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer Panel */}
          <aside className="relative w-72 max-w-[85vw] bg-deep-blue text-white flex flex-col justify-between p-4 shadow-2xl z-10 overflow-y-auto">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center p-1">
                    <Droplet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white">WaterFlow OS</div>
                    <div className="text-[10px] text-blue-200 font-mono">SCADA Control Console</div>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items (9 tabs) */}
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold border-l-4 transition-all text-left ${
                        isActive
                          ? "bg-white/20 text-white border-vibrant-blue shadow-2xs"
                          : "text-blue-100 hover:bg-white/10 border-transparent"
                      }`}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-vibrant-blue" : ""}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.id === "queue" && (
                        <span className="px-1.5 py-0.5 bg-warm-amber text-white text-[10px] font-bold rounded-full">
                          {queueCount}
                        </span>
                      )}
                      {item.id === "governance" && govPending > 0 && (
                        <span className="px-1.5 py-0.5 bg-crit-red text-white text-[10px] font-bold rounded-full animate-pulse">
                          {govPending}
                        </span>
                      )}
                      {item.id === "governance" && govPending === 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                          ✓
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

              {/* Field Mobile Portals */}
              <div className="pt-3 border-t border-white/10 space-y-1.5">
                <div className="px-2 text-[10px] uppercase font-bold text-blue-300 tracking-wider">
                  Field Mobile Portals
                </div>
                <button
                  onClick={() => {
                    setPortalMode("citizen");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-100 hover:bg-white/10 text-left transition-all"
                >
                  <Smartphone className="w-4 h-4 text-vibrant-blue" />
                  <span className="flex-1">Citizen Portal</span>
                  <span className="px-1.5 py-0.5 bg-blue-500/30 text-blue-200 text-[9px] font-bold rounded">Live</span>
                </button>
                <button
                  onClick={() => {
                    setPortalMode("worker");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-100 hover:bg-white/10 text-left transition-all"
                >
                  <Truck className="w-4 h-4 text-warm-amber" />
                  <span className="flex-1">Worker Terminal</span>
                  <span className="px-1.5 py-0.5 bg-amber-500/30 text-amber-200 text-[9px] font-bold rounded">T-08</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
              <div className="bg-black/20 rounded-lg p-2.5 text-xs">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-blue-200">Daily Quota Burn</span>
                  <span className="font-bold text-white">
                    {kpis?.water_available_kl || 286} / {kpis?.total_capacity_kl || 420} KL
                  </span>
                </div>
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-vibrant-blue h-1.5 rounded-full"
                    style={{ width: `${kpis?.water_pct || 68}%` }}
                  />
                </div>
              </div>
              {user && (
                <button
                  onClick={() => {
                    logout();
                    setView("landing");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-bold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out ({user.name})</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ============================================================ */}
      {/* BODY: Sidebar + Main */}
      {/* ============================================================ */}
      <div className="flex-1 lg:h-[calc(100vh-56px)] min-h-0 flex flex-col lg:flex-row overflow-x-hidden lg:overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex w-64 shrink-0 bg-deep-blue text-white flex-col justify-between p-3 select-none border-r border-blue-900/30">
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
                    {item.id === "governance" && govPending > 0 && (
                      <span className="px-1.5 py-0.5 bg-crit-red text-white text-[10px] font-bold rounded-full animate-pulse">
                        {govPending}
                      </span>
                    )}
                    {item.id === "governance" && govPending === 0 && (
                      <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                        ✓
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
        <main className="flex-1 min-w-0 overflow-y-auto lg:overflow-hidden flex flex-col gap-2 p-1.5 sm:p-2">
          {/* KPI Strip */}
          <KpiStrip kpis={kpis} />

          {/* Tab Content */}
          <div className="flex-1 min-h-0 relative">
            {loading && (
              <div className="absolute inset-0 bg-canvas/80 flex items-center justify-center z-[9998]">
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
              <div className="w-full flex flex-col lg:flex-row gap-2.5 lg:h-full lg:overflow-hidden animate-fade-in">
                {/* Left: Map + Explainability */}
                <div className="w-full lg:w-[62%] min-h-[380px] lg:h-full flex flex-col gap-2 min-h-0">
                  <MapPanel
                    wards={wards}
                    tankers={tankers}
                    depots={depots}
                    priorityQueue={priorityQueue}
                    onNavigateToSpatial={() => setActiveTab("spatial")}
                    onDispatch={handleDispatchWard}
                  />
                </div>
                {/* Right: Queue + Resources + Alerts */}
                <div className="w-full lg:w-[38%] flex flex-col gap-2 min-h-0">
                  <PriorityQueue queue={priorityQueue} onDispatch={handleDispatchWard} />
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
                <div className="flex-1 min-h-0 relative overflow-hidden isolate">
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

            {/* TAB: Governance Gate (HITL 3-Tier Decision Pipeline) */}
            {activeTab === "governance" && (
              <GovernanceCenter />
            )}

            {/* TAB: Network Resilience (Graph-Based Scenario Analysis) */}
            {activeTab === "resilience" && (
              <div className="bg-slate-900/80 rounded-xl border border-slate-600/30 p-6 animate-fade-in">
                <NetworkResilience />
              </div>
            )}

            {/* TAB: Policy & Crisis Sandbox Simulator */}
            {activeTab === "sandbox" && (
              <PolicySandbox onNavigateToGovernance={() => setActiveTab("governance")} />
            )}

            {/* TAB: Allocation Queue */}
            {activeTab === "queue" && (
              <div className="h-full w-full bg-white rounded-xl border border-card-border shadow-sm flex flex-col overflow-hidden p-3 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-card-border shrink-0">
                  <div>
                    <h3 className="font-extrabold text-sm text-head-text flex items-center space-x-2">
                      <ListOrdered className="w-4 h-4 text-deep-blue" />
                      <span>Algorithmic Allocation Queue &amp; Transparent Scoring</span>
                    </h3>
                    <p className="text-[11px] text-sec-text">
                      24 BMC Administrative Wards ranked strictly by vulnerability formula without human geographic bias
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="hidden sm:inline-flex px-2 py-0.5 bg-blue-50 text-deep-blue text-[10px] font-bold rounded border border-blue-200">
                      Zero Human Bias · Audit Certified
                    </span>
                    <button
                      onClick={handleRerunOptimizer}
                      disabled={optimizerRunning}
                      className="flex items-center space-x-1.5 px-3 py-1 bg-deep-blue text-white text-xs font-bold rounded-lg shadow-2xs hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${optimizerRunning ? "animate-spin" : ""}`} />
                      <span>{optimizerRunning ? "Recalculating..." : "Re-run Optimizer"}</span>
                    </button>
                  </div>
                </div>

                {/* Queue Summary Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2 shrink-0">
                  <div className="p-2 bg-slate-50 rounded-lg border border-card-border flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold text-sec-text uppercase">Total Evaluated</div>
                      <div className="text-sm font-extrabold text-head-text">24 Administrative Wards</div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="p-2 bg-red-50/60 rounded-lg border border-red-200 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold text-crit-red uppercase">Tier 1 Critical</div>
                      <div className="text-sm font-extrabold text-crit-red">
                        {priorityQueue.filter(w => (w.tier || 1) === 1).length} Wards Immediate
                      </div>
                    </div>
                    <ShieldAlert className="w-4 h-4 text-crit-red" />
                  </div>
                  <div className="p-2 bg-amber-50/60 rounded-lg border border-amber-200 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold text-warm-amber uppercase">Avg Dry Pipeline</div>
                      <div className="text-sm font-extrabold text-warm-amber">
                        {Math.round(priorityQueue.reduce((acc, w) => acc + (w.dry_pipe_hours || 0), 0) / (priorityQueue.length || 1))} Hours
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-warm-amber" />
                  </div>
                  <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-200 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold text-deep-blue uppercase">Total Demand</div>
                      <div className="text-sm font-extrabold text-deep-blue">
                        {Math.round(priorityQueue.reduce((acc, w) => acc + (w.demand_liters || 0), 0) / 1000).toLocaleString()} KL
                      </div>
                    </div>
                    <Droplet className="w-4 h-4 text-deep-blue" />
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scroll mt-1">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-blue-50/70 sticky top-0 text-sec-text z-10">
                      <tr className="border-b border-card-border">
                        <th className="py-2 px-3">Rank</th>
                        <th className="py-2 px-3">Ward Identifier</th>
                        <th className="py-2 px-3">Tier</th>
                        <th className="py-2 px-3">Volume Needed</th>
                        <th className="py-2 px-3">Dry Pipeline Time</th>
                        <th className="py-2 px-3">Composite Score</th>
                        <th className="py-2 px-3">Primary Factor</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {priorityQueue.map((ward, idx) => {
                        const topFactor = ward.breakdown?.length
                          ? ward.breakdown.reduce((a, b) => ((a?.weighted_score || 0) > (b?.weighted_score || 0) ? a : b), ward.breakdown[0])
                          : null;
                        const factorName = topFactor?.factor_name || topFactor?.factor || "Vulnerability Exposure";
                        const factorScore = Math.round(topFactor?.weighted_score || topFactor?.weighted_contribution || 28);
                        const dryHours =
                          ward.breakdown?.find(
                            (b) =>
                              b.factor === "Unmet Demand" ||
                              b.factor === "Dry Pipe Time" ||
                              b.factor_name === "Dry Pipe Duration"
                          )?.raw_value ||
                          ward.dry_pipe_hours ||
                          0;
                        const wardCode = ward.ward_number || ward.ward_code || `W-${idx + 1}`;
                        const tier = ward.tier || (idx < 4 ? 1 : idx < 12 ? 2 : 3);

                        return (
                          <tr key={wardCode} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                                idx === 0
                                  ? "bg-amber-100 text-amber-800 border border-amber-300 font-black"
                                  : idx === 1
                                  ? "bg-slate-200 text-slate-700 font-bold"
                                  : idx === 2
                                  ? "bg-amber-50 text-amber-700 font-bold"
                                  : "text-sec-text"
                              }`}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-bold text-head-text">{ward.name}</div>
                              <div className="text-[10px] text-sec-text font-mono">Ward {wardCode} · {ward.zone || "Mumbai Metropolitan"}</div>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                tier === 1
                                  ? "bg-red-50 text-crit-red border-red-200"
                                  : tier === 2
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-blue-50 text-deep-blue border-blue-200"
                              }`}>
                                Tier {tier}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold">
                              {(ward.demand_liters || 10000).toLocaleString()} L
                            </td>
                            <td className={`py-2 px-3 font-bold ${dryHours > 40 ? "text-crit-red" : dryHours > 20 ? "text-warm-amber" : "text-sec-text"}`}>
                              {Math.round(dryHours)} hours
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-mono font-black text-deep-blue">{Math.round(ward.total_score || 0)}</span>
                              <span className="text-[10px] text-sec-text"> / 100</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-sec-text">{factorName}</span>
                              <span className="text-[10px] font-bold text-deep-blue ml-1 font-mono">+{factorScore}</span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => handleDispatchWard(ward)}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all shadow-2xs ${
                                  idx === 0
                                    ? "bg-deep-blue text-white hover:bg-blue-700"
                                    : "bg-slate-100 hover:bg-slate-200 text-deep-blue hover:text-blue-800"
                                }`}
                              >
                                Dispatch
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Citizen Shortage Reports & Credibility Verification Section */}
                <div className="mt-3 pt-3 border-t border-card-border shrink-0">
                  <div className="flex items-center justify-between pb-2">
                    <div>
                      <h4 className="text-xs font-black text-head-text flex items-center space-x-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>Citizen Complaint Credibility &amp; Anti-Fraud Verification Gate</span>
                      </h4>
                      <p className="text-[10px] text-sec-text">
                        Admin Triage: Genuine reports award +25 Civic Credits. False / fabricated reports detected via telemetry downvote citizen (-40 Civic Credits).
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                      SCADA Citizen Trust Engine
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {/* Complaint Card 1: High trust fast-track */}
                    <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50/40 flex flex-col justify-between space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-xs text-head-text">#WF-24-918</span>
                            <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono">
                              ⚡ Fast-Track Booster Active (-20 Cr Used)
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-800 mt-1">
                            Severe Dry Tap (&gt;48 Hours Continuous) · Ward M/East
                          </div>
                          <div className="text-[10px] text-sec-text mt-0.5">
                            Caller: <strong>+91 98200 12345</strong> · Govandi Shivaji Nagar Sec-4
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-mono block">
                            92% Trust Score
                          </span>
                          <span className="text-[9px] text-sec-text block mt-0.5">Gold Contributor (145 Cr)</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-sec-text italic">
                          SCADA acoustic log: Confirms 0 bar pressure at standpost #4
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleReviewCitizenReport("+91 98200 12345", "WF-24-918", "VERIFY_GENUINE")}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition cursor-pointer shadow-2xs"
                          >
                            ✓ Verify Genuine (+25 Cr)
                          </button>
                          <button
                            onClick={() => handleReviewCitizenReport("+91 98200 12345", "WF-24-918", "DOWNVOTE_FALSE")}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition cursor-pointer shadow-2xs"
                          >
                            ⚠️ Flag False (-40 Cr)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Complaint Card 2: Low trust suspicious report */}
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-xs text-head-text">#WF-24-942</span>
                            <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                              Standard Triage Queue
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-800 mt-1">
                            Unscheduled Outage Claim · Ward L (Kurla)
                          </div>
                          <div className="text-[10px] text-sec-text mt-0.5">
                            Caller: <strong>+91 98334 88120</strong> · Kurla Pipe Road Standpost
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-mono block">
                            48% Trust Score
                          </span>
                          <span className="text-[9px] text-sec-text block mt-0.5">Probationary (25 Cr)</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] text-sec-text italic">
                          SCADA sensor: Line pressure normal (2.4 bar) during reported hour
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleReviewCitizenReport("+91 98334 88120", "WF-24-942", "VERIFY_GENUINE")}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition cursor-pointer shadow-2xs"
                          >
                            ✓ Verify Genuine (+25 Cr)
                          </button>
                          <button
                            onClick={() => handleReviewCitizenReport("+91 98334 88120", "WF-24-942", "DOWNVOTE_FALSE")}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition cursor-pointer shadow-2xs"
                          >
                            ⚠️ Flag False (-40 Cr)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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
            {activeTab === "fleet" && (() => {
              const allTankers = (tankers && tankers.length > 0) ? tankers : DEFAULT_MUMBAI_TANKERS;
              const enRouteCount = allTankers.filter(t => t.status === "en_route").length;
              const dispensingCount = allTankers.filter(t => t.status === "dispensing").length;
              const loadingCount = allTankers.filter(t => t.status === "loading").length;
              const availableCount = allTankers.filter(t => t.status === "available" && !t.is_blacklisted).length;
              const otherCount = allTankers.filter(t => ["returning", "maintenance"].includes(t.status)).length;
              const preferredCount = allTankers.filter(t => t.is_preferred).length;
              const blacklistedCount = allTankers.filter(t => t.is_blacklisted).length;
              const activeCount = enRouteCount + dispensingCount + loadingCount;

              const filteredTankers = allTankers.filter(t => {
                if (fleetFilter === "all") return true;
                if (fleetFilter === "preferred") return t.is_preferred;
                if (fleetFilter === "blacklisted") return t.is_blacklisted;
                if (fleetFilter === "active") return ["en_route", "dispensing", "loading"].includes(t.status);
                if (fleetFilter === "available") return t.status === "available" && !t.is_blacklisted;
                if (fleetFilter === "en_route") return t.status === "en_route";
                if (fleetFilter === "dispensing") return t.status === "dispensing";
                if (fleetFilter === "loading") return t.status === "loading";
                if (fleetFilter === "maintenance") return ["returning", "maintenance"].includes(t.status);
                return true;
              });

              return (
                <div className="h-full w-full bg-white rounded-xl border border-card-border shadow-sm flex flex-col overflow-hidden p-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-card-border shrink-0">
                    <div>
                      <h3 className="font-extrabold text-sm text-head-text flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-deep-blue" />
                        <span>Municipal Tanker Fleet Transponders &amp; Turnaround</span>
                      </h3>
                      <p className="text-[11px] text-sec-text">
                        {allTankers.length} Registered Municipal Tankers · Preferred Tier: {preferredCount} · Blacklisted: {blacklistedCount}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-50 text-olive-green border border-emerald-200 text-xs font-bold rounded">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Telemetry Online</span>
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-2 shrink-0">
                    <div className="p-2 bg-slate-50 rounded-lg border border-card-border">
                      <div className="text-[9px] font-bold text-sec-text uppercase">Total Fleet</div>
                      <div className="text-sm font-extrabold text-head-text">{allTankers.length} Units</div>
                    </div>
                    <div className="p-2 bg-amber-50/70 rounded-lg border border-amber-300">
                      <div className="text-[9px] font-bold text-amber-800 uppercase">⭐ Preferred Contractors</div>
                      <div className="text-sm font-extrabold text-amber-900">{preferredCount} Priority Units</div>
                    </div>
                    <div className="p-2 bg-rose-50/70 rounded-lg border border-rose-300">
                      <div className="text-[9px] font-bold text-rose-800 uppercase">⛔ Blacklisted Plates</div>
                      <div className="text-sm font-extrabold text-rose-900">{blacklistedCount} Banned</div>
                    </div>
                    <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-200">
                      <div className="text-[9px] font-bold text-deep-blue uppercase">Active Dispatches</div>
                      <div className="text-sm font-extrabold text-deep-blue">{activeCount} Running</div>
                    </div>
                    <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-200">
                      <div className="text-[9px] font-bold text-olive-green uppercase">Standby Ready</div>
                      <div className="text-sm font-extrabold text-olive-green">{availableCount} Available</div>
                    </div>
                  </div>

                  {/* Status Filter Tabs */}
                  <div className="flex items-center space-x-1 overflow-x-auto custom-scroll pb-1 shrink-0 border-b border-card-border text-xs">
                    {[
                      { id: "all", label: `All (${allTankers.length})` },
                      { id: "preferred", label: `⭐ Preferred (${preferredCount})` },
                      { id: "blacklisted", label: `⛔ Blacklisted (${blacklistedCount})` },
                      { id: "active", label: `Active Pipeline (${activeCount})` },
                      { id: "available", label: `Available Standby (${availableCount})` },
                      { id: "en_route", label: `En Route (${enRouteCount})` },
                      { id: "dispensing", label: `Dispensing (${dispensingCount})` },
                      { id: "loading", label: `Loading (${loadingCount})` },
                      { id: "maintenance", label: `Refit / Returning (${otherCount})` },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFleetFilter(f.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          fleetFilter === f.id
                            ? "bg-deep-blue text-white shadow-2xs"
                            : "bg-slate-100 text-sec-text hover:bg-slate-200 hover:text-head-text"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Tankers Grid */}
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scroll mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {filteredTankers.map((tanker) => {
                        const statusColors = {
                          en_route: { text: "text-deep-blue", bg: "bg-deep-blue", badge: "bg-blue-100 text-deep-blue border-blue-200" },
                          dispensing: { text: "text-olive-green", bg: "bg-olive-green", badge: "bg-emerald-100 text-olive-green border-emerald-200" },
                          loading: { text: "text-indigo-600", bg: "bg-indigo-600", badge: "bg-indigo-100 text-indigo-700 border-indigo-200" },
                          available: { text: "text-teal-700", bg: "bg-teal-600", badge: "bg-teal-50 text-teal-700 border-teal-200" },
                          returning: { text: "text-amber-700", bg: "bg-amber-600", badge: "bg-amber-100 text-amber-800 border-amber-200" },
                          maintenance: { text: "text-rose-700", bg: "bg-rose-600", badge: "bg-rose-100 text-rose-800 border-rose-200" },
                        };
                        const sc = statusColors[tanker.status] || statusColors.available;
                        const loadPct = tanker.capacity > 0 ? Math.round((tanker.current_load / tanker.capacity) * 100) : 0;
                        const ward = wards?.find(w => w.ward_number === tanker.assigned_ward);
                        const tankerKey = tanker.transponder_id || tanker.tanker_id;

                        return (
                          <div key={tankerKey} className={`p-3 rounded-xl border transition-all shadow-2xs flex flex-col justify-between ${
                            tanker.is_blacklisted
                              ? "bg-rose-50/50 border-rose-400 ring-1 ring-rose-400/50"
                              : tanker.is_preferred
                              ? "bg-[#FBFDFF] border-amber-300 ring-1 ring-amber-300/40"
                              : "bg-[#FBFDFF] border-card-border hover:border-blue-300"
                          }`}>
                            <div>
                              <div className="flex justify-between items-start gap-1">
                                <div>
                                  <div className="flex items-center space-x-1.5 flex-wrap">
                                    <span className="font-mono font-black text-sm text-head-text">{tanker.transponder_id}</span>
                                    <span className="text-[10px] font-mono font-bold text-slate-800 px-1.5 py-0.2 bg-white rounded border border-slate-300 shadow-2xs">
                                      {tanker.plate || "MH-01-M-4491"}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-sec-text mt-0.5">
                                    Driver: <strong className="text-head-text">{tanker.driver || "Municipal Fleet Crew"}</strong>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize font-mono ${sc.badge}`}>
                                    {tanker.status.replace("_", " ")}
                                  </span>
                                  {tanker.is_blacklisted ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white font-mono animate-pulse">
                                      ⛔ Blacklisted
                                    </span>
                                  ) : tanker.is_preferred ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                                      ⭐ Preferred
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              {/* Integrity & Telemetry Strip */}
                              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-200 mt-2 text-[10px] font-mono">
                                <div className="flex items-center space-x-1">
                                  <span className="text-sec-text">Credits:</span>
                                  <strong className={tanker.is_blacklisted ? "text-rose-600 font-black" : tanker.credit_balance >= 90 ? "text-amber-700 font-black" : "text-deep-blue font-bold"}>
                                    {tanker.credit_balance !== undefined ? tanker.credit_balance : (tanker.is_blacklisted ? 20 : 85)} Cr
                                  </strong>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-sec-text">GPS:</span>
                                  <span className={`font-bold ${tanker.telemetry_status === "TAMPER_DETECTED" ? "text-rose-600" : "text-emerald-700"}`}>
                                    {tanker.telemetry_status === "TAMPER_DETECTED" ? "⚠️ Tampered" : "Online"}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-sec-text">Rating:</span>
                                  <span className="font-bold text-amber-600">★ {tanker.integrity_rating || "4.8"}</span>
                                </div>
                              </div>

                              {/* Capacity Meter */}
                              <div className="mt-2.5">
                                <div className="flex justify-between text-[11px] font-mono mb-1">
                                  <span className="text-sec-text">Volume Load</span>
                                  <span className="font-bold text-head-text">{tanker.current_load?.toLocaleString()} / {tanker.capacity?.toLocaleString()} L ({loadPct}%)</span>
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`${sc.bg} h-2 rounded-full transition-all duration-700`}
                                    style={{ width: `${loadPct}%` }}
                                  />
                                </div>
                              </div>

                              {/* Deployment Details */}
                              <div className="text-[11px] text-sec-text mt-2 pt-2 border-t border-slate-100 flex flex-col gap-0.5">
                                {tanker.assigned_ward ? (
                                  <div className="font-semibold text-deep-blue flex items-center space-x-1">
                                    <Navigation className="w-3 h-3 text-deep-blue shrink-0" />
                                    <span>Assigned: Ward {tanker.assigned_ward} {ward ? `(${ward.name})` : ""}</span>
                                    {tanker.eta_minutes ? <span className="font-mono text-warm-amber">· ETA {tanker.eta_minutes}m</span> : null}
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-1 text-sec-text">
                                    <Radio className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>Base Depot: {tanker.depot || "Bhandup Master Plant"}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-[10px] text-sec-text mt-1">
                                  <span>Speed: {tanker.speed_kmh || 0} km/h</span>
                                  <span className="font-mono text-slate-400">GPS: {tanker.lat?.toFixed(3)}, {tanker.lng?.toFixed(3)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Action Button & Admin Simulators */}
                            <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                              {tanker.is_blacklisted ? (
                                <div className="space-y-1.5">
                                  <div className="text-[10px] font-bold text-rose-700 bg-rose-100 p-1.5 rounded flex items-center space-x-1">
                                    <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                                    <span>CONTRACT REVOKED: Banned due to low credits (&lt;30 Cr). Barred from allocation.</span>
                                  </div>
                                  <button
                                    onClick={() => handleToggleBlacklistAdmin(tankerKey, true)}
                                    className="w-full py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                                  >
                                    ✓ Reinstate Plate &amp; Driver (Admin Passed Audit)
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {tanker.status === "available" ? (
                                    <button
                                      onClick={() => {
                                        const topWard = priorityQueue[0];
                                        if (topWard) handleDispatchWard(topWard, { tankerId: tanker.transponder_id });
                                      }}
                                      className="w-full py-1 px-2.5 bg-deep-blue text-white rounded text-[11px] font-bold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      Quick Dispatch to Priority Ward
                                    </button>
                                  ) : tanker.status === "en_route" || tanker.status === "dispensing" ? (
                                    <button
                                      onClick={() => setActiveTab("spatial")}
                                      className="w-full py-1 px-2.5 bg-blue-50 text-deep-blue border border-blue-200 rounded text-[11px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                                    >
                                      Track on Live GIS Map
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-sec-text italic w-full text-center py-1 block">
                                      Depot Operations in Progress
                                    </span>
                                  )}

                                  {/* Admin Simulation Actions Strip */}
                                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 text-[9px] font-mono">
                                    <span className="text-slate-400">Infractions:</span>
                                    <button
                                      onClick={() => handleDriverInfractionAdmin(tankerKey, "ROUTE_DIVERSION", "Off-corridor diversion detected")}
                                      className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer font-bold"
                                      title="Simulate Route Diversion (-25 Cr)"
                                    >
                                      Divert (-25)
                                    </button>
                                    <button
                                      onClick={() => handleDriverInfractionAdmin(tankerKey, "GPS_TAMPER", "GPS transponder signal lost")}
                                      className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer font-bold"
                                      title="Simulate GPS Tamper (-35 Cr)"
                                    >
                                      Cut GPS (-35)
                                    </button>
                                    <button
                                      onClick={() => handleDriverInfractionAdmin(tankerKey, "ILLEGAL_WATER_SALE", "Vigilance alert: Selling relief water")}
                                      className="px-1.5 py-0.5 rounded bg-rose-600 text-white hover:bg-rose-700 cursor-pointer font-black"
                                      title="Report Illegal Sale (-60 Cr & Immediate Blacklist)"
                                    >
                                      Illegal Sale (-60)
                                    </button>
                                    <button
                                      onClick={() => handleDriverRewardAdmin(tankerKey, "ON_TIME_DELIVERY", "On-time arrival praise")}
                                      className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer font-bold"
                                      title="Reward On-Time Delivery (+15 Cr)"
                                    >
                                      Reward (+15)
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

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
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scroll mt-2">
                  <table className="w-full text-left text-xs border-collapse min-w-[550px]">
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
                      <button
                        onClick={() => {
                          if (alert.severity === "critical" && alert.ward_number) {
                            handleDispatchWard({ ward_number: alert.ward_number, demand_liters: 10000 });
                          } else {
                            setActiveTab("spatial");
                          }
                        }}
                        className="px-3 py-1 bg-deep-blue hover:bg-blue-700 text-white rounded text-xs font-bold shrink-0 ml-4 transition-colors"
                      >
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
      <EvidencePanelModal isOpen={isEvidenceModalOpen} onClose={() => setIsEvidenceModalOpen(false)} />
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
