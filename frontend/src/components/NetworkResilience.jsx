/**
 * WaterFlow OS — Network Resilience Dashboard Component
 * Graph-based scenario analysis visualization
 *
 * Mode: DEMO / OPERATIONAL SIMULATION
 */

import { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Droplet,
  Eye,
  GitBranch,
  Lock,
  Network,
  RefreshCw,
  Shield,
  ShieldAlert,
  Target,
  Truck,
  XCircle,
  Zap,
  Power,
} from "lucide-react";

const API_URL = "http://localhost:3001";

const SCENARIO_ICONS = {
  NORMAL: CheckCircle2,
  SINGLE_PIPE_FAILURE: AlertTriangle,
  SOURCE_CAPACITY_REDUCTION: Droplet,
  VALVE_UNAVAILABLE: XCircle,
  MULTIPLE_FAILURES: ShieldAlert,
};

const TIER_COLORS = {
  1: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", badge: "bg-emerald-100", label: "Tier 1 · Auto" },
  2: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", badge: "bg-amber-100", label: "Tier 2 · Review" },
  3: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", badge: "bg-red-100", label: "Tier 3 · Critical" },
};

export default function NetworkResilience() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [automationStatus, setAutomationStatus] = useState(null);

  // Fetch scenarios
  useEffect(() => {
    fetch(`${API_URL}/api/resilience/scenarios`)
      .then(res => res.json())
      .then(data => setScenarios(data.scenarios || []))
      .catch(err => console.warn("Failed to fetch scenarios:", err));

    fetch(`${API_URL}/api/automation/status`)
      .then(res => res.json())
      .then(data => setAutomationStatus(data))
      .catch(err => console.warn("Failed to fetch automation status:", err));
  }, []);

  const runSimulation = async (scenarioId) => {
    setLoading(true);
    setSelectedScenario(scenarioId);
    try {
      const res = await fetch(`${API_URL}/api/resilience/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleKillSwitch = async () => {
    const currentState = automationStatus?.automation_state?.kill_switch_enabled;
    try {
      const res = await fetch(`${API_URL}/api/automation/kill-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentState, officer_name: "Dashboard Operator" }),
      });
      const data = await res.json();
      setAutomationStatus(prev => ({
        ...prev,
        automation_state: { ...prev?.automation_state, kill_switch_enabled: data.kill_switch_enabled },
      }));
    } catch (err) {
      console.error("Kill switch toggle failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-400" />
            Network Resilience · Graph-Based Scenario Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            DEMO / OPERATIONAL SIMULATION · SYNTHETIC topology — not actual municipal infrastructure
          </p>
        </div>
        {/* Kill Switch */}
        <button
          onClick={toggleKillSwitch}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            automationStatus?.automation_state?.kill_switch_enabled
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
              : "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
          }`}
        >
          <Power className="w-4 h-4" />
          Automation: {automationStatus?.automation_state?.kill_switch_enabled ? "ENABLED" : "DISABLED"}
        </button>
      </div>

      {/* Scenario Selector */}
      <div className="grid grid-cols-5 gap-3">
        {scenarios.map(s => {
          const Icon = SCENARIO_ICONS[s.id] || Activity;
          const isActive = selectedScenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => runSimulation(s.id)}
              disabled={loading}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? "bg-sky-500/20 border-sky-400/50 ring-1 ring-sky-400/30"
                  : "bg-slate-800/60 border-slate-600/30 hover:border-slate-500/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                <span className={`text-xs font-bold ${isActive ? "text-sky-300" : "text-slate-300"}`}>
                  {s.id.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">{s.description}</p>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
          <span className="ml-2 text-sm text-slate-400">Running scenario analysis...</span>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Impact Summary */}
          <div className="grid grid-cols-4 gap-3">
            <MetricCard
              label="Affected Wards"
              value={result.impact?.affected_wards?.length || 0}
              icon={Target}
              color={result.impact?.affected_wards?.length > 0 ? "text-red-400" : "text-emerald-400"}
            />
            <MetricCard
              label="Demand at Risk"
              value={`${result.impact?.demand_at_risk_kl || 0} kL`}
              icon={Droplet}
              color={result.impact?.demand_at_risk_kl > 0 ? "text-amber-400" : "text-emerald-400"}
            />
            <MetricCard
              label="Population at Risk"
              value={(result.impact?.population_at_risk || 0).toLocaleString()}
              icon={Activity}
              color={result.impact?.population_at_risk > 0 ? "text-red-400" : "text-emerald-400"}
            />
            <MetricCard
              label="Governance Tier"
              value={`Tier ${result.governance?.tier || 1}`}
              icon={Shield}
              color={
                result.governance?.tier === 3 ? "text-red-400" :
                result.governance?.tier === 2 ? "text-amber-400" : "text-emerald-400"
              }
            />
          </div>

          {/* Before / After Metrics */}
          {result.metrics && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 p-4">
              <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-sky-400" />
                Before / After Comparison
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <ComparisonColumn title="Baseline" metrics={result.metrics.before} color="emerald" />
                <ComparisonColumn title="After Failure" metrics={result.metrics.after_failure} color="red" />
                {result.metrics.after_recovery && (
                  <ComparisonColumn title="After Recovery" metrics={result.metrics.after_recovery} color="sky" />
                )}
              </div>
            </div>
          )}

          {/* Recovery Alternatives */}
          {result.recovery?.alternatives && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 p-4">
              <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-400" />
                Recovery Alternatives (Ranked by Objective Score — lower is better)
              </h3>
              <div className="space-y-2">
                {result.recovery.alternatives.map(alt => (
                  <div
                    key={alt.option_id}
                    className={`p-3 rounded-lg border transition-all ${
                      alt.recommended
                        ? "bg-sky-500/10 border-sky-400/40"
                        : alt.feasible
                          ? "bg-slate-700/30 border-slate-600/30"
                          : "bg-slate-800/30 border-red-500/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold ${
                          alt.recommended ? "text-sky-300" : "text-slate-400"
                        }`}>
                          Option {alt.option_id}
                        </span>
                        <span className="text-sm font-medium text-slate-200">{alt.name}</span>
                        {alt.recommended && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-300 rounded-full">
                            RECOMMENDED
                          </span>
                        )}
                        {!alt.feasible && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-300 rounded-full">
                            INFEASIBLE
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        Score: {alt.objective_score}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{alt.description}</p>
                    <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
                      <span>Unmet: {alt.unmet_demand_kl} kL</span>
                      <span>Pop: {(alt.population_still_affected || 0).toLocaleString()}</span>
                      <span>Cost: {alt.operational_cost_units} units</span>
                      {alt.estimated_restoration_hours && <span>ETA: {alt.estimated_restoration_hours}h</span>}
                    </div>
                    {alt.actions?.length > 0 && (
                      <div className="mt-2 text-[10px] text-slate-500">
                        {alt.actions.map((a, i) => <div key={i}>→ {a}</div>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {result.recovery.ranking_methodology && (
                <div className="mt-3 p-2 bg-slate-900/50 rounded text-[10px] text-slate-500">
                  <strong>Ranking:</strong> {result.recovery.ranking_methodology.objective}<br />
                  <strong>Weight provenance:</strong> {result.recovery.ranking_methodology.weight_provenance}
                </div>
              )}
            </div>
          )}

          {/* Fault Localization */}
          {result.fault_localization?.candidates?.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 p-4">
              <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                Fault Localization (SYNTHETIC Observations)
              </h3>
              <div className="space-y-2">
                {result.fault_localization.candidates.slice(0, 5).map((c, i) => (
                  <div key={c.candidate_id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                    <div>
                      <span className="text-xs font-mono text-slate-300">{c.candidate_id}</span>
                      <span className="text-xs text-slate-400 ml-2">{c.edge_description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${Math.min(c.score * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-amber-400">{(c.score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 italic">
                {result.fault_localization.methodology}
              </p>
            </div>
          )}

          {/* Governance Status */}
          {result.governance && (
            <div className={`p-4 rounded-xl border ${
              result.governance.execution_blocked
                ? "bg-red-500/10 border-red-500/30"
                : result.governance.tier === 2
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-emerald-500/10 border-emerald-500/30"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.governance.execution_blocked ? (
                    <Lock className="w-4 h-4 text-red-400" />
                  ) : result.governance.tier === 2 ? (
                    <Eye className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Zap className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="text-sm font-bold text-slate-200">
                    {TIER_COLORS[result.governance.tier]?.label || `Tier ${result.governance.tier}`}
                  </span>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  result.governance.execution_blocked
                    ? "bg-red-500/20 text-red-300"
                    : result.governance.tier === 2
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-emerald-500/20 text-emerald-300"
                }`}>
                  {result.governance.status}
                </span>
              </div>
              {result.governance.block_reason && (
                <p className="text-xs text-red-300 mt-2">{result.governance.block_reason}</p>
              )}
              {result.governance.decision_id && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Decision ID: {result.governance.decision_id}
                </p>
              )}
            </div>
          )}

          {/* Explanation */}
          {result.explanation && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 p-4">
              <h3 className="text-sm font-bold text-slate-300 mb-2">Explanation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{result.explanation}</p>
            </div>
          )}

          {/* Affected Wards Table */}
          {result.impact?.affected_wards?.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 p-4">
              <h3 className="text-sm font-bold text-slate-300 mb-3">Affected Wards</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="text-left py-1">Ward</th>
                    <th className="text-left py-1">Name</th>
                    <th className="text-right py-1">Demand (kL)</th>
                    <th className="text-right py-1">Population</th>
                    <th className="text-right py-1">Vulnerability</th>
                  </tr>
                </thead>
                <tbody>
                  {result.impact.affected_wards.map(w => (
                    <tr key={w.id} className="border-b border-slate-700/50 text-slate-300">
                      <td className="py-1 font-mono">{w.ward_code}</td>
                      <td className="py-1">{w.name}</td>
                      <td className="py-1 text-right">{w.demand_kl}</td>
                      <td className="py-1 text-right">{(w.population || 0).toLocaleString()}</td>
                      <td className="py-1 text-right">{(w.vulnerability || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Network className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Select a failure scenario above to run graph-based analysis</p>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ComparisonColumn({ title, metrics, color }) {
  if (!metrics) return null;
  const colorClass = `text-${color}-400`;
  return (
    <div className={`p-3 rounded-lg bg-${color}-500/5 border border-${color}-500/20`}>
      <h4 className={`text-xs font-bold ${colorClass} mb-2`}>{title}</h4>
      <div className="space-y-1 text-xs text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-500">Connected Wards</span>
          <span>{metrics.connected_wards ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Unmet Demand</span>
          <span>{metrics.unmet_demand_kl ?? "—"} kL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Population Served</span>
          <span>{(metrics.population_served ?? 0).toLocaleString()}</span>
        </div>
        {metrics.total_source_capacity_kl && (
          <div className="flex justify-between">
            <span className="text-slate-500">Source Capacity</span>
            <span>{metrics.total_source_capacity_kl} kL</span>
          </div>
        )}
      </div>
    </div>
  );
}
