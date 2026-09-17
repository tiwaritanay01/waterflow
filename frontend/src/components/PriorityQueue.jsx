import { ListOrdered } from "lucide-react";

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
        <span className="text-[9px] font-bold text-deep-blue bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
          Top {displayQueue.length} Pending
        </span>
      </div>

      {/* Queue Items */}
      <div className="space-y-1.5 mt-2">
        {displayQueue.map((ward, idx) => {
          const isTop = idx === 0;
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
                  {isTop ? "Assign" : "Queue"}
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
