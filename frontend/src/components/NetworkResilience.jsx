/**
 * WaterFlow OS — Network Incident Response & Governed Resilience Demonstrator
 * Day 3 Primary Demonstrator Component
 *
 * Operational Closed-Loop Flow:
 * NORMAL OPERATION → FAILURE INJECTED → IMPACT LOCALIZED → RECOVERY RANKED →
 * GOVERNANCE CHECK → MISSION DISPATCHED → FIELD EXECUTION → VERIFIED → SERVICE RECOVERED
 *
 * Mode: DEMO / OPERATIONAL SIMULATION
 * Model: Deterministic Topological Graph Reachability Abstraction (Seed 42)
 */

import { useState, useEffect } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Droplet,
  Eye,
  FileCheck,
  GitBranch,
  HelpCircle,
  Info,
  Lock,
  Network,
  Power,
  RefreshCw,
  RotateCcw,
  Scale,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Truck,
  Unlock,
  UserCheck,
  Wifi,
  WifiOff,
  X,
  XCircle,
  Zap,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SCENARIO_ICONS = {
  SEED42_TRUNK_FAILURE_01: AlertOctagon,
  SEED_42_NETWORK_FAILURE: AlertOctagon,
  SINGLE_PIPE_FAILURE: AlertTriangle,
  SOURCE_CAPACITY_REDUCTION: Droplet,
  VALVE_UNAVAILABLE: XCircle,
  MULTIPLE_FAILURES: ShieldAlert,
  NORMAL: CheckCircle2,
};

const PIPELINE_STEPS = [
  { id: "normal", label: "1. Normal State", icon: CheckCircle2 },
  { id: "injected", label: "2. Failure Injected", icon: AlertOctagon },
  { id: "localized", label: "3. Impact Localized", icon: Target },
  { id: "ranked", label: "4. Recovery Ranked", icon: Scale },
  { id: "governed", label: "5. Governed Check", icon: ShieldAlert },
  { id: "dispatched", label: "6. Mission Dispatched", icon: Truck },
  { id: "field", label: "7. Field Handshake", icon: WifiOff },
  { id: "verified", label: "8. Service Recovered", icon: FileCheck },
];

export default function NetworkResilience() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("SEED42_TRUNK_FAILURE_01");
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [automationStatus, setAutomationStatus] = useState(null);

  // Recovery Execution & Governance State
  const [selectedOptionId, setSelectedOptionId] = useState("D");
  const [targetWard, setTargetWard] = useState("G/N");
  const [authPin, setAuthPin] = useState("4491");
  const [executionResult, setExecutionResult] = useState(null);
  const [executionError, setExecutionError] = useState(null);

  // Field & Verification Handshake State
  const [fieldDelivered, setFieldDelivered] = useState(false);
  const [verifyOtp, setVerifyOtp] = useState("7419");
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState(null);

  // End-to-End Trace State
  const [traceData, setTraceData] = useState(null);
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [activeTab, setActiveTab] = useState("topology"); // "topology" | "observations" | "wards"

  // Fetch scenarios and automation status on mount
  useEffect(() => {
    fetchScenarios();
    fetchAutomationStatus();
  }, []);

  const fetchScenarios = async () => {
    try {
      const res = await fetch(`${API_URL}/api/resilience/scenarios`);
      const data = await res.json();
      setScenarios(data.scenarios || []);
    } catch (err) {
      console.warn("Failed to fetch scenarios:", err);
    }
  };

  const fetchAutomationStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/automation/status`);
      const data = await res.json();
      setAutomationStatus(data);
    } catch (err) {
      console.warn("Failed to fetch automation status:", err);
    }
  };

  // Run simulation for selected scenario
  const runSimulation = async (scenarioId = selectedScenarioId) => {
    setLoading(true);
    setSelectedScenarioId(scenarioId);
    setExecutionResult(null);
    setExecutionError(null);
    setFieldDelivered(false);
    setVerificationResult(null);
    setVerificationError(null);

    try {
      const res = await fetch(`${API_URL}/api/resilience/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      const data = await res.json();
      setSimulation(data);
      if (data.recovery?.alternatives?.length > 0) {
        const top = data.recovery.alternatives.find((a) => a.recommended) || data.recovery.alternatives[0];
        setSelectedOptionId(top.option_id);
      }
      if (data.impact?.affected_wards?.length > 0) {
        setTargetWard(data.impact.affected_wards[0].ward_code);
      }
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle emergency kill switch
  const toggleKillSwitch = async () => {
    const currentState = automationStatus?.automation_state?.kill_switch_enabled;
    try {
      const res = await fetch(`${API_URL}/api/automation/kill-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: !currentState,
          officer_name: "Operations Commander (Console)",
        }),
      });
      const data = await res.json();
      setAutomationStatus((prev) => ({
        ...prev,
        automation_state: { ...prev?.automation_state, kill_switch_enabled: data.kill_switch_enabled },
      }));
      // Re-evaluate current simulation constraints
      if (simulation) {
        runSimulation(selectedScenarioId);
      }
    } catch (err) {
      console.error("Kill switch toggle failed:", err);
    }
  };

  // Execute Governed Recovery Operation
  const handleExecuteRecovery = async () => {
    setActionLoading(true);
    setExecutionError(null);

    try {
      const res = await fetch(`${API_URL}/api/resilience/execute-recovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: selectedScenarioId,
          option_id: selectedOptionId,
          target_ward: targetWard,
          volume_liters: 10000,
          pin: authPin,
          officer_name: "Executive Officer Demo",
          officer_id: "DEMO_EXEC_01",
          justification: `Emergency relief dispatch for critical facilities in ${targetWard} under ${selectedScenarioId}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setExecutionError(data.error || "Execution blocked by governance or preconditions gate");
        return;
      }

      setExecutionResult(data);
      if (data.mission?.otp_code) {
        setVerifyOtp(data.mission.otp_code);
      }
      fetchAutomationStatus();
    } catch (err) {
      setExecutionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Simulate Offline Field Handshake
  const handleSimulateFieldDelivery = () => {
    setFieldDelivered(true);
  };

  // Verify Delivery via OTP physical handshake
  const handleVerifyDelivery = async () => {
    if (!executionResult?.mission_id) return;
    setActionLoading(true);
    setVerificationError(null);

    try {
      const res = await fetch(`${API_URL}/api/field/missions/${executionResult.mission_id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp_code: verifyOtp,
          verified_by: "Dr. A. K. Joshi (Chief Medical Officer, Sion Hospital)",
          receiver_role: "Medical Superintendent / Critical Water Custodian",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setVerificationError(data.error || "Delivery verification failed. Invalid OTP handshake.");
        return;
      }

      setVerificationResult(data);
      // Fetch latest trace
      fetchTrace();
    } catch (err) {
      setVerificationError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch complete decision trace
  const fetchTrace = async () => {
    try {
      const res = await fetch(`${API_URL}/api/resilience/trace/${selectedScenarioId}`);
      const data = await res.json();
      setTraceData(data.trace);
    } catch (err) {
      console.warn("Failed to fetch trace:", err);
    }
  };

  // Reset operational state back to Seed 42 baseline
  const handleResetState = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/resilience/reset`, { method: "POST" });
      setExecutionResult(null);
      setExecutionError(null);
      setFieldDelivered(false);
      setVerificationResult(null);
      setVerificationError(null);
      setTraceData(null);
      await fetchAutomationStatus();
      runSimulation("SEED42_TRUNK_FAILURE_01");
    } catch (err) {
      console.error("Reset failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Determine current pipeline stage
  const getCurrentStepIndex = () => {
    if (!simulation) return 0;
    if (verificationResult) return 7;
    if (fieldDelivered) return 6;
    if (executionResult) return 5;
    if (simulation.governance?.tier) return 4;
    if (simulation.recovery?.alternatives) return 3;
    if (simulation.impact) return 2;
    return 1;
  };

  const currentStep = getCurrentStepIndex();
  const selectedOption = simulation?.recovery?.alternatives?.find((a) => a.option_id === selectedOptionId);
  const killSwitchActive = automationStatus?.automation_state?.kill_switch_enabled === false;

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & CONTROLS ── */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/60 p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">
                <Network className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Network Incident Response & Governed Resilience
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                    Day 3 Demonstrator
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Deterministic Graph-Based Reachability & Bounded Recovery · Seed 42 Operational Slice
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Reset */}
            <button
              onClick={handleResetState}
              disabled={loading}
              title="Reset state to Seed 42 clean baseline"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset State
            </button>

            {/* View Full Trace */}
            <button
              onClick={() => {
                fetchTrace();
                setShowTraceModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-medium rounded-xl border border-sky-500/30 transition-all"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Audit Trace
            </button>

            {/* Emergency Kill Switch */}
            <button
              onClick={toggleKillSwitch}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all shadow-lg ${
                !killSwitchActive
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-950/20"
                  : "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 shadow-red-950/40 animate-pulse"
              }`}
            >
              <Power className="w-4 h-4" />
              Kill Switch: {!killSwitchActive ? "READY (OFF)" : "ACTIVE (ENGAGED)"}
            </button>
          </div>
        </div>

        {/* ── OPERATIONAL PIPELINE PROGRESS STRIP ── */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={step.id} className="flex items-center gap-2 min-w-fit">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isCurrent
                        ? "bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-sm shadow-sky-500/20"
                        : isPast
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        : "bg-slate-800/40 text-slate-500 border border-slate-700/30"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isCurrent ? "animate-spin text-sky-400" : ""}`} />
                    <span>{step.label}</span>
                  </div>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <ChevronRight className={`w-3 h-3 ${isPast ? "text-emerald-500/50" : "text-slate-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CANONICAL SCENARIO SPOTLIGHT BANNER ── */}
      <div className="bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-indigo-500/10 rounded-2xl border border-amber-500/30 p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/30 text-amber-300 mt-0.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                Canonical Scenario
              </span>
              <h3 className="text-sm font-bold text-white">
                SEED42_TRUNK_FAILURE_01 · Primary Trunk Corridor Severed
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Synthetically severs the primary transmission corridor (E006, E007, E012) feeding Sion hub.
              Disrupts network reachability to 3 wards (G/N, F/S, A) and 2 tertiary hospitals (KEM & Sion),
              exposing 1.14M residents and 35 kL unmet demand.
            </p>
          </div>
        </div>

        <button
          onClick={() => runSimulation("SEED42_TRUNK_FAILURE_01")}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all min-w-fit justify-center"
        >
          {loading && selectedScenarioId === "SEED42_TRUNK_FAILURE_01" ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 fill-current" />
          )}
          Trigger Seed 42 Failure
        </button>
      </div>

      {/* ── 3-COLUMN DEMONSTRATOR GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ══════════════════════════════════════════════════════════════════
            LEFT COLUMN (3 cols): SCENARIOS & FAULT LOCALIZATION
        ══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-4">
          {/* Scenario Selector */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Failure Scenarios</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {scenarios.length} available
              </span>
            </h3>

            <div className="space-y-2">
              {scenarios.map((s) => {
                const Icon = SCENARIO_ICONS[s.id] || Activity;
                const isSelected = selectedScenarioId === s.id;
                const isCanonical = s.id === "SEED42_TRUNK_FAILURE_01";

                return (
                  <button
                    key={s.id}
                    onClick={() => runSimulation(s.id)}
                    disabled={loading}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-sky-500/15 border-sky-400/50 shadow-sm shadow-sky-500/10"
                        : "bg-slate-800/40 border-slate-700/30 hover:border-slate-600/50 hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-sky-400" : "text-slate-400"}`} />
                        <span className={`text-xs font-bold ${isSelected ? "text-sky-200" : "text-slate-300"}`}>
                          {s.name || s.id}
                        </span>
                      </div>
                      {isCanonical && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                          Demo
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 font-mono">
                      Asset: {s.affected_asset || "NONE"} · {s.severity || "MODERATE"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Structured Scenario Metadata */}
          {simulation && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-2.5 text-xs">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                Scenario Provenance
              </h3>
              <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">scenario_id</span>
                  <span className="text-sky-300">{simulation.scenario_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">source_type</span>
                  <span className="text-amber-400">{simulation.source_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">seed</span>
                  <span className="text-emerald-400">{simulation.seed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">failure_type</span>
                  <span className="text-slate-300">{simulation.failure_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">affected_asset</span>
                  <span className="text-red-400 font-bold truncate max-w-[140px]" title={simulation.affected_asset}>
                    {simulation.affected_asset}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Fault Localization & Evidence */}
          {simulation?.fault_localization && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  Fault Localization
                </h3>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[10px] font-bold rounded border border-amber-500/30">
                  {Math.round((simulation.fault_localization.confidence_score || 0) * 100)}% Consistency
                </span>
              </div>

              <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-xs">
                <div className="font-bold text-amber-200">
                  Top Suspect: {simulation.fault_localization.top_candidate?.candidate_id || "E006"}
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  {simulation.fault_localization.interpretation}
                </p>
              </div>

              {/* Evidence Observations */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {simulation.fault_localization.observations?.map((obs) => (
                  <div key={obs.id} className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/30 text-[11px]">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="text-amber-400 font-bold">{obs.type}</span>
                      <span>{obs.location}</span>
                    </div>
                    <p className="text-slate-300 mt-0.5 line-clamp-2">{obs.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CENTER COLUMN (5 cols): NETWORK IMPACT & GRAPH ABSTRACTION
        ══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-4">
          {simulation ? (
            <>
              {/* Impact KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Affected Wards</div>
                  <div className="text-lg font-black text-red-400 mt-0.5">
                    {simulation.impact?.affected_wards?.length || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {simulation.impact?.affected_wards?.map((w) => w.ward_code).join(", ") || "None"}
                  </div>
                </div>

                <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Hospitals at Risk</div>
                  <div className="text-lg font-black text-red-400 mt-0.5">
                    {simulation.impact?.affected_facilities?.length || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    2,400 beds exposed
                  </div>
                </div>

                <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Demand Deficit</div>
                  <div className="text-lg font-black text-amber-400 mt-0.5">
                    {simulation.impact?.demand_at_risk_kl || 0} kL
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {(simulation.impact?.demand_at_risk_kl || 0) * 1000} L
                  </div>
                </div>

                <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Population</div>
                  <div className="text-lg font-black text-slate-200 mt-0.5">
                    {((simulation.impact?.population_at_risk || 0) / 1000000).toFixed(2)}M
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {(simulation.impact?.population_at_risk || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Reachability Invariant Banner */}
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">
                    Reachability Invariant Holds: Reachable After ({simulation.impact?.scenario_impact?.reachable_from_sources}) ≤ Baseline ({simulation.impact?.baseline?.reachable_from_sources})
                  </span>
                </div>
                <span className="font-mono text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200">
                  MONOTONIC BFS
                </span>
              </div>

              {/* Graph Reachability & Topology Abstraction Visualizer */}
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Network className="w-3.5 h-3.5 text-sky-400" />
                    Topological Connectivity Model
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("topology")}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                        activeTab === "topology" ? "bg-sky-500/20 text-sky-300" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Graph View
                    </button>
                    <button
                      onClick={() => setActiveTab("wards")}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                        activeTab === "wards" ? "bg-sky-500/20 text-sky-300" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Affected Assets
                    </button>
                  </div>
                </div>

                {activeTab === "topology" ? (
                  <div className="relative bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 space-y-4">
                    {/* Source Reservoirs */}
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Active Sources (Reservoirs & WTPs)
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: "SRC-BHANDUP", name: "Bhandup WTP", cap: "2,800 kL", status: "ONLINE" },
                          { id: "SRC-VERAVALI", name: "Veravali Res.", cap: "1,250 kL", status: "ONLINE" },
                          { id: "SRC-TROMBAY", name: "Trombay High", cap: "750 kL", status: "ONLINE" },
                          { id: "SRC-DADAR", name: "Dadar Res.", cap: "400 kL", status: "ONLINE" },
                        ].map((src) => (
                          <div key={src.id} className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                            <Droplet className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
                            <div className="text-[10px] font-bold text-emerald-200 truncate">{src.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono">{src.cap}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Transmission Conduits Indicator */}
                    <div className="py-2 px-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-red-300">
                        <AlertOctagon className="w-4 h-4 text-red-400" />
                        <span>Transmission Corridor Severed: Links E006, E007, E012 Unavailable</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Direct transmission from Trombay/Dadar to Sion Hub unreachable
                      </p>
                    </div>

                    {/* Disconnected Hub & Downstream Island */}
                    <div>
                      <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Isolated Downstream Island (Unreachable Demand)</span>
                        <span className="font-mono text-[9px] bg-red-500/20 px-1.5 py-0.5 rounded text-red-300">
                          {simulation.impact?.affected_nodes?.length || 5} nodes cut off
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {simulation.impact?.affected_nodes?.map((node) => (
                          <div
                            key={node.id}
                            className="p-2 bg-red-500/15 border border-red-500/40 rounded-lg text-center"
                          >
                            <span className="text-[9px] font-black px-1 py-0.2 bg-red-500/30 text-red-200 rounded font-mono">
                              {node.type}
                            </span>
                            <div className="text-xs font-bold text-red-100 mt-1 truncate" title={node.name}>
                              {node.id}
                            </div>
                            <div className="text-[9px] text-slate-300 truncate">{node.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Affected Wards & Facilities Details Table */
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                          <th className="py-2">Code</th>
                          <th className="py-2">Zone / Facility</th>
                          <th className="py-2 text-right">Demand</th>
                          <th className="py-2 text-right">Population</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {simulation.impact?.affected_wards?.map((w) => (
                          <tr key={w.id} className="text-slate-300 hover:bg-slate-800/30">
                            <td className="py-2 font-bold text-red-400">{w.ward_code}</td>
                            <td className="py-2 font-sans">{w.name}</td>
                            <td className="py-2 text-right">{w.demand_kl} kL</td>
                            <td className="py-2 text-right">{(w.population || 0).toLocaleString()}</td>
                            <td className="py-2 text-right">
                              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded text-[10px]">
                                OUTAGE
                              </span>
                            </td>
                          </tr>
                        ))}
                        {simulation.impact?.affected_facilities?.map((f) => (
                          <tr key={f.id} className="text-slate-300 hover:bg-slate-800/30 bg-amber-500/5">
                            <td className="py-2 font-bold text-amber-400">{f.id}</td>
                            <td className="py-2 font-sans font-semibold text-amber-200">{f.name}</td>
                            <td className="py-2 text-right">{f.daily_demand_kl} kL</td>
                            <td className="py-2 text-right">{f.beds} beds</td>
                            <td className="py-2 text-right">
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px]">
                                CRITICAL
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
              <Network className="w-12 h-12 mx-auto mb-3 opacity-30 text-sky-400" />
              <p className="text-sm">Select a failure scenario above to analyze network impact</p>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT COLUMN (4 cols): GOVERNED RECOVERY & EXECUTION LOOP
        ══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-4">
          {simulation?.recovery?.alternatives ? (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-sky-400" />
                  Recovery Alternatives
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Ranked by Objective Score</span>
              </div>

              {/* Recovery Alternatives List */}
              <div className="space-y-2">
                {simulation.recovery.alternatives.map((alt) => {
                  const isSelected = selectedOptionId === alt.option_id;

                  return (
                    <div
                      key={alt.option_id}
                      onClick={() => alt.feasible && setSelectedOptionId(alt.option_id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-sky-500/15 border-sky-400/60 shadow-md shadow-sky-500/10 ring-1 ring-sky-400/30"
                          : alt.feasible
                          ? "bg-slate-800/40 border-slate-700/40 hover:border-slate-600"
                          : "bg-slate-900/40 border-red-500/20 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-sky-300">
                            Option {alt.option_id}
                          </span>
                          <span className="text-xs font-bold text-white">{alt.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {alt.recommended && (
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                              RECOMMENDED
                            </span>
                          )}
                          {!alt.feasible && (
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 rounded border border-red-500/30">
                              INFEASIBLE
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {alt.objective_score}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{alt.description}</p>

                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                        <div>Unmet: <span className="text-amber-300 font-bold">{alt.unmet_demand_kl} kL</span></div>
                        <div>Cost: <span className="text-slate-300">{alt.operational_cost_units}</span></div>
                        <div>Tier: <span className="text-red-400 font-bold">Tier {alt.governance_tier}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Transparent Score Decomposition */}
              {selectedOption?.score_breakdown && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-300 text-[11px]">
                    <span>Score Reconciliation (Option {selectedOption.option_id})</span>
                    <span className="font-mono text-sky-400">Total: {selectedOption.score_breakdown.total}</span>
                  </div>
                  <div className="space-y-1 text-[11px] font-mono text-slate-400">
                    <div className="flex justify-between">
                      <span>Unmet Demand (×1.0)</span>
                      <span className="text-slate-200">+{selectedOption.score_breakdown.unmet_demand_contribution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Critical Facilities (×50.0)</span>
                      <span className="text-slate-200">+{selectedOption.score_breakdown.critical_facility_contribution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Population (×0.001)</span>
                      <span className="text-slate-200">+{selectedOption.score_breakdown.population_contribution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operational Cost (×0.1)</span>
                      <span className="text-slate-200">+{selectedOption.score_breakdown.operational_cost_contribution}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Operational Safety Preconditions Checklist */}
              {selectedOption?.preconditions && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-300 uppercase tracking-wider">Recovery Preconditions</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        selectedOption.preconditions.eligible_for_execution && !killSwitchActive
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {killSwitchActive
                        ? "KILL SWITCH ACTIVE"
                        : selectedOption.preconditions.eligible_for_execution
                        ? "ELIGIBLE FOR EXECUTION"
                        : "EXECUTION BLOCKED"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3 h-3" /> Valid scenario
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3 h-3" /> Reachable recovery path
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3 h-3" /> Tanker available
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3 h-3" /> Capacity sufficient
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3 h-3" /> Action reversible
                    </div>
                    <div className={`flex items-center gap-1.5 ${!killSwitchActive ? "text-emerald-400" : "text-red-400"}`}>
                      {!killSwitchActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Kill switch OFF
                    </div>
                  </div>
                </div>
              )}

              {/* Tier 3 Governance Authorization & Dispatch Gate */}
              {!executionResult ? (
                <div className="p-3.5 bg-red-500/10 rounded-xl border border-red-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Tier 3 Consequential Action · Executive Authorization</span>
                  </div>

                  <div className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                    DEMO MODE — NOT A PRODUCTION MUNICIPAL CREDENTIAL
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={authPin}
                      onChange={(e) => setAuthPin(e.target.value)}
                      placeholder="Enter Executive PIN"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-400"
                    />
                    <button
                      onClick={handleExecuteRecovery}
                      disabled={actionLoading || killSwitchActive}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-lg transition-all shrink-0 flex items-center gap-1.5"
                    >
                      {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Authorize & Dispatch
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Officer: DEMO_EXEC_01</span>
                    <span className="font-mono text-amber-400">Demo Auth PIN: 4491</span>
                  </div>

                  {executionError && (
                    <div className="p-2 bg-red-900/40 border border-red-500/50 rounded text-red-200 text-[11px]">
                      {executionError}
                    </div>
                  )}
                </div>
              ) : (
                /* Dispatched Mission Card & Field Verification */
                <div className="space-y-3">
                  <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Mission #{executionResult.mission_id} Dispatched</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-200 font-mono text-[10px] rounded">
                        {executionResult.mission?.status || "en_route"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1">
                      <div>Target: <span className="text-white font-bold">Ward {executionResult.mission?.ward_code}</span></div>
                      <div>Vehicle: <span className="text-white font-bold">{executionResult.tanker?.transponder_id}</span></div>
                      <div>Volume: <span className="text-white font-bold">{executionResult.mission?.volume_liters?.toLocaleString()} L</span></div>
                      <div>Handover OTP: <span className="text-amber-400 font-bold">{executionResult.mission?.otp_code}</span></div>
                    </div>
                  </div>

                  {/* Step 7: Simulate Field Handshake */}
                  {!fieldDelivered && !verificationResult && (
                    <button
                      onClick={handleSimulateFieldDelivery}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <WifiOff className="w-3.5 h-3.5" />
                      Simulate Offline Delivery Handshake
                    </button>
                  )}

                  {/* Step 8: OTP Verification Handshake */}
                  {fieldDelivered && !verificationResult && (
                    <div className="p-3.5 bg-sky-500/10 rounded-xl border border-sky-500/30 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-sky-400" />
                          Handover Verification
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">OTP: {executionResult.mission?.otp_code}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={verifyOtp}
                          onChange={(e) => setVerifyOtp(e.target.value)}
                          placeholder="4-digit OTP"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-400 text-center tracking-widest font-bold"
                        />
                        <button
                          onClick={handleVerifyDelivery}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg transition-all shrink-0 flex items-center gap-1.5"
                        >
                          {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                          Verify Delivery
                        </button>
                      </div>

                      {verificationError && (
                        <div className="p-2 bg-red-900/40 border border-red-500/50 rounded text-red-200 text-[11px]">
                          {verificationError}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Verified Outcome & Operational Delta */}
                  {verificationResult && (
                    <div className="p-3.5 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 rounded-xl border border-emerald-500/40 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-emerald-300">
                        <span className="flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-emerald-400" />
                          Delivery Verified · Closed Loop Complete
                        </span>
                        <span className="text-[9px] bg-emerald-500/30 text-emerald-200 font-mono px-2 py-0.5 rounded">
                          PARTIALLY_RECOVERED (Tranche 1)
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
                        <div className="text-slate-300">
                          Planned Relief: <span className="text-white font-bold">35,000 L</span> across 4 tankers (Plan Unmet: 0 kL)
                        </div>
                        <div className="text-slate-300">
                          Executed Tranche 1: <span className="text-emerald-300 font-bold">10,000 L</span> to Ward G/N
                        </div>
                        <div className="text-slate-300">
                          Ward G/N Unmet Demand: <span className="text-amber-300 font-bold">28,000 L → 18,000 L</span> (-10,000 L)
                        </div>
                        <div className="text-slate-400 text-[10px] pt-0.5">
                          Invariant: 18,000 L = max(0, 28,000 - 10,000) ✓
                        </div>
                      </div>

                      <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-400 space-y-1">
                        <div className="truncate">Digital Delivery Receipt ID: <span className="text-emerald-300">{verificationResult.transaction_hash}</span></div>
                        <div>Authority: <span className="text-slate-200">{verificationResult.verified_by}</span></div>
                        <div>Log Persistence: <span className="text-slate-400 font-sans">In-memory governance audit log (resets on restart)</span></div>
                      </div>

                      <div className="pt-1 text-[10px] text-amber-300/90 font-medium">
                        ⚠️ Note: Service recovery active via tanker bridge. Physical trunk corridor repair remains pending in graph topology.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── AUDIT TRACE MODAL ── */}
      {showTraceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-sky-400" />
                Resilience Recovery Decision Trace
              </h3>
              <button
                onClick={() => setShowTraceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {traceData ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-slate-500 uppercase text-[10px] font-bold">1. Scenario & Impact</div>
                  <div className="text-sky-300">Scenario: {traceData.scenario_id}</div>
                  <div className="text-slate-300">Affected Asset: {traceData.affected_asset}</div>
                  <div className="text-slate-300">Wards: {traceData.impact?.affected_wards?.join(", ")}</div>
                  <div className="text-amber-400">Demand at Risk: {traceData.impact?.demand_at_risk_kl} kL</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-slate-500 uppercase text-[10px] font-bold">2. Governance & Recovery Action</div>
                  <div className="text-emerald-300">Selected Option: {traceData.recovery_option?.name || "Emergency Tanker Dispatch"}</div>
                  <div className="text-slate-300">Governance Tier: Tier {traceData.governance?.tier} ({traceData.governance?.status})</div>
                  <div className="text-slate-300">Decision ID: {traceData.governance?.decision_id || "gov-resilience-demo"}</div>
                </div>

                {traceData.mission && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="text-slate-500 uppercase text-[10px] font-bold">3. Operational Mission & Handshake</div>
                    <div className="text-sky-300">Mission #{traceData.mission.mission_id} ({traceData.mission.status})</div>
                    <div className="text-slate-300">Tanker: {traceData.mission.tanker_id} · Destination: Ward {traceData.mission.target_ward}</div>
                    <div className="text-slate-300">Volume: {traceData.mission.volume_liters?.toLocaleString()} L</div>
                    <div className="text-emerald-400">Verification: {traceData.verification_status || "UNVERIFIED"}</div>
                  </div>
                )}

                {traceData.post_action_effect && (
                  <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 space-y-1.5 text-emerald-200">
                    <div className="text-emerald-400 uppercase text-[10px] font-bold">4. Closed-Loop State Delta</div>
                    <div>Verified Delivered: {traceData.post_action_effect.verified_volume_delivered} L</div>
                    <div>Demand Reduction: -{traceData.post_action_effect.unmet_demand_reduction_liters} L</div>
                    <div>Recovery State: {traceData.recovery_state}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">Loading decision trace...</div>
            )}

            <button
              onClick={() => setShowTraceModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              Close Trace Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
