import { useState, useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Truck,
  Droplet,
  Layers,
  Maximize2,
  RefreshCw,
  Clock,
  Users,
  ShieldAlert,
  Flame,
  Activity,
  Compass,
} from "lucide-react";

// Mumbai center coordinates
const MUMBAI_CENTER = [19.085, 72.885];
const MUMBAI_BOUNDS = [
  [18.89, 72.75], // Southwest
  [19.28, 72.99], // Northeast
];

// Map recentering helper component
function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [12, 12], maxZoom: 11.5 });
    } else if (center) {
      map.setView(center, zoom || 11);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

// Custom SVG DivIcon generator for Tankers
function createTankerIcon(tanker) {
  const isEnRoute = tanker.status === "en_route";
  const isDispensing = tanker.status === "dispensing";
  const isAvailable = tanker.status === "available";

  const color = isEnRoute ? "#0056B3" : isDispensing ? "#6B8E23" : isAvailable ? "#3399FF" : "#C27A29";
  const pingClass = isEnRoute ? "animate-ping" : isDispensing ? "animate-pulse" : "";

  return L.divIcon({
    className: "custom-tanker-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
        ${isEnRoute ? `<span class="${pingClass}" style="position: absolute; inset: -4px; border-radius: 9999px; background-color: rgba(51, 153, 255, 0.4);"></span>` : ""}
        <div style="
          position: relative;
          background: ${color};
          color: white;
          padding: 5px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0, 40, 80, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        </div>
        <div style="
          margin-top: 2px;
          background: rgba(15, 23, 42, 0.9);
          color: white;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          ${tanker.transponder_id} ${isEnRoute ? `(${tanker.eta_minutes}m)` : ""}
        </div>
      </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 21],
  });
}

// Custom SVG DivIcon for Municipal Depots
function createDepotIcon(depot) {
  return L.divIcon({
    className: "custom-depot-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
        <div style="
          position: relative;
          background: #003366;
          color: white;
          padding: 6px;
          border-radius: 8px;
          border: 2px solid #3399FF;
          box-shadow: 0 4px 12px rgba(0, 50, 120, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3399FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
        </div>
        <div style="
          margin-top: 2px;
          background: #003366;
          color: #E0F2FE;
          font-size: 8px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid #3399FF;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
          ${depot.name.split(" ")[0]} DEPOT
        </div>
      </div>
    `,
    iconSize: [34, 46],
    iconAnchor: [17, 23],
  });
}

export default function MumbaiLeafletMap({
  wards = [],
  tankers = [],
  depots = [],
  priorityQueue = [],
  selectedWard = null,
  onSelectWard = () => {},
  isExpanded = false,
}) {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [activeLayer, setActiveLayer] = useState("deficit"); // deficit | vulnerability | dry_pipe | priority
  const [tileSource, setTileSource] = useState("osm"); // osm | carto
  const [showTankers, setShowTankers] = useState(true);
  const [showDepots, setShowDepots] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapKey, setMapKey] = useState(0);

  // Load Mumbai GeoJSON
  useEffect(() => {
    fetch("/mumbai_wards.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setGeoJsonData(data);
      })
      .catch((err) => {
        console.error("Failed to load /mumbai_wards.geojson:", err);
      });
  }, []);

  // Quick lookup dictionary for ward metrics by ward code (e.g. 'M/E', 'G/N', 'A')
  const wardMap = useMemo(() => {
    const map = {};
    for (const w of wards) {
      const key = String(w.ward_code || w.ward_number || "").toUpperCase().trim();
      map[key] = w;
    }
    return map;
  }, [wards]);

  // Priority queue rank dictionary
  const rankMap = useMemo(() => {
    const map = {};
    (priorityQueue || []).forEach((item, idx) => {
      const key = String(item.ward_code || item.ward_number || "").toUpperCase().trim();
      map[key] = { rank: idx + 1, item };
    });
    return map;
  }, [priorityQueue]);

  // Styling helper based on active metric layer
  const getFeatureColor = (feature) => {
    const code = String(feature?.properties?.name || "").toUpperCase().trim();
    const ward = wardMap[code];
    if (!ward) return "#94A3B8";

    if (activeLayer === "deficit") {
      const deficit = ward.water_deficit_pct || Math.round((1 - (ward.coverage_pct || 50) / 100) * 100);
      if (deficit >= 70) return "#D32F2F"; // Critical Red
      if (deficit >= 50) return "#C27A29"; // Warning Amber
      if (deficit >= 30) return "#0056B3"; // Municipal Blue
      return "#6B8E23"; // Safe Olive Green
    }

    if (activeLayer === "vulnerability") {
      const v = ward.vulnerability_index || 0;
      if (v >= 0.85) return "#D32F2F";
      if (v >= 0.65) return "#C27A29";
      if (v >= 0.45) return "#0056B3";
      return "#6B8E23";
    }

    if (activeLayer === "dry_pipe") {
      const d = ward.dry_pipe_hours || 0;
      if (d >= 48) return "#D32F2F";
      if (d >= 30) return "#C27A29";
      if (d >= 15) return "#0056B3";
      return "#6B8E23";
    }

    if (activeLayer === "priority") {
      const rank = rankMap[code]?.rank || 99;
      if (rank <= 3) return "#D32F2F";
      if (rank <= 8) return "#C27A29";
      if (rank <= 16) return "#0056B3";
      return "#6B8E23";
    }

    return "#0056B3";
  };

  // Leaflet Polygon Style Function
  const styleFeature = (feature) => {
    const code = String(feature?.properties?.name || "").toUpperCase().trim();
    const isSelected = selectedWard && String(selectedWard.ward_code || selectedWard.ward_number).toUpperCase() === code;

    const baseColor = getFeatureColor(feature);

    return {
      fillColor: baseColor,
      weight: isSelected ? 3.5 : 1.5,
      opacity: 1,
      color: isSelected ? "#0F172A" : "#FFFFFF",
      dashArray: isSelected ? "" : "2",
      fillOpacity: isSelected ? 0.65 : 0.38,
      className: "transition-all duration-200 cursor-pointer",
    };
  };

  // On Each Feature event binder
  const onEachFeature = (feature, layer) => {
    const code = String(feature?.properties?.name || "").toUpperCase().trim();
    const ward = wardMap[code];
    const rankInfo = rankMap[code];
    const rank = rankInfo?.rank;

    const wardName = ward?.name || `Ward ${code}`;
    const deficit = ward?.water_deficit_pct || (ward?.coverage_pct ? 100 - ward.coverage_pct : 50);
    const dryHours = ward?.dry_pipe_hours || 0;
    const pop = ward?.population ? ward.population.toLocaleString() : "—";
    const demand = ward?.demand_liters ? ward.demand_liters.toLocaleString() : "—";

    // Tooltip on Hover
    layer.bindTooltip(
      `
      <div style="font-family: 'Public Sans', sans-serif;">
        <div style="font-size: 11px; font-weight: 800; color: #FFFFFF; display: flex; align-items: center; gap: 4px;">
          <span>WARD ${code}</span>
          ${rank ? `<span style="background: #C27A29; font-size: 9px; padding: 1px 4px; border-radius: 3px;">RANK #${rank}</span>` : ""}
        </div>
        <div style="font-size: 10px; color: #94A3B8; margin-top: 1px;">${wardName}</div>
        <div style="margin-top: 4px; font-size: 10px; display: flex; gap: 8px; font-family: 'JetBrains Mono', monospace;">
          <span style="color: ${deficit >= 65 ? '#F87171' : '#38BDF8'}; font-weight: 700;">Deficit: ${deficit}%</span>
          <span>Dry: ${dryHours}h</span>
        </div>
      </div>
      `,
      { sticky: true, direction: "top", opacity: 0.95 }
    );

    // Click handler
    layer.on({
      click: () => {
        if (ward) {
          onSelectWard(ward);
        }
      },
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({
          fillOpacity: 0.7,
          weight: 2.5,
          color: "#0056B3",
        });
      },
      mouseout: (e) => {
        const l = e.target;
        l.setStyle(styleFeature(feature));
      },
    });

    // Rich Popup
    layer.bindPopup(
      `
      <div style="min-width: 240px; padding: 12px; font-family: 'Public Sans', sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 8px;">
          <div>
            <span style="font-size: 9px; font-weight: 800; background: #0056B3; color: white; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em;">
              BMC WARD ${code}
            </span>
            <h4 style="margin: 4px 0 0 0; font-size: 13px; font-weight: 800; color: #0F172A;">
              ${wardName}
            </h4>
          </div>
          ${
            rank
              ? `<div style="text-align: right;">
                  <span style="font-size: 9px; color: #64748B; font-weight: 700; text-transform: uppercase;">Priority</span>
                  <div style="font-size: 14px; font-weight: 900; color: #C27A29; font-family: 'JetBrains Mono', monospace;">#${rank}</div>
                 </div>`
              : ""
          }
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; font-size: 11px;">
          <div style="background: #F8FAFC; padding: 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div style="font-size: 9px; color: #64748B; text-transform: uppercase; font-weight: 700;">Water Deficit</div>
            <div style="font-size: 13px; font-weight: 900; color: ${deficit >= 65 ? '#D32F2F' : '#0056B3'}; font-family: 'JetBrains Mono', monospace;">
              ${deficit}%
            </div>
          </div>

          <div style="background: #F8FAFC; padding: 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div style="font-size: 9px; color: #64748B; text-transform: uppercase; font-weight: 700;">Dry Pipe Time</div>
            <div style="font-size: 13px; font-weight: 900; color: ${dryHours >= 40 ? '#D32F2F' : '#C27A29'}; font-family: 'JetBrains Mono', monospace;">
              ${dryHours} hrs
            </div>
          </div>

          <div style="background: #F8FAFC; padding: 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div style="font-size: 9px; color: #64748B; text-transform: uppercase; font-weight: 700;">Daily Demand</div>
            <div style="font-size: 12px; font-weight: 800; color: #0F172A; font-family: 'JetBrains Mono', monospace;">
              ${demand} L
            </div>
          </div>

          <div style="background: #F8FAFC; padding: 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div style="font-size: 9px; color: #64748B; text-transform: uppercase; font-weight: 700;">Population</div>
            <div style="font-size: 12px; font-weight: 800; color: #0F172A; font-family: 'JetBrains Mono', monospace;">
              ${pop}
            </div>
          </div>
        </div>

        <div style="font-size: 10px; color: #475569; margin-bottom: 10px; background: #F1F5F9; padding: 6px 8px; border-radius: 6px;">
          ${ward?.description || "Municipal water rationing and tanker allocation monitoring sector."}
        </div>

        <div style="display: flex; gap: 6px;">
          <button style="
            flex: 1;
            background: #0056B3;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
          " onclick="window.dispatchEvent(new CustomEvent('assign-tanker', { detail: '${code}' }))">
            Dispatch Tanker
          </button>
        </div>
      </div>
      `,
      { maxWidth: 280 }
    );
  };

  // Dispatch route polylines connecting depots to target wards
  const dispatchRoutes = useMemo(() => {
    const routes = [];
    const enRouteTankers = tankers.filter((t) => t.status === "en_route" && t.assigned_ward);

    for (const t of enRouteTankers) {
      const ward = wardMap[String(t.assigned_ward).toUpperCase()];
      if (ward && ward.lat && ward.lng && t.lat && t.lng) {
        routes.push({
          id: t.tanker_id,
          tankerId: t.transponder_id,
          positions: [
            [t.lat, t.lng],
            [ward.lat, ward.lng],
          ],
          color: "#0056B3",
        });
      }
    }
    return routes;
  }, [tankers, wardMap]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none bg-[#EAF2F9] isolate">
      {/* Top Map Control Bar */}
      <div className="z-20 absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        {/* Layer Selector */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-card-border shadow-sm flex items-center space-x-1.5 text-xs">
          <span className="font-bold text-[10px] text-sec-text flex items-center space-x-1 pr-1 border-r border-slate-200">
            <Layers className="w-3.5 h-3.5 text-deep-blue" />
            <span className="hidden sm:inline">Layer:</span>
          </span>
          <button
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
              activeLayer === "deficit"
                ? "bg-deep-blue text-white shadow-2xs"
                : "text-sec-text hover:bg-slate-100"
            }`}
            onClick={() => setActiveLayer("deficit")}
          >
            Water Deficit
          </button>
          <button
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
              activeLayer === "vulnerability"
                ? "bg-deep-blue text-white shadow-2xs"
                : "text-sec-text hover:bg-slate-100"
            }`}
            onClick={() => setActiveLayer("vulnerability")}
          >
            Vulnerability (Vw)
          </button>
          <button
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
              activeLayer === "dry_pipe"
                ? "bg-deep-blue text-white shadow-2xs"
                : "text-sec-text hover:bg-slate-100"
            }`}
            onClick={() => setActiveLayer("dry_pipe")}
          >
            Dry-Pipe Hours
          </button>
          <button
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
              activeLayer === "priority"
                ? "bg-deep-blue text-white shadow-2xs"
                : "text-sec-text hover:bg-slate-100"
            }`}
            onClick={() => setActiveLayer("priority")}
          >
            Priority Tiers
          </button>
        </div>

        {/* Right Quick Controls */}
        <div className="pointer-events-auto flex items-center space-x-1.5">
          <div className="bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg border border-card-border shadow-sm flex items-center space-x-1 text-[11px]">
            <button
              className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                showTankers ? "bg-blue-100 text-deep-blue" : "text-slate-400"
              }`}
              onClick={() => setShowTankers(!showTankers)}
            >
              🚚 Tankers
            </button>
            <button
              className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                showDepots ? "bg-blue-100 text-deep-blue" : "text-slate-400"
              }`}
              onClick={() => setShowDepots(!showDepots)}
            >
              💧 Depots
            </button>
          </div>

          <button
            className="bg-white/95 backdrop-blur-md p-1.5 rounded-lg border border-card-border shadow-sm text-deep-blue hover:bg-blue-50 transition-colors"
            title="Recenter Mumbai View"
            onClick={() => setMapKey((k) => k + 1)}
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Leaflet Map Canvas */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer
          key={mapKey}
          center={MUMBAI_CENTER}
          zoom={11}
          minZoom={10}
          maxZoom={17}
          maxBounds={MUMBAI_BOUNDS}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <MapController bounds={MUMBAI_BOUNDS} />

          {/* Base Tile Layer */}
          {tileSource === "carto" ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          )}

          {/* Mumbai BMC Ward GeoJSON Choropleth */}
          {geoJsonData && (
            <GeoJSON
              key={`geojson-${activeLayer}-${geoJsonData?.features?.length}-${selectedWard?.ward_code || ""}`}
              data={geoJsonData}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Active Tanker Dispatch Routes */}
          {showRoutes &&
            dispatchRoutes.map((route) => (
              <Polyline
                key={`route-${route.id}`}
                positions={route.positions}
                color={route.color}
                dashArray="6, 6"
                weight={3}
                opacity={0.8}
              />
            ))}

          {/* Live Tanker Fleet Markers */}
          {showTankers &&
            tankers.map((tanker) => {
              if (!tanker.lat || !tanker.lng) return null;
              return (
                <Marker
                  key={`tanker-${tanker.tanker_id}`}
                  position={[tanker.lat, tanker.lng]}
                  icon={createTankerIcon(tanker)}
                >
                  <Popup>
                    <div className="p-1 font-sans text-xs">
                      <div className="font-bold text-deep-blue flex items-center space-x-1">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Tanker {tanker.transponder_id}</span>
                      </div>
                      <div className="text-[10px] text-sec-text mt-0.5">
                        Capacity: <strong>{tanker.capacity?.toLocaleString()} L</strong> · Load:{" "}
                        <strong>{tanker.current_load?.toLocaleString()} L</strong>
                      </div>
                      <div className="text-[10px] text-sec-text">
                        Status:{" "}
                        <span className="font-bold capitalize text-deep-blue">
                          {tanker.status.replace("_", " ")}
                        </span>
                        {tanker.assigned_ward && (
                          <span> (Destination: Ward {tanker.assigned_ward})</span>
                        )}
                      </div>
                      {tanker.eta_minutes && (
                        <div className="text-[10px] font-mono text-warm-amber font-bold mt-0.5">
                          ETA: {tanker.eta_minutes} mins
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* Municipal Depots */}
          {showDepots &&
            depots.map((depot) => {
              if (!depot.lat || !depot.lng) return null;
              return (
                <Marker
                  key={`depot-${depot.id}`}
                  position={[depot.lat, depot.lng]}
                  icon={createDepotIcon(depot)}
                >
                  <Popup>
                    <div className="p-1 font-sans text-xs">
                      <div className="font-extrabold text-deep-blue">{depot.name}</div>
                      <div className="text-[10px] text-sec-text mt-0.5">{depot.zone}</div>
                      <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
                        <span>Stock:</span>
                        <strong>{Math.round(depot.current_stock / 1000)}k / {Math.round(depot.total_capacity / 1000)}k KL</strong>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-vibrant-blue h-1.5 rounded-full"
                          style={{
                            width: `${Math.round((depot.current_stock / depot.total_capacity) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>
      </div>

      {/* Floating Bottom HUD */}
      <div className="z-20 absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        {/* Choropleth Legend */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-card-border shadow-sm text-[10px] flex items-center space-x-3">
          <div className="font-bold text-head-text">
            {activeLayer === "deficit"
              ? "Deficit Severity"
              : activeLayer === "vulnerability"
              ? "Vulnerability Index"
              : activeLayer === "dry_pipe"
              ? "Dry-Pipe Hours"
              : "Priority Level"}
          </div>
          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#D32F2F]" />
              <span className="text-sec-text font-medium">Critical (&gt;70%)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#C27A29]" />
              <span className="text-sec-text font-medium">Warning (50-70%)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#0056B3]" />
              <span className="text-sec-text font-medium">Moderate (30-50%)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#6B8E23]" />
              <span className="text-sec-text font-medium">Stable (&lt;30%)</span>
            </span>
          </div>
        </div>

        {/* Map Telemetry Badges */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-card-border shadow-sm text-[10px] font-mono text-sec-text flex items-center space-x-2">
          <span className="text-deep-blue font-bold">Mumbai BMC</span>
          <span>·</span>
          <span>EPSG:4326</span>
          <span>·</span>
          <button
            className="text-deep-blue hover:underline font-bold"
            onClick={() => setTileSource(tileSource === "carto" ? "osm" : "carto")}
          >
            {tileSource === "carto" ? "OSM Layer" : "Carto Clean"}
          </button>
        </div>
      </div>
    </div>
  );
}
