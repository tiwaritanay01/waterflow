import { useState, useEffect } from "react";
import { X, ShieldCheck, Database, Sliders, Cpu, Activity, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";

export default function EvidencePanelModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("provenance");
  const [policyData, setPolicyData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetch("http://localhost:8000/api/policy")
        .then((r) => r.json())
        .then((d) => setPolicyData(d))
        .catch(() => {
          // Fallback static policy data
          setPolicyData({
            policy_version: "3.0.0-research",
            policy_name: "BMC Municipal Need-Based Equity Allocation Policy",
            weights: {
              vulnerability: 0.25,
              unmet_demand: 0.25,
              historical_deficit: 0.20,
              reliability_deficit: 0.10,
              complaint_evidence: 0.10,
              critical_facility: 0.10
            }
          });
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Evidence, Provenance & Scientific Methodology
              </h2>
              <p className="text-xs text-slate-500">
                WaterFlow OS v3.0.0-research — Algorithmic Explainability & Data Taxonomy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab("provenance")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === "provenance"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Data Classification</span>
          </button>
          <button
            onClick={() => setActiveTab("policy")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === "policy"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Allocation Policy (v3.0)</span>
          </button>
          <button
            onClick={() => setActiveTab("models")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === "models"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Models & Baselines</span>
          </button>
          <button
            onClick={() => setActiveTab("traceability")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === "traceability"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Decision Traceability</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* TAB 1: DATA CLASSIFICATION */}
          {activeTab === "provenance" && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Strict Provenance Protocol:</span> Operational event logs shown in this prototype are generated deterministically from seed=42 and must not be cited as real BMC SCADA records. Demographic ward baselines are anchored to official Census figures.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>REAL DATA</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>2011 Ward Census Population</li>
                    <li>MCGM 2034 Master Plan Projections</li>
                    <li>2011 Slum Population Shares</li>
                    <li>Ward Boundary GeoJSON & Centroids</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                  <div className="flex items-center space-x-2 text-blue-800 font-bold text-xs mb-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>SIMULATED SCENARIO</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>12 Stress Scenarios (A to L)</li>
                    <li>Daily Tanker Requests & Complaints</li>
                    <li>Lake Reservoir Inflow & Catchment Lags</li>
                    <li>Simulated Aqueduct Ruptures</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
                  <div className="flex items-center space-x-2 text-purple-800 font-bold text-xs mb-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>POLICY ASSUMPTION</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>135 LPCD Minimum Lifeline Standard</li>
                    <li>25% Non-Revenue Water (NRW) Loss</li>
                    <li>Zero Demographic Identity Allocation</li>
                    <li>Emergency Lifeline Override Rule</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALLOCATION POLICY */}
          {activeTab === "policy" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Policy Version 3.0.0-research</h3>
                  <p className="text-xs text-slate-500">Decoupled Need Formula (Zero Distance in Need Scoring)</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono rounded-lg">
                  Weights Sum = 1.000
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-bold text-slate-800">Socio-Spatial Vulnerability (V)</span>
                    <p className="text-slate-500">Slum share & piped infrastructure deficit</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">25.0%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-bold text-slate-800">Normalized Unmet Demand (U)</span>
                    <p className="text-slate-500">Unsatisfied daily hydration requirement</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">25.0%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-bold text-slate-800">Historical Service Deficit (H)</span>
                    <p className="text-slate-500">Cumulative unserved gap & consecutive dry streak</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">20.0%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-bold text-slate-800">Service Reliability Deficit (R)</span>
                    <p className="text-slate-500">Unplanned outage and pressure failure frequency</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">10.0%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-bold text-slate-800">Corroborated Citizen Complaints (C)</span>
                    <p className="text-slate-500">Deduplicated multi-citizen incident velocity</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">10.0%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-bold text-slate-800">Critical Facility Lifeline (F)</span>
                    <p className="text-slate-500">Hospitals, dialysis centers, clinics storage deficit</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">10.0%</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MODELS & BASELINES */}
          {activeTab === "models" && (
            <div className="space-y-4">
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Engine Component</th>
                      <th className="p-3">Model Family</th>
                      <th className="p-3">Baseline Comparison</th>
                      <th className="p-3">Measured Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-3 font-semibold">Demand Forecasting</td>
                      <td className="p-3">Random Forest (50 trees)</td>
                      <td className="p-3 text-slate-500">Naive Previous-Day (y_{'{t-1}'})</td>
                      <td className="p-3 text-emerald-700 font-mono font-bold">MAE 730 L (-17.3% error)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Emergency Prediction</td>
                      <td className="p-3">Balanced Classifier</td>
                      <td className="p-3 text-slate-500">Velocity Rule Threshold</td>
                      <td className="p-3 text-emerald-700 font-mono font-bold">Recall 70.8% | AUC 0.788</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Fleet Logistics</td>
                      <td className="p-3">Decoupled VRP (2-opt)</td>
                      <td className="p-3 text-slate-500">Nearest Tanker Heuristic</td>
                      <td className="p-3 text-emerald-700 font-mono font-bold">-27.1% Emergency Delay</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Water Balance</td>
                      <td className="p-3">Physical Mass Balance</td>
                      <td className="p-3 text-slate-500">Infinite Supply Prototype</td>
                      <td className="p-3 text-blue-700 font-mono font-bold">Raw Inflow $\to$ NRW $\to$ Relief</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DECISION TRACEABILITY */}
          {activeTab === "traceability" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Every municipal allocation batch receives an immutable, reproducible decision identifier. Inspect full historical decision traces via backend API:
              </p>
              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto">
                GET /api/decision/dec-7f3b89a012c4
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                <div className="font-bold text-slate-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Immutable Decision Audit Guarantees</span>
                </div>
                <p className="text-slate-600">
                  1. Policy version and mathematical weights frozen at moment of calculation.<br />
                  2. All constraints (non-negativity, capacity limits, zero-demand clamping) recorded in trace logs.<br />
                  3. Full explainable score contribution products stored per ward for civic transparency.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Municipal Water Resource Optimization Framework</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
