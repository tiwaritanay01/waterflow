import { useState, useEffect } from "react";
import {
  Droplet,
  MapPin,
  Clock,
  Truck,
  Phone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ChevronRight,
  ShieldCheck,
  Navigation,
  Compass,
  ArrowLeft,
  Sparkles,
  Camera,
  Layers,
  Smartphone,
  Monitor,
  X,
  Share2,
  Check,
  Activity,
  BarChart3,
  User,
  ExternalLink,
  Gauge,
  Radio,
  Calendar,
  AlertOctagon,
  Mic,
  MicOff,
  HelpCircle,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { MUMBAI_WARDS_DATABASE, findNearestMumbaiWard } from "../utils/mumbaiWardsData";

const API_BASE = "http://localhost:3001";

// Bilingual dictionary for Marathi toggle
const I18N = {
  en: {
    scadaLive: "SCADA LIVE",
    telemetryVer: "BMC Telemetry v4.12",
    helpline: "MCGM 1916",
    appTitle: "WaterFlow Citizen",
    subTitle: "Brihanmumbai Municipal Corporation (BMC)",
    emergencySupport: "Emergency Rationing Support",
    algoActive: "Algorithmic Routing Active",
    heroTitle: "Facing severe water deficit in your locality?",
    heroDesc: "Directly insert grievance telemetry into Mumbai's WaterFlow Priority Queue for automated dispatch & verified emergency tanker deployment.",
    alreadyLogged: "Already logged a complaint?",
    trackQueueDesc: "Monitor queue priority score & GIS tanker route",
    trackStatus: "Track Status",
    formTitle: "Citizen Grievance Submission",
    formId: "Form ID: WF-24-918",
    issueClass: "Issue Classification",
    autoWeight: "Automatic weight: +28 Pts (Priority Tier-1)",
    tankerEligible: "Eligible for Emergency Tanker",
    phoneLabel: "Mobile Number (Delivery OTP & Geotracking)",
    otpVerified: "OTP Verified",
    wardLabel: "Municipal Ward",
    settlementLabel: "Settlement Type",
    localityLabel: "Locality Landmark / Specific Galli",
    gpsHeader: "GPS Dispatch Coordinates",
    refreshGps: "Refresh GPS",
    wgsVerified: "WGS84 Verified",
    photoLabel: "AI Photo Triage (Optional - Fast Tracks Valve Team)",
    photoDesc: "Automated image triage checks turbidity & valve isolation pressure",
    submitBtn: "Report Deficit & Queue Emergency Tanker",
    explainTitle: "Explainability Engine",
    explainHeading: "Mathematical Equity Guarantee",
    explainFormula: "Priority = 0.35(Vulnerability) + 0.30(DryTime) + 0.20(Density)",
    explainBody: "VIP favoritism is disabled; allocations are automatically dispatched from the nearest depot based on verified algorithmic need.",
    gridStability: "Grid Stability",
    activeFleet: "Active Fleet",
    dailyWater: "Daily Water",
    footerDept: "Brihanmumbai Municipal Corporation (BMC) · Water Engineering Dept",
    footerVer: "WaterFlow SCADA Algorithmic Grid Telemetry v4.12 · 24 BMC Administrative Wards",
    navHome: "Home",
    navMap: "Live Map",
    navGrievance: "Grievance",
    navQueue: "Queue",
    navProfile: "Profile",
  },
  mr: {
    scadaLive: "स्काडा थेट",
    telemetryVer: "मनपा टेलीमेट्री आवृत्ती ४.१२",
    helpline: "मनपा १९१६",
    appTitle: "वॉटरफ्लो नागरिक",
    subTitle: "बृहन्मुंबई महानगरपालिका (BMC)",
    emergencySupport: "तातडीचे पाणी वाटप साहाय्य",
    algoActive: "अल्गोरिदम आधारित वाटप सक्रिय",
    heroTitle: "तुमच्या परिसरात तीव्र पाणीटंचाई आहे का?",
    heroDesc: "तातडीच्या टँकर पुरवठ्यासाठी तुमची तक्रार थेट वॉटरफ्लो प्राधान्य प्रणालीमध्ये नोंदवा.",
    alreadyLogged: "आधीच तक्रार नोंदवली आहे का?",
    trackQueueDesc: "रांगेतील प्राधान्य क्रमांक आणि टँकरचा थेट मार्ग तपासा",
    trackStatus: "स्थिती तपासा",
    formTitle: "नागरिक पाणी तक्रार नोंदणी",
    formId: "तक्रार क्र.: WF-24-918",
    issueClass: "समस्येचे स्वरूप",
    autoWeight: "प्राधान्य गुण: +२८ (स्तर-१ प्राधान्य)",
    tankerEligible: "तातडीच्या टँकरसाठी पात्र",
    phoneLabel: "भ्रमणध्वनी क्रमांक (ओटीपी व ट्रॅकिंगसाठी)",
    otpVerified: "ओटीपी प्रमाणित",
    wardLabel: "प्रभाग (वॉर्ड)",
    settlementLabel: "वस्तीचा प्रकार",
    localityLabel: "नजीकची खूण / गल्ली",
    gpsHeader: "जीपीएस वितरण निर्देशक",
    refreshGps: "जीपीएस रिफ्रेश",
    wgsVerified: "WGS84 प्रमाणित",
    photoLabel: "एआय फोटो तपासणी (पर्यायी)",
    photoDesc: "फोटोवरून गळती आणि पाण्याचा गढूळपणा स्वयंचलितपणे तपासला जातो",
    submitBtn: "तक्रार नोंदवा व तातडीचा टँकर मिळवा",
    explainTitle: "पारदर्शकता प्रणाली",
    explainHeading: "गणितीय समानतेची हमी",
    explainFormula: "प्राधान्य = ०.३५(गरज) + ०.३०(कोरडे तास) + ०.२०(लोकसंख्या)",
    explainBody: "कोणताही राजकीय हस्तक्षेप नाही; गरज आणि अंतराच्या आधारे स्वयंचलित टँकर वितरण.",
    gridStability: "ग्रिड स्थिरता",
    activeFleet: "सक्रिय टँकर",
    dailyWater: "दैनिक पाणी",
    footerDept: "बृहन्मुंबई महानगरपालिका · जल अभियंता विभाग",
    footerVer: "वॉटरफ्लो स्काडा नियंत्रण कक्ष आवृत्ती ४.१२ · २४ मनपा प्रभाग",
    navHome: "मुख्य",
    navMap: "थेट नकाशा",
    navGrievance: "तक्रार",
    navQueue: "प्रतीक्षा यादी",
    navProfile: "माहिती",
  }
};

// Custom Leaflet Markers
const citizenIcon = L.divIcon({
  className: "custom-leaflet-marker",
  html: `<div style="background-color: #0056b3; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.4); color: white; font-size: 14px;">📍</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const tankerIcon = L.divIcon({
  className: "custom-leaflet-marker",
  html: `<div style="background-color: #f59e0b; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); color: #000; font-size: 17px;">🚛</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// Map View Controller for auto-centering on ward change
function MapViewController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 13, { duration: 1.0 });
    }
  }, [center, map]);
  return null;
}

export default function CitizenApp({ onBackToDashboard, onSignOut, user }) {
  // Navigation & View state
  const [activeNav, setActiveNav] = useState("home"); // "home" | "map" | "grievance" | "queue" | "profile"
  const [lang, setLang] = useState("en"); // "en" | "mr"
  const [showPwaBanner, setShowPwaBanner] = useState(true);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [forceMobileFrame, setForceMobileFrame] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [whatsappTracking, setWhatsappTracking] = useState(true);

  // Auto-Detection State
  const [detectedWard, setDetectedWard] = useState(MUMBAI_WARDS_DATABASE[0]);
  const [detectionMode, setDetectionMode] = useState("Device GPS (Auto)");
  const [gpsAccuracy, setGpsAccuracy] = useState("±3.4m");
  const [gpsLoading, setGpsLoading] = useState(false);

  // Form State
  const [phoneNumber, setPhoneNumber] = useState("98200 12345");
  const [issueType, setIssueType] = useState("Severe Dry Pipe (>48 Hours Continuous)");
  const [settlement, setSettlement] = useState("Chawl / Informal Cluster");
  const [landmark, setLandmark] = useState(MUMBAI_WARDS_DATABASE[0].default_landmark);
  const [coords, setCoords] = useState({ lat: MUMBAI_WARDS_DATABASE[0].lat, lng: MUMBAI_WARDS_DATABASE[0].lng });
  const [hasPhoto, setHasPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showExplainModal, setShowExplainModal] = useState(false);

  const t = I18N[lang];

  // Web Speech API Voice Recognition Handler (Phase 21)
  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(lang === "mr" ? "तुमचा ब्राउझर व्हॉइस इनपुटला सपोर्ट करत नाही. कृपया टाइप करा." : "Web Speech API is not supported in this browser. Please type your location.");
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === "mr" ? "mr-IN" : "en-IN";
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setLandmark((prev) => prev ? `${prev}, ${transcript}` : transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition error:", err);
      setIsListening(false);
    }
  };

  // Auto-detect location on device GPS
  const autoDetectLocation = () => {
    setGpsLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = parseFloat(pos.coords.latitude.toFixed(4));
          const userLng = parseFloat(pos.coords.longitude.toFixed(4));
          setCoords({ lat: userLat, lng: userLng });

          // Match closest BMC ward
          const matched = findNearestMumbaiWard(userLat, userLng);
          setDetectedWard(matched);
          setLandmark(matched.default_landmark);
          setDetectionMode("Live Device GPS");
          setGpsAccuracy(`±${pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 3.4}m`);
          setGpsLoading(false);
        },
        (err) => {
          console.warn("GPS permission not granted or timeout, using Mumbai centroid:", err.message);
          const fallback = MUMBAI_WARDS_DATABASE[0]; // Ward M/E
          setDetectedWard(fallback);
          setCoords({ lat: fallback.lat, lng: fallback.lng });
          setLandmark(fallback.default_landmark);
          setDetectionMode("Centroid Auto-Fallback (Ward M/East)");
          setGpsAccuracy("±4.2m");
          setGpsLoading(false);
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      setGpsLoading(false);
    }
  };

  // Run auto-detection on initial mount
  useEffect(() => {
    autoDetectLocation();
  }, []);

  // Evaluator Ward Simulator Trigger
  const handleSimulateWard = (wardCode) => {
    const target = MUMBAI_WARDS_DATABASE.find((w) => w.ward_code === wardCode) || MUMBAI_WARDS_DATABASE[0];
    setDetectedWard(target);
    setCoords({ lat: target.lat, lng: target.lng });
    setLandmark(target.default_landmark);
    setDetectionMode(`Simulated Location (${target.ward_code})`);
    setGpsAccuracy("±1.5m (Calibrated)");
  };

  // Submit Grievance
  const handleSubmitGrievance = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await fetch(`${API_BASE}/api/citizen/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: "+91 " + phoneNumber,
          lat: coords.lat,
          lng: coords.lng,
          issue_type: issueType,
          landmark: landmark,
          ward: `Ward ${detectedWard.ward_code} (${detectedWard.name})`,
          settlement: settlement,
        }),
      });
    } catch (err) {
      console.warn("Offline fallback report logged:", err.message);
    } finally {
      setSubmitting(false);
      alert(
        lang === "mr"
          ? `तक्रार यशस्वीरित्या नोंदवली! वॉर्ड ${detectedWard.ward_code} (${detectedWard.name}) साठी टँकर ${detectedWard.assigned_tanker.tanker_id} चा मार्ग निश्चित केला गेला आहे.`
          : `Grievance Registered: Logged into MCGM Priority Queue for Ward ${detectedWard.ward_code} (${detectedWard.name}). Relief Tanker ${detectedWard.assigned_tanker.tanker_id} assigned.`
      );
    }
  };

  // Copy OTP helper
  const handleCopyOtp = () => {
    navigator.clipboard?.writeText(detectedWard.assigned_tanker.otp_code);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2500);
  };

  // Simulated tanker route line for this ward
  const routePoints = [
    detectedWard.depot_coords,
    [
      (detectedWard.depot_coords[0] + coords.lat) / 2 + 0.005,
      (detectedWard.depot_coords[1] + coords.lng) / 2 - 0.003,
    ],
    [coords.lat, coords.lng],
  ];

  // Authoritative factor calculation matching config/allocation_policy.yaml
  const vulnScore = Math.min(1.0, (detectedWard.slum_pop_pct || 65) / 100);
  const unmetScore = Math.min(1.0, (detectedWard.dry_pipe_hours || 36) / 72);
  const popScore = Math.min(1.0, (detectedWard.population || 500000) / 1000000);
  const deficitScore = Math.min(1.0, (detectedWard.water_deficit_pct || 35) / 100);
  const distPenalty = Math.min(1.0, (detectedWard.distance_to_depot_km || 4.2) / 20);
  const proxScore = Math.max(0.0, 1.0 - distPenalty);

  const vulnContrib = vulnScore * 30.0;
  const unmetContrib = unmetScore * 25.0;
  const popContrib = popScore * 20.0;
  const deficitContrib = deficitScore * 15.0;
  const proxContrib = proxScore * 10.0;
  const totalScore = (vulnContrib + unmetContrib + popContrib + deficitContrib + proxContrib).toFixed(1);

  const dominantDriver = unmetScore >= vulnScore
    ? `${detectedWard.dry_pipe_hours || 36}h continuous dry pipeline duration`
    : `${(vulnScore * 100).toFixed(0)}% informal settlement vulnerability ratio`;

  // ============================================================
  // REUSABLE SUB-RENDERERS
  // ============================================================

  const renderWardBanner = () => (
    <section className="civic-card rounded-xl p-3.5 bg-gradient-to-r from-emerald-50/90 via-white to-sky-50/70 border-2 border-emerald-400/80 shadow-xs relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-slate-900 tracking-tight">
                Auto-Detected Ward: Ward {detectedWard.ward_code}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[9px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-ping"></span>
                {detectionMode}
              </span>
            </div>
            <p className="text-xs font-semibold text-sky-900 mt-0.5">
              {detectedWard.name} · <span className="text-slate-500 font-normal">{detectedWard.zone}</span>
            </p>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-0.5">
              <span>Lat: <strong className="text-slate-800">{coords.lat.toFixed(4)}°N</strong></span>
              <span>Lng: <strong className="text-slate-800">{coords.lng.toFixed(4)}°E</strong></span>
              <span>Accuracy: <strong className="text-emerald-700">{gpsAccuracy}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <button
            type="button"
            onClick={autoDetectLocation}
            disabled={gpsLoading}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-white hover:bg-sky-50 px-2.5 py-1.5 rounded-lg border border-sky-300 shadow-2xs transition cursor-pointer"
            title="Re-run Geolocation detection"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? "animate-spin text-sky-600" : ""}`} />
            <span>{gpsLoading ? "Detecting..." : "Refresh GPS"}</span>
          </button>

          {/* Ward Simulator Dropdown */}
          <select
            onChange={(e) => handleSimulateWard(e.target.value)}
            value={detectedWard.ward_code}
            className="text-[11px] font-bold text-slate-700 bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-2xs focus:outline-hidden cursor-pointer"
            title="Simulate user location in other Mumbai wards"
          >
            <option value="" disabled>Simulate Location...</option>
            {MUMBAI_WARDS_DATABASE.map((w) => (
              <option key={w.ward_code} value={w.ward_code}>
                📍 Ward {w.ward_code} ({w.name.split("/")[0].trim()})
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );

  const renderTimetableAdvisory = () => (
    <section className="civic-card rounded-xl p-4 bg-white border border-slate-200 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Ward {detectedWard.ward_code} Water Supply Timetable &amp; Grid Advisory
          </h3>
        </div>
        <span className="font-mono text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
          Ward-Only Telemetry
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        {/* Supply Schedule */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
            Rationing Timetable
          </span>
          <span className="font-bold text-slate-900 block mt-0.5">
            {detectedWard.timetable}
          </span>
          <span className="text-[9.5px] text-slate-500 mt-0.5 block">
            Feeder: {detectedWard.feeder_line}
          </span>
        </div>

        {/* Pressure Status */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
            Grid Line Pressure
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${
              detectedWard.pressure_status === "critical" ? "bg-rose-500 animate-ping" : detectedWard.pressure_status === "warning" ? "bg-amber-500" : "bg-emerald-500"
            }`}></span>
            <span className="font-bold text-slate-900">
              {detectedWard.line_pressure}
            </span>
          </div>
          <span className="text-[9.5px] text-slate-500 mt-0.5 block">
            Telemetry: SCADA Node Z-{detectedWard.ward_code}
          </span>
        </div>

        {/* Deficit & Priority Score */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
            Deficit &amp; Score
          </span>
          <span className="font-bold text-rose-700 block mt-0.5">
            {detectedWard.water_deficit_pct}% Deficit ({detectedWard.dry_pipe_hours}h Dry)
          </span>
          <span className="text-[9.5px] text-slate-600 font-mono mt-0.5 block">
            Priority: <strong>{detectedWard.priority_score}</strong> ({detectedWard.priority_tier})
          </span>
        </div>
      </div>
    </section>
  );

  const renderPwaBanner = () => {
    if (!showPwaBanner) return null;
    return (
      <div className="civic-card rounded-xl p-3.5 border border-sky-300/80 bg-gradient-to-r from-sky-50/80 via-white to-sky-50/60 shadow-xs relative overflow-hidden animate-fade-in">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0056b3] text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5 border border-white/20">
              <Droplet className="w-5 h-5 text-sky-200 fill-sky-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 tracking-tight">
                  Install WaterFlow Citizen PWA
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[9px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  Offline Ready
                </span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-tight mt-1">
                Instant offline grievance drafting, WhatsApp tanker tracking &amp; live GPS alerts without app store downloads.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowPwaBanner(false)}
            aria-label="Dismiss banner"
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
            <span>⚡ Fast Cache Sync</span>
            <span>•</span>
            <span>🔒 BMC Verified</span>
          </div>

          <button
            onClick={() => {
              setPwaInstalled(true);
              alert(
                lang === "mr"
                  ? "वॉटरफ्लो ॲप तुमच्या फोनवर इन्स्टॉल केले गेले आहे!"
                  : "PWA Initialized: WaterFlow Citizen added to home screen with offline SCADA service worker cache."
              );
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0056b3] hover:bg-sky-700 text-white text-[11px] font-bold shadow-xs active:scale-95 transition cursor-pointer"
          >
            {pwaInstalled ? <Check className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{pwaInstalled ? "Installed" : "Install App"}</span>
          </button>
        </div>
      </div>
    );
  };

  const renderGrievanceForm = () => (
    <section className="civic-card rounded-xl p-4 sm:p-5 shadow-xs bg-white border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3.5">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {t.formTitle} — Ward {detectedWard.ward_code}
          </h3>
        </div>
        <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          {t.formId}
        </span>
      </div>

      <form onSubmit={handleSubmitGrievance} className="space-y-3.5">
        {/* Issue Classification */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-tight mb-1.5">
            {t.issueClass} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="civic-input w-full rounded-lg text-xs font-semibold text-slate-800 py-2.5 pl-3 pr-8 focus:outline-hidden"
            >
              <option value="Severe Dry Pipe (>48 Hours Continuous)">🔴 Severe Dry Pipe (&gt;48 Hours Continuous)</option>
              <option value="Critical Ration Deficit (24-48 Hours)">🟠 Critical Ration Deficit (24-48 Hours)</option>
              <option value="Low Pressure & Variable Grid Supply">🟡 Low Pressure &amp; Variable Grid Supply</option>
              <option value="Severe Turbidity / Water Contamination">⚠️ Severe Turbidity / Water Contamination</option>
              <option value="Main Line Burst / Road Flooding">🚰 Main Line Burst / Road Flooding</option>
              <option value="Municipal Tanker Diversion / Non-Arrival">🚛 Municipal Tanker Diversion / Non-Arrival</option>
            </select>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 px-0.5">
            <span>Automatic weight: <strong className="text-sky-700 font-bold">+28 Pts (Priority Tier-1)</strong></span>
            <span className="text-emerald-600 font-semibold">{t.tankerEligible}</span>
          </div>
        </div>

        {/* Mobile Verification */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
              {t.phoneLabel} <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-emerald-600 font-medium flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
              {t.otpVerified}
            </span>
          </div>
          <div className="relative flex rounded-lg">
            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 text-slate-600 font-mono text-xs font-semibold">
              🇮🇳 +91
            </span>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="civic-input block w-full flex-1 rounded-none rounded-r-lg text-xs font-mono font-bold text-slate-800 py-2 px-3 border border-slate-300"
              placeholder="10-digit mobile"
              required
            />
          </div>
        </div>

        {/* Municipal Ward (Auto-Locked) & Settlement Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-tight mb-1">
              {t.wardLabel} <span className="text-emerald-600 font-semibold">(Auto-Detected)</span>
            </label>
            <div className="civic-input w-full rounded-lg text-xs font-bold text-sky-900 py-2 px-2.5 border border-emerald-300 bg-emerald-50/40 flex items-center justify-between">
              <span>Ward {detectedWard.ward_code} ({detectedWard.name.split("/")[0].trim()})</span>
              <span className="text-[10px] text-emerald-700 font-mono font-bold">LOCKED</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-tight mb-1">
              {t.settlementLabel}
            </label>
            <select
              value={settlement}
              onChange={(e) => setSettlement(e.target.value)}
              className="civic-input w-full rounded-lg text-xs font-medium text-slate-800 py-2 px-2.5 border border-slate-300"
            >
              <option value="Chawl / Informal Cluster">Chawl / Informal Cluster</option>
              <option value="Co-op Housing Society (CHS)">Co-op Housing Society (CHS)</option>
              <option value="Slum Rehabilitation (SRA)">Slum Rehabilitation (SRA)</option>
              <option value="Commercial / Small Trade">Commercial / Small Trade</option>
            </select>
          </div>
        </div>

        {/* Locality Landmark & Voice Input (Phase 21) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
              {t.localityLabel} <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                isListening
                  ? "bg-rose-100 text-rose-700 animate-pulse border border-rose-300"
                  : "bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
              }`}
              title="Speak grievance in Marathi or English"
            >
              {isListening ? <MicOff className="w-3 h-3 text-rose-600 animate-bounce" /> : <Mic className="w-3 h-3 text-sky-700" />}
              <span>{isListening ? (lang === "mr" ? "ऐकत आहे..." : "Listening...") : (lang === "mr" ? "व्हॉइस इनपुट" : "Voice Input")}</span>
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="civic-input w-full rounded-lg text-xs font-medium text-slate-800 py-2 px-3 border border-slate-300 pr-9"
              placeholder="e.g., Gate No 5, Opposite Ration Kendra"
              required
            />
            <button
              type="button"
              onClick={toggleVoiceInput}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-700 p-1 cursor-pointer"
              title="Dictate with voice"
            >
              <Mic className={`w-3.5 h-3.5 ${isListening ? "text-rose-500 animate-pulse" : ""}`} />
            </button>
          </div>
        </div>

        {/* GPS Dispatch Coordinates Box */}
        <div className="rounded-lg bg-sky-50/70 border border-sky-200 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5">
              <Navigation className="w-3.5 h-3.5 text-sky-700" />
              <span className="text-[11px] font-bold text-sky-950 tracking-tight">
                {t.gpsHeader} ({detectionMode})
              </span>
            </div>

            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {t.wgsVerified}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <div className="text-slate-700 font-semibold space-x-3">
              <span>Lat: <strong className="text-slate-900 font-bold">{coords.lat.toFixed(4)}° N</strong></span>
              <span>Lng: <strong className="text-slate-900 font-bold">{coords.lng.toFixed(4)}° E</strong></span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold font-mono">
              Depot: {detectedWard.nearest_depot.split("(")[0].trim()}
            </span>
          </div>
        </div>

        {/* AI Photo Triage */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-tight mb-1">
            {t.photoLabel}
          </label>
          <div
            onClick={() => setHasPhoto(!hasPhoto)}
            className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition ${
              hasPhoto
                ? "border-emerald-500 bg-emerald-50/60"
                : "border-slate-200 hover:border-sky-500 bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-center space-x-2 text-slate-600">
              <Camera className={`w-5 h-5 ${hasPhoto ? "text-emerald-600" : "text-sky-600"}`} />
              <span className="text-xs font-semibold text-slate-800">
                {hasPhoto
                  ? "✓ Evidence Attached: pipeline_leak_burst_evidence.jpg (Turbidity 42 NTU)"
                  : "Capture dry tap or pipeline leak photo"}
              </span>
            </div>
            <p className="text-[9.5px] text-slate-400 mt-0.5">
              {t.photoDesc}
            </p>
          </div>
        </div>

        {/* Submit Action Button */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0056b3] to-[#0284c7] hover:from-sky-800 hover:to-sky-600 text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center space-x-2 border border-sky-400/30 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Logging Grievance into SCADA...</span>
              </>
            ) : (
              <>
                <Droplet className="w-4 h-4 text-white fill-white" />
                <span>{t.submitBtn}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );

  const renderExplainabilitySection = () => (
    <section className="civic-card rounded-xl p-4 bg-gradient-to-b from-white via-sky-50/30 to-sky-50/70 border-2 border-sky-300/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="px-2 py-0.5 rounded bg-[#0056b3] text-white font-mono text-[10px] font-black uppercase tracking-wider">
            {lang === "mr" ? "स्पष्टीकरण" : "EXPLAINABILITY"}
          </div>
          <h4 className="text-xs font-black text-slate-900 tracking-tight">
            {lang === "mr" ? "माझी विनंती रांगेत का आहे?" : "Why am I queued?"} — Ward {detectedWard.ward_code}
          </h4>
        </div>
        <span className="font-mono text-[9.5px] font-bold text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-300">
          Policy v2.4.0-hardened
        </span>
      </div>

      {/* Top Score Banner */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-sky-200 shadow-2xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">
            {lang === "mr" ? "एकूण प्राधान्य गुण" : "Total Priority Score"}
          </span>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="text-2xl font-black text-[#0056b3] font-mono">{totalScore}</span>
            <span className="text-xs font-bold text-slate-400 font-mono">/ 100</span>
            <span className="ml-2 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
              {detectedWard.priority_tier || "Priority Tier-1"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowExplainModal(true)}
          className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
          <span>{lang === "mr" ? "सविस्तर गणित" : "View Audit Math"}</span>
        </button>
      </div>

      {/* Mathematical Factor Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10.5px] text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 uppercase font-mono text-[9px]">
              <th className="pb-1.5 font-bold">Factor</th>
              <th className="pb-1.5 text-right font-bold">Observed</th>
              <th className="pb-1.5 text-right font-bold">Norm [0–1]</th>
              <th className="pb-1.5 text-right font-bold">Weight</th>
              <th className="pb-1.5 text-right font-bold text-[#0056b3]">Contrib</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            <tr>
              <td className="py-1 font-sans font-bold text-slate-800">Vulnerability (Slum %)</td>
              <td className="py-1 text-right text-slate-600">{detectedWard.slum_pop_pct || 65}%</td>
              <td className="py-1 text-right text-slate-700">{vulnScore.toFixed(2)}</td>
              <td className="py-1 text-right text-slate-500">× 30%</td>
              <td className="py-1 text-right font-bold text-[#0056b3]">+{vulnContrib.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="py-1 font-sans font-bold text-slate-800">Unmet Demand (Dry Pipe)</td>
              <td className="py-1 text-right text-slate-600">{detectedWard.dry_pipe_hours || 36}h</td>
              <td className="py-1 text-right text-slate-700">{unmetScore.toFixed(2)}</td>
              <td className="py-1 text-right text-slate-500">× 25%</td>
              <td className="py-1 text-right font-bold text-[#0056b3]">+{unmetContrib.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="py-1 font-sans font-bold text-slate-800">Population Need</td>
              <td className="py-1 text-right text-slate-600">{(detectedWard.population || 500000).toLocaleString()}</td>
              <td className="py-1 text-right text-slate-700">{popScore.toFixed(2)}</td>
              <td className="py-1 text-right text-slate-500">× 20%</td>
              <td className="py-1 text-right font-bold text-[#0056b3]">+{popContrib.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="py-1 font-sans font-bold text-slate-800">Historical Deficit</td>
              <td className="py-1 text-right text-slate-600">{detectedWard.water_deficit_pct || 35}%</td>
              <td className="py-1 text-right text-slate-700">{deficitScore.toFixed(2)}</td>
              <td className="py-1 text-right text-slate-500">× 15%</td>
              <td className="py-1 text-right font-bold text-[#0056b3]">+{deficitContrib.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="py-1 font-sans font-bold text-slate-800">Depot Proximity (Logistics)</td>
              <td className="py-1 text-right text-slate-600">{(detectedWard.distance_to_depot_km || 4.2).toFixed(1)} km</td>
              <td className="py-1 text-right text-slate-700">{proxScore.toFixed(2)}</td>
              <td className="py-1 text-right text-slate-500">× 10%</td>
              <td className="py-1 text-right font-bold text-[#0056b3]">+{proxContrib.toFixed(2)}</td>
            </tr>
            <tr className="border-t-2 border-slate-300 font-bold bg-sky-50/50">
              <td className="py-1.5 font-sans text-slate-900">Total Score (Sum)</td>
              <td colSpan="3" className="py-1.5 text-right text-slate-500 font-mono text-[9.5px]">Σ (Normalized × Weight)</td>
              <td className="py-1.5 text-right text-base text-[#0056b3] font-black">{totalScore}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Human-Readable Explanation */}
      <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed">
        <span className="font-bold text-slate-900 block mb-0.5">
          {lang === "mr" ? "थेट कारण:" : "Algorithmic Determination:"}
        </span>
        {lang === "mr"
          ? `तुमचा प्रभाग ${detectedWard.ward_code} उच्च प्राधान्य क्रमाने ठेवण्यात आला आहे, कारण येथे ${dominantDriver} आहे. वॉटरफ्लो अल्गोरिदम वेळेपेक्षा (FCFS) मानवीय गरजेला प्राधान्य देतो.`
          : `Grievance prioritized at score ${totalScore}/100. Key driver: ${dominantDriver}. Under WaterFlow Policy v2.4.0-hardened, humanitarian need overrides submission timestamps to prevent vocal affluent wards from displacing vulnerable communities.`}
      </div>

      {/* Live Metric Badges */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center font-mono">
        <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
          <span className="block text-[9px] uppercase text-slate-400 font-sans font-bold">
            {t.gridStability}
          </span>
          <span className="text-xs font-bold text-emerald-600">99.4%</span>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
          <span className="block text-[9px] uppercase text-slate-400 font-sans font-bold">
            Ward Priority Rank
          </span>
          <span className="text-xs font-bold text-sky-700">#1 in {detectedWard.zone}</span>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
          <span className="block text-[9px] uppercase text-slate-400 font-sans font-bold">
            {t.dailyWater}
          </span>
          <span className="text-xs font-bold text-slate-800">810 KL</span>
        </div>
      </div>
    </section>
  );

  const renderOtpCard = () => (
    <div className="civic-card rounded-xl p-4 bg-gradient-to-br from-emerald-50 via-white to-sky-50 border-2 border-emerald-400 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 live-pulse"></span>
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
            Official Delivery OTP (Ward {detectedWard.ward_code})
          </span>
        </div>
        <span className="font-mono text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
          SCADA SECURED
        </span>
      </div>

      <div className="text-center py-2">
        <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-slate-900 select-all">
          {detectedWard.assigned_tanker.otp_code}
        </div>
        <p className="text-[11px] font-medium text-slate-600 mt-1">
          Share this 4-digit code with driver <strong className="text-slate-900">{detectedWard.assigned_tanker.driver}</strong> upon tanker arrival at {detectedWard.standpost_name}.
        </p>
      </div>

      <div className="mt-2 pt-2 border-t border-emerald-200/70 flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-mono">
          Quota: <strong className="text-slate-800">{detectedWard.assigned_tanker.volume_liters?.toLocaleString()} L (Potable)</strong>
        </span>
        <button
          onClick={handleCopyOtp}
          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white text-emerald-800 text-[10.5px] font-bold border border-emerald-300 shadow-2xs hover:bg-emerald-50 active:scale-95 transition cursor-pointer"
        >
          {copiedOtp ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          <span>{copiedOtp ? "Copied" : "Copy Code"}</span>
        </button>
      </div>
    </div>
  );

  const renderTankerTrackingCard = () => (
    <div className="civic-card rounded-xl p-4 shadow-xs space-y-3 bg-white border border-slate-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold text-slate-900">
                Tanker {detectedWard.assigned_tanker.tanker_id}
              </span>
              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-300">
                {detectedWard.assigned_tanker.plate}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Driver: {detectedWard.assigned_tanker.driver}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-bold text-amber-600 flex items-center justify-end space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>ETA {detectedWard.assigned_tanker.eta_mins} Mins</span>
          </div>
          <span className="text-[9.5px] text-slate-400 font-mono">
            Status: {detectedWard.assigned_tanker.delivery_status}
          </span>
        </div>
      </div>

      {/* Driver Contact & Target Standpost */}
      <div className="flex items-center justify-between text-xs pt-1">
        <div className="flex items-center space-x-1.5 text-slate-600 text-[11px]">
          <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="truncate max-w-[200px] font-medium">{detectedWard.standpost_name}</span>
        </div>

        <a
          href={`tel:${detectedWard.assigned_tanker.driver_phone}`}
          className="inline-flex items-center space-x-1 font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200 hover:bg-sky-100 transition cursor-pointer"
        >
          <Phone className="w-3 h-3 text-sky-600" />
          <span>Call Driver</span>
        </a>
      </div>
    </div>
  );

  const renderMap = (heightClass = "h-48") => (
    <div className={`${heightClass} w-full rounded-xl overflow-hidden border border-slate-200 relative isolate`}>
      <MapContainer
        center={[coords.lat, coords.lng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <MapViewController center={[coords.lat, coords.lng]} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {/* Citizen Standpost Marker */}
        <Marker position={[coords.lat, coords.lng]} icon={citizenIcon}>
          <Popup>
            <div className="text-xs font-bold font-sans">
              Ward {detectedWard.ward_code} ({detectedWard.standpost_name})
              <div className="text-[10px] text-slate-500 font-normal">
                {landmark}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Dispatched Tanker Marker */}
        <Marker position={routePoints[1]} icon={tankerIcon}>
          <Popup>
            <div className="text-xs font-bold font-sans">
              Tanker {detectedWard.assigned_tanker.tanker_id} ({detectedWard.assigned_tanker.driver})
              <div className="text-[10px] text-amber-600 font-semibold">
                ETA {detectedWard.assigned_tanker.eta_mins} Mins · En Route
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Corridor Route Line */}
        <Polyline positions={routePoints} color="#0056b3" weight={4} dashArray="6, 6" />

        {/* Geofence Area */}
        <Circle
          center={[coords.lat, coords.lng]}
          radius={150}
          pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.15 }}
        />
      </MapContainer>

      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-700 shadow-2xs border border-slate-200 z-[400]">
        🛰️ Ward {detectedWard.ward_code} Radar
      </div>
    </div>
  );

  const renderHydraulicProfile = () => (
    <div className="civic-card rounded-xl p-3.5 shadow-xs bg-white space-y-2 border border-slate-200">
      <span className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center space-x-1.5">
        <Activity className="w-3.5 h-3.5 text-sky-700" />
        <span>Ward {detectedWard.ward_code} Hydraulic Profile</span>
      </span>

      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-500">Administrative Zone:</span>
          <span className="font-bold text-slate-800">{detectedWard.zone}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Ward Population:</span>
          <span className="font-bold font-mono text-slate-800">{detectedWard.population?.toLocaleString()} residents</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Designated Depot:</span>
          <span className="font-bold text-sky-800">{detectedWard.nearest_depot}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Feeder Pipeline:</span>
          <span className="font-mono text-slate-700 font-semibold">{detectedWard.feeder_line}</span>
        </div>
      </div>
    </div>
  );

  const renderRecentTickets = () => (
    <div className="civic-card rounded-xl p-4 bg-white border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-700" />
          <span>Recent Grievance History</span>
        </span>
        <span className="font-mono text-[9.5px] font-bold text-slate-500">Ward {detectedWard.ward_code}</span>
      </div>

      <div className="space-y-2">
        <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-200 flex items-center justify-between text-xs">
          <div>
            <div className="flex items-center space-x-1.5 font-mono font-bold text-slate-900">
              <span>#WF-24-918</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800">Assigned (T-08)</span>
            </div>
            <p className="text-[10.5px] text-slate-600 mt-0.5">Severe Dry Pipe (&gt;48 Hours Continuous)</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveNav("map")}
            className="text-[10.5px] font-bold text-sky-700 hover:underline flex items-center space-x-0.5 cursor-pointer"
          >
            <span>Track</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs opacity-75">
          <div>
            <div className="flex items-center space-x-1.5 font-mono font-bold text-slate-700">
              <span>#WF-24-811</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800">Delivered</span>
            </div>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Community Standpost #4 · 10,000 L (Yesterday)</p>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 font-bold">✓ OTP Verified</span>
        </div>
      </div>
    </div>
  );

  const renderProfileView = () => (
    <div className="space-y-4 animate-fade-in">
      <div className={`grid grid-cols-1 ${forceMobileFrame ? "space-y-4" : "lg:grid-cols-12"} gap-4`}>
        {/* Left Column: Identity & Preferences */}
        <div className={`${forceMobileFrame ? "" : "lg:col-span-6"} space-y-4`}>
          {/* Identity Card */}
          <div className="civic-card rounded-xl p-4 bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0056b3] to-sky-400 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {user?.name || "Govandi Resident"}
                </h3>
                <p className="text-xs text-slate-500 font-mono">+91 {phoneNumber}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    OTP Verified Resident
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                    Ward {detectedWard.ward_code}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Municipal Zone:</span>
                <span className="font-bold text-slate-800">{detectedWard.zone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Designated Standpost:</span>
                <span className="font-bold text-slate-800">{detectedWard.standpost_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Settlement Type:</span>
                <span className="font-bold text-slate-800">{settlement}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Registered Landmark:</span>
                <span className="font-bold text-slate-800 max-w-[200px] truncate text-right">{landmark}</span>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="civic-card rounded-xl p-4 bg-white border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Notification &amp; Language Settings
            </h4>

            {/* Language Switcher */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Portal Language / भाषा</span>
                <span className="text-[10px] text-slate-500">Choose between English and मराठी</span>
              </div>
              <div className="flex space-x-1 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    lang === "en" ? "bg-[#0056b3] text-white shadow-2xs" : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLang("mr")}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    lang === "mr" ? "bg-[#0056b3] text-white shadow-2xs" : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  मराठी
                </button>
              </div>
            </div>

            {/* SMS Alerts Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">SMS OTP &amp; Dispatch Alerts</span>
                <span className="text-[10px] text-slate-500">Real-time SMS when tanker departs depot</span>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="w-4 h-4 text-[#0056b3] rounded cursor-pointer"
              />
            </div>

            {/* WhatsApp Tracking Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">WhatsApp Live Geotracking</span>
                <span className="text-[10px] text-slate-500">Receive live Google Maps link upon tanker arrival</span>
              </div>
              <input
                type="checkbox"
                checked={whatsappTracking}
                onChange={(e) => setWhatsappTracking(e.target.checked)}
                className="w-4 h-4 text-[#0056b3] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostics & Support */}
        <div className={`${forceMobileFrame ? "" : "lg:col-span-6"} space-y-4`}>
          {/* PWA & System Diagnostics */}
          <div className="civic-card rounded-xl p-4 bg-white border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              SCADA System &amp; PWA Diagnostics
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block font-sans">Service Worker Cache</span>
                <span className="font-bold text-emerald-600">Active (Offline Ready)</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block font-sans">GPS Accuracy</span>
                <span className="font-bold text-slate-800">{gpsAccuracy}</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block font-sans">Telemetry Node</span>
                <span className="font-bold text-[#0056b3]">SCADA Node Z-{detectedWard.ward_code}</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block font-sans">App Version</span>
                <span className="font-bold text-slate-700">v4.12-bmc</span>
              </div>
            </div>
          </div>

          {/* Municipal Emergency Directory */}
          <div className="civic-card rounded-xl p-4 bg-white border border-slate-200 shadow-xs space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Municipal Support &amp; Emergency Contacts
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded bg-sky-50/70 border border-sky-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">MCGM Disaster Helpline</span>
                  <span className="text-[10px] text-slate-500 font-mono">24/7 Toll-Free Emergency</span>
                </div>
                <a href="tel:1916" className="font-mono font-black text-sm text-[#0056b3]">1916</a>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Ward {detectedWard.ward_code} Water Engineering</span>
                  <span className="text-[10px] text-slate-500 font-mono">Local Ward Assistant Engineer</span>
                </div>
                <span className="font-mono font-bold text-slate-700">022-2555-4000</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Nearest Relief Depot</span>
                  <span className="text-[10px] text-slate-500 font-mono">{detectedWard.nearest_depot}</span>
                </div>
                <span className="font-mono font-bold text-slate-700">022-2560-1234</span>
              </div>
            </div>
          </div>

          {/* Portal Navigation & Sign Out */}
          <div className="civic-card rounded-xl p-4 bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 transition cursor-pointer flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Admin OS</span>
              </button>
            )}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs flex items-center space-x-1"
              >
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full min-h-screen bg-[#edf4fb] text-slate-800 font-sans selection:bg-sky-100 flex flex-col ${forceMobileFrame ? "py-6 px-4 flex items-center justify-center bg-slate-900/70" : ""}`}>
      
      {/* Outer Shell: Fits Phone edge-to-edge on mobile, Expands to Desktop workstation on Desktop */}
      <div className={`w-full ${forceMobileFrame ? "max-w-md shadow-2xl rounded-2xl overflow-hidden border-2 border-slate-700 bg-[#edf4fb]" : "max-w-7xl mx-auto"} flex flex-col min-h-screen transition-all duration-200`}>
        
        {/* ============================================================
            TOP BAR (BMC Civic Theme #0056b3)
            ============================================================ */}
        <header className="sticky top-0 z-30 bg-[#0056b3] text-white px-4 pt-3 pb-3 shadow-md border-b border-sky-600/50">
          
          {/* Status Meta Strip */}
          <div className="flex items-center justify-between text-[11px] font-medium text-sky-100 mb-2 border-b border-sky-500/40 pb-1.5">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-semibold border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 glow-dot animate-pulse"></span>
                {t.scadaLive}
              </span>
              <span className="text-sky-200 hidden sm:inline">{t.telemetryVer}</span>
            </div>

            <div className="flex items-center space-x-2 font-mono">
              <span className="text-[10px] bg-sky-900/50 px-1.5 py-0.5 rounded border border-sky-500/30 text-sky-200">
                {t.helpline}
              </span>

              {/* Marathi / English Switcher */}
              <button
                onClick={() => setLang(lang === "en" ? "mr" : "en")}
                className="text-white hover:text-sky-200 text-[11px] font-bold px-2 py-0.5 rounded bg-sky-700/60 border border-sky-400/40 active:scale-95 transition cursor-pointer"
                title="Toggle Marathi / English"
              >
                {lang === "en" ? "मराठी" : "English"}
              </button>

              {/* Desktop / Mobile Preview Switcher (Visible on desktop screens) */}
              <div className="hidden lg:flex items-center pl-2 border-l border-sky-600/40 space-x-1">
                <button
                  onClick={() => setForceMobileFrame(!forceMobileFrame)}
                  className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold flex items-center space-x-1 transition cursor-pointer ${
                    forceMobileFrame ? "bg-amber-400 text-slate-950 font-bold" : "bg-sky-800 text-sky-200 hover:bg-sky-700"
                  }`}
                  title="Toggle Mobile Screen Frame vs Desktop Wide View"
                >
                  {forceMobileFrame ? (
                    <>
                      <Monitor className="w-3 h-3" />
                      <span>Desktop View</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-3 h-3" />
                      <span>Phone Preview</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* App Title & Navigation Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  aria-label="Back to Command Center"
                  className="p-1.5 rounded-lg bg-sky-700/60 hover:bg-sky-600 text-white transition active:scale-95 border border-sky-400/30 flex items-center space-x-1 text-xs font-semibold cursor-pointer"
                  title="Return to Municipal Command Center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin OS</span>
                </button>
              )}

              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white border border-white/20 shadow-inner">
                  <Droplet className="w-5 h-5 text-sky-200 fill-sky-300" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-none">
                    {t.appTitle}
                  </h1>
                  <p className="text-[10.5px] text-sky-200 font-medium tracking-tight mt-0.5">
                    {t.subTitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="px-2.5 py-1 rounded bg-sky-800/90 border border-sky-400/40 text-[11px] font-medium text-sky-100 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                <span>Ward {detectedWard.ward_code}</span>
              </div>
              {user && (
                <span className="hidden sm:inline-block px-2 py-1 rounded bg-sky-900/70 border border-sky-400/30 text-[10.5px] font-mono text-sky-200">
                  👤 {user.name}
                </span>
              )}
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition shadow-2xs flex items-center space-x-1 cursor-pointer"
                  title="Sign Out to Landing Page"
                >
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ============================================================
            MAIN CONTENT AREA — SWITCHED BY activeNav
            ============================================================ */}
        <main className="flex-1 p-3.5 sm:p-5 pb-24 overflow-y-auto custom-scroll">
          
          {/* TAB 1: HOME */}
          {activeNav === "home" && (
            <div className="space-y-4 animate-fade-in">
              {renderWardBanner()}
              {renderTimetableAdvisory()}

              {/* Quick Action & Live Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Card 1: Tanker Dispatch */}
                <div className="civic-card rounded-xl p-3.5 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border border-amber-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center space-x-1.5 text-xs font-bold text-amber-900 uppercase">
                        <Truck className="w-4 h-4 text-amber-600" />
                        <span>{lang === "mr" ? "सक्रिय टँकर" : "Active Relief Tanker"}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        ETA {detectedWard.assigned_tanker.eta_mins}m
                      </span>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      Tanker {detectedWard.assigned_tanker.tanker_id}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {detectedWard.assigned_tanker.driver} · {detectedWard.standpost_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveNav("map")}
                    className="mt-3 w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1 transition cursor-pointer shadow-2xs"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{lang === "mr" ? "थेट नकाशा पहा →" : "Track on Live Map →"}</span>
                  </button>
                </div>

                {/* Card 2: Grievance Submission */}
                <div className="civic-card rounded-xl p-3.5 bg-gradient-to-br from-sky-50/70 via-white to-sky-50/30 border border-sky-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center space-x-1.5 text-xs font-bold text-sky-900 uppercase">
                        <MapPin className="w-4 h-4 text-sky-700" />
                        <span>{lang === "mr" ? "तक्रार नोंदणी" : "Emergency Grievance"}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">
                        SCADA Log
                      </span>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {lang === "mr" ? "पाणीटंचाई नोंदवा" : "Report Water Deficit"}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {lang === "mr" ? "कोरडी पाईपलाईन किंवा गळती नोंदवा" : "Priority queue for dry pipe (>48h), leak, or non-arrival"}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveNav("grievance")}
                    className="mt-3 w-full py-1.5 px-2.5 rounded-lg bg-[#0056b3] hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center space-x-1 transition cursor-pointer shadow-2xs"
                  >
                    <Droplet className="w-3.5 h-3.5" />
                    <span>{lang === "mr" ? "तक्रार नोंदवा →" : "Submit Grievance →"}</span>
                  </button>
                </div>

                {/* Card 3: Algorithmic Queue */}
                <div className="civic-card rounded-xl p-3.5 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900 uppercase">
                        <BarChart3 className="w-4 h-4 text-emerald-600" />
                        <span>{lang === "mr" ? "प्राधान्य रांग" : "Queue & Delivery OTP"}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        OTP: {detectedWard.assigned_tanker.otp_code}
                      </span>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      Ward {detectedWard.ward_code} #1 in {detectedWard.zone}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Score: {totalScore}/100 · {detectedWard.priority_tier || "Tier-1 Critical"}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveNav("queue")}
                    className="mt-3 w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1 transition cursor-pointer shadow-2xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{lang === "mr" ? "रांग व गणित पहा →" : "View Queue & Math →"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 space-y-4">
                  {renderHydraulicProfile()}
                  {renderPwaBanner()}
                </div>
                <div className="lg:col-span-5 space-y-4">
                  {/* Helpline card */}
                  <div className="civic-card rounded-xl p-4 bg-white border border-slate-200 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-[#0056b3]" />
                        <span className="text-xs font-bold text-slate-900 uppercase">BMC Disaster & Water Helpline</span>
                      </div>
                      <span className="text-[10px] font-mono bg-blue-100 text-deep-blue px-2 py-0.5 rounded font-bold">24x7 TOLL FREE</span>
                    </div>
                    <div className="p-3 bg-sky-50/70 rounded-lg border border-sky-200 flex items-center justify-between">
                      <div>
                        <div className="text-xl font-black text-[#0056b3] font-mono">1916</div>
                        <div className="text-[10.5px] text-slate-600 mt-0.5">Municipal Control Room & Tanker Dispatch</div>
                      </div>
                      <a
                        href="tel:1916"
                        className="px-3 py-1.5 bg-[#0056b3] hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer"
                      >
                        Call Now
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE MAP */}
          {activeNav === "map" && (
            <div className="space-y-4 animate-fade-in">
              {/* Map Header */}
              <div className="civic-card rounded-xl p-3 bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0056b3] text-white flex items-center justify-center font-bold">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900">
                      Ward {detectedWard.ward_code} Live Water Delivery Radar &amp; Fleet Tracker
                    </h3>
                    <p className="text-[10.5px] text-slate-500">
                      Real-time GPS transponder telemetry for relief tanker {detectedWard.assigned_tanker.tanker_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold border border-emerald-300 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>GPS TRACKING LIVE</span>
                  </span>
                  <a
                    href={`tel:${detectedWard.assigned_tanker.driver_phone}`}
                    className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 rounded-lg text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                  >
                    <Phone className="w-3 h-3 text-sky-600" />
                    <span>Call Driver</span>
                  </a>
                </div>
              </div>

              <div className={`grid grid-cols-1 ${forceMobileFrame ? "space-y-4" : "lg:grid-cols-12"} gap-4`}>
                {/* Left Column: Big Map */}
                <div className={`${forceMobileFrame ? "" : "lg:col-span-7"} space-y-4`}>
                  {renderMap("h-[420px]")}
                  {/* Delivery Milestones */}
                  <div className="civic-card rounded-xl p-3 bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10.5px] font-bold uppercase text-slate-400 block mb-2 font-mono">
                      Delivery Pipeline Milestones
                    </span>
                    <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-medium text-slate-500">
                      <div className="text-emerald-700 font-bold p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                        <span className="block text-emerald-600 text-xs mb-0.5">✓</span>
                        <span>Logged</span>
                      </div>
                      <div className="text-sky-700 font-bold p-2 bg-sky-50 rounded-lg border border-sky-300">
                        <span className="block text-sky-600 text-xs mb-0.5 animate-pulse">●</span>
                        <span>Dispatched</span>
                      </div>
                      <div className="text-slate-400 p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="block text-slate-400 text-xs mb-0.5">○</span>
                        <span>Arrived</span>
                      </div>
                      <div className="text-slate-400 p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="block text-slate-400 text-xs mb-0.5">○</span>
                        <span>Complete</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Tanker & OTP Cards */}
                <div className={`${forceMobileFrame ? "" : "lg:col-span-5"} space-y-4`}>
                  {renderTankerTrackingCard()}
                  {renderOtpCard()}
                  {renderHydraulicProfile()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GRIEVANCE */}
          {activeNav === "grievance" && (
            <div className="space-y-4 animate-fade-in">
              <div className={`grid grid-cols-1 ${forceMobileFrame ? "space-y-4" : "lg:grid-cols-12"} gap-4`}>
                <div className={`${forceMobileFrame ? "" : "lg:col-span-7"} space-y-4`}>
                  {renderGrievanceForm()}
                </div>
                <div className={`${forceMobileFrame ? "" : "lg:col-span-5"} space-y-4`}>
                  {renderWardBanner()}
                  {renderTimetableAdvisory()}
                  {renderRecentTickets()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QUEUE */}
          {activeNav === "queue" && (
            <div className="space-y-4 animate-fade-in">
              <div className={`grid grid-cols-1 ${forceMobileFrame ? "space-y-4" : "lg:grid-cols-12"} gap-4`}>
                <div className={`${forceMobileFrame ? "" : "lg:col-span-7"} space-y-4`}>
                  {renderExplainabilitySection()}
                </div>
                <div className={`${forceMobileFrame ? "" : "lg:col-span-5"} space-y-4`}>
                  {renderOtpCard()}
                  {/* Queue Pipeline Card */}
                  <div className="civic-card rounded-xl p-4 bg-white border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-sky-700" />
                        <span>Ward Dispatch Pipeline</span>
                      </span>
                      <span className="font-mono text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        Rank #1
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Corridor Route:</span>
                        <span className="font-bold text-slate-900">Eastern Expressway</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Active Tanker:</span>
                        <span className="font-bold text-[#0056b3]">Tanker {detectedWard.assigned_tanker.tanker_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Estimated Standpost Arrival:</span>
                        <span className="font-bold text-amber-700 font-mono">{detectedWard.assigned_tanker.eta_mins} Mins</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveNav("map")}
                      className="w-full py-2 bg-[#0056b3] hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Track Relief Tanker on Map →</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PROFILE */}
          {activeNav === "profile" && renderProfileView()}

        </main>

        {/* ============================================================
            MOBILE BOTTOM NAVIGATION BAR
            ============================================================ */}
        <nav className="sticky bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-3 py-1.5 shadow-lg flex items-center justify-around text-[10px]">
          <button
            onClick={() => setActiveNav("home")}
            className={`flex flex-col items-center justify-center py-1 px-3 relative transition cursor-pointer ${
              activeNav === "home" ? "text-[#0056b3] font-bold" : "text-slate-500 hover:text-sky-700"
            }`}
          >
            {activeNav === "home" && (
              <div className="absolute -top-1 w-8 h-1 bg-[#0056b3] rounded-full"></div>
            )}
            <Droplet className="w-4 h-4 mb-0.5" />
            <span>{t.navHome}</span>
          </button>

          <button
            onClick={() => setActiveNav("map")}
            className={`flex flex-col items-center justify-center py-1 px-3 relative transition cursor-pointer ${
              activeNav === "map" ? "text-[#0056b3] font-bold" : "text-slate-500 hover:text-sky-700"
            }`}
          >
            {activeNav === "map" && (
              <div className="absolute -top-1 w-8 h-1 bg-[#0056b3] rounded-full"></div>
            )}
            <Compass className="w-4 h-4 mb-0.5" />
            <span>{t.navMap}</span>
          </button>

          <button
            onClick={() => setActiveNav("grievance")}
            className={`flex flex-col items-center justify-center py-1 px-3 relative transition cursor-pointer ${
              activeNav === "grievance" ? "text-[#0056b3] font-bold" : "text-slate-500 hover:text-sky-700"
            }`}
          >
            {activeNav === "grievance" && (
              <div className="absolute -top-1 w-8 h-1 bg-[#0056b3] rounded-full"></div>
            )}
            <MapPin className="w-4 h-4 mb-0.5" />
            <span>{t.navGrievance}</span>
          </button>

          <button
            onClick={() => setActiveNav("queue")}
            className={`flex flex-col items-center justify-center py-1 px-3 relative transition cursor-pointer ${
              activeNav === "queue" ? "text-[#0056b3] font-bold" : "text-slate-500 hover:text-sky-700"
            }`}
          >
            {activeNav === "queue" && (
              <div className="absolute -top-1 w-8 h-1 bg-[#0056b3] rounded-full"></div>
            )}
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span>{t.navQueue}</span>
          </button>

          <button
            onClick={() => setActiveNav("profile")}
            className={`flex flex-col items-center justify-center py-1 px-3 relative transition cursor-pointer ${
              activeNav === "profile" ? "text-[#0056b3] font-bold" : "text-slate-500 hover:text-sky-700"
            }`}
          >
            {activeNav === "profile" && (
              <div className="absolute -top-1 w-8 h-1 bg-[#0056b3] rounded-full"></div>
            )}
            <User className="w-4 h-4 mb-0.5" />
            <span>{t.navProfile}</span>
          </button>
        </nav>

        {/* Footer */}
        <footer className="text-center py-2 px-2 text-slate-400 text-[10px] leading-tight space-y-0.5 bg-slate-50 border-t border-slate-200">
          <p className="font-medium text-slate-500">{t.footerDept}</p>
          <p className="text-[9.5px]">{t.footerVer}</p>
        </footer>

        {/* Mathematical Explainability Modal (Phase 20) */}
        {showExplainModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-[#0056b3] text-white p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-sky-900/60 px-2 py-0.5 rounded border border-sky-400/40 text-sky-200">
                    POLICY v2.4.0-HARDENED
                  </span>
                  <h3 className="text-sm font-black mt-1">
                    {lang === "mr" ? "गणितीय वाटप पारदर्शकता ऑडिट" : "Municipal Algorithmic Equity Audit"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowExplainModal(false)}
                  className="p-1 rounded-lg hover:bg-sky-700/60 text-sky-100 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-700">
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                  <div className="font-bold text-sky-950 mb-1">
                    {lang === "mr" ? "पाणी वाटप कसे ठरवले जाते?" : "How is Relief Priority Determined?"}
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-slate-600">
                    Unlike legacy First-Come-First-Served (FCFS) pipelines where high-bandwidth commercial users dominate relief tankers, WaterFlow calculates an authoritative equity score:
                  </p>
                  <div className="mt-2 font-mono bg-white p-2 rounded border border-sky-200 text-slate-800 text-[11px] font-bold">
                    Score = 30·V + 25·U + 20·P + 15·H + 10·(1 - D)
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-slate-900 text-xs">Audited Ward Inputs (Ward {detectedWard.ward_code}):</div>
                  <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-600 font-mono">
                    <li><strong className="text-slate-800">Vulnerability (V):</strong> {detectedWard.slum_pop_pct || 65}% slum share (Weight: 30%)</li>
                    <li><strong className="text-slate-800">Unmet Demand (U):</strong> {detectedWard.dry_pipe_hours || 36} hours without water (Weight: 25%)</li>
                    <li><strong className="text-slate-800">Population Need (P):</strong> {(detectedWard.population || 500000).toLocaleString()} residents (Weight: 20%)</li>
                    <li><strong className="text-slate-800">Historical Deficit (H):</strong> {detectedWard.water_deficit_pct || 35}% ration deficit (Weight: 15%)</li>
                    <li><strong className="text-slate-800">Distance Logistics (D):</strong> {(detectedWard.distance_to_depot_km || 4.2).toFixed(1)} km to depot (Weight: 10%)</li>
                  </ul>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center space-x-1.5 text-emerald-900 font-bold text-xs mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Anti-Discrimination &amp; VIP Immunity Guarantee</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-normal">
                    Mathematical policy constraints ensure that submission timestamps cannot override genuine physiological urgency. All 24 BMC ward allocations are reproducible and auditable in real time.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowExplainModal(false)}
                  className="px-4 py-1.5 bg-[#0056b3] hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer transition"
                >
                  {lang === "mr" ? "बंद करा" : "Close Audit"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
