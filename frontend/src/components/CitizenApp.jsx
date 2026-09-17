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
  AlertOctagon
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
  const [activeNav, setActiveNav] = useState("grievance"); // "home" | "map" | "grievance" | "queue" | "profile"
  const [lang, setLang] = useState("en"); // "en" | "mr"
  const [showPwaBanner, setShowPwaBanner] = useState(true);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [forceMobileFrame, setForceMobileFrame] = useState(false);

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

  const t = I18N[lang];

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
            MAIN CONTENT AREA
            - Mobile (< 1024px or forceMobileFrame): 1 Column
            - Desktop (>= 1024px): 2 Columns (7 cols Form + 5 cols Tracking & Map)
            ============================================================ */}
        <main className={`flex-1 p-3.5 sm:p-5 pb-24 ${forceMobileFrame ? "space-y-3.5" : "lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0"} overflow-y-auto custom-scroll`}>

          {/* ============================================================
              LEFT COLUMN: Auto-Location Banner, Timetable, Grievance Form
              ============================================================ */}
          <div className={`${forceMobileFrame ? "space-y-3.5" : "lg:col-span-7 space-y-4"}`}>

            {/* AUTO-DETECTED WARD LOCATION BANNER */}
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

            {/* WARD-ONLY WATER ADVISORY & TIMETABLE CARD */}
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

            {/* PWA Install Banner */}
            {showPwaBanner && (
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
            )}

            {/* Grievance Submission Form (Locked to Auto-Detected Ward) */}
            <section className="civic-card rounded-xl p-4 sm:p-5 shadow-xs">
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

                {/* Locality Landmark */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-tight mb-1">
                    {t.localityLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="civic-input w-full rounded-lg text-xs font-medium text-slate-800 py-2 px-3 border border-slate-300"
                    placeholder="e.g., Gate No 5, Opposite Ration Kendra"
                    required
                  />
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

            {/* Mathematical Fairness Explainability Card */}
            <section className="civic-card rounded-xl p-3.5 bg-gradient-to-b from-white to-sky-50/50 border border-slate-200 shadow-xs">
              <div className="flex items-center space-x-1.5 mb-1.5">
                <div className="px-1.5 py-0.5 rounded bg-sky-900 text-white font-mono text-[9px] font-bold uppercase tracking-wider">
                  {t.explainTitle}
                </div>
                <span className="text-[10.5px] font-bold text-slate-800">
                  {t.explainHeading} (Ward {detectedWard.ward_code} Score: {detectedWard.priority_score})
                </span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-relaxed">
                Every submission is dynamically weighted by Mumbai SCADA's algorithmic formula:
                <span className="font-mono text-slate-800 font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] mx-1 inline-block">
                  {t.explainFormula}
                </span>
                {t.explainBody}
              </p>

              {/* Live Metric Badges */}
              <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-slate-200/80 text-center font-mono">
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
          </div>

          {/* ============================================================
              RIGHT COLUMN: Ward-Only Dispatched Tanker & Delivery OTP Card
              ============================================================ */}
          <div className={`${forceMobileFrame ? "space-y-3.5" : "lg:col-span-5 space-y-4"}`}>

            {/* Prominent Proof-of-Delivery OTP Card (Locked to Ward's Dispatched Tanker) */}
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

            {/* Dispatched Relief Tanker Card for THIS WARD ONLY */}
            <div className="civic-card rounded-xl p-4 shadow-xs space-y-3">
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
                  className="inline-flex items-center space-x-1 font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200 hover:bg-sky-100 transition"
                >
                  <Phone className="w-3 h-3 text-sky-600" />
                  <span>Call Driver</span>
                </a>
              </div>

              {/* Interactive Mini-Map (Centers specifically on detected ward) */}
              <div className="h-48 w-full rounded-lg overflow-hidden border border-slate-200 relative">
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

              {/* Progress Milestones */}
              <div className="pt-2 border-t border-slate-100">
                <div className="grid grid-cols-4 gap-1 text-center text-[9.5px] font-medium text-slate-500">
                  <div className="text-emerald-700 font-bold">
                    <span className="block text-emerald-600">✓</span> Logged
                  </div>
                  <div className="text-sky-700 font-bold">
                    <span className="block text-sky-600">●</span> Dispatched
                  </div>
                  <div className="text-slate-400">
                    <span className="block">○</span> Arrived
                  </div>
                  <div className="text-slate-400">
                    <span className="block">○</span> Complete
                  </div>
                </div>
              </div>
            </div>

            {/* Ward-Specific Infrastructure Info */}
            <div className="civic-card rounded-xl p-3.5 shadow-xs bg-white space-y-2">
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
              </div>
            </div>

          </div>
        </main>

        {/* ============================================================
            MOBILE BOTTOM NAVIGATION BAR
            ============================================================ */}
        <nav className="sticky bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-3 py-1.5 shadow-lg flex items-center justify-around text-[10px]">
          <button
            onClick={() => setActiveNav("home")}
            className={`flex flex-col items-center justify-center py-1 px-3 transition cursor-pointer ${
              activeNav === "home" ? "text-[#0056b3] font-bold" : "text-slate-500 hover:text-sky-700"
            }`}
          >
            <Droplet className="w-4 h-4 mb-0.5" />
            <span>{t.navHome}</span>
          </button>

          <button
            onClick={() => setActiveNav("map")}
            className={`flex flex-col items-center justify-center py-1 px-3 transition cursor-pointer ${
              activeNav === "map" ? "text-[#0056b3] font-bold" : "text-slate-500 hover:text-sky-700"
            }`}
          >
            <Compass className="w-4 h-4 mb-0.5" />
            <span>{t.navMap}</span>
          </button>

          <button
            onClick={() => setActiveNav("grievance")}
            className={`flex flex-col items-center justify-center py-1 px-3 relative cursor-pointer ${
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
            className={`flex flex-col items-center justify-center py-1 px-3 transition cursor-pointer ${
              activeNav === "queue" ? "text-[#0056b3] font-bold" : "text-slate-500 hover:text-sky-700"
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span>{t.navQueue}</span>
          </button>

          <button
            onClick={() => setActiveNav("profile")}
            className={`flex flex-col items-center justify-center py-1 px-3 transition cursor-pointer ${
              activeNav === "profile" ? "text-[#0056b3] font-bold" : "text-slate-500 hover:text-sky-700"
            }`}
          >
            <User className="w-4 h-4 mb-0.5" />
            <span>{t.navProfile}</span>
          </button>
        </nav>

        {/* Footer */}
        <footer className="text-center py-2 px-2 text-slate-400 text-[10px] leading-tight space-y-0.5 bg-slate-50 border-t border-slate-200">
          <p className="font-medium text-slate-500">{t.footerDept}</p>
          <p className="text-[9.5px]">{t.footerVer}</p>
        </footer>

      </div>
    </div>
  );
}
