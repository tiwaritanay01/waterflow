import { useState } from "react";
import { Truck, Droplet, Flame, MapPin, Radio, ArrowUpRight, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import MumbaiLeafletMap from "./MumbaiLeafletMap";

export default function MapPanel({
  wards,
  tankers,
  depots,
  priorityQueue,
  onSelectWard,
  onNavigateToSpatial,
}) {
  const [internalSelectedWard, setInternalSelectedWard] = useState(null);
  const [tankerAssigned, setTankerAssigned] = useState(false);

  // Spotlight ward is either user-clicked or top ranked
  const spotlightWard =
    internalSelectedWard ||
    (priorityQueue && priorityQueue.length > 0 ? priorityQueue[0] : null);

  const handleSelectWard = (ward) => {
    // Find matching item from priorityQueue if available to get full breakdown
    const enriched =
      priorityQueue?.find(
        (pq) =>
          String(pq.ward_code || pq.ward_number).toUpperCase() ===
          String(ward.ward_code || ward.ward_number).toUpperCase()
      ) || ward;

    setInternalSelectedWard(enriched);
    setTankerAssigned(false);
    if (onSelectWard) onSelectWard(enriched);
  };

  const handleAssignTanker = () => {
    setTankerAssigned(true);
    setTimeout(() => setTankerAssigned(false), 4000);
  };

  const activeTankerCount =
    tankers?.filter((t) =>
      ["en_route", "dispensing", "available"].includes(t.status)
    ).length || 18;

  const priorityZonesCount =
    wards?.filter((w) => (w.water_deficit_pct || 0) >= 40 || (w.demand_liters || 0) > 0).length ||
    24;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
      {/* GIS Map Card */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-card-border shadow-sm flex flex-col overflow-hidden">
        {/* Map Header */}
        <div className="px-3 py-1.5 border-b border-card-border flex items-center justify-between bg-[#FBFDFF] shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-crit-red animate-ping" />
            <span className="font-bold text-xs text-head-text">
              Mumbai BMC Live Spatial GIS
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-deep-blue text-[9px] font-mono font-bold">
              Leaflet · OSM WGS84
            </span>
            <span className="text-[10px] text-sec-text hidden sm:inline">
              24 Administrative Wards
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[10px]">
            <button
              onClick={onNavigateToSpatial}
              className="text-deep-blue font-bold hover:underline flex items-center space-x-0.5 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
            >
              <span>Full Spatial Console</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Leaflet Map Canvas Container */}
        <div className="flex-1 min-h-0 relative overflow-hidden isolate">
          <MumbaiLeafletMap
            wards={wards}
            tankers={tankers}
            depots={depots}
            priorityQueue={priorityQueue}
            selectedWard={spotlightWard}
            onSelectWard={handleSelectWard}
          />
        </div>

        {/* Telemetry Bar at bottom of map card */}
        <div className="px-3 py-1 bg-white border-t border-card-border flex items-center justify-between text-[10px] shrink-0">
          <div className="flex items-center space-x-3 font-semibold text-sec-text">
            <span className="flex items-center space-x-1 text-deep-blue">
              <Truck className="w-3 h-3" />
              <span>
                <strong>{activeTankerCount}</strong> Active Tankers
              </span>
            </span>
            <span>·</span>
            <span className="flex items-center space-x-1 text-warm-amber">
              <MapPin className="w-3 h-3" />
              <span>
                <strong>{priorityZonesCount}</strong> BMC Monitored Wards
              </span>
            </span>
            <span>·</span>
            <span className="flex items-center space-x-1 text-sec-text">
              <Radio className="w-3 h-3 text-vibrant-blue" />
              <span>
                <strong>4</strong> Municipal Water Depots
              </span>
            </span>
          </div>
          <span className="text-sec-text text-[9px] font-mono hidden md:inline">
            Click any ward polygon for algorithmic formula breakdown
          </span>
        </div>
      </div>

      {/* Explainability Spotlight Card */}
      {spotlightWard && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-2.5 flex flex-col justify-between shrink-0 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-card-border/60 pb-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-deep-blue text-white text-[9px] font-bold uppercase rounded">
                Explainability Engine
              </span>
              <h4 className="font-extrabold text-xs text-head-text truncate">
                WHY IS WARD {spotlightWard.ward_code || spotlightWard.ward_number} ({spotlightWard.name?.split("/")[0]?.trim() || "Mumbai"}) PRIORITIZED?
              </h4>
              <span className="text-[10px] text-sec-text hidden sm:inline">
                Mathematical Equity Model
              </span>
            </div>
            <div className="flex items-center space-x-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              <span className="text-[10px] font-bold text-sec-text uppercase">
                Priority Index:
              </span>
              <span className="font-mono font-black text-xs text-deep-blue">
                {Math.round(spotlightWard.total_score || 78)}/100
              </span>
              <span className="px-1 py-0.5 bg-warm-amber text-white text-[8px] font-bold rounded ml-1">
                Tier {spotlightWard.tier || 1}
              </span>
            </div>
          </div>

          {/* Factor breakdown bars */}
          <div className="grid grid-cols-5 gap-2 my-1.5">
            {(spotlightWard.breakdown || [
              { factor: "Vulnerability", weighted_score: 28.8, normalized: 0.96, description: "Informal density" },
              { factor: "Dry Pipe Time", weighted_score: 20.1, normalized: 0.81, description: "58h dry" },
              { factor: "Population", weighted_score: 16.2, normalized: 0.81, description: "807k residents" },
              { factor: "Historical Deficit", weighted_score: 11.7, normalized: 0.78, description: "78% deficit" },
              { factor: "Depot Distance", weighted_score: 2.4, normalized: 0.24, description: "4.8km to depot" },
            ]).map((factor) => (
              <div
                key={factor.factor}
                className="bg-[#F8FAFC] border border-card-border rounded p-1.5"
              >
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-head-text truncate">
                    {factor.factor}
                  </span>
                  <span className="font-mono font-extrabold text-deep-blue">
                    +{Math.round(factor.weighted_score)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1 rounded-full mt-1 overflow-hidden">
                  <div
                    className="bg-deep-blue h-1 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(factor.normalized * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-sec-text truncate mt-0.5">
                  {factor.description}
                </div>
              </div>
            ))}
          </div>

          {/* Recommendation CTA */}
          <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200 rounded-lg px-2.5 py-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-deep-blue shrink-0">✓</span>
              <span className="text-xs font-bold text-head-text truncate">
                Recommended:{" "}
                <strong className="text-deep-blue">
                  {(spotlightWard.demand_liters || 32000).toLocaleString()} L
                </strong>{" "}
                (Tanker T-08 queued via Eastern Expressway corridor)
              </span>
            </div>
            <button
              onClick={handleAssignTanker}
              className={`px-3 py-1 rounded text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-all ${
                tankerAssigned
                  ? "bg-olive-green text-white"
                  : "bg-deep-blue hover:bg-blue-700 active:bg-blue-800 text-white"
              }`}
            >
              {tankerAssigned ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Dispatched T-08!</span>
                </>
              ) : (
                <>
                  <Truck className="w-3.5 h-3.5" />
                  <span>Assign Tanker T-08 Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
