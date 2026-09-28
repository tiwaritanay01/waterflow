import { ListOrdered, Zap, Eye, Lock } from "lucide-react";

// Classify governance tier for a ward dispatch based on volume and priority tier
function getGovernanceTier(ward) {
  // Tier 3: Critical — hospital-adjacent wards, extreme dry pipe hours, very high volume
  if (ward.dry_pipe_hours > 50 || ward.total_score >= 85 || ward.demand_liters > 25000) return 3;
  // Tier 2: Operator Review — elevated demand, moderate scores
  if (ward.demand_liters > 15000 || ward.total_score >= 70) return 2;
  // Tier 1: Autonomous — routine dispatches
  return 1;
}

const GOV_TIER_META = {
  1: { label: "AUTO", icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  2: { label: "REVIEW", icon: Eye, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  3: { label: "AUTH", icon: Lock, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
};

export default function PriorityQueue({ queue }) {
  const displayQueue = queue?.slice(0, 5) || [];

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
          const govTier = getGovernanceTier(ward);
          const tierMeta = GOV_TIER_META[govTier];
          const TierIcon = tierMeta.icon;
          return (
            <div
              key={ward.ward_id || ward.ward_number}
              className={`p-${isTop ? "2" : "1.5"} rounded-lg border ${
                isTop
                  ? "border-deep-blue/30 bg-blue-50/50"
                  : "border-card-border bg-[#FBFDFF]"
              } flex items-center justify-between animate-fade-in`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
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
                <span className="font-mono font-black text-xs text-deep-blue">
                  {Math.round(ward.total_score)}
                  <span className="text-[9px] font-normal text-sec-text">
                    /100
                  </span>
                </span>
                <button
                  className={`px-2 py-1 ${
                    isTop
                      ? "bg-deep-blue text-white hover:bg-blue-700"
                      : "bg-slate-100 hover:bg-slate-200 text-deep-blue"
                  } text-[10px] font-bold rounded shadow-2xs transition-colors`}
                >
                  {govTier === 3 ? "🔐 Auth" : govTier === 2 ? "Review" : isTop ? "Assign" : "Queue"}
                </button>
              </div>
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
