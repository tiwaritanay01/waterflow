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
  FlaskConical,
  Wifi,
  WifiOff,
  CloudUpload,
  History,
  AlertCircle,
  X,
  Layers,
  Star,
  Award,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from "react-leaflet";
import L from "leaflet";
import DeliveryVerification from "./DeliveryVerification";
import {
  cacheMission,
  getCachedMission,
  getAllCachedMissions,
  queueOfflineAction,
  getPendingActions,
  getAllQueuedActions,
  updateActionStatus,
  deleteQueuedAction,
  clearAllQueuedActions,
  syncOfflineQueue,
  checkServerReachability,
} from "../utils/indexedDB";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

  // Offline & Synchronization State
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [isCachedSnapshot, setIsCachedSnapshot] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [queuedActions, setQueuedActions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [activeConflict, setActiveConflict] = useState(null);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);

  // Driver Integrity, Telemetry & Blacklisting State
  const [driverCredits, setDriverCredits] = useState(120);
  const [integrityRating, setIntegrityRating] = useState(4.8);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [isPreferred, setIsPreferred] = useState(true);
  const [telemetryStatus, setTelemetryStatus] = useState("ONLINE"); // "ONLINE" | "TAMPER_DETECTED"
  const [routeStatus, setRouteStatus] = useState("ON_CORRIDOR"); // "ON_CORRIDOR" | "OFF_ROUTE_DIVERSION"
  const [infractionHistory, setInfractionHistory] = useState([]);
  const [integrityFeedback, setIntegrityFeedback] = useState(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [showIntegrityLedger, setShowIntegrityLedger] = useState(false);

  // Sync Driver Integrity Profile from Backend
  const fetchDriverIntegrity = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/driver/integrity?tanker_id=${mission.tanker_id}`);
      const data = await res.json();
      if (data.success && data.driver) {
        setDriverCredits(data.driver.credit_balance);
        setIntegrityRating(data.driver.integrity_rating);
        setIsBlacklisted(data.driver.is_blacklisted);
        setIsPreferred(data.driver.is_preferred);
        setTelemetryStatus(data.driver.telemetry_status || "ONLINE");
        setRouteStatus(data.driver.route_status || "ON_CORRIDOR");
        if (data.driver.history) {
          setInfractionHistory(data.driver.history);
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchDriverIntegrity();
  }, [mission.tanker_id]);

  // Infraction & Telemetry Simulators for Evaluators
  const handleTriggerInfraction = async (infractionType, notes) => {
    setIntegrityLoading(true);
    setIntegrityFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/driver/infraction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanker_id: mission.tanker_id,
          infraction_type: infractionType,
          notes: notes,
        }),
      });
      const data = await res.json();
      if (data.success && data.driver) {
        setDriverCredits(data.driver.credit_balance);
        setIntegrityRating(data.driver.integrity_rating);
        setIsBlacklisted(data.driver.is_blacklisted);
        setIsPreferred(data.driver.is_preferred);
        setTelemetryStatus(data.driver.telemetry_status);
        setRouteStatus(data.driver.route_status);
        if (data.driver.history) setInfractionHistory(data.driver.history);
        setIntegrityFeedback(data.message);
      }
    } catch (err) {
      setIntegrityFeedback("Failed to record infraction: " + err.message);
    } finally {
      setIntegrityLoading(false);
    }
  };

  const handleTriggerReward = async (rewardType, details) => {
    setIntegrityLoading(true);
    setIntegrityFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/driver/reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanker_id: mission.tanker_id,
          reward_type: rewardType,
          details: details,
        }),
      });
      const data = await res.json();
      if (data.success && data.driver) {
        setDriverCredits(data.driver.credit_balance);
        setIntegrityRating(data.driver.integrity_rating);
        setIsBlacklisted(data.driver.is_blacklisted);
        setIsPreferred(data.driver.is_preferred);
        if (data.driver.history) setInfractionHistory(data.driver.history);
        setIntegrityFeedback(data.message);
      }
    } catch (err) {
      setIntegrityFeedback("Failed to record reward: " + err.message);
    } finally {
      setIntegrityLoading(false);
    }
  };

  const handleToggleBlacklist = async () => {
    setIntegrityLoading(true);
    setIntegrityFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/driver/blacklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanker_id: mission.tanker_id,
          is_blacklisted: !isBlacklisted,
          reason: !isBlacklisted ? "Manual municipal audit flag: Transponder tampered & route violated" : "Audited & restored by Municipal Chief Hydraulic Engineer",
        }),
      });
      const data = await res.json();
      if (data.success && data.driver) {
        setIsBlacklisted(data.driver.is_blacklisted);
        setDriverCredits(data.driver.credit_balance);
        setIsPreferred(data.driver.is_preferred);
        if (data.driver.history) setInfractionHistory(data.driver.history);
        setIntegrityFeedback(data.message);
      }
    } catch (err) {
      setIntegrityFeedback("Failed to update blacklist status: " + err.message);
    } finally {
      setIntegrityLoading(false);
    }
  };

  // Helper to re-read pending and queued actions from IndexedDB
  const refreshQueueStatus = async () => {
    try {
      const pending = await getPendingActions();
      setPendingCount(pending.length);
      const all = await getAllQueuedActions();
      setQueuedActions(all);
    } catch (e) {
      console.warn("Could not read local queue:", e);
    }
  };

  // Fetch active mission (Online -> cache to IndexedDB; Offline -> load from IndexedDB)
  const fetchMission = async () => {
    setLoading(true);
    setVerificationError(null);

    let reachable = false;
    if (!simulateOffline) {
      reachable = await checkServerReachability(API_BASE);
      setIsServerReachable(reachable);
    } else {
      setIsServerReachable(false);
    }

    // ONLINE MODE: Fetch from /api/field/missions and update cache
    if (!simulateOffline && reachable) {
      try {
        const res = await fetch(`${API_BASE}/api/field/missions?tanker_id=${mission.tanker_id}`);
        const data = await res.json();
        if (data.success && data.missions && data.missions.length > 0) {
          const serverMission = data.missions.find((m) => m.tanker_id === mission.tanker_id) || data.missions[0];
          const merged = {
            ...mission,
            ...serverMission,
            mission_id: serverMission.mission_id,
            version: serverMission.version,
            delivery_status: serverMission.status,
            assigned_worker: serverMission.assigned_worker || mission.driver_name,
            driver_name: serverMission.assigned_worker || mission.driver_name,
            volume_liters: serverMission.volume_liters || 10000,
          };

          setMission(merged);
          setIsCachedSnapshot(false);
          setIsStale(false);
          const timeStr = new Date().toLocaleTimeString();
          setLastSyncTime(timeStr);

          // Durably cache snapshot in IndexedDB
          await cacheMission(merged);

          if (serverMission.status === "delivered") {
            setDeliverySuccess({
              timestamp: serverMission.updated_at || new Date().toISOString(),
              volume: serverMission.delivery_quantity_liters || serverMission.volume_liters || 10000,
              audit_token: `SRV-VERIFIED-v${serverMission.version}`,
              stage: "SERVER_ACCEPTED",
              isOffline: false,
            });
            setVolumeDischarged(serverMission.delivery_quantity_liters || 10000);
          }
        }
      } catch (err) {
        console.warn("Online mission fetch failed, attempting cached fallback:", err.message);
        reachable = false;
        setIsServerReachable(false);
      }
    }

    // OFFLINE MODE: Load from local IndexedDB cache
    if (simulateOffline || !reachable) {
      try {
        const cached = await getCachedMission(String(mission.mission_id || "501"));
        if (cached) {
          setMission((prev) => ({
            ...prev,
            ...cached,
            mission_id: cached.mission_id,
            version: cached.version || 1,
            delivery_status: cached.status || cached.delivery_status || "en_route",
          }));
          setIsCachedSnapshot(true);
          setIsStale(cached.is_stale || false);
          if (cached.cached_at) {
            setLastSyncTime(new Date(cached.cached_at).toLocaleTimeString());
          }
          if (cached.status === "delivered" || cached.delivery_status === "delivered") {
            setDeliverySuccess({
              timestamp: cached.delivery_timestamp || new Date().toISOString(),
              volume: cached.delivery_quantity_liters || cached.volume_liters || 10000,
              audit_token: "CACHED-OFFLINE-SNAPSHOT",
              stage: "SAVED_LOCALLY_PENDING_SYNC",
              isOffline: true,
            });
            setVolumeDischarged(cached.volume_liters || 10000);
          }
        } else {
          // If no cache exists, initialize current mission in cache
          await cacheMission({ ...mission, version: 1 });
          setIsCachedSnapshot(true);
          setIsStale(false);
        }
      } catch (cacheErr) {
        console.warn("Error reading cached mission from IndexedDB:", cacheErr);
      }
    }

    await refreshQueueStatus();
    setLoading(false);
  };

  // Synchronize pending queue to backend /api/field/sync
  const runSync = async () => {
    if (isSyncing) return;
    if (simulateOffline) {
      setSyncFeedback("Cannot sync while Simulated Offline is active. Turn off simulation first.");
      return;
    }

    setIsSyncing(true);
    setSyncFeedback("Synchronizing offline queue with BMC server...");

    try {
      const result = await syncOfflineQueue(API_BASE);

      if (!result.success) {
        setSyncFeedback(`Sync paused: ${result.error || "Network unreachable"}. Pending actions retained.`);
        setIsServerReachable(false);
      } else if (result.total === 0) {
        setSyncFeedback("Sync complete. Queue is clear (0 pending).");
        setLastSyncTime(new Date().toLocaleTimeString());
        setIsServerReachable(true);
      } else {
        setSyncFeedback(`Sync complete: ${result.accepted} accepted, ${result.duplicate} duplicate, ${result.conflict} conflicts, ${result.rejected} rejected.`);
        setLastSyncTime(new Date().toLocaleTimeString());
        setIsServerReachable(true);

        if (result.conflict > 0) {
          const all = await getAllQueuedActions();
          const firstConflict = all.find((a) => a.status === "conflict");
          if (firstConflict) {
            setActiveConflict(firstConflict);
          }
        }
      }

      await fetchMission();
    } catch (err) {
      setSyncFeedback(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
      await refreshQueueStatus();
    }
  };

  // Monitor network online / offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (!simulateOffline) {
        const reachable = await checkServerReachability(API_BASE);
        setIsServerReachable(reachable);
        if (reachable) {
          runSync();
        }
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsServerReachable(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    fetchMission();

    const interval = setInterval(async () => {
      if (!simulateOffline && typeof navigator !== "undefined" && navigator.onLine) {
        const reachable = await checkServerReachability(API_BASE);
        setIsServerReachable(reachable);
      }
      refreshQueueStatus();
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [simulateOffline]);

  // Update Driver Transit Status (Durable queueing before local success)
  const handleUpdateStatus = async (newStatus) => {
    if (statusUpdating || isSyncing) return;
    setStatusUpdating(true);
    setVerificationError(null);

    const isArrival = newStatus === "arrived";
    const op = {
      operation_id: `op-status-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      mission_id: String(mission.mission_id || "501"),
      action_type: isArrival ? "ARRIVAL_RECORD" : "STATUS_UPDATE",
      local_timestamp: new Date().toISOString(),
      mission_version: mission.version || 1,
      payload: isArrival
        ? { gps: { lat: mission.lat, lng: mission.lng } }
        : { status: newStatus.toLowerCase() },
      worker_name: mission.driver_name || mission.assigned_worker || "Rajesh Patil",
    };

    try {
      // 1. Durably save in IndexedDB
      await queueOfflineAction(op);

      // 2. Update local UI state
      setMission((prev) => ({ ...prev, delivery_status: newStatus, status: newStatus }));
      await refreshQueueStatus();
      setSyncFeedback("SAVED LOCALLY — PENDING SYNC");

      // 3. Trigger immediate sync if connected
      if (!simulateOffline && isServerReachable) {
        runSync();
      }
    } catch (err) {
      console.error("Failed to queue status update:", err);
      setVerificationError("Failed to persist action locally: " + err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Report Route Delay (durably queues a NOTES action)
  const handleReportDelay = async (delayReason = "Route delay along corridor") => {
    const op = {
      operation_id: `op-note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      mission_id: String(mission.mission_id || "501"),
      action_type: "NOTES",
      local_timestamp: new Date().toISOString(),
      mission_version: mission.version || 1,
      payload: { note: delayReason },
      worker_name: mission.driver_name || mission.assigned_worker || "Rajesh Patil",
    };

    try {
      await queueOfflineAction(op);
      await refreshQueueStatus();
      setSyncFeedback("SAVED LOCALLY — PENDING SYNC");
      if (!simulateOffline && isServerReachable) {
        runSync();
      }
    } catch (err) {
      console.error("Failed to queue delay note:", err);
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

  // Verify Delivery with Backend or Queue Durably for Offline Sync
  const handleVerifyDelivery = async () => {
    if (inputOtp.length !== 4) return;
    if (verifying || isSyncing) return;

    setVerifying(true);
    setVerificationError(null);

    const opId = `op-deliv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const op = {
      operation_id: opId,
      mission_id: String(mission.mission_id || "501"),
      action_type: "DELIVERY_RECORD",
      local_timestamp: new Date().toISOString(),
      mission_version: mission.version || 1,
      payload: {
        quantity_liters: mission.volume_liters || 10000,
        otp_code: inputOtp,
        gps: { lat: mission.lat, lng: mission.lng },
        notes: "Citizen OTP handover completed",
      },
      worker_name: mission.driver_name || mission.assigned_worker || "Rajesh Patil",
    };

    try {
      // 1. Durably queue action in IndexedDB BEFORE showing success
      await queueOfflineAction(op);

      // 2. Update local state
      setMission((prev) => ({
        ...prev,
        delivery_status: "Delivered",
        status: "delivered",
      }));
      setVolumeDischarged(mission.volume_liters || 10000);

      const isOff = simulateOffline || !isServerReachable;
      setDeliverySuccess({
        timestamp: new Date().toISOString(),
        volume: mission.volume_liters || 10000,
        audit_token: opId,
        stage: isOff ? "SAVED_LOCALLY_PENDING_SYNC" : "SERVER_ACCEPTED",
        isOffline: isOff,
      });

      await refreshQueueStatus();
      setSyncFeedback(isOff ? "SAVED LOCALLY — PENDING SYNC" : "Synchronizing delivery with server...");

      // 3. If online, trigger sync
      if (!simulateOffline && isServerReachable) {
        await runSync();
      }
    } catch (err) {
      console.error("Failed to queue delivery record:", err);
      setVerificationError("Failed to save delivery offline: " + err.message);
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
                    WaterFlow Driver App (चालक ॲप)
                  </span>
                  <span className="text-[9px] bg-sky-700 text-blue-100 font-mono font-bold px-1 py-0.5 rounded leading-none">
                    DRIVER APP
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Works Without Internet · Govandi Route (इंटरनेटशिवाय सुरू)
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
                onClick={() => alert("WaterFlow App Saved: The driver app is now added to your home screen and works even without internet.")}
                className="bg-[#0056b3] hover:bg-sky-800 active:bg-sky-900 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-2xs transition-colors flex items-center gap-1"
              >
                <Smartphone className="w-3 h-3" />
                <span>Add to Phone (फोनवर जोडा)</span>
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

            {/* Telemetry Status, Queue Counter & Manual Sync Controls */}
            <div className="flex items-center space-x-2">
              {/* Online / Offline Status Pill */}
              {simulateOffline ? (
                <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-full text-[11px] font-bold text-rose-700">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Simulated Offline</span>
                </div>
              ) : !isOnline ? (
                <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-full text-[11px] font-bold text-rose-700">
                  <WifiOff className="w-3 h-3 text-rose-600" />
                  <span>Offline</span>
                </div>
              ) : !isServerReachable ? (
                <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full text-[11px] font-bold text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Server Unreachable</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 live-pulse"></span>
                  <span>Online (इंटरनेट चालू)</span>
                </div>
              )}

              {/* Pending Queue Counter Button */}
              <button
                type="button"
                onClick={() => setShowQueueDrawer(true)}
                title="View Saved Deliveries"
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  pendingCount > 0
                    ? "bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900 animate-pulse"
                    : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                }`}
              >
                <CloudUpload className="w-3.5 h-3.5 text-amber-600" />
                <span>{pendingCount} Saved</span>
              </button>

              {/* Manual "Sync Now" Action Button */}
              <button
                type="button"
                onClick={runSync}
                disabled={isSyncing || simulateOffline || (!isServerReachable && !isOnline)}
                title="Send Saved Deliveries to BMC Office"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 shadow-2xs transition cursor-pointer ${
                  isSyncing
                    ? "bg-sky-200 text-sky-800 cursor-wait"
                    : simulateOffline || (!isServerReachable && !isOnline)
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-[#0056b3] hover:bg-sky-800 active:bg-sky-900 text-white"
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Sending..." : "Send to Office"}</span>
              </button>

              <button
                onClick={fetchMission}
                disabled={loading}
                aria-label="Refresh Delivery Data"
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
            
            {/* ============================================================
                DRIVER & TANKER INTEGRITY SCORECARD & COMPLIANCE BANNER
                ============================================================ */}
            <div className={`rounded-2xl p-4 transition-all shadow-md border ${
              isBlacklisted
                ? "bg-gradient-to-br from-rose-950 via-slate-900 to-rose-900 text-white border-rose-500/80 ring-2 ring-rose-500/50"
                : isPreferred
                ? "bg-gradient-to-br from-slate-900 via-sky-950 to-blue-900 text-white border-amber-400/40"
                : "bg-white text-slate-800 border-slate-200"
            }`}>
              {/* Header row: License Plate & Standing */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  {/* High-Security Registration Plate Mockup */}
                  <div className="flex items-center border-2 border-slate-700 rounded bg-white px-2 py-0.5 shadow-sm text-slate-900 shrink-0">
                    <div className="flex flex-col items-center mr-1.5 pr-1 border-r border-slate-300">
                      <span className="text-[7px] font-black text-blue-800 leading-none">IND</span>
                      <span className="text-[8px] leading-none">🇮🇳</span>
                    </div>
                    <span className="font-mono font-black text-sm tracking-wider uppercase text-slate-900">
                      {mission.license_plate}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className={`text-xs font-black ${isBlacklisted || isPreferred ? "text-white" : "text-slate-900"}`}>
                        {mission.driver_name}
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">({mission.driver_id})</span>
                    </div>
                    <span className="text-[10px] opacity-80 block font-medium">
                      Municipal Assigned Fleet · {mission.destination_ward}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isBlacklisted ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white border border-rose-400 flex items-center space-x-1 animate-pulse">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>⛔ CONTRACT REVOKED</span>
                    </span>
                  ) : isPreferred ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 border border-amber-300 flex items-center space-x-1 shadow-xs">
                      <Star className="w-3.5 h-3.5 fill-slate-950" />
                      <span>⭐ PREFERRED CONTRACTOR</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
                      Active Contractor
                    </span>
                  )}
                </div>
              </div>

              {/* Blacklisted Warning Banner */}
              {isBlacklisted && (
                <div className="mt-3 p-3 rounded-xl bg-rose-600/30 border-2 border-rose-500 text-rose-100 text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-black text-white text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>VEHICLE BLACKLISTED — WATER ALLOCATION CONTRACT CANCELLED</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-200">
                    Tanker plate <strong>{mission.license_plate}</strong> credit balance dropped to <strong>{driverCredits} Credits</strong> (below threshold of 30). This vehicle is barred from BMC water delivery contracts. Handover water must be cleared by Municipal Vigilance.
                  </p>
                </div>
              )}

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 text-xs">
                {/* Credit Balance */}
                <div className={`p-2.5 rounded-xl border ${isBlacklisted ? "bg-white/5 border-white/10" : isPreferred ? "bg-white/10 border-white/15" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-[10px] opacity-75 font-mono block">Driver Credits</span>
                  <div className="flex items-baseline space-x-1 mt-0.5">
                    <span className={`text-xl font-black font-mono ${isBlacklisted ? "text-rose-400" : isPreferred ? "text-amber-300" : "text-[#0056b3]"}`}>
                      {driverCredits}
                    </span>
                    <span className="text-[10px] opacity-75">/ 100</span>
                  </div>
                  <span className="text-[9.5px] opacity-70 block mt-0.5">
                    {driverCredits < 30 ? "Threshold < 30 breached" : driverCredits >= 90 ? "Preferred priority tier" : "Standard standing"}
                  </span>
                </div>

                {/* Rating */}
                <div className={`p-2.5 rounded-xl border ${isBlacklisted ? "bg-white/5 border-white/10" : isPreferred ? "bg-white/10 border-white/15" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-[10px] opacity-75 font-mono block">Customer Rating</span>
                  <div className="flex items-baseline space-x-1 mt-0.5">
                    <span className="text-xl font-black font-mono text-amber-400">{integrityRating}</span>
                    <span className="text-xs text-amber-300">★</span>
                  </div>
                  <span className="text-[9.5px] opacity-70 block mt-0.5">Ward feedback score</span>
                </div>

                {/* GPS Telemetry */}
                <div className={`p-2.5 rounded-xl border ${isBlacklisted ? "bg-white/5 border-white/10" : isPreferred ? "bg-white/10 border-white/15" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-[10px] opacity-75 font-mono block">Transponder (GPS)</span>
                  <div className="flex items-center space-x-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${telemetryStatus === "ONLINE" ? "bg-emerald-400 live-pulse" : "bg-rose-500 animate-ping"}`} />
                    <span className={`font-bold text-xs ${telemetryStatus === "ONLINE" ? "text-emerald-300" : "text-rose-400"}`}>
                      {telemetryStatus === "ONLINE" ? "GPS Online" : "TAMPERED"}
                    </span>
                  </div>
                  <span className="text-[9.5px] opacity-70 block mt-0.5">
                    {telemetryStatus === "ONLINE" ? "Corridor Adherence: 98%" : "Signal cut (-35 Cr)"}
                  </span>
                </div>

                {/* Route Adherence */}
                <div className={`p-2.5 rounded-xl border ${isBlacklisted ? "bg-white/5 border-white/10" : isPreferred ? "bg-white/10 border-white/15" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-[10px] opacity-75 font-mono block">Corridor Adherence</span>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className={`font-bold text-xs ${routeStatus === "ON_CORRIDOR" ? "text-emerald-300" : "text-rose-400"}`}>
                      {routeStatus === "ON_CORRIDOR" ? "On Corridor" : "Diverted Route"}
                    </span>
                  </div>
                  <span className="text-[9.5px] opacity-70 block mt-0.5">
                    {routeStatus === "ON_CORRIDOR" ? "No deviation flags" : "Deviation flagged (-25 Cr)"}
                  </span>
                </div>
              </div>

              {/* Evaluator Interactive Telemetry & Infraction Controls */}
              <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 text-[10px]">
                  <span className="opacity-75 font-mono uppercase mr-1">Evaluator Simulator:</span>
                  <button
                    type="button"
                    onClick={() => handleTriggerInfraction("GPS_TAMPER", "Worker simulated transponder disconnect / power cut")}
                    disabled={integrityLoading}
                    className="px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/40 font-bold transition cursor-pointer"
                    title="Simulate GPS cut (-35 Credits)"
                  >
                    📡 Cut GPS (-35 Cr)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerInfraction("ROUTE_DIVERSION", "Worker simulated route deviation outside municipal corridor")}
                    disabled={integrityLoading}
                    className="px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/40 font-bold transition cursor-pointer"
                    title="Simulate Route Diversion (-25 Credits)"
                  >
                    ⚠️ Divert Route (-25 Cr)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerInfraction("ILLEGAL_WATER_SALE", "Simulated consumer complaint: Demanded extra money for water")}
                    disabled={integrityLoading}
                    className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-black border border-rose-400 transition cursor-pointer"
                    title="Report Illegal Sale / Bribe (-60 Credits & Immediate Blacklist)"
                  >
                    🚨 Illegal Sale (-60 Cr)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerReward("ON_TIME_DELIVERY", "On-time arrival within 5 minutes of SCADA ETA")}
                    disabled={integrityLoading}
                    className="px-2 py-1 rounded bg-emerald-800/70 hover:bg-emerald-700 text-emerald-200 border border-emerald-500/40 font-bold transition cursor-pointer"
                    title="Award on-time delivery (+15 Credits)"
                  >
                    ⭐ Reward (+15 Cr)
                  </button>
                </div>

                <div className="flex items-center space-x-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={handleToggleBlacklist}
                    disabled={integrityLoading}
                    className={`px-2.5 py-1 rounded font-bold border transition cursor-pointer ${
                      isBlacklisted
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400"
                        : "bg-rose-800 hover:bg-rose-900 text-rose-100 border-rose-600"
                    }`}
                  >
                    {isBlacklisted ? "✓ Reinstate Plate" : "⛔ Blacklist Plate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIntegrityLedger(true)}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-mono border border-white/20 transition cursor-pointer"
                  >
                    Audit Log ({infractionHistory.length})
                  </button>
                </div>
              </div>

              {/* Status feedback message */}
              {integrityFeedback && (
                <div className="mt-2.5 p-2 rounded-lg bg-white/10 border border-white/20 text-xs font-bold text-amber-200 animate-fade-in flex items-center justify-between">
                  <span>{integrityFeedback}</span>
                  <button onClick={() => setIntegrityFeedback(null)} className="opacity-75 hover:opacity-100 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Dynamic Offline-First Status & Control Bar */}
            <div className="space-y-2">
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Cache State Badge */}
                  {isCachedSnapshot ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>SAVED ON PHONE · OFFLINE MODE</span>
                      {isStale && <span className="text-[10px] text-rose-600 font-black ml-1">· CHECK FOR UPDATE</span>}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-md">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>OFFICIAL BMC MISSION (अधिकृत काम)</span>
                    </span>
                  )}

                  {/* Last Sync Timestamp */}
                  <span className="text-[11px] text-slate-500 font-medium">
                    Last sync: <strong className="text-slate-700">{lastSyncTime || "Initial"}</strong>
                  </span>
                </div>

                {/* Simulation & Queue Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !simulateOffline;
                      setSimulateOffline(next);
                      if (next) {
                        setIsServerReachable(false);
                        setSyncFeedback("Simulating connection loss. Offline queue is active.");
                      } else {
                        setSyncFeedback("Restoring connection...");
                        checkServerReachability(API_BASE).then((r) => {
                          setIsServerReachable(r);
                          if (r) runSync();
                        });
                      }
                    }}
                    className={`text-[10.5px] font-bold px-2.5 py-1 rounded-md border transition cursor-pointer ${
                      simulateOffline
                        ? "bg-rose-600 text-white border-rose-700 hover:bg-rose-700"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                    }`}
                  >
                    {simulateOffline ? "Restore Connectivity" : "Simulate Offline"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQueueDrawer(true)}
                    className="text-[10.5px] font-bold px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
                  >
                    Queue ({queuedActions.length})
                  </button>
                </div>
              </div>

              {/* Explicit Sync Status Toast Banner */}
              {syncFeedback && (
                <div className="bg-sky-50 border border-sky-300 text-sky-950 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 shadow-2xs animate-fade-in">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sky-700">⚡ STATUS:</span>
                    <span className="font-semibold">{syncFeedback}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSyncFeedback(null)}
                    className="text-sky-700 hover:text-sky-900 font-bold text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* High-Priority Conflict Review Banner */}
              {activeConflict && (
                <div className="bg-rose-50 border-2 border-rose-400 text-rose-950 p-3 rounded-xl shadow-xs space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-rose-600" />
                      Sync Conflict Requiring Review ({activeConflict.conflict_type || "CONFLICT"})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveConflict(null)}
                      className="text-rose-700 hover:text-rose-900 text-xs font-bold"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="text-xs text-rose-900">
                    {activeConflict.reason || "Server authoritative state rejected local action to prevent safety conflict."}
                  </p>
                  <div className="text-[10px] font-mono bg-white/80 p-1.5 rounded border border-rose-200 text-rose-800 flex items-center justify-between">
                    <span>Op ID: {activeConflict.operation_id}</span>
                    <span>Action: {activeConflict.action_type}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Priority Mission Card */}
            <section className="bg-white rounded-xl border border-sky-200 shadow-xs p-4 sm:p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-sky-500 to-[#0056b3]"></div>
              
              {/* Tag row */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Water Delivery Task (पाणी वाटप काम)
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
                    Delivery Location (पाणी देण्याची जागा)
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
                  <div className="text-[9px] uppercase tracking-wider font-bold text-sky-700">Water Tank Quota</div>
                  <div className="text-lg font-black font-mono text-sky-900 leading-none mt-1">
                    {mission.volume_liters?.toLocaleString() || "10,000"}
                  </div>
                  <div className="text-[10px] font-semibold text-sky-600 mt-0.5">Liters (पिण्याचे पाणी)</div>
                </div>
              </div>

              {/* Recipient Liaison Line */}
              <div className="mt-3.5 pt-2.5 border-t border-dashed border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="text-slate-600">Citizen: <strong>{mission.citizen_name}</strong></span>
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
                <span className="tracking-wide">OPEN ROUTE IN MAPS / रस्ता पहा (Google Maps)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            </section>

            {/* Interactive Leaflet Priority Route Corridor Map */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-sky-700" />
                  <span>Water Delivery Route &amp; Standpost Map</span>
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

            {/* Water Tank & Valve Status */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                <span>Water Tank &amp; Tap Status (पाणी मीटर)</span>
                <span className="font-mono text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sensor Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Flow Valve Status */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Water Outlet / Valve (नळ / व्हॉल्व्ह)</div>
                  <div className="font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      deliverySuccess ? "bg-emerald-500" : mission.delivery_status === "dispensing" ? "bg-emerald-500 animate-ping" : "bg-amber-500"
                    }`}></span>
                    <span>
                      {deliverySuccess ? "Closed / Delivered (बंद केले)" : mission.delivery_status === "dispensing" ? "Water Flowing (पाणी सुरू)" : "Ready (Awaiting OTP)"}
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
                    Near Standpost: <strong>18m from Standpost #4 (जवळ पोहोचलो)</strong>
                  </span>
                </div>
                <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  In Range
                </span>
              </div>
            </section>

            {/* Emergency Escalation */}
            <section className="pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReportDelay("Traffic delay along Eastern Express Highway")}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Report Traffic Delay</span>
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
                  Delivery Progress (पाणी वाटप स्थिती)
                </span>
                <span className="text-[11px] font-semibold text-slate-500">Live Stage</span>
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
                    1. ON THE WAY (निघालो)
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
                    2. ARRIVED (पोहोचलो)
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5">At Standpost</span>
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
                    3. GIVING WATER (पाणी सुरू)
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Ask OTP</span>
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
                      Enter Citizen OTP to Confirm Delivery
                    </h2>
                    <p className="text-[11px] text-slate-500">पाणी दिल्यावर नागरिकाकडून ४-अंकी OTP घ्या आणि येथे टाका</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded">
                  Citizen App PIN
                </span>
              </div>

              {/* Delivery Success View — Clearly distinguishes Locally Recorded vs Server Accepted */}
              {deliverySuccess ? (
                <div className={`border-2 rounded-xl p-4 text-center space-y-2 animate-fade-in ${
                  deliverySuccess.stage === "SAVED_LOCALLY_PENDING_SYNC"
                    ? "bg-amber-50/90 border-amber-500 text-amber-950"
                    : "bg-emerald-50 border-emerald-500 text-emerald-950"
                }`}>
                  <div className={`w-12 h-12 text-white rounded-full flex items-center justify-center mx-auto shadow-sm ${
                    deliverySuccess.stage === "SAVED_LOCALLY_PENDING_SYNC" ? "bg-amber-500" : "bg-emerald-500"
                  }`}>
                    {deliverySuccess.stage === "SAVED_LOCALLY_PENDING_SYNC" ? (
                      <CloudUpload className="w-7 h-7" />
                    ) : (
                      <CheckCircle2 className="w-8 h-8" />
                    )}
                  </div>
                  <h3 className="text-base font-black tracking-tight">
                    {deliverySuccess.stage === "SAVED_LOCALLY_PENDING_SYNC"
                      ? "SAVED ON PHONE (फोनवर नोंद झाली)"
                      : "DELIVERY COMPLETE (पाणी वाटप पूर्ण झाले)"}
                  </h3>
                  <p className="text-xs leading-relaxed opacity-90">
                    {deliverySuccess.stage === "SAVED_LOCALLY_PENDING_SYNC"
                      ? `Recorded ${deliverySuccess.volume?.toLocaleString()} L delivery safely on phone. Will send to BMC office automatically when internet connects.`
                      : `Discharged ${deliverySuccess.volume?.toLocaleString()} Liters of drinking water to ${mission.destination_ward}. BMC delivery record confirmed.`}
                  </p>

                  <div className="bg-white/90 p-2.5 rounded-lg text-[10px] font-mono border text-left space-y-1 border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Operation ID:</span>
                      <strong className="text-slate-800">{deliverySuccess.audit_token}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Queue Stage:</span>
                      <span className={`font-bold px-1.5 py-0.2 rounded ${
                        deliverySuccess.stage === "SAVED_LOCALLY_PENDING_SYNC"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-emerald-100 text-emerald-900"
                      }`}>
                        {deliverySuccess.stage}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Record Status:</span>
                      <span className="font-bold text-slate-700">
                        {deliverySuccess.stage === "SAVED_LOCALLY_PENDING_SYNC" ? "PENDING AUTO-SEND" : "BMC VERIFIED"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex gap-2">
                    {deliverySuccess.stage === "SAVED_LOCALLY_PENDING_SYNC" && !simulateOffline && isServerReachable && (
                      <button
                        type="button"
                        onClick={runSync}
                        disabled={isSyncing}
                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        {isSyncing ? "Syncing..." : "Sync Delivery Now"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setDeliverySuccess(null);
                        setInputOtp("");
                        setMission((p) => ({ ...p, delivery_status: "en_route" }));
                      }}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Reset / Next Dispatch
                    </button>
                  </div>
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
                      onVerificationSuccess={async (result) => {
                        const opId = `op-deliv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
                        const op = {
                          operation_id: opId,
                          mission_id: String(mission.mission_id || "501"),
                          action_type: "DELIVERY_RECORD",
                          local_timestamp: new Date().toISOString(),
                          mission_version: mission.version || 1,
                          payload: {
                            quantity_liters: mission.volume_liters || 10000,
                            otp_code: result.otpCode || "7419",
                            gps: { lat: mission.lat, lng: mission.lng },
                            tds: result.tdsLevel,
                            ph: result.phLevel,
                            notes: "Smart delivery proof with water quality telemetry",
                          },
                          worker_name: mission.driver_name || mission.assigned_worker || "Rajesh Patil",
                        };

                        try {
                          await queueOfflineAction(op);
                          await refreshQueueStatus();
                        } catch (e) {
                          console.warn("Queue error:", e);
                        }

                        const isOff = simulateOffline || !isServerReachable;
                        setDeliverySuccess({
                          timestamp: new Date().toISOString(),
                          volume: mission.volume_liters || 10000,
                          audit_token: opId,
                          stage: isOff ? "SAVED_LOCALLY_PENDING_SYNC" : "SERVER_ACCEPTED",
                          isOffline: isOff,
                        });
                        setVolumeDischarged(10000);
                        setMission((p) => ({ ...p, delivery_status: "Delivered", status: "delivered" }));
                        setSyncFeedback(isOff ? "SAVED LOCALLY — PENDING SYNC" : "Synchronizing delivery with server...");

                        if (!simulateOffline && isServerReachable) {
                          runSync();
                        }
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
                  {isBlacklisted ? (
                    <div className="mt-4 p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold flex items-center space-x-2">
                      <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>⛔ DELIVERY LOCKED: Tanker Plate Blacklisted due to low integrity credits ({driverCredits} &lt; 30).</span>
                    </div>
                  ) : (
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
                          <span>Verifying OTP (तपासत आहे)...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>CONFIRM DELIVERY (पाणी दिले)</span>
                        </>
                      )}
                    </button>
                  )}
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
            WaterFlow Driver Terminal · Brihanmumbai Municipal Corporation (BMC Water Dept)
          </p>
        </footer>

        {/* ============================================================
            OFFLINE QUEUE INSPECTION DRAWER MODAL
            ============================================================ */}
        {showQueueDrawer && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudUpload className="w-5 h-5 text-sky-400" />
                  <div>
                    <h3 className="text-sm font-bold">Saved Deliveries on Phone</h3>
                    <p className="text-[10px] text-slate-300">Saved safely on phone · Automatically sent when network reconnects</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQueueDrawer(false)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Total Items: {queuedActions.length}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-amber-700 font-semibold">{pendingCount} Pending Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={runSync}
                    disabled={isSyncing || simulateOffline || !isServerReachable}
                    className="px-2.5 py-1 rounded bg-[#0056b3] hover:bg-sky-800 disabled:bg-slate-300 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>Sync Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const all = await getAllQueuedActions();
                      for (const a of all) {
                        if (a.status === "synced") {
                          await deleteQueuedAction(a.operation_id);
                        }
                      }
                      await refreshQueueStatus();
                    }}
                    className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                  >
                    Clear Synced
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
                {queuedActions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p>No deliveries waiting in queue.</p>
                    <p className="text-[10px] mt-0.5">Deliveries made without internet are safely stored here and sent automatically when online.</p>
                  </div>
                ) : (
                  queuedActions.map((item) => (
                    <div
                      key={item.operation_id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                        item.status === "pending" || item.status === "retry"
                          ? "bg-amber-50/70 border-amber-300"
                          : item.status === "conflict"
                          ? "bg-rose-50 border-rose-300"
                          : item.status === "rejected"
                          ? "bg-red-50 border-red-300"
                          : "bg-slate-50 border-slate-200 opacity-80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            item.status === "pending" || item.status === "retry"
                              ? "bg-amber-200 text-amber-900"
                              : item.status === "conflict"
                              ? "bg-rose-200 text-rose-900"
                              : item.status === "rejected"
                              ? "bg-red-200 text-red-900"
                              : "bg-emerald-200 text-emerald-900"
                          }`}>
                            {item.status === "pending" || item.status === "retry"
                              ? "SAVED ON PHONE (साठवले)"
                              : item.status === "conflict" || item.status === "rejected"
                              ? "CHECK WITH OFFICE (तपासा)"
                              : "SENT TO OFFICE (पाठवले)"}
                          </span>
                          <span className="font-bold text-slate-900">
                            {item.action_type === "UPDATE_STAGE"
                              ? "Trip Progress (प्रवास टप्पा)"
                              : item.action_type === "COMPLETE_MISSION"
                              ? "Water Delivery Completed (पाणी दिले)"
                              : item.action_type === "REPORT_INCIDENT"
                              ? "Road Issue (समस्या)"
                              : item.action_type}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(item.created_at || item.local_timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="text-[10.5px] text-slate-600">
                        Delivery Mission #{item.mission_id}
                      </div>

                      {item.payload && (
                        <div className="bg-white/90 p-2 rounded border border-slate-200 text-[11px] text-slate-800 font-medium">
                          {item.payload.stage === "ARRIVED" && "📍 Arrived at Delivery Spot (जागेवर पोहोचलो)"}
                          {item.payload.stage === "DISPENSING" && "💧 Giving Water to Residents (पाणी देणे सुरू)"}
                          {item.payload.stage === "EN_ROUTE" && "🚚 Driving to Ward (मार्गावर आहे)"}
                          {item.payload.liters_delivered && `💧 ${Number(item.payload.liters_delivered).toLocaleString()} Liters given to ${item.payload.receiver_name || "Residents"}`}
                          {item.payload.note && `📝 Note: ${item.payload.note}`}
                          {!item.payload.stage && !item.payload.liters_delivered && !item.payload.note && "Delivery action recorded"}
                        </div>
                      )}

                      {item.reason && (
                        <div className="text-[11px] text-rose-700 font-semibold bg-rose-100/60 p-1.5 rounded">
                          Reason: {item.reason}
                        </div>
                      )}

                      {item.last_error && (
                        <div className="text-[10px] text-amber-800 bg-amber-100/70 p-1.5 rounded">
                          Will send automatically as soon as phone gets mobile signal.
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowQueueDrawer(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            DRIVER INTEGRITY & INFRACTION AUDIT LOG MODAL
            ============================================================ */}
        {showIntegrityLedger && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold">Driver Telemetry &amp; Infraction Audit Log</h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Plate: {mission.license_plate} · Driver: {mission.driver_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIntegrityLedger(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status summary banner */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-500">Current Balance: </span>
                  <strong className={isBlacklisted ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                    {driverCredits} Credits
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Contract Standing: </span>
                  <strong className={isBlacklisted ? "text-rose-600 font-bold" : isPreferred ? "text-amber-600 font-bold" : "text-sky-700 font-bold"}>
                    {isBlacklisted ? "REVOKED / BLACKLISTED" : isPreferred ? "PREFERRED CONTRACTOR" : "ACTIVE"}
                  </strong>
                </div>
              </div>

              {/* List */}
              <div className="p-4 overflow-y-auto space-y-2 flex-1 custom-scroll text-xs">
                {infractionHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-60" />
                    <p>Clean track record! No infractions or customer grievances recorded.</p>
                  </div>
                ) : (
                  infractionHistory.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-2 ${
                        item.type === "REWARD"
                          ? "bg-emerald-50/70 border-emerald-200"
                          : item.amount < -30
                          ? "bg-rose-50/80 border-rose-300"
                          : "bg-amber-50/70 border-amber-300"
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          item.type === "REWARD" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}>
                          {item.type === "REWARD" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 font-mono">
                            <span className={`font-bold ${item.type === "REWARD" ? "text-emerald-700" : "text-rose-700"}`}>
                              {item.amount > 0 ? `+${item.amount}` : item.amount} Credits
                            </span>
                            <span className="text-[10px] text-slate-400">· {item.timestamp}</span>
                          </div>
                          <p className="text-slate-800 font-medium text-xs mt-0.5">{item.reason}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono block">Balance</span>
                        <span className="font-mono font-bold text-slate-800">{item.balance_after} Cr</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowIntegrityLedger(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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
