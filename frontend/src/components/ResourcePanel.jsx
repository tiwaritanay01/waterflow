import { PieChart } from "lucide-react";

export default function ResourcePanel({ kpis, depots }) {
  const allocated = kpis?.water_available_kl || 286;
  const total = kpis?.total_capacity_kl || 420;
  const pct = total > 0 ? Math.round((allocated / total) * 100) : 0;
  const reservePct = 14;
  const remainPct = Math.max(0, 100 - pct - reservePct);

  const fleetAvailable = kpis?.fleet_available || 18;
  const fleetLoading = kpis?.fleet_loading || 4;
  const fleetEnRoute = kpis?.fleet_en_route || 3;

  return (
    <div className="bg-white rounded-xl border border-card-border shadow-sm p-2.5 flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-card-border">
        <div className="flex items-center space-x-1.5">
          <PieChart className="w-3.5 h-3.5 text-deep-blue" />
          <h4 className="font-extrabold text-xs text-head-text">
            Resource &amp; Fleet Allocation
          </h4>
        </div>
        <span className="text-[9px] font-mono text-sec-text">
          {depots?.[0]?.name || "DEPOT #1"}
        </span>
      </div>

      {/* Quota strip */}
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-[11px] font-semibold">
          <span className="text-sec-text">Daily Water Allocation</span>
          <span className="font-mono text-head-text">
            <strong>{allocated}</strong> / {total} KL ({pct}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-deep-blue h-2 transition-all duration-700"
            style={{ width: `${pct}%` }}
            title={`Allocated ${pct}%`}
          />
          <div
            className="bg-vibrant-blue h-2 transition-all duration-700"
            style={{ width: `${reservePct}%` }}
            title={`Reserved Buffer ${reservePct}%`}
          />
          <div
            className="bg-emerald-200 h-2 transition-all duration-700"
            style={{ width: `${remainPct}%` }}
            title={`Remaining ${remainPct}%`}
          />
        </div>
      </div>

      {/* Fleet status pills */}
      <div className="grid grid-cols-3 gap-1.5 mt-2 text-center text-[10px]">
        <div className="p-1 rounded bg-emerald-50 border border-emerald-100">
          <div className="font-mono font-extrabold text-olive-green text-xs">
            {fleetAvailable}
          </div>
          <div className="text-sec-text text-[9px] font-medium">Available</div>
        </div>
        <div className="p-1 rounded bg-blue-50 border border-blue-100">
          <div className="font-mono font-extrabold text-deep-blue text-xs">
            {fleetLoading}
          </div>
          <div className="text-sec-text text-[9px] font-medium">Loading</div>
        </div>
        <div className="p-1 rounded bg-amber-50 border border-amber-100">
          <div className="font-mono font-extrabold text-warm-amber text-xs">
            {fleetEnRoute}
          </div>
          <div className="text-sec-text text-[9px] font-medium">En Route</div>
        </div>
      </div>
    </div>
  );
}
