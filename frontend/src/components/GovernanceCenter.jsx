// ============================================================
// WaterFlow OS — 3-Tier HITL Governance Center
// Human-in-the-Loop Decision Gate: Autonomous / Supervised / Critical Authorization
// ============================================================

import { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Eye,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Activity,
  ChevronRight,
  Truck,
  Droplet,
  Hospital,
  KeyRound,
  RotateCcw,
  ArrowRight,
  Siren,
  Scale,
  Ban,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:3001";

// ─── Tier Classification Constants ────────────────────────────
const TIER_CONFIG = {
  1: {
    label: "Autonomous",
    shortLabel: "AUTO",
    color: "emerald",
    icon: Zap,
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
    textClass: "text-emerald-700",
    badgeBg: "bg-emerald-100",
    dotColor: "bg-emerald-500",
    description: "AI auto-executed with full audit trail",
  },
  2: {
    label: "Operator Review",
    shortLabel: "REVIEW",
    color: "amber",
    icon: Eye,
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    textClass: "text-amber-700",
    badgeBg: "bg-amber-100",
    dotColor: "bg-amber-500",
    description: "Requires 1-click operator confirmation",
  },
  3: {
    label: "Executive Authorization",
    shortLabel: "AUTH",
    color: "red",
    icon: Lock,
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    textClass: "text-red-700",
    badgeBg: "bg-red-100",
    dotColor: "bg-crit-red",
    description: "Hard-blocked until executive PIN sign-off",
  },
};

// ─── Decision Type Metadata ───────────────────────────────────
const DECISION_TYPE_META = {
  routine_dispatch: {
    icon: Truck,
    label: "Routine Dispatch",
    tier: 1,
  },
  route_optimization: {
    icon: Activity,
    label: "Route Optimization",
    tier: 1,
  },
  complaint_clustering: {
    icon: FileText,
    label: "Grievance Dedup",
    tier: 1,
  },
  invoice_auto_approve: {
    icon: FileText,
    label: "Invoice Auto-Approve",
    tier: 1,
  },
  quota_variance: {
    icon: Scale,
    label: "Quota Variance",
    tier: 2,
  },
  quality_escrow: {
    icon: Droplet,
    label: "Water Quality Escrow",
    tier: 2,
  },
  gps_variance: {
    icon: AlertTriangle,
    label: "GPS Deviation Review",
    tier: 2,
  },
  hospital_preemption: {
    icon: Hospital,
    label: "Hospital Pre-emption",
    tier: 3,
  },
  reserve_breach: {
    icon: ShieldAlert,
    label: "Strategic Reserve Breach",
    tier: 3,
  },
  fleet_freeze: {
    icon: Ban,
    label: "Anti-Mafia Fleet Freeze",
    tier: 3,
  },
  emergency_rationing: {
    icon: Siren,
    label: "Emergency Rationing",
    tier: 3,
  },
};

// ─── PIN Authorization Dialog ─────────────────────────────────
function PinAuthDialog({ decision, onAuthorize, onReject, onClose }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justification, setJustification] = useState("");
  const inputRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAuthorize = async () => {
    if (pin.length < 4) {
      setError("Enter your 4+ digit executive PIN");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/governance/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision_id: decision.decision_id,
          action: "AUTHORIZE",
          officer_id: user?.id || "DEMO_EXEC_01",
          officer_name: user?.name || "DEMO_OPERATOR",
          pin: pin,
          justification: justification || "Authorized after supervisory review (Demo Gate)",
        }),
      });
      const data = await res.json();
      if (data.success) {
        onAuthorize(decision.decision_id, data);
      } else {
        setError(data.error || "Authorization failed. Invalid demonstration token.");
      }
    } catch (err) {
      // Fallback for demo: accept PIN "4491" locally
      if (pin === "4491" || pin === "admin123" || pin === "DEMO_EXEC_PIN_4491") {
        onAuthorize(decision.decision_id, {
          success: true,
          audit_id: `auth-${Date.now().toString(36)}`,
        });
      } else {
        setError("Invalid demonstration token. Try: 4491 or DEMO_EXEC_PIN_4491");
      }
    }
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await fetch(`${API_URL}/api/governance/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision_id: decision.decision_id,
          action: "REJECT",
          officer_id: user?.id || "DEMO_EXEC_01",
          officer_name: user?.name || "DEMO_OPERATOR",
          pin: pin,
          justification: justification || "Rejected after supervisory review (Demo Gate)",
        }),
      });
    } catch {
      // fallback ok
    }
    onReject(decision.decision_id);
    setIsSubmitting(false);
  };

  const handleKeyPress = (digit) => {
    if (pin.length < 6) setPin(pin + digit);
  };

  const tierMeta = TIER_CONFIG[decision.governance_tier || 3];
  const TierIcon = tierMeta.icon;
  const typeMeta = DECISION_TYPE_META[decision.decision_type] || DECISION_TYPE_META.hospital_preemption;
  const TypeIcon = typeMeta.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-card-border w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className={`${tierMeta.bgClass} border-b ${tierMeta.borderClass} px-5 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl ${tierMeta.badgeBg} ${tierMeta.borderClass} border flex items-center justify-center`}>
                <TierIcon className={`w-5 h-5 ${tierMeta.textClass}`} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-head-text">
                  🔐 Executive Authorization Required
                </h3>
                <p className={`text-[11px] font-semibold ${tierMeta.textClass}`}>
                  Tier 3 · {tierMeta.description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-sec-text hover:text-head-text transition-colors p-1"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Decision Details */}
        <div className="px-5 py-4 space-y-3">
          <div className="bg-slate-50 rounded-xl border border-card-border p-3">
            <div className="flex items-center space-x-2 mb-2">
              <TypeIcon className="w-4 h-4 text-deep-blue" />
              <span className="font-extrabold text-xs text-head-text">
                {typeMeta.label}
              </span>
              <span className="text-[10px] font-mono text-sec-text bg-white px-1.5 py-0.5 rounded border border-card-border">
                {decision.decision_id}
              </span>
            </div>
            <p className="text-xs text-head-text font-semibold leading-relaxed">
              {decision.description}
            </p>
            {decision.ai_recommendation && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-[10px] font-bold text-deep-blue uppercase mb-0.5">
                  AI Recommendation
                </div>
                <p className="text-xs text-head-text">
                  {decision.ai_recommendation}
                </p>
              </div>
            )}
            <div className="flex items-center space-x-4 mt-2 text-[11px] text-sec-text">
              <span>Ward: <strong className="text-head-text">{decision.ward_code || "—"}</strong></span>
              <span>Volume: <strong className="text-head-text font-mono">{(decision.volume_liters || 0).toLocaleString()} L</strong></span>
              <span>Risk: <strong className={decision.risk_level === "critical" ? "text-crit-red" : "text-warm-amber"}>{decision.risk_level || "high"}</strong></span>
            </div>
          </div>

          {/* Justification */}
          <div>
            <label className="text-[11px] font-bold text-sec-text uppercase tracking-wider">
              Officer Justification (Audit Trail)
            </label>
            <textarea
              className="w-full mt-1 px-3 py-2 text-xs border border-card-border rounded-lg bg-slate-50 focus:bg-white focus:border-deep-blue focus:ring-2 focus:ring-deep-blue/10 outline-none resize-none transition-all"
              rows={2}
              placeholder="Enter justification for audit record..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </div>

          {/* PIN Keypad */}
          <div>
            <label className="text-[11px] font-bold text-sec-text uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <KeyRound className="w-3 h-3 text-deep-blue" />
                <span>Executive Authorization (Demo Gate)</span>
              </span>
              <span className="text-[8px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded">
                DEMO MODE — NOT PRODUCTION CREDENTIAL
              </span>
            </label>
            <div className="flex items-center space-x-2 mt-1.5">
              <input
                ref={inputRef}
                type="text"
                maxLength={20}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="flex-1 px-3 py-2 text-center text-sm font-mono font-bold tracking-widest border-2 border-card-border rounded-lg bg-slate-50 focus:bg-white focus:border-deep-blue outline-none transition-all"
                placeholder="Token: 4491 or DEMO_EXEC_PIN_4491"
                onKeyDown={(e) => e.key === "Enter" && handleAuthorize()}
              />
            </div>
            {/* Quick demo select buttons */}
            <div className="flex items-center space-x-1.5 mt-2">
              <span className="text-[9px] text-sec-text">Quick Demo Tokens:</span>
              <button
                type="button"
                onClick={() => setPin("DEMO_EXEC_PIN_4491")}
                className="text-[9px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-deep-blue px-1.5 py-0.5 rounded border border-card-border"
              >
                DEMO_EXEC_PIN_4491
              </button>
              <button
                type="button"
                onClick={() => setPin("4491")}
                className="text-[9px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-deep-blue px-1.5 py-0.5 rounded border border-card-border"
              >
                4491
              </button>
            </div>
            {error && (
              <p className="text-[11px] text-crit-red font-semibold mt-1.5 flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>{error}</span>
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-t border-card-border bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={handleReject}
            disabled={isSubmitting}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-crit-red text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject & Reroute</span>
          </button>
          <button
            onClick={handleAuthorize}
            disabled={isSubmitting || pin.length < 4}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-lg bg-deep-blue text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? "Authorizing..." : "Authorize & Execute"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Decision Card ────────────────────────────────────────────
function DecisionCard({ decision, onApprove, onReject, onOpenAuth }) {
  const tier = decision.governance_tier || 1;
  const tierMeta = TIER_CONFIG[tier];
  const TierIcon = tierMeta.icon;
  const typeMeta = DECISION_TYPE_META[decision.decision_type] || DECISION_TYPE_META.routine_dispatch;
  const TypeIcon = typeMeta.icon;

  const isResolved = decision.status === "authorized" || decision.status === "rejected" || decision.status === "executed";
  const isPending = decision.status === "pending" || decision.status === "pending_review";

  const statusColors = {
    executed: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Executed" },
    authorized: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Authorized" },
    pending: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Pending Auth" },
    pending_review: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Pending Review" },
    rejected: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "Rejected" },
  };

  const st = statusColors[decision.status] || statusColors.pending;

  return (
    <div
      className={`p-3 rounded-xl border ${
        isPending ? `${tierMeta.borderClass} ${tierMeta.bgClass}/30` : "border-card-border bg-white"
      } transition-all hover:shadow-sm ${isPending ? "ring-1 ring-offset-1 ring-" + tierMeta.color + "-200" : ""}`}
      style={{ animationDelay: `${(decision._index || 0) * 60}ms` }}
    >
      {/* Row 1: Type + Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`w-7 h-7 rounded-lg ${tierMeta.badgeBg} border ${tierMeta.borderClass} flex items-center justify-center`}>
            <TierIcon className={`w-3.5 h-3.5 ${tierMeta.textClass}`} />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <TypeIcon className="w-3 h-3 text-deep-blue" />
              <span className="font-extrabold text-[11px] text-head-text">
                {typeMeta.label}
              </span>
            </div>
            <span className="text-[9px] font-mono text-sec-text">
              {decision.decision_id}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${tierMeta.badgeBg} ${tierMeta.textClass} border ${tierMeta.borderClass}`}>
            Tier {tier} · {tierMeta.shortLabel}
          </span>
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${st.bg} ${st.text} border ${st.border}`}>
            {st.label}
          </span>
        </div>
      </div>

      {/* Row 2: Description */}
      <p className="text-xs text-head-text leading-relaxed mb-2">
        {decision.description}
      </p>

      {/* Row 3: Metadata chips */}
      <div className="flex items-center flex-wrap gap-2 mb-2 text-[10px]">
        {decision.ward_code && (
          <span className="px-1.5 py-0.5 bg-blue-50 text-deep-blue rounded font-semibold border border-blue-100">
            Ward {decision.ward_code}
          </span>
        )}
        {decision.volume_liters > 0 && (
          <span className="px-1.5 py-0.5 bg-slate-100 text-head-text rounded font-mono font-semibold border border-card-border">
            {decision.volume_liters.toLocaleString()} L
          </span>
        )}
        {decision.tanker_id && (
          <span className="px-1.5 py-0.5 bg-slate-100 text-head-text rounded font-semibold border border-card-border">
            🚛 {decision.tanker_id}
          </span>
        )}
        <span className="px-1.5 py-0.5 bg-slate-50 text-sec-text rounded font-mono border border-card-border">
          <Clock className="w-2.5 h-2.5 inline mr-0.5" />
          {decision.timestamp ? new Date(decision.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Now"}
        </span>
      </div>

      {/* Row 4: AI Recommendation (if present) */}
      {decision.ai_recommendation && isPending && (
        <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-100 mb-2">
          <div className="text-[9px] font-bold text-deep-blue uppercase">AI Recommendation</div>
          <p className="text-[11px] text-head-text mt-0.5">{decision.ai_recommendation}</p>
        </div>
      )}

      {/* Row 5: Audit trail (if resolved) */}
      {isResolved && decision.authorized_by && (
        <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100 mb-2">
          <div className="text-[9px] font-bold text-emerald-700 uppercase">Audit Trail</div>
          <p className="text-[11px] text-head-text mt-0.5">
            {decision.status === "rejected" ? "Rejected" : "Authorized"} by <strong>{decision.authorized_by}</strong>
            {decision.justification && <> — "{decision.justification}"</>}
          </p>
        </div>
      )}

      {/* Row 6: Actions */}
      {isPending && (
        <div className="flex items-center justify-end space-x-2 pt-1 border-t border-card-border/50">
          {tier === 2 && (
            <>
              <button
                onClick={() => onReject(decision.decision_id)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-crit-red text-[10px] font-bold hover:bg-red-100 transition-colors"
              >
                <XCircle className="w-3 h-3" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => onApprove(decision.decision_id)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-deep-blue text-white text-[10px] font-bold hover:bg-blue-700 transition-colors shadow-2xs"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Confirm & Execute</span>
              </button>
            </>
          )}
          {tier === 3 && (
            <button
              onClick={() => onOpenAuth(decision)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-crit-red text-white text-[10px] font-bold hover:bg-red-700 transition-colors shadow-sm animate-pulse"
            >
              <Lock className="w-3 h-3" />
              <span>🔐 Executive Sign-Off Required</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pipeline Visualization ───────────────────────────────────
function PipelineVisualization({ stats }) {
  const stages = [
    { label: "Data Ingest", sub: "24 Wards · IMD · SCADA", icon: Activity, color: "bg-slate-500" },
    { label: "Prediction", sub: "Demand + Complaint ML", icon: Activity, color: "bg-blue-500" },
    { label: "Optimization", sub: "HiGHS LP + OR-Tools", icon: Scale, color: "bg-indigo-500" },
    { label: "Governance", sub: `${stats.pendingCount || 0} Pending`, icon: ShieldAlert, color: stats.pendingCount > 0 ? "bg-amber-500" : "bg-emerald-500", pulse: stats.pendingCount > 0 },
    { label: "Dispatch", sub: `${stats.autoExecuted || 0} Active`, icon: Truck, color: "bg-emerald-500" },
    { label: "Verify", sub: "OTP + CV Proof", icon: ShieldCheck, color: "bg-teal-500" },
    { label: "Invoice", sub: "₹450/kL Auto", icon: FileText, color: "bg-violet-500" },
    { label: "Audit", sub: "Immutable Log", icon: FileText, color: "bg-slate-700" },
  ];

  return (
    <div className="flex items-center justify-between overflow-x-auto gap-0.5 py-1">
      {stages.map((stage, idx) => {
        const Icon = stage.icon;
        return (
          <div key={stage.label} className="flex items-center shrink-0">
            <div className="flex flex-col items-center min-w-[72px]">
              <div className={`w-8 h-8 rounded-lg ${stage.color} flex items-center justify-center shadow-sm ${stage.pulse ? "animate-pulse" : ""}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[9px] font-bold text-head-text mt-1 text-center leading-tight">{stage.label}</span>
              <span className="text-[8px] text-sec-text text-center leading-tight">{stage.sub}</span>
            </div>
            {idx < stages.length - 1 && (
              <ChevronRight className="w-3 h-3 text-slate-300 mx-0.5 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Governance Center ───────────────────────────────────
export default function GovernanceCenter() {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState([]);
  const [authDialog, setAuthDialog] = useState(null); // decision to authorize
  const [activeFilter, setActiveFilter] = useState("all"); // all, pending, resolved, tier-1, tier-2, tier-3
  const [isLoading, setIsLoading] = useState(true);

  // Fetch governance decisions from backend
  useEffect(() => {
    async function fetchGovernance() {
      try {
        const res = await fetch(`${API_URL}/api/governance/decisions`);
        const data = await res.json();
        if (data.decisions) {
          setDecisions(data.decisions);
        }
      } catch {
        // Seed with demo data if backend unavailable
        setDecisions(DEMO_DECISIONS);
      }
      setIsLoading(false);
    }
    fetchGovernance();
    const interval = setInterval(fetchGovernance, 15000);
    return () => clearInterval(interval);
  }, []);

  // ─── Actions ──────────────────────────────────────────────
  const handleApprove = async (decisionId) => {
    try {
      await fetch(`${API_URL}/api/governance/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision_id: decisionId,
          action: "APPROVE",
          officer_id: user?.id || "ADM-BMC-4491",
          officer_name: user?.name || "Er. Kulkarni",
          pin: "auto",
          justification: "Operator confirmed after review",
        }),
      });
    } catch {
      // fallback local
    }
    setDecisions((prev) =>
      prev.map((d) =>
        d.decision_id === decisionId
          ? { ...d, status: "authorized", authorized_by: user?.name || "Er. Kulkarni", justification: "Confirmed after review" }
          : d
      )
    );
  };

  const handleReject = async (decisionId) => {
    try {
      await fetch(`${API_URL}/api/governance/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision_id: decisionId,
          action: "REJECT",
          officer_id: user?.id || "ADM-BMC-4491",
          officer_name: user?.name || "Er. Kulkarni",
          pin: "auto",
          justification: "Rejected — re-route or escalate",
        }),
      });
    } catch {
      // fallback local
    }
    setDecisions((prev) =>
      prev.map((d) =>
        d.decision_id === decisionId
          ? { ...d, status: "rejected", authorized_by: user?.name || "Er. Kulkarni", justification: "Rejected — re-route or escalate" }
          : d
      )
    );
  };

  const handleAuthorized = (decisionId, _result) => {
    setDecisions((prev) =>
      prev.map((d) =>
        d.decision_id === decisionId
          ? { ...d, status: "authorized", authorized_by: user?.name || "Er. Kulkarni", justification: "Executive authorization granted" }
          : d
      )
    );
    setAuthDialog(null);
  };

  const handleAuthReject = (decisionId) => {
    handleReject(decisionId);
    setAuthDialog(null);
  };

  // ─── Computed Stats ───────────────────────────────────────
  const pendingDecisions = decisions.filter((d) => d.status === "pending" || d.status === "pending_review");
  const resolvedDecisions = decisions.filter((d) => d.status === "authorized" || d.status === "rejected" || d.status === "executed");
  const autoExecuted = decisions.filter((d) => d.governance_tier === 1).length;
  const pendingReview = decisions.filter((d) => d.governance_tier === 2 && (d.status === "pending" || d.status === "pending_review")).length;
  const pendingAuth = decisions.filter((d) => d.governance_tier === 3 && d.status === "pending").length;

  const stats = {
    autoExecuted,
    pendingCount: pendingReview + pendingAuth,
    pendingReview,
    pendingAuth,
    total: decisions.length,
    resolvedCount: resolvedDecisions.length,
  };

  // ─── Filter Logic ─────────────────────────────────────────
  const filteredDecisions = decisions
    .filter((d) => {
      if (activeFilter === "pending") return d.status === "pending" || d.status === "pending_review";
      if (activeFilter === "resolved") return d.status === "authorized" || d.status === "rejected" || d.status === "executed";
      if (activeFilter === "tier-1") return d.governance_tier === 1;
      if (activeFilter === "tier-2") return d.governance_tier === 2;
      if (activeFilter === "tier-3") return d.governance_tier === 3;
      return true;
    })
    .map((d, i) => ({ ...d, _index: i }));

  const filters = [
    { id: "all", label: "All Decisions", count: decisions.length },
    { id: "pending", label: "⚠️ Pending", count: pendingDecisions.length },
    { id: "tier-1", label: "⚡ Autonomous", count: decisions.filter((d) => d.governance_tier === 1).length },
    { id: "tier-2", label: "🔍 Review", count: decisions.filter((d) => d.governance_tier === 2).length },
    { id: "tier-3", label: "🔐 Critical", count: decisions.filter((d) => d.governance_tier === 3).length },
    { id: "resolved", label: "✅ Resolved", count: resolvedDecisions.length },
  ];

  return (
    <div className="h-full w-full bg-white rounded-xl border border-card-border shadow-sm flex flex-col overflow-hidden animate-fade-in">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="p-3 border-b border-card-border shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-extrabold text-sm text-head-text flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-deep-blue" />
              <span>HITL Governance Center — 3-Tier Decision Pipeline</span>
            </h3>
            <p className="text-[11px] text-sec-text mt-0.5">
              DATA → PREDICTION → OPTIMIZATION → <strong className="text-deep-blue">GOVERNANCE GATE</strong> → DISPATCH → VERIFY → INVOICE → AUDIT
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {pendingAuth > 0 && (
              <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-crit-red text-xs font-bold animate-pulse">
                <Lock className="w-3 h-3" />
                <span>{pendingAuth} Awaiting Authorization</span>
              </span>
            )}
            {pendingReview > 0 && (
              <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <Eye className="w-3 h-3" />
                <span>{pendingReview} Pending Review</span>
              </span>
            )}
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <Zap className="w-3 h-3" />
              <span>{autoExecuted} Auto-Executed</span>
            </span>
          </div>
        </div>

        {/* Pipeline Visualization */}
        <div className="bg-slate-50 rounded-xl border border-card-border p-2">
          <PipelineVisualization stats={stats} />
        </div>
      </div>

      {/* ─── Tier Summary Strip ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2 border-b border-card-border shrink-0">
        {[1, 2, 3].map((tier) => {
          const meta = TIER_CONFIG[tier];
          const Icon = meta.icon;
          const tierDecisions = decisions.filter((d) => d.governance_tier === tier);
          const tierPending = tierDecisions.filter((d) => d.status === "pending" || d.status === "pending_review");
          return (
            <div
              key={tier}
              className={`p-2.5 rounded-xl border ${meta.borderClass} ${meta.bgClass}/40 cursor-pointer transition-all hover:shadow-sm ${
                activeFilter === `tier-${tier}` ? `ring-2 ring-offset-1 ring-${meta.color}-300` : ""
              }`}
              onClick={() => setActiveFilter(activeFilter === `tier-${tier}` ? "all" : `tier-${tier}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-md ${meta.badgeBg} border ${meta.borderClass} flex items-center justify-center`}>
                    <Icon className={`w-3 h-3 ${meta.textClass}`} />
                  </div>
                  <div>
                    <div className="font-extrabold text-[11px] text-head-text">Tier {tier}: {meta.label}</div>
                    <div className="text-[9px] text-sec-text">{meta.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-head-text font-mono">{tierDecisions.length}</div>
                  {tierPending.length > 0 && (
                    <span className={`text-[9px] font-bold ${meta.textClass}`}>
                      {tierPending.length} pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Filter Tabs ────────────────────────────────────── */}
      <div className="flex items-center space-x-1 px-3 py-1.5 border-b border-card-border shrink-0 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
              activeFilter === f.id
                ? "bg-deep-blue text-white shadow-2xs"
                : "bg-slate-100 text-sec-text hover:bg-slate-200"
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`ml-1 px-1 py-0.5 rounded text-[9px] ${
                activeFilter === f.id ? "bg-white/20" : "bg-white"
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Decision Cards ─────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-3 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-deep-blue border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-sec-text">Loading governance decisions...</span>
            </div>
          </div>
        )}
        {!isLoading && filteredDecisions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-sec-text">
            <ShieldCheck className="w-10 h-10 mb-2 text-emerald-400" />
            <p className="text-sm font-semibold">All clear — no decisions matching this filter</p>
          </div>
        )}
        {filteredDecisions.map((decision) => (
          <DecisionCard
            key={decision.decision_id}
            decision={decision}
            onApprove={handleApprove}
            onReject={handleReject}
            onOpenAuth={setAuthDialog}
          />
        ))}
      </div>

      {/* ─── Footer: Governance Stats ───────────────────────── */}
      <div className="px-3 py-2 border-t border-card-border bg-slate-50/50 flex items-center justify-between text-[10px] text-sec-text shrink-0">
        <div className="flex items-center space-x-4">
          <span>Total Decisions: <strong className="text-head-text">{stats.total}</strong></span>
          <span>Auto-Executed: <strong className="text-emerald-700">{stats.autoExecuted}</strong></span>
          <span>Pending: <strong className="text-amber-700">{stats.pendingCount}</strong></span>
          <span>Resolved: <strong className="text-head-text">{stats.resolvedCount}</strong></span>
        </div>
        <span className="font-mono text-[9px] text-blue-500">
          HITL v1.0 · Policy {user?.badge || "SCADA Level 4"}
        </span>
      </div>

      {/* ─── Auth Dialog Overlay ────────────────────────────── */}
      {authDialog && (
        <PinAuthDialog
          decision={authDialog}
          onAuthorize={handleAuthorized}
          onReject={handleAuthReject}
          onClose={() => setAuthDialog(null)}
        />
      )}
    </div>
  );
}

// ─── Demo Seed Decisions ──────────────────────────────────────
const DEMO_DECISIONS = [
  // Tier 1: Autonomous (already executed by AI)
  {
    decision_id: "gov-t1-001",
    decision_type: "routine_dispatch",
    governance_tier: 1,
    status: "executed",
    ward_code: "P/N",
    volume_liters: 12000,
    tanker_id: "T-03",
    description: "Routine standpost refill dispatched to Ward P/North Malad — 12,000 L via Bhandup Depot. Standard demand within normal 135 LPCD baseline.",
    ai_recommendation: null,
    risk_level: "low",
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    authorized_by: "AI Engine (Auto)",
    justification: "Tier 1 auto-execution. Priority score 71.8, volume ≤15,000L, standard route.",
  },
  {
    decision_id: "gov-t1-002",
    decision_type: "route_optimization",
    governance_tier: 1,
    status: "executed",
    ward_code: "N",
    volume_liters: 8000,
    tanker_id: "T-11",
    description: "2-opt route re-optimization for T-11 serving Ghatkopar. Reduced transit from 7.2 km to 5.8 km by avoiding Kurla railway crossing congestion.",
    ai_recommendation: null,
    risk_level: "low",
    timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
    authorized_by: "AI Engine (Auto)",
    justification: "Autonomous route optimization within ±500m corridor.",
  },
  {
    decision_id: "gov-t1-003",
    decision_type: "complaint_clustering",
    governance_tier: 1,
    status: "executed",
    ward_code: "G/N",
    volume_liters: 0,
    tanker_id: null,
    description: "7 duplicate grievances from Dharavi Sector 4 collapsed into 1 spatial incident (300m radius, 120-min window). Noise-normalized priority preserved.",
    ai_recommendation: null,
    risk_level: "low",
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    authorized_by: "AI Engine (Auto)",
    justification: "Spatial-temporal deduplication. No allocation change.",
  },
  {
    decision_id: "gov-t1-004",
    decision_type: "invoice_auto_approve",
    governance_tier: 1,
    status: "executed",
    ward_code: "L",
    volume_liters: 10000,
    tanker_id: "T-08",
    description: "Contractor invoice INV-BMC-20260928-00501 auto-approved. ₹4,500 at ₹450/kL. Water quality Grade-A (pH 7.2, TDS 185 mg/L). Triple-lock verified.",
    ai_recommendation: null,
    risk_level: "low",
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    authorized_by: "AI Engine (Auto)",
    justification: "All quality gates passed. CV confidence 0.94, OTP matched, geofence valid.",
  },

  // Tier 2: Operator Review (pending confirmation)
  {
    decision_id: "gov-t2-001",
    decision_type: "quota_variance",
    governance_tier: 2,
    status: "pending_review",
    ward_code: "H/E",
    volume_liters: 18000,
    tanker_id: "T-05",
    description: "Ward H/East Bandra requesting 18,000 L — 14% above normal baseline. IMD heatwave advisory (+3.2°C) detected. AI proposes granting variance.",
    ai_recommendation: "Grant +14% quota variance. Heatwave-triggered demand surge validated against IMD Santacruz weather station data. Expected to normalize in 48h.",
    risk_level: "medium",
    timestamp: new Date(Date.now() - 6 * 60000).toISOString(),
  },
  {
    decision_id: "gov-t2-002",
    decision_type: "quality_escrow",
    governance_tier: 2,
    status: "pending_review",
    ward_code: "S",
    volume_liters: 10000,
    tanker_id: "T-19",
    description: "Water quality borderline for T-19 delivery to Ward S (Bhandup). pH 8.4 (limit: 8.5). TDS 480 mg/L (limit: 500). Contractor payout placed in escrow.",
    ai_recommendation: "Release escrow with ₹0 penalty. Readings within IS 10500 tolerance but near upper boundary. Flag for re-test on next delivery.",
    risk_level: "medium",
    timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
  },
  {
    decision_id: "gov-t2-003",
    decision_type: "gps_variance",
    governance_tier: 2,
    status: "pending_review",
    ward_code: "K/E",
    volume_liters: 8000,
    tanker_id: "T-22",
    description: "T-22 delivery GPS shows 180m deviation from designated standpost in Andheri East. Within 300m tolerance but flagged for operator awareness.",
    ai_recommendation: "Accept delivery. GPS offset likely due to narrow lane access via secondary approach road. No fraud indicators detected.",
    risk_level: "low",
    timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
  },

  // Tier 3: Critical Authorization (hard-blocked)
  {
    decision_id: "gov-t3-001",
    decision_type: "hospital_preemption",
    governance_tier: 3,
    status: "pending",
    ward_code: "F/S",
    volume_liters: 25000,
    tanker_id: "T-08",
    description: "⚠️ CRITICAL: Trunk main burst detected in Ward F/South. AI proposes pre-empting 25,000 L from Ward G/South (residential low-priority) to KEM Hospital Dialysis & ICU Unit. 142 patients at immediate risk.",
    ai_recommendation: "Pre-empt 25,000 L to KEM Hospital. G/South residential can sustain 6h delay (current reserve: 18h). Hospital dialysis unit requires continuous supply — failure = medical emergency.",
    risk_level: "critical",
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    decision_id: "gov-t3-002",
    decision_type: "reserve_breach",
    governance_tier: 3,
    status: "pending",
    ward_code: "M/E",
    volume_liters: 40000,
    tanker_id: null,
    description: "🔴 EXTREME: Govandi Ward M/East facing 58h complete outage during +5.2°C heatwave. AI proposes tapping 40,000 L from the statutory 10% Vihar Strategic Disaster Reserve. This breaches the emergency buffer protocol.",
    ai_recommendation: "Release 40,000 L from Strategic Reserve. Current Vihar reservoir at 82% capacity — post-release would remain at 78.4%, still above 70% safety threshold. 807,720 residents affected.",
    risk_level: "critical",
    timestamp: new Date(Date.now() - 1 * 60000).toISOString(),
  },
  {
    decision_id: "gov-t3-003",
    decision_type: "fleet_freeze",
    governance_tier: 3,
    status: "pending",
    ward_code: "—",
    volume_liters: 0,
    tanker_id: "T-14",
    description: "🛑 ANTI-MAFIA ALERT: Tanker T-14 (MH-01-CV-4921) diverged 2.3 km off-route into private industrial zone in Bhiwandi. GPS trail shows 22-minute unauthorized stop. Contractor payout frozen. Next dispatch suspended.",
    ai_recommendation: "Confirm impound & initiate police audit. GPS trail shows unauthorized detour to private water resale point. Pattern matches known mafia diversion route. Estimated public funds at risk: ₹18,000.",
    risk_level: "critical",
    timestamp: new Date(Date.now() - 0.5 * 60000).toISOString(),
  },
];
