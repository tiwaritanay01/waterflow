// ============================================================
// WaterFlow OS — Policy & Crisis Simulator
// Decision tool: Runs BASELINE vs SCENARIO using existing allocation engine
// Mode: DEMO / OPERATIONAL SIMULATION
// ============================================================

import { useState, useEffect } from "react";
import {
  Beaker,
  Play,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ExternalLink,
  Loader2,
  BarChart3,
  RefreshCw,
} from "lucide-react";

import { runLocalSandboxSimulation } from "../utils/sandboxSimulator";
import { DEFAULT_MUMBAI_WARDS } from "../utils/mumbaiWardsData";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Policy Preset metadata
const POLICY_META = {
  EQUAL_SERVICE: {
    label: "Equal Service",
    description: "Equal weight across all 5 allocation factors",
    icon: "⚖️",
    color: "blue",
  },
  PRO_POOR: {
    label: "Pro-Poor",
    description: "50% vulnerability — protect informal settlements",
    icon: "🏘️",
    color: "violet",
  },
  OUTAGE_FIRST: {
    label: "Outage-First",
    description: "50% unmet demand — respond to acute dry-pipe hours",
    icon: "🚰",
    color: "amber",
  },
  FACILITY_PROTECTION: {
    label: "Facility Protection",
    description: "35% population/facility — protect hospitals & shelters",
    icon: "🏥",
    color: "red",
  },
  LOGISTICS_FIRST: {
    label: "Logistics-First",
    description: "35% distance — reduce tanker transit & operational burden",
    icon: "🚛",
    color: "emerald",
  },
};

// Crisis Scenario metadata
const CRISIS_META = {
  NORMAL: {
    label: "Normal Operations",
    description: "Baseline — all infrastructure at nominal capacity",
    icon: "✅",
    severity: "low",
  },
  HEATWAVE: {
    label: "Heatwave Advisory",
    description: "Demand +25% — sustained temperature anomaly",
    icon: "🌡️",
    severity: "medium",
  },
  MAJOR_SUPPLY_REDUCTION: {
    label: "Major Supply Reduction",
    description: "Supply −35% — upstream reservoir/treatment cut",
    icon: "📉",
    severity: "high",
  },
  TRUNK_MAIN_FAILURE: {
    label: "Trunk Main Failure",
    description: "Major conduit burst — transmission reduced, reserve release",
    icon: "💥",
    severity: "critical",
  },
  FLOOD_DISRUPTION: {
    label: "Flood Disruption",
    description: "Monsoon flooding — higher losses, longer routes",
    icon: "🌊",
    severity: "high",
  },
};

const TIER_STYLES = {
  1: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100",
    label: "Tier 1 · Autonomous",
    icon: Zap,
    description: "Routine allocation — ready for operation",
  },
  2: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100",
    label: "Tier 2 · Operator Review",
    icon: Eye,
    description: "Elevated variance — operator confirmation needed",
  },
  3: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-crit-red",
    badge: "bg-red-100",
    label: "Tier 3 · Executive Authorization",
    icon: Lock,
    description: "Critical action — hard-blocked until PIN sign-off",
  },
};

function MetricCard({ label, value, unit, delta, deltaPct, direction, small }) {
  const isUp = direction === "↑";
  const isDown = direction === "↓";
  const isNeutral = !isUp && !isDown;

  const deltaColor = label.includes("Unmet") || label.includes("Critical")
    ? (isUp ? "text-crit-red" : isDown ? "text-emerald-600" : "text-sec-text")
    : (isDown ? "text-crit-red" : isUp ? "text-emerald-600" : "text-sec-text");

  return (
    <div className={`${small ? "p-2" : "p-3"} bg-white rounded-xl border border-card-border`}>
      <div className={`${small ? "text-[9px]" : "text-[10px]"} font-semibold text-sec-text uppercase tracking-wider mb-1`}>{label}</div>
      <div className={`${small ? "text-sm" : "text-lg"} font-black text-head-text font-mono`}>
        {typeof value === "number"
          ? value >= 1000
            ? value.toLocaleString()
            : value.toFixed(value < 10 ? 1 : 0)
          : value}
        {unit && <span className={`${small ? "text-[9px]" : "text-[10px]"} font-semibold text-sec-text ml-0.5`}>{unit}</span>}
      </div>
      {deltaPct !== undefined && deltaPct !== 0 && (
        <div className={`flex items-center space-x-1 mt-0.5 ${deltaColor}`}>
          {isUp && <TrendingUp className="w-3 h-3" />}
          {isDown && <TrendingDown className="w-3 h-3" />}
          {isNeutral && <Minus className="w-3 h-3" />}
          <span className="text-[10px] font-bold">{deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

export default function PolicySandbox({ onNavigateToGovernance }) {
  const [selectedPolicy, setSelectedPolicy] = useState("EQUAL_SERVICE");
  const [selectedScenario, setSelectedScenario] = useState("NORMAL");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    let simData = null;

    try {
      const res = await fetch(`${API_URL}/api/sandbox/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyPreset: selectedPolicy,
          crisisScenario: selectedScenario,
          parameters: {},
        }),
      });

      if (res.ok) {
        simData = await res.json();
      } else {
        console.warn(`Backend sandbox API returned status ${res.status}, executing client-side simulation`);
      }
    } catch (fetchErr) {
      console.warn("Backend sandbox API unreachable, executing client-side simulation:", fetchErr.message);
    }

    if (!simData || !simData.success) {
      try {
        simData = runLocalSandboxSimulation(
          selectedPolicy,
          selectedScenario,
          {},
          DEFAULT_MUMBAI_WARDS
        );
      } catch (localErr) {
        setError(`Simulation error: ${localErr.message}`);
        setIsRunning(false);
        return;
      }
    }

    setResult(simData);
    setIsRunning(false);
  };

  const govTier = result?.governance?.tier || 1;
  const tierStyle = TIER_STYLES[govTier];
  const TierIcon = tierStyle?.icon || Zap;

  const policyMeta = POLICY_META[selectedPolicy];
  const scenarioMeta = CRISIS_META[selectedScenario];

  return (
    <div className="h-full w-full bg-white rounded-xl border border-card-border shadow-sm flex flex-col overflow-hidden animate-fade-in">
      {/* ─── Header ─────────────────────────────── */}
      <div className="p-3 border-b border-card-border shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center">
              <Beaker className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-head-text">Policy & Crisis Simulator</h3>
              <p className="text-[10px] text-sec-text">
                EXISTING ENGINE → BASELINE vs SCENARIO → WHY → GOVERNANCE GATE
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[9px] font-bold text-amber-700">
            DEMO / OPERATIONAL SIMULATION
          </span>
        </div>

        {/* ─── Controls ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-2 mt-2">
          {/* Policy Selector */}
          <div>
            <label className="text-[9px] font-bold text-sec-text uppercase tracking-wider block mb-1">Policy Preset</label>
            <select
              value={selectedPolicy}
              onChange={(e) => { setSelectedPolicy(e.target.value); setResult(null); }}
              className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-card-border rounded-lg focus:border-deep-blue focus:ring-2 focus:ring-deep-blue/10 outline-none cursor-pointer"
            >
              {Object.entries(POLICY_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.icon} {meta.label}</option>
              ))}
            </select>
            <p className="text-[9px] text-sec-text mt-0.5">{policyMeta?.description}</p>
          </div>

          {/* Scenario Selector */}
          <div>
            <label className="text-[9px] font-bold text-sec-text uppercase tracking-wider block mb-1">Crisis Scenario</label>
            <select
              value={selectedScenario}
              onChange={(e) => { setSelectedScenario(e.target.value); setResult(null); }}
              className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-card-border rounded-lg focus:border-deep-blue focus:ring-2 focus:ring-deep-blue/10 outline-none cursor-pointer"
            >
              {Object.entries(CRISIS_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.icon} {meta.label}</option>
              ))}
            </select>
            <p className="text-[9px] text-sec-text mt-0.5">{scenarioMeta?.description}</p>
          </div>

          {/* Run Button */}
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <button
              onClick={runSimulation}
              disabled={isRunning}
              className="w-full lg:w-auto flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg bg-deep-blue text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            >
              {isRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{isRunning ? "Running..." : "Run Simulation"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Results ────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-3 space-y-3">
        {/* Error State */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center space-x-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-crit-red" />
              <span className="font-bold text-xs text-crit-red">Simulation Error</span>
            </div>
            <p className="text-xs text-head-text">{error}</p>
            <p className="text-[10px] text-sec-text mt-1">Ensure the AI Engine is running on port 8000 and the Gateway on port 3001.</p>
          </div>
        )}

        {/* Empty State */}
        {!result && !error && !isRunning && (
          <div className="flex flex-col items-center justify-center py-16 text-sec-text">
            <Beaker className="w-12 h-12 mb-3 text-indigo-300" />
            <p className="text-sm font-semibold">Select a policy & scenario, then click Run Simulation</p>
            <p className="text-[11px] mt-1">The simulation runs the EXISTING allocation engine twice: baseline and scenario.</p>
          </div>
        )}

        {/* Loading */}
        {isRunning && (
          <div className="flex flex-col items-center justify-center py-16 text-sec-text">
            <Loader2 className="w-10 h-10 mb-3 text-deep-blue animate-spin" />
            <p className="text-sm font-semibold">Running simulation...</p>
            <p className="text-[11px] mt-1">Executing baseline + scenario allocation via existing HiGHS LP engine</p>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <>
            {/* Simulation ID + Metadata */}
            <div className="flex items-center justify-between text-[10px] text-sec-text">
              <div className="flex items-center space-x-3">
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-card-border">{result.simulation_id}</span>
                <span>{new Date(result.timestamp).toLocaleString()}</span>
              </div>
              <span className="font-mono text-amber-600">{result.mode}</span>
            </div>

            {/* Scenario Assumptions */}
            {result.scenario_assumptions?.length > 0 && (
              <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="flex items-center space-x-1 mb-1">
                  <Info className="w-3 h-3 text-deep-blue" />
                  <span className="text-[9px] font-bold text-deep-blue uppercase">Scenario Assumptions</span>
                </div>
                <ul className="text-[10px] text-head-text space-y-0.5">
                  {result.scenario_assumptions.map((a, i) => (
                    <li key={i} className="flex items-start space-x-1">
                      <span className="text-sec-text shrink-0">•</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* BASELINE vs SCENARIO Side-by-Side */}
            {(() => {
              const impactDeltasArray = Array.isArray(result?.impact_deltas)
                ? result.impact_deltas
                : result?.impact_deltas && typeof result.impact_deltas === "object"
                ? Object.entries(result.impact_deltas)
                    .filter(([k]) => k !== "top_divergent_wards")
                    .map(([k, v]) => ({
                      metric: k.replace(/_/g, " "),
                      delta_pct: typeof v === "number" ? v : 0,
                      direction: v > 0 ? "↑" : v < 0 ? "↓" : "—",
                    }))
                : [];

              const whyExplanationsArray = Array.isArray(result?.why_explanations)
                ? result.why_explanations
                : [];

              return (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Baseline Column */}
                    <div>
                      <div className="text-[10px] font-bold text-sec-text uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                        <BarChart3 className="w-3 h-3" />
                        <span>Baseline</span>
                      </div>
                      <div className="space-y-1.5">
                        <MetricCard label="Supply" value={result.baseline?.total_supply} unit="L" small />
                        <MetricCard label="Demand" value={result.baseline?.total_demand} unit="L" small />
                        <MetricCard label="Allocated" value={result.baseline?.allocated_volume} unit="L" small />
                        <MetricCard label="Unmet" value={result.baseline?.unmet_demand} unit="L" small />
                        <MetricCard label="Reserve" value={result.baseline?.reserve_held} unit="L" small />
                        <MetricCard label="Fulfillment" value={(result.baseline?.fulfillment_ratio || 0) * 100} unit="%" small />
                        <MetricCard label="Vuln. Fulfillment" value={(result.baseline?.high_vuln_fulfillment_ratio || 0) * 100} unit="%" small />
                        <MetricCard label="Affected Wards" value={result.baseline?.affected_wards} small />
                      </div>
                    </div>

                    {/* Scenario Column */}
                    <div>
                      <div className="text-[10px] font-bold text-sec-text uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                        <Beaker className="w-3 h-3" />
                        <span>Scenario ({CRISIS_META[result.crisis_scenario]?.icon} {CRISIS_META[result.crisis_scenario]?.label})</span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { label: "Supply", key: "total_supply", unit: "L" },
                          { label: "Demand", key: "total_demand", unit: "L" },
                          { label: "Allocated", key: "allocated_volume", unit: "L" },
                          { label: "Unmet", key: "unmet_demand", unit: "L" },
                          { label: "Reserve", key: "reserve_held", unit: "L" },
                          { label: "Fulfillment", key: "fulfillment_ratio", unit: "%", ratio: true },
                          { label: "Vuln. Fulfillment", key: "high_vuln_fulfillment_ratio", unit: "%", ratio: true },
                          { label: "Affected Wards", key: "affected_wards" },
                        ].map(({ label, key, unit, ratio }) => {
                          const scenVal = ratio ? (result.scenario?.[key] || 0) * 100 : result.scenario?.[key];
                          const delta = impactDeltasArray.find(d =>
                            d?.metric && d.metric.toLowerCase().includes(label.toLowerCase().split(".")[0].trim())
                          );
                          return (
                            <MetricCard
                              key={key}
                              label={label}
                              value={scenVal}
                              unit={unit}
                              deltaPct={delta?.delta_pct}
                              direction={delta?.direction}
                              small
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* IMPACT DELTA Strip */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-card-border">
                    <h4 className="text-[10px] font-bold text-sec-text uppercase tracking-wider mb-2 flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Impact Delta</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {impactDeltasArray
                        .filter(d => d?.delta_pct !== 0 && d?.metric)
                        .slice(0, 6)
                        .map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1.5 bg-white rounded-lg border border-card-border">
                            <span className="font-semibold text-head-text truncate mr-1">{(d.metric || "").replace(" (L)", "")}</span>
                            <span className={`font-black font-mono whitespace-nowrap ${
                              d.direction === "↑"
                                ? (d.metric || "").includes("Unmet") || (d.metric || "").includes("Critical") ? "text-crit-red" : "text-emerald-600"
                                : d.direction === "↓"
                                  ? (d.metric || "").includes("Fulfi") || (d.metric || "").includes("Allocated") ? "text-crit-red" : "text-emerald-600"
                                  : "text-sec-text"
                            }`}>
                              {d.direction || "—"} {d.delta_pct > 0 ? "+" : ""}{(d.delta_pct || 0).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* WHY DID THIS CHANGE? */}
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200">
                    <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Why Did This Change?</span>
                    </h4>
                    <div className="space-y-2">
                      {whyExplanationsArray.map((w, i) => (
                        <div key={i} className="p-2 bg-white rounded-lg border border-indigo-100">
                          <div className="text-[9px] font-bold text-indigo-600 uppercase mb-0.5">
                            {i + 1}. {w.category || w.type || "Operational Variance"}
                          </div>
                          <p className="text-[11px] text-head-text leading-relaxed">{w.explanation || w.text || "Scenario modifier applied."}</p>
                          {w.delta_pct !== 0 && w.delta_pct != null && (
                            <div className="text-[9px] font-mono text-sec-text mt-0.5">
                              {w.metric_key || ""}: {w.baseline_value?.toLocaleString()} → {w.scenario_value?.toLocaleString()} ({w.delta_pct > 0 ? "+" : ""}{w.delta_pct?.toFixed(1)}%)
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* GOVERNANCE CLASSIFICATION */}
            <div className={`p-3 rounded-xl border ${tierStyle.border} ${tierStyle.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg ${tierStyle.badge} border ${tierStyle.border} flex items-center justify-center`}>
                    <TierIcon className={`w-4 h-4 ${tierStyle.text}`} />
                  </div>
                  <div>
                    <h4 className={`font-extrabold text-xs ${tierStyle.text}`}>{tierStyle.label}</h4>
                    <p className="text-[10px] text-sec-text">{tierStyle.description}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tierStyle.badge} ${tierStyle.text} border ${tierStyle.border}`}>
                  {result.governance?.risk_level?.toUpperCase()}
                </span>
              </div>

              {/* Proposed Actions */}
              {result.governance?.proposed_actions?.length > 0 && (
                <div className="mb-2">
                  <div className="text-[9px] font-bold text-sec-text uppercase mb-1">Proposed Actions</div>
                  <ul className="space-y-0.5">
                    {result.governance.proposed_actions.map((a, i) => (
                      <li key={i} className="text-[10px] text-head-text flex items-center space-x-1">
                        <ArrowRight className="w-2.5 h-2.5 text-deep-blue shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tier 3: Hard Block */}
              {govTier === 3 && (
                <div className="p-2 bg-red-100 border border-red-300 rounded-lg mt-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <Lock className="w-4 h-4 text-crit-red" />
                    <span className="font-black text-xs text-crit-red">🔐 EXECUTIVE AUTHORIZATION REQUIRED</span>
                  </div>
                  <p className="text-[10px] text-head-text">
                    {result.block_reason || "This action is hard-blocked until executive PIN sign-off via the Governance Center."}
                  </p>
                  {result.governance_decision_id && (
                    <p className="text-[9px] font-mono text-sec-text mt-1">
                      Decision ID: {result.governance_decision_id}
                    </p>
                  )}
                  {onNavigateToGovernance && (
                    <button
                      onClick={onNavigateToGovernance}
                      className="mt-2 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-crit-red text-white text-[10px] font-bold hover:bg-red-700 transition-colors shadow-sm"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Governance Center</span>
                    </button>
                  )}
                </div>
              )}

              {/* Tier 2: Review */}
              {govTier === 2 && (
                <div className="p-2 bg-amber-100 border border-amber-300 rounded-lg mt-2">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-xs text-amber-700">Operator review recommended</span>
                  </div>
                  {result.governance_decision_id && (
                    <p className="text-[9px] font-mono text-sec-text mt-1">
                      Decision ID: {result.governance_decision_id}
                    </p>
                  )}
                  {onNavigateToGovernance && (
                    <button
                      onClick={onNavigateToGovernance}
                      className="mt-2 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[10px] font-bold hover:bg-amber-700 transition-colors shadow-sm"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Governance Center</span>
                    </button>
                  )}
                </div>
              )}

              {/* Tier 1: Ready */}
              {govTier === 1 && (
                <div className="p-2 bg-emerald-100 border border-emerald-300 rounded-lg mt-2">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-xs text-emerald-700">Ready for routine operation</span>
                  </div>
                </div>
              )}
            </div>

            {/* Rerun */}
            <div className="flex justify-center pt-1 pb-2">
              <button
                onClick={runSimulation}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-sec-text text-[10px] font-bold hover:bg-slate-200 transition-colors border border-card-border"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Re-run Simulation</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─── Footer ────────────────────────────── */}
      <div className="px-3 py-1.5 border-t border-card-border bg-slate-50/50 flex items-center justify-between text-[9px] text-sec-text shrink-0">
        <span>Policy Sandbox v1.0 · Existing LP Engine · Deterministic WHY</span>
        <span className="font-mono text-amber-600">DEMO / OPERATIONAL SIMULATION</span>
      </div>
    </div>
  );
}
