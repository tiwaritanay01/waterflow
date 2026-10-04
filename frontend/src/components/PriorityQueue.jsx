import { useState } from "react";
import { ListOrdered, Zap, Eye, Lock } from "lucide-react";



const GOV_TIER_META = {
  1: { label: "AUTO", icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  2: { label: "REVIEW", icon: Eye, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  3: { label: "AUTH", icon: Lock, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
};

export default function PriorityQueue({ queue, onDispatch }) {
  const displayQueue = queue?.slice(0, 5) || [];
  const [dispatchingWard, setDispatchingWard] = useState(null);
  const [expandedWard, setExpandedWard] = useState(null);

  const handleAction = async (ward, govTier) => {
    if (dispatchingWard) return;
    setDispatchingWard(ward.ward_number);
    try {
      if (onDispatch) {
        await onDispatch(ward);
      } else {
        await fetch("http://localhost:3001/api/dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ward_code: ward.ward_number || ward.ward_code,
            volume_liters: ward.demand_liters || 10000,
            pin: "DEMO_EXEC_PIN_4491",
            notes: `Priority Queue dispatch (Tier ${govTier})`,
          }),
        });
      }
    } catch (e) {
      console.error("Queue dispatch error:", e);
    } finally {
      setDispatchingWard(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-card-border shadow-sm p-2.5 flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-card-border">
        <div className="flex items-center space-x-1.5">
          <ListOrdered className="w-3.5 h-3.5 text-deep-blue" />
          <h4 className="font-extrabold text-xs text-head-text">
            Explainable Priority Queue
          </h4>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded flex items-center space-x-0.5">
            <Zap className="w-2 h-2" /><span>Auto</span>
          </span>
          <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded flex items-center space-x-0.5">
            <Eye className="w-2 h-2" /><span>Review</span>
          </span>
          <span className="text-[8px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 py-0.5 rounded flex items-center space-x-0.5">
            <Lock className="w-2 h-2" /><span>Auth</span>
          </span>
        </div>
      </div>

      {/* Queue Items */}
      <div className="space-y-1.5 mt-2">
        {displayQueue.map((ward, idx) => {
          const isTop = idx === 0;
          const govTier = ward.tier || 1;
          const tierMeta = GOV_TIER_META[govTier];
          const TierIcon = tierMeta.icon;
          const isExpanded = expandedWard === ward.ward_number;
          return (
            <div
              key={ward.ward_id || ward.ward_number}
              className={`rounded-lg border transition-all ${
                isTop
                  ? "border-deep-blue/30 bg-blue-50/50"
                  : "border-card-border bg-[#FBFDFF]"
              } animate-fade-in`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className={`p-${isTop ? "2" : "1.5"} flex items-center justify-between`}>
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`px-1 py-0.5 ${
                        isTop
                          ? "bg-deep-blue text-white"
                          : "bg-slate-200 text-sec-text"
                      } text-[8px] font-bold rounded`}
                    >
                      #{idx + 1}
                    </span>
                    <span
                      className={`${
                        isTop ? "font-extrabold" : "font-bold"
                      } text-xs text-head-text`}
                    >
                      Ward {ward.ward_number}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        isTop ? "font-bold text-deep-blue" : "text-sec-text"
                      }`}
                    >
                      {ward.demand_liters?.toLocaleString()}L
                    </span>
                    {/* Governance Tier Badge */}
                    <span className={`px-1 py-0.5 ${tierMeta.bg} ${tierMeta.border} border rounded text-[7px] font-bold ${tierMeta.color} flex items-center space-x-0.5`}>
                      <TierIcon className="w-2 h-2" />
                      <span>{tierMeta.label}</span>
                    </span>
                  </div>
                  <div className="text-[10px] text-sec-text truncate mt-0.5">
                    {ward.description || _getWardSummary(ward)}
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() => setExpandedWard(isExpanded ? null : ward.ward_number)}
                    className="text-[9px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded transition-colors"
                    title="View exact mathematical factor contributions and constraints"
                  >
                    {isExpanded ? "Hide" : "Why?"}
                  </button>
                  <span className="font-mono font-black text-xs text-deep-blue">
                    {Math.round(ward.total_score)}
                    <span className="text-[9px] font-normal text-sec-text">
                      /100
                    </span>
                  </span>
                  <button
                    onClick={() => handleAction(ward, govTier)}
                    disabled={dispatchingWard === ward.ward_number}
                    className={`px-2 py-1 ${
                      dispatchingWard === ward.ward_number
                        ? "bg-blue-300 text-white cursor-wait"
                        : isTop
                        ? "bg-deep-blue text-white hover:bg-blue-700"
                        : "bg-slate-100 hover:bg-slate-200 text-deep-blue"
                    } text-[10px] font-bold rounded shadow-2xs transition-colors`}
                  >
                    {dispatchingWard === ward.ward_number
                      ? "..."
                      : govTier === 3
                      ? "🔐 Auth"
                      : govTier === 2
                      ? "Review"
                      : isTop
                      ? "Assign"
                      : "Queue"}
                  </button>
                </div>
              </div>

              {/* Expandable Trust & Explainability Details */}
              {isExpanded && (
                <div className="p-2 border-t border-blue-100 bg-white/90 rounded-b-lg text-[10px] space-y-1.5">
                  <div className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Evidence-Backed Scoring Factors:</span>
                    <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded font-mono">
                      SYNTHETIC_SEEDED: Seed 42
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-[9px]">
                    {(ward.priority_factors || ward.breakdown || []).map((f, fIdx) => (
                      <div key={fIdx} className="flex justify-between items-center text-slate-600">
                        <span className="truncate pr-1">
                          + {f.factor_name || f.factor} (wt {Math.round(f.weight * 100)}%):
                        </span>
                        <span className="font-bold text-slate-800 shrink-0">
                          {f.description} → +{Number(f.weighted_contribution ?? f.weighted_score ?? 0).toFixed(1)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-500 font-mono">
                    <span>
                      Sum: {(ward.priority_factors || []).reduce((s, f) => s + (f.weighted_contribution || 0), 0).toFixed(1)} / 100
                    </span>
                    <span className="font-semibold text-emerald-600">Gate: DEMO_EXECUTIVE_AUTH</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function _getWardSummary(ward) {
  const parts = [];
  if (ward.breakdown) {
    // Find the top contributing factor
    const sorted = [...ward.breakdown].sort(
      (a, b) => b.weighted_score - a.weighted_score
    );
    if (sorted[0]) parts.push(sorted[0].description);
  }
  return parts.join(" · ") || ward.name;
}
