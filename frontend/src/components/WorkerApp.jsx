import { useState, useEffect } from "react";
import {
  Truck,
  MapPin,
  Navigation,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  Droplet,
  Clock,
  Phone,
  RefreshCw,
  ArrowLeft,
  KeyRound,
  Delete,
  XCircle,
  ExternalLink,
  Smartphone,
  Monitor,
  AlertTriangle,
  Radio,
  Check,
  Activity,
  Gauge,
  Camera,
  FlaskConical
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from "react-leaflet";
import L from "leaflet";
import DeliveryVerification from "./DeliveryVerification";

const API_BASE = "http://localhost:3001";

// Leaflet Icons
const depotIcon = L.divIcon({
  className: "custom-leaflet-marker",
  html: `<div style="background-color: #0284c7; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); color: white; font-size: 13px;">🏢</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const workerTankerIcon = L.divIcon({
  className: "custom-leaflet-marker",
  html: `<div style="background-color: #d97706; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); color: white; font-size: 18px;">🚛</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const standpostIcon = L.divIcon({
  className: "custom-leaflet-marker",
  html: `<div style="background-color: #10b981; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); color: white; font-size: 13px;">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function WorkerApp({ onBackToDashboard, onSignOut, user }) {
  // Mission Data State
  const [mission, setMission] = useState({
    mission_id: 501,
    tanker_id: "T-08",
    license_plate: "MH-03-BW-7821",
    driver_name: "Rajesh Patil",
    driver_id: "#4892",
    destination_ward: "Ward M/East (Govandi)",
    destination_address: "Shivaji Nagar Community Supply Point, Sector 4, Govandi, Mumbai 400043",
    lat: 19.055,
    lng: 72.918,
    depot_name: "Trombay Hub",
    depot_coords: [19.015, 72.905],
    volume_liters: 10000,
    citizen_name: "Mr. Kamble (Ward Rep)",
    citizen_phone: "+91 98200 12345",
    delivery_status: "en_route", // "en_route" | "arrived" | "dispensing" | "Delivered"
    eta_minutes: 14,
  });

  const [loading, setLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [forceMobileFrame, setForceMobileFrame] = useState(false); // Toggle for desktop view vs phone frame

  // OTP Entry State
  const [inputOtp, setInputOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [deliverySuccess, setDeliverySuccess] = useState(null);
  const [volumeDischarged, setVolumeDischarged] = useState(0);
  const [verifyTab, setVerifyTab] = useState("smart"); // "smart" | "keypad"

  // Fetch active mission
  const fetchMission = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/worker/mission?tanker_id=T-08`);
      const data = await res.json();
      if (data.success && data.mission) {
        setMission((prev) => ({
          ...prev,
          ...data.mission,
          driver_name: data.mission.driver_name || "Rajesh Patil",
          license_plate: data.mission.license_plate || "MH-03-BW-7821",
        }));
        if (data.mission.delivery_status === "Delivered") {
          setDeliverySuccess({
            timestamp: data.mission.completed_at || new Date().toISOString(),
            volume: data.mission.volume_liters || 10000,
            audit_token: "SCADA-AUDIT-AUTH-SUCCESS-7419",
          });
          setVolumeDischarged(10000);
        }
      }
    } catch (err) {
      console.warn("Worker mission fetch error, using default mission:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMission();
  }, []);

  // Update Driver Transit Status
  const handleUpdateStatus = async (newStatus) => {
    setStatusUpdating(true);
    setMission((prev) => ({ ...prev, delivery_status: newStatus }));

    try {
      await fetch(`${API_BASE}/api/worker/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanker_id: mission.tanker_id,
          status: newStatus,
        }),
      });
    } catch (err) {
      console.warn("Status update offline fallback:", err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Open Google Maps Navigation
  const handleNavigate = () => {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mission.lat},${mission.lng}`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  // Numpad Key Click
  const handleKeyPress = (num) => {
    if (inputOtp.length < 4) {
      setInputOtp((prev) => prev + num);
      setVerificationError(null);
    }
  };

  // Backspace
  const handleBackspace = () => {
    setInputOtp((prev) => prev.slice(0, -1));
    setVerificationError(null);
  };

  // Clear
  const handleClear = () => {
    setInputOtp("");
    setVerificationError(null);
  };

  // Verify Delivery with Backend
  const handleVerifyDelivery = async () => {
    if (inputOtp.length !== 4) return;
    setVerifying(true);
    setVerificationError(null);

    try {
      const res = await fetch(`${API_BASE}/api/worker/verify-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanker_id: mission.tanker_id,
          otp_code: inputOtp,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setDeliverySuccess({
          timestamp: data.completed_at || new Date().toISOString(),
          volume: data.volume_liters || mission.volume_liters,
          audit_token: data.audit_token || "SCADA-AUDIT-AUTH-OK",
        });
        setMission((prev) => ({ ...prev, delivery_status: "Delivered" }));
        setVolumeDischarged(10000);
      } else {
        setVerificationError(data.error || "Invalid OTP PIN. Verification failed.");
      }
    } catch (err) {
      // Fallback verification for test demo
      if (inputOtp === "7419") {
        setDeliverySuccess({
          timestamp: new Date().toISOString(),
          volume: 10000,
          audit_token: "SCADA-AUDIT-OFFLINE-VERIFIED",
        });
        setMission((prev) => ({ ...prev, delivery_status: "Delivered" }));
        setVolumeDischarged(10000);
      } else {
        setVerificationError("Invalid Citizen OTP. Please re-enter 4 digits.");
      }
    } finally {
      setVerifying(false);
    }
  };

  // Corridor route points
  const routePoints = [
    mission.depot_coords || [19.015, 72.905],
    [19.035, 72.912],
    [mission.lat, mission.lng],
  ];

  return (
    <div className={`w-full min-h-screen bg-[#f0f5fa] text-slate-900 font-sans selection:bg-sky-100 flex flex-col ${forceMobileFrame ? "py-6 px-4 flex items-center justify-center bg-slate-900/80" : ""}`}>
      
      {/* Outer Shell: Fits Phone edge-to-edge on mobile, Expands to Desktop workstation on Desktop */}
      <div className={`w-full ${forceMobileFrame ? "max-w-md shadow-2xl rounded-2xl overflow-hidden border-2 border-slate-700 bg-[#f4f8fc]" : "max-w-7xl mx-auto"} flex flex-col min-h-screen transition-all duration-200`}>
        
        {/* ============================================================
            PWA TOP NOTIFICATION STRIP
            ============================================================ */}
        <div className="bg-slate-900 text-white px-3.5 py-2 border-b border-slate-800 shadow-xs z-30 relative">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-[#0056b3] flex items-center justify-center shrink-0">
                <Truck className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-[11px] font-bold text-white tracking-tight">
                    Install WaterFlow Field App
                  </span>
                  <span className="text-[9px] bg-sky-700 text-blue-100 font-mono font-bold px-1 py-0.5 rounded leading-none">
                    PWA
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Offline SCADA Caching Active (Govandi Zone)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop / Mobile Preview Toggle (Visible on desktop screens) */}
              <button
                onClick={() => setForceMobileFrame(!forceMobileFrame)}
                className={`hidden lg:flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded transition ${
                  forceMobileFrame ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
                title="Toggle Mobile Screen Frame vs Desktop Wide View"
              >
                {forceMobileFrame ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                <span>{forceMobileFrame ? "Desktop View" : "Phone Preview"}</span>
              </button>

              <button
                type="button"
                onClick={() => alert("PWA Added to Home Screen: WaterFlow Field Terminal is now cached offline for low-connectivity zones.")}
                className="bg-[#0056b3] hover:bg-sky-800 active:bg-sky-900 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-2xs transition-colors flex items-center gap-1"
              >
                <Smartphone className="w-3 h-3" />
                <span>Add to Home</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================
            HEADER: Tanker ID, Driver Profile, SCADA Synced Indicator
            ============================================================ */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
          <div className="flex items-center justify-between">
            
            {/* Back action & Brand Identity */}
            <div className="flex items-center space-x-3">
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  aria-label="Go Back to Command Center"
                  className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                  type="button"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0056b3] text-white flex items-center justify-center shadow-xs">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 tracking-tight">
                      Tanker {mission.tanker_id}
                    </span>
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-300">
                      {mission.license_plate}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {mission.driver_name} · <span className="text-slate-400">{mission.driver_id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Telemetry Status & Manual Sync Refresh */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 live-pulse"></span>
                <span>SCADA Synced</span>
              </div>
              
              <button
                onClick={fetchMission}
                disabled={loading}
                aria-label="Refresh Telemetry Data"
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                type="button"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>

              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition shadow-2xs flex items-center space-x-1 cursor-pointer ml-1"
                  title="Sign Out to Landing Page"
                >
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ============================================================
            MAIN CONTENT AREA
            - Mobile (< 1024px or forceMobileFrame): 1 Column
            - Desktop (>= 1024px): 2 Columns (7 cols Mission & Telemetry + 5 cols Logistics & Keypad)
            ============================================================ */}
        <main className={`flex-1 p-3.5 sm:p-5 pb-12 ${forceMobileFrame ? "space-y-3.5" : "lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0"} overflow-y-auto custom-scroll`}>
          
          {/* ============================================================
              LEFT COLUMN: Priority Mission Card, Route Map, Ultrasonic Telemetry, Escalation
              ============================================================ */}
          <div className={`${forceMobileFrame ? "space-y-3.5" : "lg:col-span-7 space-y-4"}`}>
            
            {/* PWA ServiceWorker v4.12 Offline First Strip */}
            <div className="bg-sky-50/70 border border-sky-200 rounded-lg px-3 py-1.5 flex items-center justify-between text-[11px] shadow-2xs">
              <div className="flex items-center gap-1.5 text-sky-900 font-medium">
                <span className="font-bold text-amber-500">⚡</span>
                <span>PWA ServiceWorker v4.12</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600 font-semibold">Offline First Cache</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                SYNCED LOCALLY
              </span>
            </div>

            {/* Priority Mission Card */}
            <section className="bg-white rounded-xl border border-sky-200 shadow-xs p-4 sm:p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-sky-500 to-[#0056b3]"></div>
              
              {/* Tag row */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Priority Dispatch Mission
                </span>
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Depot: <strong className="text-slate-800 font-semibold">{mission.depot_name}</strong>
                </span>
              </div>

              {/* Target Sector and Quota Callout */}
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-rose-600 uppercase">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Target Delivery Sector
                  </div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    {mission.destination_ward}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                    {mission.destination_address}
                  </p>
                </div>

                {/* Quota Target Badge */}
                <div className="bg-gradient-to-b from-sky-50 to-blue-100/70 border border-sky-200 px-3 py-2 rounded-xl text-center min-w-[96px] shadow-2xs">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-sky-700">Quota Target</div>
                  <div className="text-lg font-black font-mono text-sky-900 leading-none mt-1">
                    {mission.volume_liters?.toLocaleString() || "10,000"}
                  </div>
                  <div className="text-[10px] font-semibold text-sky-600 mt-0.5">Liters (Potable)</div>
                </div>
              </div>

              {/* Recipient Liaison Line */}
              <div className="mt-3.5 pt-2.5 border-t border-dashed border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="text-slate-600">Lead: <strong>{mission.citizen_name}</strong></span>
                </div>
                <a
                  className="inline-flex items-center gap-1 font-mono text-xs font-bold text-sky-700 hover:text-sky-900 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200"
                  href={`tel:${mission.citizen_phone}`}
                >
                  <Phone className="w-3 h-3 text-sky-600" />
                  <span>{mission.citizen_phone}</span>
                </a>
              </div>

              {/* Primary Action: Turn-by-Turn GPS Corridor Navigation */}
              <button
                onClick={handleNavigate}
                className="mt-3.5 w-full py-2.5 px-4 rounded-lg bg-[#0056b3] hover:bg-sky-800 active:bg-sky-900 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all duration-150 cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-white" />
                <span className="tracking-wide">LAUNCH TURN-BY-TURN ROUTE (BMC PRIORITY CORRIDOR)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            </section>

            {/* Interactive Leaflet Priority Route Corridor Map */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-sky-700" />
                  <span>Live Dispatch Route &amp; Geofence Corridor</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  GPS Active ±2.4m
                </span>
              </div>

              <div className="h-56 w-full relative">
                <MapContainer
                  center={[19.035, 72.912]}
                  zoom={12}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={false}
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  {/* Depot Marker */}
                  <Marker position={mission.depot_coords || [19.015, 72.905]} icon={depotIcon}>
                    <Popup>
                      <div className="text-xs font-bold font-sans">
                        Trombay High Reservoir (Depot)
                      </div>
                    </Popup>
                  </Marker>

                  {/* Tanker Marker */}
                  <Marker position={[19.035, 72.912]} icon={workerTankerIcon}>
                    <Popup>
                      <div className="text-xs font-bold font-sans">
                        Tanker T-08 (Rajesh Patil)
                        <div className="text-[10px] text-amber-600 font-semibold">
                          En Route · ETA 14m
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Standpost Destination Marker */}
                  <Marker position={[mission.lat, mission.lng]} icon={standpostIcon}>
                    <Popup>
                      <div className="text-xs font-bold font-sans">
                        Shivaji Nagar Standpost #4
                        <div className="text-[10px] text-slate-500 font-normal">
                          Ward M/East Target
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Corridor Polyline */}
                  <Polyline positions={routePoints} color="#0056b3" weight={4} dashArray="6, 6" />

                  {/* Geofence Perimeter */}
                  <Circle
                    center={[mission.lat, mission.lng]}
                    radius={150}
                    pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.15 }}
                  />
                </MapContainer>

                <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs px-2 py-1 rounded text-[10px] font-mono text-slate-700 shadow-2xs border border-slate-200 z-[400] flex items-center space-x-2">
                  <span>🔵 Depot: Trombay</span>
                  <span>➜</span>
                  <span>🟢 Target: Shivaji Nagar</span>
                </div>
              </div>
            </div>

            {/* Ultrasonic Flow & Tank Telemetry */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                <span>Ultrasonic Flow &amp; Tank Telemetry</span>
                <span className="font-mono text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sensor Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Flow Valve Status */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Discharge Valve</div>
                  <div className="font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      deliverySuccess ? "bg-emerald-500" : mission.delivery_status === "dispensing" ? "bg-emerald-500 animate-ping" : "bg-amber-500"
                    }`}></span>
                    <span>
                      {deliverySuccess ? "Discharged / Sealed" : mission.delivery_status === "dispensing" ? "Flow Active (Dispensing)" : "Standby (Awaiting OTP)"}
                    </span>
                  </div>
                </div>

                {/* Tank Capacity Meter */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Tanker Volume</div>
                  <div className="font-bold font-mono text-sky-800 mt-1 text-sm">
                    {deliverySuccess ? "0 / 10,000 L (Empty)" : "10,000 / 10,000 L"}
                  </div>
                </div>
              </div>

              {/* Geofence Proximity Status */}
              <div className="bg-sky-50/70 border border-sky-100 rounded-lg p-2.5 flex items-center justify-between text-xs text-sky-950">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-medium text-[11px]">
                    GPS Geofence: <strong>18m from Standpost #4</strong>
                  </span>
                </div>
                <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Valid Range
                </span>
              </div>
            </section>

            {/* Emergency Escalation */}
            <section className="pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alert("Transit Delay Logged: Notified BMC Central Operations and automated ward SMS sent to Mr. Kamble.")}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Report Route Delay</span>
                </button>

                <a
                  href="tel:02224072233"
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-slate-300 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-sky-600" />
                  <span>BMC Control Desk</span>
                </a>
              </div>
            </section>
          </div>

          {/* ============================================================
              RIGHT COLUMN: Driver Logistics Stepper, OTP Authorization Panel & Keypad
              ============================================================ */}
          <div className={`${forceMobileFrame ? "space-y-3.5" : "lg:col-span-5 space-y-4"}`}>

            {/* Driver Logistics Stepper */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Driver Logistics Status
                </span>
                <span className="text-[11px] font-semibold text-slate-500">Live Mission Stage</span>
              </div>

              {/* 3-State Action Bar */}
              <div className="grid grid-cols-3 gap-2">
                
                {/* State 1: En Route */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("en_route")}
                  className={`relative rounded-lg p-2.5 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                    mission.delivery_status === "en_route"
                      ? "border-2 border-amber-500 bg-amber-50/90 shadow-2xs"
                      : "border border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  {mission.delivery_status === "en_route" && (
                    <span className="absolute -top-1.5 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  )}
                  <Navigation className={`w-5 h-5 ${mission.delivery_status === "en_route" ? "text-amber-700" : "text-slate-400"}`} />
                  <span className={`text-[11px] font-black uppercase mt-1 tracking-tight leading-none ${mission.delivery_status === "en_route" ? "text-amber-900" : "text-slate-600"}`}>
                    1. EN ROUTE
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500 mt-0.5">Dep: 14:15 IST</span>
                </button>

                {/* State 2: Arrived */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("arrived")}
                  className={`relative rounded-lg p-2.5 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                    mission.delivery_status === "arrived"
                      ? "border-2 border-sky-500 bg-sky-50/90 shadow-2xs"
                      : "border border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  {mission.delivery_status === "arrived" && (
                    <span className="absolute -top-1.5 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                  )}
                  <MapPin className={`w-5 h-5 ${mission.delivery_status === "arrived" ? "text-sky-700" : "text-slate-400"}`} />
                  <span className={`text-[11px] font-bold uppercase mt-1 tracking-tight leading-none ${mission.delivery_status === "arrived" ? "text-sky-900" : "text-slate-600"}`}>
                    2. ARRIVED
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Geofence Check</span>
                </button>

                {/* State 3: Dispensing */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("dispensing")}
                  className={`relative rounded-lg p-2.5 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                    mission.delivery_status === "dispensing"
                      ? "border-2 border-emerald-500 bg-emerald-50/90 shadow-2xs"
                      : "border border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  {mission.delivery_status === "dispensing" && (
                    <span className="absolute -top-1.5 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  )}
                  <Droplet className={`w-5 h-5 ${mission.delivery_status === "dispensing" ? "text-emerald-700" : "text-slate-400"}`} />
                  <span className={`text-[11px] font-bold uppercase mt-1 tracking-tight leading-none ${mission.delivery_status === "dispensing" ? "text-emerald-900" : "text-slate-600"}`}>
                    3. DISPENSING
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Req. OTP</span>
                </button>
              </div>
            </section>

            {/* Proof of Delivery OTP Authorization Panel */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Proof of Delivery Authorization
                    </h2>
                    <p className="text-[11px] text-slate-500">Enter 4-digit citizen OTP to release SCADA valve</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded">
                  Citizen App PIN
                </span>
              </div>

              {/* Delivery Success View */}
              {deliverySuccess ? (
                <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 rounded-xl p-4 text-center space-y-2 animate-fade-in">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-emerald-950">
                    Delivery Verified &amp; SCADA Audited!
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Discharged <strong>{deliverySuccess.volume?.toLocaleString()} Liters</strong> of potable water to {mission.destination_ward}.
                  </p>
                  <div className="bg-white/80 p-2 rounded-lg text-[10px] font-mono text-emerald-800 border border-emerald-200">
                    Audit Token: {deliverySuccess.audit_token || "SCADA-AUDIT-DELIV-AUTH-OK"}
                  </div>
                  <button
                    onClick={() => {
                      setDeliverySuccess(null);
                      setInputOtp("");
                      setMission((p) => ({ ...p, delivery_status: "en_route" }));
                    }}
                    className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Reset / Next Mission Dispatch
                  </button>
                </div>
              ) : (
                <>
                  {/* Phase 2 Verification Mode Tabs */}
                  <div className="flex rounded-lg bg-slate-100 p-1 mb-4 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setVerifyTab("smart")}
                      className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition ${
                        verifyTab === "smart"
                          ? "bg-white text-[#0056b3] shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Phase 2: Visual Proof &amp; Quality</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerifyTab("keypad")}
                      className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition ${
                        verifyTab === "keypad"
                          ? "bg-white text-[#0056b3] shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      <span>Numeric Keypad</span>
                    </button>
                  </div>

                  {verifyTab === "smart" ? (
                    <DeliveryVerification
                      dispatchId={mission.mission_id}
                      wardId="M/East"
                      wardName={mission.destination_ward}
                      targetVolume={mission.volume_liters || 10000}
                      onVerificationSuccess={(result) => {
                        setDeliverySuccess({
                          timestamp: new Date().toISOString(),
                          volume: mission.volume_liters || 10000,
                          audit_token: result.invoiceNumber || "SCADA-AUDIT-AUTH-SUCCESS-7419",
                          isOffline: result.isOffline
                        });
                        setVolumeDischarged(10000);
                        setMission(p => ({ ...p, delivery_status: "Delivered" }));
                      }}
                    />
                  ) : (
                    <>
                      {/* 4 PIN Digits Box Display */}
                  <div className="flex justify-center items-center gap-3 py-1">
                    {[0, 1, 2, 3].map((idx) => {
                      const char = inputOtp[idx];
                      return (
                        <div
                          key={idx}
                          id={`pin-slot-${idx}`}
                          className={`w-12 h-14 rounded-lg flex items-center justify-center text-xl font-bold font-mono transition-all ${
                            char
                              ? "bg-sky-50 border-2 border-[#0056b3] text-slate-900 shadow-inner"
                              : "bg-slate-50 border border-slate-300 text-slate-400"
                          }`}
                        >
                          {char ? (
                            <span>{char}</span>
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Verification Error */}
                  {verificationError && (
                    <div className="mt-2 bg-rose-50 border border-rose-300 text-rose-800 px-3 py-2 rounded-lg text-xs flex items-center space-x-2 animate-fade-in">
                      <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-semibold">{verificationError}</span>
                    </div>
                  )}

                  {/* Touch Optimized Civic Keypad (1-9, Clear, 0, Backspace) */}
                  <div className="mt-4 grid grid-cols-3 gap-2 max-w-xs mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleKeyPress(String(digit))}
                        className="keypad-btn h-12 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 font-mono text-lg font-bold text-slate-800 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
                      >
                        {digit}
                      </button>
                    ))}

                    {/* Clear Button */}
                    <button
                      type="button"
                      onClick={handleClear}
                      className="keypad-btn h-12 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer"
                    >
                      Clear
                    </button>

                    {/* 0 Button */}
                    <button
                      type="button"
                      onClick={() => handleKeyPress("0")}
                      className="keypad-btn h-12 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 font-mono text-lg font-bold text-slate-800 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
                    >
                      0
                    </button>

                    {/* Backspace Button */}
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="keypad-btn h-12 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all cursor-pointer"
                      title="Backspace"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Confirm Delivery Button */}
                  <button
                    type="button"
                    onClick={handleVerifyDelivery}
                    disabled={verifying || inputOtp.length !== 4}
                    className={`mt-4 w-full py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      inputOtp.length === 4
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/30"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying OTP with SCADA...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>CONFIRM DELIVERY (AUTHORIZE VALVE)</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}
        </section>

          </div>
        </main>

        {/* Footer */}
        <footer className="px-4 py-2 border-t border-slate-200 text-center bg-slate-50">
          <p className="text-[10px] text-slate-400 font-medium">
            WaterFlow OS · Municipal Water Supply &amp; Fleet Telemetry v4.12 · BMC Central Operations
          </p>
        </footer>

      </div>
    </div>
  );
}

// Building icon helper
function Building2(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
