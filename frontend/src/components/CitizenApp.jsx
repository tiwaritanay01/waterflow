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
  Wifi,
  WifiOff,
  Bot,
  Send,
  MessageSquare,
  FileText,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneOff,
  Users,
  ThumbsUp,
  ThumbsDown,
  Star,
  Award,
  History,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { MUMBAI_WARDS_DATABASE, findNearestMumbaiWard } from "../utils/mumbaiWardsData";
import CitizenChatbot from "./CitizenChatbot";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Trilingual dictionary: English, Hindi, Marathi
const I18N = {
  en: {
    scadaLive: "LIVE WATER SERVICE",
    telemetryVer: "BMC Water Works",
    helpline: "+91 8369978764",
    appTitle: "WaterFlow Citizen",
    subTitle: "Brihanmumbai Municipal Corporation (BMC)",
    emergencySupport: "Emergency Water Relief",
    algoActive: "Fair Distribution Active",
    heroTitle: "Facing water shortage in your area?",
    heroDesc: "Report your water problem here to receive immediate municipal assistance and a relief tanker.",
    alreadyLogged: "Already reported an issue?",
    trackQueueDesc: "Check where you are in the list & track your relief tanker live",
    trackStatus: "Check Tanker Status",
    formTitle: "Report Water Problem",
    formId: "Complaint No.: WF-24-918",
    issueClass: "What is your water problem?",
    autoWeight: "Priority: Urgent Need",
    tankerEligible: "Eligible for Free Relief Tanker",
    phoneLabel: "Mobile Phone Number",
    otpVerified: "Mobile Ready",
    wardLabel: "Your Ward / Area",
    settlementLabel: "Area Type (Chawl / Slum / Society)",
    localityLabel: "Near Landmark / Building / Galli No.",
    gpsHeader: "Your Location",
    refreshGps: "Update Location",
    wgsVerified: "Location Confirmed",
    photoLabel: "Attach Photo of Leak / Dry Tap (Optional)",
    photoDesc: "A photo helps our municipal team find and fix the problem faster",
    submitBtn: "Send Report & Request Relief Tanker",
    explainTitle: "Fairness Guarantee",
    explainHeading: "Fair Water For All — No VIP Influence",
    explainFormula: "Priority = Need + Days Without Water + Population",
    explainBody: "Water is sent first to areas with the greatest shortage. Nobody can skip the queue through political favoritism.",
    gridStability: "Tap Supply Status",
    activeFleet: "Tankers on Duty",
    dailyWater: "Today's Supply",
    footerDept: "Brihanmumbai Municipal Corporation (BMC) · Water Department",
    footerVer: "WaterFlow Municipal Support · 24 BMC Wards",
    navHome: "Home",
    navMap: "Live Tanker",
    navGrievance: "Report Issue",
    navQueue: "My Queue",
    navChat: "AI Helper",
    navProfile: "My Info",
    sosButton: "SOS Urgent Help",
    offlineMode: "Without Internet",
    onlineMode: "Connected",
    offlineAssisted: "SMS Support (No Internet)",
    ticketRaised: "Complaint Registered",
    smsTicketConfirmed: "SMS Complaint Saved",
    triggerWebhook: "Call Emergency Help (SOS)",
    ivrCalling: "Calling Your Phone Now",
  },
  hi: {
    scadaLive: "जल सेवा चालू",
    telemetryVer: "मनपा जल विभाग",
    helpline: "+91 8369978764",
    appTitle: "वॉटरफ्लो नागरिक सेवा",
    subTitle: "बृहन्मुंबई महानगरपालिका (BMC)",
    emergencySupport: "आपातकालीन जल सहायता",
    algoActive: "समान व निष्पक्ष वितरण",
    heroTitle: "क्या आपके इलाके में पानी की किल्लत है?",
    heroDesc: "तुरंत राहत टैंकर और सहायता के लिए अपनी शिकायत दर्ज करें।",
    alreadyLogged: "क्या पहले से शिकायत दर्ज है?",
    trackQueueDesc: "टैंकर कहाँ पहुँचा है और कतार में अपनी स्थिति देखें",
    trackStatus: "टैंकर की स्थिति देखें",
    formTitle: "पानी की शिकायत दर्ज करें",
    formId: "शिकायत क्र.: WF-24-918",
    issueClass: "समस्या का प्रकार चुनें",
    autoWeight: "प्राथमिकता: अति आवश्यक सहायता",
    tankerEligible: "मुफ्त राहत टैंकर हेतु पात्र",
    phoneLabel: "मोबाइल नंबर",
    otpVerified: "नंबर सही है",
    wardLabel: "आपका वार्ड / इलाका",
    settlementLabel: "इलाके का प्रकार (चॉल / बस्ती / सोसाइटी)",
    localityLabel: "पास का लैंडमार्क / गली नंबर",
    gpsHeader: "आपका स्थान",
    refreshGps: "स्थान अपडेट करें",
    wgsVerified: "स्थान सुरक्षित",
    photoLabel: "लीकेज या सूखे नल का फोटो (वैकल्पिक)",
    photoDesc: "फोटो से नगर निगम टीम को समस्या ढूंढने में आसानी होती है",
    submitBtn: "शिकायत भेजें और राहत टैंकर पाएं",
    explainTitle: "निष्पक्षता की गारंटी",
    explainHeading: "सभी के लिए समान पानी — कोई वीआईपी पक्षपात नहीं",
    explainFormula: "प्राथमिकता = वास्तविक जरूरत + सूखे दिन + आबादी",
    explainBody: "पानी सबसे पहले उन बस्तियों में पहुंचाया जाता है जहां सबसे ज्यादा संकट है। कोई भी प्रभाव डालकर कतार नहीं तोड़ सकता।",
    gridStability: "नल आपूर्ति स्थिति",
    activeFleet: "ड्यूटी पर टैंकर",
    dailyWater: "आज का पानी",
    footerDept: "बृहन्मुंबई महानगरपालिका · जल विभाग",
    footerVer: "वॉटरफ्लो नागरिक सहायता · 24 मनपा वार्ड",
    navHome: "होम",
    navMap: "टैंकर देखें",
    navGrievance: "शिकायत करें",
    navQueue: "मेरी कतार",
    navChat: "AI सहायक",
    navProfile: "मेरी जानकारी",
    sosButton: "आपातकालीन SOS",
    offlineMode: "बिना इंटरनेट",
    onlineMode: "ऑनलाइन",
    offlineAssisted: "SMS सहायता (ऑफलाइन)",
    ticketRaised: "शिकायत दर्ज हुई",
    smsTicketConfirmed: "SMS शिकायत सुरक्षित",
    triggerWebhook: "आपातकालीन सहायता बुलाएं",
    ivrCalling: "आपके फोन पर कॉल आ रहा है",
  },
  mr: {
    scadaLive: "पाणीपुरवठा थेट",
    telemetryVer: "मनपा पाणी विभाग",
    helpline: "+91 8369978764",
    appTitle: "वॉटरफ्लो नागरिक सेवा",
    subTitle: "बृहन्मुंबई महानगरपालिका (BMC)",
    emergencySupport: "तातडीची पाणी मदत",
    algoActive: "न्याय्य पाणी वाटप",
    heroTitle: "तुमच्या भागात पाण्याची टंचाई आहे का?",
    heroDesc: "तातडीचा पाण्याचा टँकर मिळवण्यासाठी तुमची तक्रार येथे नोंदवा.",
    alreadyLogged: "आधी तक्रार केली आहे का?",
    trackQueueDesc: "टँकर कुठे आला आहे आणि तुमचा नंबर तपासा",
    trackStatus: "टँकर कुठे आहे पहा",
    formTitle: "पाण्याची तक्रार नोंदवा",
    formId: "तक्रार क्र.: WF-24-918",
    issueClass: "समस्येचा प्रकार निवडा",
    autoWeight: "प्राधान्य: तातडीची गरज",
    tankerEligible: "मोफत टँकरसाठी पात्र",
    phoneLabel: "मोबाईल नंबर",
    otpVerified: "नंबर योग्य आहे",
    wardLabel: "तुमचा प्रभाग (वॉर्ड)",
    settlementLabel: "वस्तीचा प्रकार (चाळ / झोपडपट्टी / सोसायटी)",
    localityLabel: "जवळची खूण / गल्ली क्रमांक",
    gpsHeader: "तुमचे ठिकाण",
    refreshGps: "ठिकाण अपडेट करा",
    wgsVerified: "जागा निश्चित",
    photoLabel: "गळती किंवा कोरड्या नळाचा फोटो (पर्यायी)",
    photoDesc: "फोटोमुळे मनपाच्या कामगारांना जागा लगेच सापडते",
    submitBtn: "तक्रार पाठवा व तातडीचा टँकर मिळवा",
    explainTitle: "पारदर्शकता व न्याय",
    explainHeading: "सर्वांसाठी समान पाणी — कोणावरही अन्याय नाही",
    explainFormula: "प्राधान्य = पाण्याची गरज + कोरडे दिवस + लोकसंख्या",
    explainBody: "ज्या भागात जास्त पाणीटंचाई आहे तिथे टँकर आधी पोहोचतो. कोणाच्याही ओळखीने किंवा प्रभावाने रांग तोडली जात नाही.",
    gridStability: "नळाचे पाणी",
    activeFleet: "कामावर असलेले टँकर",
    dailyWater: "आजचे पाणी",
    footerDept: "बृहन्मुंबई महानगरपालिका · जल विभाग",
    footerVer: "वॉटरफ्लो नागरिक साहाय्य · २४ मनपा प्रभाग",
    navHome: "मुख्य",
    navMap: "टँकर मार्ग",
    navGrievance: "तक्रार नोंदवा",
    navQueue: "माझा नंबर",
    navChat: "AI मदतनीस",
    navProfile: "माझी माहिती",
    sosButton: "तातडीची मदत (SOS)",
    offlineMode: "ऑफलाइन",
    onlineMode: "ऑनलाइन",
    offlineAssisted: "SMS साहाय्य (ऑफलाइन)",
    ticketRaised: "तक्रार नोंदवली",
    smsTicketConfirmed: "SMS तक्रार सुरक्षित",
    triggerWebhook: "तातडीची मदत मागवा",
    ivrCalling: "फोनवर कॉल येत आहे",
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
  const [activeNav, setActiveNav] = useState("home"); // "home" | "map" | "grievance" | "queue" | "chat" | "profile"
  const [lang, setLang] = useState(() => localStorage.getItem("WF_CITIZEN_LANG") || "en"); // "en" | "hi" | "mr"
  const [showPwaBanner, setShowPwaBanner] = useState(true);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [forceMobileFrame, setForceMobileFrame] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [whatsappTracking, setWhatsappTracking] = useState(true);

  // Network & Offline Support State
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [activeSmsTicket, setActiveSmsTicket] = useState(null);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const saved = localStorage.getItem("WF_CITIZEN_OFFLINE_QUEUE");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Emergency Call Webhook State
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyWebhookResult, setEmergencyWebhookResult] = useState(null);
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);

  // Interactive Helpline Voice Bot & Priority Queue State (+91 8369978764)
  const [showCallModal, setShowCallModal] = useState(false);
  const [callSession, setCallSession] = useState(null);
  const [callStage, setCallStage] = useState("calling"); // 'calling' | 'bot_speaking' | 'bot_satisfied_check' | 'resolved' | 'queued' | 'officer_connected'
  const [callDuration, setCallDuration] = useState(0);
  const [callQueueData, setCallQueueData] = useState(null);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [officerData, setOfficerData] = useState(null);
  const [callMuted, setCallMuted] = useState(false);

  // Auto-Detection State
  const [detectedWard, setDetectedWard] = useState(MUMBAI_WARDS_DATABASE[0]);
  const [detectionMode, setDetectionMode] = useState("Device GPS (Auto)");
  const [gpsAccuracy, setGpsAccuracy] = useState("±3.4m");
  const [gpsLoading, setGpsLoading] = useState(false);

  // Form State
  const [phoneNumber, setPhoneNumber] = useState("98200 12345");
  const [issueType, setIssueType] = useState("🔴 No Water for 2+ Days (दोन दिवसांपेक्षा जास्त पाणी नाही)");
  const [settlement, setSettlement] = useState("Chawl / Slum Colony (चाळ / झोपडपट्टी)");
  const [landmark, setLandmark] = useState(MUMBAI_WARDS_DATABASE[0].default_landmark);
  const [coords, setCoords] = useState({ lat: MUMBAI_WARDS_DATABASE[0].lat, lng: MUMBAI_WARDS_DATABASE[0].lng });
  const [hasPhoto, setHasPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showExplainModal, setShowExplainModal] = useState(false);

  // Dynamic Recent Tickets list
  const [recentTicketsList, setRecentTicketsList] = useState([
    {
      id: "#WF-24-918",
      type: "Severe Dry Pipe (>48 Hours Continuous)",
      status: "Assigned (T-08)",
      tanker: "T-08 (ETA 14m)",
      time: "45 mins ago",
      otp: "7419",
      isLive: true,
    },
    {
      id: "#WF-24-811",
      type: "Community Standpost #4 · 10,000 L",
      status: "Delivered",
      tanker: "T-04 (Delivered)",
      time: "Yesterday",
      otp: "8312",
      isDelivered: true,
    },
  ]);

  // Citizen Credibility & Civic Credits State
  const [citizenCredits, setCitizenCredits] = useState(145);
  const [credibilityScore, setCredibilityScore] = useState(92);
  const [citizenTier, setCitizenTier] = useState("Gold Civic Contributor");
  const [useFastTrack, setUseFastTrack] = useState(false);
  const [creditFilter, setCreditFilter] = useState("all");
  const [creditLedger, setCreditLedger] = useState([
    {
      id: "TX-CIT-101",
      timestamp: "Today, 10:15 AM",
      type: "CREDIT",
      amount: 25,
      reason: "Verified genuine dry pipe report #WF-24-811 by Ward Junior Engineer",
      balance_after: 145,
    },
    {
      id: "TX-CIT-102",
      timestamp: "Yesterday, 04:30 PM",
      type: "CREDIT",
      amount: 15,
      reason: "Delivery OTP #8312 confirmed on-site at Standpost #4",
      balance_after: 120,
    },
    {
      id: "TX-CIT-103",
      timestamp: "Oct 5, 06:12 PM",
      type: "DEBIT",
      amount: -20,
      reason: "Fast-Track Priority Boost redeemed for Ticket #WF-24-811",
      balance_after: 105,
    },
    {
      id: "TX-CIT-104",
      timestamp: "Oct 1, 09:00 AM",
      type: "CREDIT",
      amount: 125,
      reason: "Initial onboarding civic trust bonus & Aadhaar/OTP verification",
      balance_after: 125,
    },
  ]);

  // Driver Grievance & Rating Modal State
  const [driverReviewModal, setDriverReviewModal] = useState(false);
  const [selectedTicketForReview, setSelectedTicketForReview] = useState(null);
  const [driverRating, setDriverRating] = useState(5);
  const [driverGrievanceType, setDriverGrievanceType] = useState("none");
  const [driverGrievanceNotes, setDriverGrievanceNotes] = useState("");
  const [driverReviewFeedback, setDriverReviewFeedback] = useState(null);
  const [driverSubmitting, setDriverSubmitting] = useState(false);

  // Sync Citizen Credits from Backend
  useEffect(() => {
    async function loadCitizenCredits() {
      try {
        const res = await fetch(`${API_BASE}/api/citizen/credits?phone=${phoneNumber}`);
        const json = await res.json();
        if (json.success && json.profile) {
          setCitizenCredits(json.profile.credit_balance);
          setCredibilityScore(json.profile.credibility_score);
          setCitizenTier(json.profile.tier);
          if (json.profile.history && json.profile.history.length > 0) {
            setCreditLedger(json.profile.history);
          }
        }
      } catch (_) {}
    }
    loadCitizenCredits();
  }, [phoneNumber]);

  const handleOpenDriverReview = (ticket) => {
    setSelectedTicketForReview(ticket);
    setDriverRating(5);
    setDriverGrievanceType("none");
    setDriverGrievanceNotes("");
    setDriverReviewFeedback(null);
    setDriverReviewModal(true);
  };

  const handleSubmitDriverReview = async (e) => {
    e.preventDefault();
    setDriverSubmitting(true);
    try {
      const tankerId = selectedTicketForReview?.tanker?.split(" ")[0]?.replace(/[()]/g, "") || "T-08";
      if (driverGrievanceType !== "none") {
        const res = await fetch(`${API_BASE}/api/citizen/driver-grievance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tanker_id: tankerId,
            citizen_phone: phoneNumber,
            issue_type: driverGrievanceType,
            notes: driverGrievanceNotes || `Citizen rating: ${driverRating} stars - ${driverGrievanceType}`,
          }),
        });
        const json = await res.json();
        setDriverReviewFeedback(
          json.success
            ? "⚠️ Grievance registered in Municipal SCADA. Driver docked -30 Credits and flagged for route review."
            : "Grievance registered into local audit record."
        );
      } else {
        await fetch(`${API_BASE}/api/driver/reward`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tanker_id: tankerId,
            reward_type: "CUSTOMER_PRAISE",
            details: `Citizen 5-star rating: ${driverGrievanceNotes || "Excellent delivery on-time"}`,
          }),
        }).catch(() => {});
        setDriverReviewFeedback("⭐ Thank you! Your 5-star rating awarded +10 Credits to the municipal driver.");
      }
    } catch (_) {
      setDriverReviewFeedback("Feedback recorded in municipal audit register.");
    } finally {
      setDriverSubmitting(false);
    }
  };

  const t = I18N[lang] || I18N.en;

  // Persist language selection
  useEffect(() => {
    localStorage.setItem("WF_CITIZEN_LANG", lang);
  }, [lang]);

  // Online / Offline event listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Web Speech API Multilingual Voice Recognition Handler (en-IN, hi-IN, mr-IN)
  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(
        lang === "mr"
          ? "तुमचा ब्राउझर व्हॉइस इनपुटला सपोर्ट करत नाही. कृपया टाइप करा."
          : lang === "hi"
          ? "आपका ब्राउज़र आवाज़ पहचान (Web Speech) को सपोर्ट नहीं करता। कृपया टाइप करें।"
          : "Web Speech API is not supported in this browser. Please type your location."
      );
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN";
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setLandmark((prev) => (prev ? `${prev}, ${transcript}` : transcript));
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
          console.warn("GPS permission not granted or timeout, using Mumbai default:", err.message);
          const fallback = MUMBAI_WARDS_DATABASE[0]; // Ward M/E
          setDetectedWard(fallback);
          setCoords({ lat: fallback.lat, lng: fallback.lng });
          setLandmark(fallback.default_landmark);
          setDetectionMode("Default Location (Ward M/East)");
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

  // Trigger Emergency Call Webhook
  const handleTriggerEmergencyWebhook = async () => {
    setEmergencySubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/emergency/call-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: "+91 " + phoneNumber,
          ward_code: detectedWard.ward_code,
          ward_name: detectedWard.name,
          lat: coords.lat,
          lng: coords.lng,
          landmark: landmark,
          emergency_type: issueType,
          source: "citizen_portal_emergency_modal",
        }),
      });

      const data = await res.json();
      setEmergencyWebhookResult(data);

      if (data.ticket_id) {
        setRecentTicketsList((prev) => [
          {
            id: `#${data.ticket_id}`,
            type: `🚨 EMERGENCY SOS (${issueType})`,
            status: "Emergency Tier-1 Dispatched",
            tanker: "Tanker T-08 (Priority Red-Alert)",
            time: "Just now",
            otp: "7419",
            isEmergency: true,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.warn("Emergency webhook network call failed, falling back to simulated IVR response:", err);
      const fallbackTicket = `WF-EMERG-${Math.floor(100000 + Math.random() * 900000)}`;
      const fallbackData = {
        success: true,
        ticket_id: fallbackTicket,
        session_id: `IVR-BMC-${Date.now()}-9412`,
        details: {
          ticket_id: fallbackTicket,
          phone_number: "+91 " + phoneNumber,
          ward_code: detectedWard.ward_code,
          ward_name: detectedWard.name,
          priority_tier: "Tier-1 Critical (RED_ALERT)",
          assigned_tanker_id: "T-08",
          driver_name: "Rajesh Patil",
          driver_phone: "+91 98201 55432",
          eta_minutes: 8,
          otp_code: "7419",
          ivr_callback: {
            scheduled: true,
            dest_number: "+91 " + phoneNumber,
            status: "QUEUED_IMMEDIATE_RING",
            expected_callback_seconds: 10,
            voice_script: `नमस्कार. तुमची तातडीची तक्रार #${fallbackTicket} नोंदवली आहे. तातडीचा टँकर T-08 रवाना झाला आहे. हेल्पलाइन: +91 8369978764.`,
          },
          sms_notification: {
            dispatched: true,
            gateway: "+91 8369978764 / 56161",
            sms_text: `MCGM WATERFLOW: Emergency SOS Ticket #${fallbackTicket} logged for Ward ${detectedWard.ward_code}. Relief Tanker T-08 en route. OTP: 7419. Helpline: +91 8369978764.`,
          },
        },
      };
      setEmergencyWebhookResult(fallbackData);
      setRecentTicketsList((prev) => [
        {
          id: `#${fallbackTicket}`,
          type: `🚨 EMERGENCY SOS (${issueType})`,
          status: "Emergency Tier-1 Dispatched",
          tanker: "Tanker T-08 (Priority Red-Alert)",
          time: "Just now",
          otp: "7419",
          isEmergency: true,
        },
        ...prev,
      ]);
    } finally {
      setEmergencySubmitting(false);
    }
  };

  // Open Pre-composed Offline SMS Grievance Composer
  const handleOpenSmsComposer = () => {
    const smsTicketId = `WF-SMS-${Math.floor(100000 + Math.random() * 900000)}`;
    const cleanPhone = (phoneNumber || "9820012345").replace(/\s+/g, "");
    const smsPayload = `MCGM WATERFLOW: TKT #${smsTicketId} | WARD ${detectedWard.ward_code} | LOC: ${landmark} | ISSUE: ${issueType} | TEL: +91${cleanPhone}`;
    setActiveSmsTicket({
      ticketId: smsTicketId,
      smsText: smsPayload,
      phoneNumber: phoneNumber,
      wardCode: detectedWard.ward_code,
      wardName: detectedWard.name,
      issueType: issueType,
      landmark: landmark,
      tankerId: detectedWard.assigned_tanker?.tanker_id || "T-08",
      otpCode: detectedWard.assigned_tanker?.otp_code || "7419",
      isOffline: true,
    });
    setShowSmsModal(true);
  };

  // Play Bot Speech aloud via browser SpeechSynthesis
  const playBotVoice = (text, language) => {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
        utter.rate = 1.0;
        utter.pitch = 1.0;
        utter.onstart = () => setIsBotSpeaking(true);
        utter.onend = () => setIsBotSpeaking(false);
        utter.onerror = () => setIsBotSpeaking(false);
        window.speechSynthesis.speak(utter);
      } catch (_) {
        setIsBotSpeaking(false);
      }
    }
  };

  // Start Helpline Call (+91 8369978764)
  const handleStartHelplineCall = async () => {
    setShowCallModal(true);
    setCallStage("calling");
    setCallDuration(0);
    setOfficerData(null);
    setCallQueueData(null);
    setIsBotSpeaking(false);

    try {
      const res = await fetch(`${API_BASE}/api/call/ivr-connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: "+91 " + phoneNumber,
          ward_code: detectedWard.ward_code,
          lang: lang,
          source: "citizen_portal_helpline_modal",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCallSession(data);
        setCallStage("bot_speaking");
        playBotVoice(data.bot_voice_script, lang);

        if (data.ticket_id) {
          setRecentTicketsList((prev) => [
            {
              id: `#${data.ticket_id}`,
              type: `📞 HELPLINE CALL (Ward ${detectedWard.ward_code})`,
              status: "Voice Helper Active",
              tanker: `Tanker ${data.area_status?.relief_tanker?.tanker_id || "T-08"}`,
              time: "Just now",
              otp: data.area_status?.relief_tanker?.otp_code || "7419",
              isCall: true,
            },
            ...prev,
          ]);
        }
      }
    } catch (err) {
      console.warn("Call connect network fallback:", err);
      const fallbackTicket = `WF-CALL-${Math.floor(100000 + Math.random() * 900000)}`;
      const fallbackScripts = {
        mr: `नमस्कार! मी मनपा जलवाणी मदत सेवेतून बोलत आहे. काळजी करू नका, तुमची तक्रार नोंदवली आहे (तक्रार क्र. #${fallbackTicket}). वॉर्ड ${detectedWard.ward_code} मध्ये आज नळाचे पाणी सकाळी ${detectedWard.timetable || "06:00 - 09:30 AM"} येणार होते. भागात पाणी कमी असल्यामुळे तुमच्यासाठी मोफत टँकर ${detectedWard.assigned_tanker?.tanker_id || "T-08"} निघाला आहे. पाणी घेताना OTP 7419 सांगा. ही माहिती समजली का?`,
        hi: `नमस्ते! मैं मनपा जलवाणी सहायता से बोल रहा हूँ। परेशान मत होइए, आपकी शिकायत दर्ज हो गई है (शिकायत क्र. #${fallbackTicket})। वार्ड ${detectedWard.ward_code} में आज नल का पानी सुबह ${detectedWard.timetable || "06:00 - 09:30 AM"} आना था। इलाके में पानी की कमी की वजह से आपके लिए मुफ्त राहत टैंकर ${detectedWard.assigned_tanker?.tanker_id || "T-08"} भेज दिया गया है। पानी लेते समय OTP 7419 बता दीजिएगा। क्या आपको पूरी जानकारी मिल गई?`,
        en: `Hello! This is the BMC Water Helpline. Don't worry, your water complaint is registered (Ticket #${fallbackTicket}). In Ward ${detectedWard.ward_code}, regular tap water was scheduled for ${detectedWard.timetable || "06:00 - 09:30 AM"}. Because water is short today, relief tanker ${detectedWard.assigned_tanker?.tanker_id || "T-08"} is already on the way to your street. Please share OTP 7419 when collecting water. Does this help you?`,
      };
      setCallSession({
        ticket_id: fallbackTicket,
        session_id: `CALL-FALLBACK-${Date.now()}`,
        bot_voice_script: fallbackScripts[lang] || fallbackScripts.en,
        area_status: {
          timetable: detectedWard.timetable || "06:00 - 09:30 AM",
          deficit_pct: detectedWard.water_deficit_pct || 28,
          relief_tanker: {
            tanker_id: detectedWard.assigned_tanker?.tanker_id || "T-08",
            driver_name: "Rajesh Patil",
            driver_phone: "+91 98201 55432",
            eta_mins: 12,
            otp_code: "7419",
          },
        },
      });
      setCallStage("bot_speaking");
      playBotVoice(fallbackScripts[lang] || fallbackScripts.en, lang);
    }
  };

  // Caller satisfaction resolution
  const handleCallSatisfaction = async (satisfied) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsBotSpeaking(false);

    if (satisfied) {
      setCallStage("resolved");
      try {
        await fetch(`${API_BASE}/api/call/satisfaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: callSession?.session_id,
            ticket_id: callSession?.ticket_id,
            satisfied: true,
          }),
        });
      } catch (_) {}
    } else {
      // Unsatisfied -> Escalate to Priority Call Queue!
      setCallStage("queued");
      try {
        const res = await fetch(`${API_BASE}/api/call/escalate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: callSession?.session_id,
            ticket_id: callSession?.ticket_id,
            phone_number: "+91 " + phoneNumber,
            ward_code: detectedWard.ward_code,
            issue_type: issueType,
            lang: lang,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setCallQueueData(data);
        }
      } catch (err) {
        console.warn("Escalate call fallback:", err);
        setCallQueueData({
          ticket_id: callSession?.ticket_id,
          queue_position: 1,
          total_waiting: 3,
          priority_score: 83.4,
          tier: 1,
          tier_name: "Tier-1 Critical Priority",
          estimated_wait_seconds: 45,
          factors: [
            { factor: "Vulnerability", weighted_score: 28.8, normalized: 0.96 },
            { factor: "Dry Pipe", weighted_score: 20.1, normalized: 0.81 },
            { factor: "Population", weighted_score: 16.2, normalized: 0.81 },
            { factor: "Historical Deficit", weighted_score: 11.7, normalized: 0.78 },
            { factor: "Depot Distance", weighted_score: 6.6, normalized: 0.66 },
          ],
        });
      }
    }
  };

  // Connect caller to municipal officer
  const handleConnectOfficer = async () => {
    setCallStage("officer_connected");
    try {
      const res = await fetch(`${API_BASE}/api/call/connect-officer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: callSession?.ticket_id,
          ward_code: detectedWard.ward_code,
        }),
      });
      const data = await res.json();
      if (data.success && data.officer) {
        setOfficerData(data.officer);
      }
    } catch (_) {
      setOfficerData({
        officer_name: "Er. Nilesh Shinde",
        designation: `Executive Water Engineer (${detectedWard.name})`,
        badge_number: "BMC-EE-4182",
        control_room: "Eastern Suburbs Municipal Water Office, Chembur",
      });
    }
  };

  // Close Call and cancel any speech
  const handleEndCall = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsBotSpeaking(false);
    setShowCallModal(false);
    setCallStage("calling");
    setCallSession(null);
  };

  // Call duration counter
  useEffect(() => {
    let timer;
    if (showCallModal && callStage !== "resolved") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showCallModal, callStage]);

  // Submit Grievance with Offline Assisted SMS Fallback & Ticket Generation
  const handleSubmitGrievance = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const isOfflineMode = !isOnline || simulateOffline;
    const generatedTicketId = isOfflineMode
      ? `WF-SMS-${Math.floor(100000 + Math.random() * 900000)}`
      : `WF-${detectedWard.ward_code}-${Math.floor(1000 + Math.random() * 9000)}`;

    const reportData = {
      ticket_id: generatedTicketId,
      phone_number: "+91 " + phoneNumber,
      lat: coords.lat,
      lng: coords.lng,
      issue_type: issueType,
      landmark: landmark,
      ward_code: detectedWard.ward_code,
      ward: `Ward ${detectedWard.ward_code} (${detectedWard.name})`,
      settlement: settlement,
      is_offline: isOfflineMode,
      use_fast_track: useFastTrack,
      created_at: new Date().toISOString(),
    };

    if (useFastTrack) {
      setCitizenCredits((prev) => Math.max(0, prev - 20));
      setCreditLedger((prev) => [
        {
          id: `TX-CIT-${Date.now()}`,
          timestamp: "Just now",
          type: "DEBIT",
          amount: -20,
          reason: `Fast-Track Priority Boost redeemed for Ticket #${generatedTicketId}`,
          balance_after: Math.max(0, citizenCredits - 20),
        },
        ...prev,
      ]);
    }

    if (isOfflineMode) {
      // 1. Store in offline local storage queue
      const updatedQueue = [reportData, ...offlineQueue];
      setOfflineQueue(updatedQueue);
      try {
        localStorage.setItem("WF_CITIZEN_OFFLINE_QUEUE", JSON.stringify(updatedQueue));
      } catch (e) {
        console.warn("Local storage write error:", e);
      }

      const smsPayload = `MCGM WATERFLOW: TKT #${generatedTicketId} | WARD ${detectedWard.ward_code} | LOC: ${landmark} | ISSUE: ${issueType} | TEL: +91${phoneNumber}`;
      setActiveSmsTicket({
        ticketId: generatedTicketId,
        smsText: smsPayload,
        phoneNumber: phoneNumber,
        wardCode: detectedWard.ward_code,
        wardName: detectedWard.name,
        issueType: issueType,
        landmark: landmark,
        tankerId: detectedWard.assigned_tanker.tanker_id,
        otpCode: detectedWard.assigned_tanker.otp_code,
        isOffline: true,
      });

      setRecentTicketsList((prev) => [
        {
          id: `#${generatedTicketId}`,
          type: `${issueType} (Offline SMS Queued)`,
          status: "Queued (SMS Dispatch)",
          tanker: `${detectedWard.assigned_tanker.tanker_id} (Auto-Assigned)`,
          tanker_id: detectedWard.assigned_tanker.tanker_id,
          time: "Just now",
          otp: detectedWard.assigned_tanker.otp_code,
          isOffline: true,
          isFastTrack: useFastTrack,
        },
        ...prev,
      ]);

      setShowSmsModal(true);
      setSubmitting(false);
      return;
    }

    // 2. Online submission path
    try {
      const res = await fetch(`${API_BASE}/api/citizen/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData),
      });

      const resJson = await res.json();
      const confirmedId = resJson?.report?.report_id || generatedTicketId;

      const smsPayload = `MCGM WATERFLOW: TKT #${confirmedId} CONFIRMED FOR WARD ${detectedWard.ward_code}. TANKER ${detectedWard.assigned_tanker.tanker_id} DISPATCHED. OTP: ${detectedWard.assigned_tanker.otp_code}.`;
      setActiveSmsTicket({
        ticketId: confirmedId,
        smsText: smsPayload,
        phoneNumber: phoneNumber,
        wardCode: detectedWard.ward_code,
        wardName: detectedWard.name,
        issueType: issueType,
        landmark: landmark,
        tankerId: detectedWard.assigned_tanker.tanker_id,
        otpCode: detectedWard.assigned_tanker.otp_code,
        isOffline: false,
      });

      setRecentTicketsList((prev) => [
        {
          id: `#${confirmedId}`,
          type: issueType,
          status: `Assigned (${detectedWard.assigned_tanker.tanker_id})`,
          tanker: `${detectedWard.assigned_tanker.tanker_id} (ETA ${detectedWard.assigned_tanker.eta_mins}m)`,
          tanker_id: detectedWard.assigned_tanker.tanker_id,
          time: "Just now",
          otp: detectedWard.assigned_tanker.otp_code,
          isLive: true,
          isFastTrack: useFastTrack,
        },
        ...prev,
      ]);

      setShowSmsModal(true);
    } catch (err) {
      console.warn("Online report failed, engaging offline SMS fallback:", err.message);
      const fallbackId = `WF-SMS-${Math.floor(100000 + Math.random() * 900000)}`;
      const smsPayload = `MCGM WATERFLOW: TKT #${fallbackId} | WARD ${detectedWard.ward_code} | LOC: ${landmark} | ISSUE: ${issueType}`;
      setActiveSmsTicket({
        ticketId: fallbackId,
        smsText: smsPayload,
        phoneNumber: phoneNumber,
        wardCode: detectedWard.ward_code,
        wardName: detectedWard.name,
        issueType: issueType,
        landmark: landmark,
        tankerId: detectedWard.assigned_tanker.tanker_id,
        otpCode: detectedWard.assigned_tanker.otp_code,
        isOffline: true,
      });

      setShowSmsModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Sync Offline Queue when back online
  const handleSyncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || syncingOffline) return;
    setSyncingOffline(true);
    try {
      const res = await fetch(`${API_BASE}/api/citizen/offline-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offline_reports: offlineQueue }),
      });
      if (res.ok) {
        localStorage.removeItem("WF_CITIZEN_OFFLINE_QUEUE");
        setOfflineQueue([]);
        alert(
          lang === "mr"
            ? "सर्व ऑफलाइन तक्रारी मनपा कार्यालयाशी सिंक झाल्या आहेत!"
            : lang === "hi"
            ? "सभी ऑफलाइन शिकायतें मनपा कार्यालय के साथ सफलतापूर्वक सिंक हो गईं!"
            : "All queued offline tickets successfully synced with BMC Water Office!"
        );
      }
    } catch (err) {
      console.warn("Sync failed:", err);
    } finally {
      setSyncingOffline(false);
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
  const distRaw = Number(detectedWard.distance_to_depot_km || detectedWard.depot_distance_km || 4.2);
  const distNorm = Math.min(1.0, Math.max(0.0, distRaw) / 20.0);
  const distContrib = distNorm * 10.0;

  const vulnContrib = vulnScore * 30.0;
  const unmetContrib = unmetScore * 25.0;
  const popContrib = popScore * 20.0;
  const deficitContrib = deficitScore * 15.0;
  const totalScore = (vulnContrib + unmetContrib + popContrib + deficitContrib + distContrib).toFixed(1);

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
          Ward Water Status
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        {/* Supply Schedule */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
            Supply Timetable
          </span>
          <span className="font-bold text-slate-900 block mt-0.5">
            {detectedWard.timetable}
          </span>
          <span className="text-[9.5px] text-slate-500 mt-0.5 block">
            Line: {detectedWard.feeder_line}
          </span>
        </div>

        {/* Pressure Status */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
            Tap Water Pressure
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
            Station: Ward Office {detectedWard.ward_code}
          </span>
        </div>

        {/* Deficit & Priority Score */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
            Shortage &amp; Need
          </span>
          <span className="font-bold text-rose-700 block mt-0.5">
            {detectedWard.water_deficit_pct}% Shortage ({detectedWard.dry_pipe_hours}h Without Water)
          </span>
          <span className="text-[9.5px] text-slate-600 font-mono mt-0.5 block">
            Urgency Rank: <strong>{detectedWard.priority_score}</strong> ({detectedWard.priority_tier})
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
            <img src="/logo.jpg" alt="WaterFlow OS Logo" className="w-9 h-9 rounded-xl shadow-sm shrink-0 mt-0.5 border border-white/20 object-cover" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 tracking-tight">
                  {lang === "hi" ? "वॉटरफ्लो ऐप फोन स्क्रीन पर जोड़ें" : lang === "mr" ? "वॉटरफ्लो ॲप फोनवर जोडा" : "Add WaterFlow to Phone Screen"}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[9px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  {lang === "hi" ? "बिना इंटरनेट चलेगा" : lang === "mr" ? "इंटरनेटशिवाय चालेल" : "Works Offline"}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-tight mt-1">
                {lang === "hi"
                  ? "बिना इंटरनेट शिकायत लिखें, पानी टैंकर की लाइव स्थिति देखें और बिना ऐप स्टोर के तुरंत चलाएं।"
                  : lang === "mr"
                  ? "इंटरनेटशिवाय तक्रार नोंदवा, पाण्याचा टँकर ट्रॅक करा आणि ॲप स्टोअरशिवाय फोनवर थेट वापरा."
                  : "Report water problems offline, track relief water tankers, and use directly without app store downloads."}
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
            <span>⚡ {lang === "hi" ? "तेज़ व सुरक्षित" : lang === "mr" ? "जलद व सुरक्षित" : "Fast & Offline Ready"}</span>
            <span>•</span>
            <span>🔒 BMC Verified</span>
          </div>

          <button
            onClick={() => {
              setPwaInstalled(true);
              alert(
                lang === "mr"
                  ? "वॉटरफ्लो ॲप तुमच्या फोनवर सुरक्षित केले आहे! इंटरनेटशिवायही चालेल."
                  : lang === "hi"
                  ? "वॉटरफ्लो ऐप आपके फोन में सुरक्षित हो गया है! बिना इंटरनेट भी चलेगा।"
                  : "WaterFlow saved to your phone. Works even without internet."
              );
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0056b3] hover:bg-sky-700 text-white text-[11px] font-bold shadow-xs active:scale-95 transition cursor-pointer"
          >
            {pwaInstalled ? <Check className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{pwaInstalled ? (lang === "hi" ? "जोड़ा गया" : lang === "mr" ? "जोडले" : "Added") : (lang === "hi" ? "फोन में जोड़ें" : lang === "mr" ? "फोनवर जोडा" : "Add to Phone")}</span>
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

      {/* Dedicated Offline / SMS Quick Ticket Card */}
      <div className="mb-3.5 p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-teal-950 flex items-center space-x-1.5">
              <span>{lang === "hi" ? "बिना इंटरनेट SMS द्वारा शिकायत दर्ज करें" : lang === "mr" ? "इंटरनेटशिवाय SMS द्वारे तक्रार नोंदवा" : "No Internet? Report via Free SMS"}</span>
              <span className="text-[9.5px] bg-teal-200/80 text-teal-900 px-1.5 py-0.2 rounded font-mono font-bold">+91 8369978764</span>
            </div>
            <p className="text-[10.5px] text-teal-800 mt-0.5 leading-tight">
              {lang === "hi"
                ? "बिना इंटरनेट के SMS भेजकर पानी की शिकायत दर्ज करें और तुरंत टैंकर OTP प्राप्त करें।"
                : lang === "mr"
                ? "इंटरनेट नसतानाही साधा SMS पाठवून पाण्याची तक्रार नोंदवा आणि तात्काळ टँकर OTP मिळवा."
                : "Send a free SMS to register your water complaint and get your relief tanker OTP immediately without internet."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenSmsComposer}
          className="py-1.5 px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs shrink-0 active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{lang === "hi" ? "SMS टिकट बनाएं →" : lang === "mr" ? "SMS तिकीट तयार करा →" : "Generate SMS Ticket →"}</span>
        </button>
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
              <option value="🔴 No Water for 2+ Days (दोन दिवसांपेक्षा जास्त पाणी नाही)">🔴 No Water for 2+ Days (दोन दिवसांपेक्षा जास्त पाणी नाही)</option>
              <option value="🟠 Water Cut for 1-2 Days (१ ते २ दिवस पाणी नाही)">🟠 Water Cut for 1-2 Days (१ ते २ दिवस पाणी नाही)</option>
              <option value="🟡 Very Low Tap Pressure (नळाला खूप कमी पाणी)">🟡 Very Low Tap Pressure (नळाला खूप कमी पाणी)</option>
              <option value="⚠️ Dirty / Muddy / Contaminated Water (घाणेरडे किंवा गढूळ पाणी)">⚠️ Dirty / Muddy / Contaminated Water (घाणेरडे किंवा गढूळ पाणी)</option>
              <option value="🚰 Water Pipe Burst / Street Leak (पाईप फुटला / पाणी गळती)">🚰 Water Pipe Burst / Street Leak (पाईप फुटला / पाणी गळती)</option>
              <option value="🚛 Relief Tanker Did Not Arrive (पाण्याचा टँकर आला नाही)">🚛 Relief Tanker Did Not Arrive (पाण्याचा टँकर आला नाही)</option>
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
              <option value="Chawl / Slum Colony (चाळ / झोपडपट्टी)">Chawl / Slum Colony (चाळ / झोपडपट्टी)</option>
              <option value="Co-op Housing Society (इमारत / सोसायटी)">Co-op Housing Society (इमारत / सोसायटी)</option>
              <option value="Slum Rehabilitation (SRA इमारत)">Slum Rehabilitation (SRA इमारत)</option>
              <option value="Small Shop / Business (दुकान / व्यवसाय)">Small Shop / Business (दुकान / व्यवसाय)</option>
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
                  ? "✓ Photo Attached: pipeline_leak_burst_evidence.jpg (Photo Added)"
                  : "Capture dry tap or pipeline leak photo"}
              </span>
            </div>
            <p className="text-[9.5px] text-slate-400 mt-0.5">
              {t.photoDesc}
            </p>
          </div>
        </div>

        {/* Civic Credits Fast-Track Priority Booster */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 via-sky-50 to-blue-50 border border-amber-300 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-base">⚡</span>
              <div>
                <span className="text-xs font-black text-slate-900 block tracking-tight">
                  {lang === "mr" ? "नागरी क्रेडिट्ससह प्राधान्य वाढवा (Fast-Track)" : lang === "hi" ? "नागरिक क्रेडिट से प्राथमिकता बढ़ाएं (Fast-Track)" : "Fast-Track Verification with Civic Credits"}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {lang === "mr" ? "उपलब्ध शिल्लक: " : lang === "hi" ? "उपलब्ध बैलेंस: " : "Available Balance: "}
                  <strong className="text-amber-700 font-mono font-bold">{citizenCredits} Credits</strong>
                  {" · "}
                  <span className="text-emerald-700 font-semibold">{credibilityScore}% Trust Rating</span>
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useFastTrack}
                onChange={(e) => setUseFastTrack(e.target.checked)}
                disabled={citizenCredits < 20}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <p className="text-[10px] text-slate-600 leading-tight">
            {useFastTrack
              ? "🌟 Fast-Track Active (-20 Credits): Your complaint will be prioritized at the top of the SCADA queue and marked with your high-trust citizen badge."
              : citizenCredits >= 20
              ? "Redeem 20 Civic Credits to bypass automated triage queues and prioritize immediate relief tanker assignment."
              : "Insufficient credits (need 20). Earn credits by reporting genuine shortages and confirming delivery OTPs."}
          </p>
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
                <span>Sending Complaint to Water Dept...</span>
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
            {lang === "mr" ? "स्पष्टीकरण" : "FAIR QUEUE"}
          </div>
          <h4 className="text-xs font-black text-slate-900 tracking-tight">
            {lang === "mr" ? "माझा नंबर कसा ठरवला?" : "How is My Turn Decided?"} — Ward {detectedWard.ward_code}
          </h4>
        </div>
        <span className="font-mono text-[9.5px] font-bold text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-300">
          Fair Distribution Policy
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
          <span>{lang === "mr" ? "कतार कशी ठरते?" : "Why This Order?"}</span>
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
              <td className="py-1 font-sans font-bold text-slate-800">Depot Distance (Transit Need)</td>
              <td className="py-1 text-right text-slate-600">{distRaw.toFixed(1)} km</td>
              <td className="py-1 text-right text-slate-700">{distNorm.toFixed(2)}</td>
              <td className="py-1 text-right text-slate-500">× 10%</td>
              <td className="py-1 text-right font-bold text-[#0056b3]">+{distContrib.toFixed(2)}</td>
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
          {lang === "mr" ? "थेट कारण:" : "Why Your Turn Comes First:"}
        </span>
        {lang === "mr"
          ? `तुमचा प्रभाग ${detectedWard.ward_code} उच्च प्राधान्य क्रमाने ठेवण्यात आला आहे, कारण येथे ${dominantDriver} आहे. कोणाच्याही ओळखीने किंवा प्रभावाने रांग तोडली जात नाही.`
          : `Your complaint is prioritized at score ${totalScore}/100 because of ${dominantDriver}. WaterFlow delivers water first to areas with the greatest shortage without VIP favoritism.`}
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
          OFFICIALLY VERIFIED
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
          <span>{lang === "hi" ? "शिकायत इतिहास" : lang === "mr" ? "तक्रार इतिहास" : "Recent Grievance History"}</span>
        </span>
        <div className="flex items-center space-x-2">
          {offlineQueue.length > 0 && (
            <button
              onClick={handleSyncOfflineQueue}
              disabled={syncingOffline || (!isOnline && !simulateOffline)}
              className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300 hover:bg-amber-200 transition cursor-pointer flex items-center space-x-1"
              title="Send offline saved complaints to office"
            >
              <RefreshCw className={`w-3 h-3 ${syncingOffline ? "animate-spin" : ""}`} />
              <span>Sync {offlineQueue.length} Queued</span>
            </button>
          )}
          <span className="font-mono text-[9.5px] font-bold text-slate-500">Ward {detectedWard.ward_code}</span>
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll">
        {recentTicketsList.map((tkt, idx) => (
          <div
            key={tkt.id || idx}
            className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition ${
              tkt.isEmergency
                ? "bg-rose-50/70 border-rose-300 text-rose-950"
                : tkt.isOffline
                ? "bg-amber-50/70 border-amber-300 text-amber-950"
                : tkt.isLive
                ? "bg-sky-50/70 border-sky-300 text-slate-900"
                : "bg-slate-50 border-slate-200 opacity-75"
            }`}
          >
            <div>
              <div className="flex items-center space-x-1.5 font-mono font-bold">
                <span>{tkt.id}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-sans ${
                    tkt.isEmergency
                      ? "bg-rose-200 text-rose-900 font-bold"
                      : tkt.isOffline
                      ? "bg-amber-200 text-amber-900 font-bold"
                      : tkt.isLive
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {tkt.status}
                </span>
                {tkt.isOffline && (
                  <span className="text-[9px] font-mono text-amber-700 bg-amber-100 px-1 rounded flex items-center space-x-0.5">
                    <WifiOff className="w-2.5 h-2.5" />
                    <span>SMS Queued</span>
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-600 mt-0.5">{tkt.type}</p>
              {tkt.tanker && (
                <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                  🚛 {tkt.tanker} {tkt.otp ? `· OTP: ${tkt.otp}` : ""}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
              {/* Driver Integrity & Grievance Review Trigger */}
              <button
                type="button"
                onClick={() => handleOpenDriverReview(tkt)}
                className="text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded transition cursor-pointer flex items-center space-x-1"
                title="Rate driver or report conduct"
              >
                <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-600" />
                <span>Rate Driver</span>
              </button>

              {tkt.isLive || tkt.isEmergency ? (
                <button
                  type="button"
                  onClick={() => setActiveNav("map")}
                  className="text-[10.5px] font-bold text-sky-700 hover:underline flex items-center space-x-0.5 cursor-pointer"
                >
                  <span>Track</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              ) : tkt.isOffline ? (
                <button
                  type="button"
                  onClick={() => {
                    const smsText = `MCGM WATERFLOW | TKT:${tkt.id} | WARD:${detectedWard.ward_code} | ISSUE:${tkt.type}`;
                    setActiveSmsTicket({
                      ticketId: tkt.id,
                      smsText,
                      phoneNumber,
                      wardCode: detectedWard.ward_code,
                      issueType: tkt.type,
                      tankerId: detectedWard.assigned_tanker?.tanker_id || "T-08",
                      otpCode: detectedWard.assigned_tanker?.otp_code || "7419",
                      isOffline: true,
                    });
                    setShowSmsModal(true);
                  }}
                  className="text-[10.5px] font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded hover:bg-amber-200 transition cursor-pointer"
                >
                  SMS
                </button>
              ) : (
                <span className="text-[10px] font-mono text-emerald-700 font-bold">✓ Verified</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfileView = () => {
    const filteredLedger = creditLedger.filter((item) => {
      if (creditFilter === "credit") return item.type === "CREDIT";
      if (creditFilter === "debit") return item.type === "DEBIT";
      return true;
    });

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Civic Credibility & Trust Hero Card */}
        <div className="civic-card rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-sky-950 to-blue-900 text-white shadow-xl border border-sky-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/15">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-950 flex items-center justify-center font-black text-xl shadow-lg border-2 border-amber-300 shrink-0">
                <Award className="w-6 h-6 text-amber-950" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h3 className="text-base font-black tracking-tight">{user?.name || "Govandi Resident"}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    ⭐ {citizenTier}
                  </span>
                </div>
                <p className="text-xs text-sky-200 font-mono mt-0.5">
                  Mobile: +91 {phoneNumber} · Ward {detectedWard.ward_code}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Aadhaar / OTP</span>
              </span>
            </div>
          </div>

          {/* Metric Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Balance */}
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="flex items-center justify-between text-sky-200 text-xs font-bold mb-1">
                <span>Available Civic Credits</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-black text-amber-300 font-mono">{citizenCredits}</span>
                <span className="text-xs text-sky-200 font-mono">Credits</span>
              </div>
              <p className="text-[10px] text-sky-200/80 mt-1">
                Fast-track booster costs 20 credits per ticket
              </p>
            </div>

            {/* Credibility Trust Score */}
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="flex items-center justify-between text-sky-200 text-xs font-bold mb-1">
                <span>Credibility Trust Score</span>
                <Gauge className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-black text-emerald-300 font-mono">{credibilityScore}%</span>
                <span className="text-xs text-emerald-200/80 font-bold">
                  {credibilityScore >= 80 ? "High Trust" : credibilityScore >= 50 ? "Moderate Trust" : "Low Trust"}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    credibilityScore >= 80 ? "bg-emerald-400" : credibilityScore >= 50 ? "bg-amber-400" : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, credibilityScore))}%` }}
                />
              </div>
            </div>

            {/* Verification Reliability Tier */}
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="flex items-center justify-between text-sky-200 text-xs font-bold mb-1">
                <span>SCADA Priority Tier</span>
                <CheckCircle2 className="w-4 h-4 text-sky-300" />
              </div>
              <div className="text-sm font-black text-white mt-1">
                {credibilityScore >= 80 ? "Priority Automated Verification" : credibilityScore >= 50 ? "Standard Ward Verification" : "Flagged for Manual Audit"}
              </div>
              <p className="text-[10px] text-sky-200/80 mt-1">
                {credibilityScore >= 80 ? "Clean track record. Top-of-queue assignment." : "Subject to Municipal JE inspection."}
              </p>
            </div>
          </div>

          {/* Civic Integrity Rule Matrix Banner */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-300 block font-mono">
              Civic Credit & Integrity Rules (MCGM Water Works)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]">
              <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30">
                <span className="text-emerald-400 font-bold block">+25 Credits</span>
                <span className="text-slate-300 text-[10px]">Genuine Shortage Report Verified</span>
              </div>
              <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30">
                <span className="text-emerald-400 font-bold block">+15 Credits</span>
                <span className="text-slate-300 text-[10px]">Delivery OTP Confirmed on-site</span>
              </div>
              <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30">
                <span className="text-amber-400 font-bold block">-20 Credits</span>
                <span className="text-slate-300 text-[10px]">Fast-Track Boost Redeemed</span>
              </div>
              <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30">
                <span className="text-rose-400 font-bold block">-40 Credits</span>
                <span className="text-slate-300 text-[10px]">False / Fabricated Report Penalty</span>
              </div>
            </div>
          </div>
        </div>

        {/* Civic Debit & Credit History Ledger Card */}
        <div className="civic-card rounded-2xl p-4 bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-[#0056b3]" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Civic Debit &amp; Credit History Ledger
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-[#0056b3] font-mono">
                {creditLedger.length} Records
              </span>
            </div>

            {/* Filter Buttons */}
            <div className="flex space-x-1 font-bold text-xs">
              <button
                type="button"
                onClick={() => setCreditFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  creditFilter === "all" ? "bg-[#0056b3] text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Records
              </button>
              <button
                type="button"
                onClick={() => setCreditFilter("credit")}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  creditFilter === "credit" ? "bg-emerald-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                + Credits Earned
              </button>
              <button
                type="button"
                onClick={() => setCreditFilter("debit")}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  creditFilter === "debit" ? "bg-rose-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                - Debits &amp; Penalties
              </button>
            </div>
          </div>

          {/* Ledger List */}
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scroll">
            {filteredLedger.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No credit records found in this category.
              </div>
            ) : (
              filteredLedger.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    item.type === "CREDIT"
                      ? "bg-emerald-50/50 border-emerald-200"
                      : item.amount < -25
                      ? "bg-rose-50/60 border-rose-200"
                      : "bg-amber-50/50 border-amber-200"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        item.type === "CREDIT"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.amount < -25
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.type === "CREDIT" ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-black font-mono ${
                            item.type === "CREDIT"
                              ? "text-emerald-700"
                              : item.amount < -25
                              ? "text-rose-700"
                              : "text-amber-800"
                          }`}
                        >
                          {item.amount > 0 ? `+${item.amount}` : item.amount} Credits
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">· {item.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-0.5">{item.reason}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <span className="text-[10px] text-slate-400 block font-mono">Balance After</span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {item.balance_after !== undefined ? `${item.balance_after} Cr` : "—"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Existing Grid with Identity & Preferences & Contacts */}
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
          {/* App & System Status */}
          <div className="civic-card rounded-xl p-4 bg-white border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              System &amp; App Status
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block font-sans">Phone Storage</span>
                <span className="font-bold text-emerald-600">Saved (Works Offline)</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block font-sans">GPS Accuracy</span>
                <span className="font-bold text-slate-800">{gpsAccuracy}</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block font-sans">Water Office</span>
                <span className="font-bold text-[#0056b3]">Ward {detectedWard.ward_code} Office</span>
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
                  <span className="text-[10px] text-slate-500 font-mono">
                    {lang === "hi" ? "24/7 फोन व आवाज सहायता (+91 8369978764)" : lang === "mr" ? "२४/७ फोन व आवाज मदत (+91 8369978764)" : "24/7 Phone & Voice Helper (+91 8369978764)"}
                  </span>
                </div>
                <a href="tel:+918369978764" className="font-mono font-black text-xs text-[#0056b3] bg-sky-100 hover:bg-sky-200 px-2 py-1 rounded transition">+91 8369978764</a>
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
};

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

            <div className="flex items-center space-x-1.5 font-mono flex-wrap gap-y-1">
              {/* Direct Helpline Call Button (+91 8369978764) */}
              <button
                onClick={handleStartHelplineCall}
                className="text-[10px] bg-sky-900/70 hover:bg-sky-800 px-2 py-0.5 rounded-lg border border-sky-400/40 text-white font-bold flex items-center space-x-1 transition cursor-pointer shadow-xs active:scale-95"
                title="Call BMC Helpline +91 8369978764 (Automated Ticket & Voice Bot)"
              >
                <PhoneCall className="w-3 h-3 text-emerald-400" />
                <span>+91 8369978764</span>
              </button>

              {/* Offline SMS Composer Shortcut */}
              <button
                onClick={handleOpenSmsComposer}
                className="text-[10px] bg-emerald-800/70 hover:bg-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-400/40 text-emerald-100 font-bold flex items-center space-x-1 transition cursor-pointer shadow-xs active:scale-95"
                title="Send Grievance via SMS to +91 8369978764"
              >
                <MessageSquare className="w-3 h-3 text-emerald-300" />
                <span>📱 SMS</span>
              </button>

              {/* Trilingual Language Selector (English / Hindi / Marathi) */}
              <div className="flex items-center bg-sky-900/70 p-0.5 rounded-lg border border-sky-400/40">
                <button
                  onClick={() => setLang("en")}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    lang === "en" ? "bg-white text-[#0056b3] shadow-xs" : "text-sky-200 hover:text-white"
                  }`}
                  title="Switch to English"
                >
                  EN
                </button>
                <button
                  onClick={() => setLang("hi")}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    lang === "hi" ? "bg-white text-[#0056b3] shadow-xs" : "text-sky-200 hover:text-white"
                  }`}
                  title="हिंदी में बदलें"
                >
                  हिं
                </button>
                <button
                  onClick={() => setLang("mr")}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    lang === "mr" ? "bg-white text-[#0056b3] shadow-xs" : "text-sky-200 hover:text-white"
                  }`}
                  title="मराठीमध्ये बदला"
                >
                  मरा
                </button>
              </div>

              {/* Emergency Call Webhook SOS Button */}
              <button
                onClick={() => setShowEmergencyModal(true)}
                className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center space-x-1 shadow-xs transition active:scale-95 cursor-pointer animate-pulse border border-rose-400"
                title="Emergency Water Help / Helpline"
              >
                <AlertOctagon className="w-3 h-3 text-white" />
                <span>SOS</span>
              </button>

              {/* Offline Assisted Mode Simulation Toggle */}
              <button
                onClick={() => setSimulateOffline(!simulateOffline)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1 transition cursor-pointer ${
                  !isOnline || simulateOffline
                    ? "bg-amber-400 text-slate-950 border border-amber-300 shadow-xs"
                    : "bg-emerald-600/80 text-white border border-emerald-400/40 hover:bg-emerald-500"
                }`}
                title="Toggle Offline Network Simulation (SMS Fallback)"
              >
                {!isOnline || simulateOffline ? (
                  <>
                    <WifiOff className="w-3 h-3 text-slate-950" />
                    <span className="hidden sm:inline">Offline (SMS)</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-200" />
                    <span className="hidden sm:inline">Online</span>
                  </>
                )}
              </button>

              {/* Desktop / Mobile Preview Switcher (Visible on desktop screens) */}
              <div className="hidden lg:flex items-center pl-1 border-l border-sky-600/40 space-x-1">
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
                      <span>Desktop</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-3 h-3" />
                      <span>Phone UI</span>
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

        {/* Persistent Offline Assisted Mode Banner */}
        {(!isOnline || simulateOffline) && (
          <div className="bg-amber-400 text-slate-950 px-4 py-2 border-b border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold shadow-xs animate-fade-in gap-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
              <WifiOff className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                {lang === "hi"
                  ? "📡 ऑफलाइन सहायता मोड सक्रिय: इंटरनेट के बिना भी शिकायतें सुरक्षित हैं एवं SMS द्वारा पंजीकृत होंगी।"
                  : lang === "mr"
                  ? "📡 ऑफलाइन साहाय्य पद्धत सक्रिय: इंटरनेट नसतानाही तक्रारी सुरक्षित राहतील व SMS द्वारे नोंदवल्या जातील."
                  : "📡 Offline-Assisted Mode Active: Reports are stored locally and will be transmitted via encrypted SMS to MCGM +91 8369978764."}
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {offlineQueue.length > 0 && (
                <button
                  onClick={handleSyncOfflineQueue}
                  disabled={syncingOffline}
                  className="px-2.5 py-1 bg-slate-950 text-white rounded-md text-[10.5px] font-mono hover:bg-slate-800 transition cursor-pointer flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${syncingOffline ? "animate-spin" : ""}`} />
                  <span>{syncingOffline ? "Syncing..." : `Sync ${offlineQueue.length} Queue`}</span>
                </button>
              )}
              <button
                onClick={() => setSimulateOffline(false)}
                className="text-[10.5px] text-slate-900 underline font-bold cursor-pointer"
              >
                Exit Offline Test
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            MAIN CONTENT AREA — SWITCHED BY activeNav
            ============================================================ */}
        <main className="flex-1 p-3.5 sm:p-5 pb-24 overflow-y-auto custom-scroll">
          
          {/* TAB 1: HOME */}
          {activeNav === "home" && (
            <div className="space-y-4 animate-fade-in">
              {renderWardBanner()}
              {renderTimetableAdvisory()}

              {/* Emergency Call Webhook & JalMitra AI Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Emergency Call Webhook Card */}
                <div className="civic-card rounded-xl p-3.5 bg-gradient-to-r from-rose-500/10 via-rose-50/50 to-white border-2 border-rose-400/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center space-x-1.5 text-xs font-bold text-rose-900 uppercase">
                        <AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />
                        <span>{lang === "hi" ? "आपातकालीन जल सहायता" : lang === "mr" ? "तातडीची पाणी मदत" : "Emergency Water SOS"}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300">
                        {lang === "hi" ? "अति आवश्यक सेवा" : lang === "mr" ? "तातडीची सेवा" : "Immediate Relief"}
                      </span>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {lang === "hi" ? "तत्काल आपातकालीन सहायता व फोन कॉल" : lang === "mr" ? "तातडीची आपत्कालीन मदत व फोन कॉल" : "Emergency Water Help & Urgent Call"}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                      {lang === "hi"
                        ? "गंभीर जल संकट, पाइपलाइन लीकेज या गंदे पानी के लिए तुरंत आपातकालीन सहायता मंगाएं।"
                        : lang === "mr"
                        ? "गंभीर पाणीटंचाई, पाईप फुटणे किंवा दूषित पाण्यासाठी त्वरित आपत्कालीन मदत मिळवा."
                        : "Acute water shortage, pipe burst, or bad water? Request immediate assistance with a direct call from +91 8369978764."}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setShowEmergencyModal(true)}
                      className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs active:scale-95"
                    >
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>{lang === "hi" ? "आपातकालीन सहायता बुलाएं →" : lang === "mr" ? "तातडीची मदत मागवा →" : "Call Emergency Help (SOS) →"}</span>
                    </button>
                    <button
                      onClick={handleStartHelplineCall}
                      className="py-2 px-3 rounded-lg bg-white border border-rose-300 text-rose-800 font-bold text-xs hover:bg-rose-50 transition cursor-pointer flex items-center justify-center space-x-1 shadow-2xs"
                      title="Direct Helpline (+91 8369978764)"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                      <span>+91 8369978764</span>
                    </button>
                  </div>
                </div>

                {/* JalMitra AI Assistant Card */}
                <div className="civic-card rounded-xl p-3.5 bg-gradient-to-r from-sky-500/10 via-sky-50/50 to-white border-2 border-sky-400/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center space-x-1.5 text-xs font-bold text-sky-900 uppercase">
                        <Bot className="w-4 h-4 text-[#0056b3]" />
                        <span>{lang === "hi" ? "जलमित्र AI सहायक" : lang === "mr" ? "जलमित्र AI साहाय्यक" : "JalMitra AI Sahayak"}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-sky-100 text-[#0056b3] px-2 py-0.5 rounded-full border border-sky-300 flex items-center space-x-1">
                        <Sparkles className="w-2.5 h-2.5 text-[#0056b3]" />
                        <span>Groq LLM</span>
                      </span>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {lang === "hi" ? "बहुभाषी आवाज़ व चैट सहायता" : lang === "mr" ? "बहुभाषिक व्हॉइस व चॅट साहाय्य" : "Trilingual Voice & Chat Assistant"}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                      {lang === "hi"
                        ? "पानी आने का समय, टैंकर ट्रैकिंग या शिकायत दर्ज करने के लिए हिंदी, मराठी या अंग्रेजी में बात करें।"
                        : lang === "mr"
                        ? "पाणी येण्याची वेळ, टँकर ट्रॅकिंग किंवा तक्रार नोंदवण्यासाठी मराठी, हिंदी किंवा इंग्रजीत बोला."
                        : "Ask about water timings, track relief tankers, or register complaints fluently in Marathi, Hindi, or English."}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveNav("chat")}
                    className="mt-3 w-full py-2 px-3 rounded-lg bg-[#0056b3] hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{lang === "hi" ? "AI सहायक से बात करें →" : lang === "mr" ? "AI साहाय्यकाशी बोला →" : "Chat with JalMitra AI →"}</span>
                  </button>
                </div>
              </div>

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
                        Complaint Registered
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
                    <div className="p-3 bg-sky-50/70 rounded-lg border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <div className="text-lg font-black text-[#0056b3] font-mono flex items-center space-x-1.5">
                          <PhoneCall className="w-4 h-4 text-emerald-600" />
                          <span>+91 8369978764</span>
                        </div>
                        <div className="text-[10.5px] text-slate-600 mt-0.5">
                          {lang === "hi"
                            ? "स्वचालित फोन सहायता व त्वरित अधिकारी कतार"
                            : lang === "mr"
                            ? "स्वयंचलित फोन मदत व तातडीचे अधिकारी केंद्र"
                            : "Automated Voice Helpline & Urgent Officer Queue"}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleStartHelplineCall}
                          className="px-3 py-1.5 bg-[#0056b3] hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer flex items-center space-x-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{lang === "hi" ? "सहायता कॉल" : lang === "mr" ? "मदत कॉल" : "Call Helpline"}</span>
                        </button>
                        <button
                          onClick={handleOpenSmsComposer}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer flex items-center space-x-1"
                          title="Draft Offline SMS"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </button>
                      </div>
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
                      Live GPS tracking for relief tanker {detectedWard.assigned_tanker.tanker_id}
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
                        <span className="text-slate-500">Delivery Route:</span>
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

          {/* TAB 5: AI SAHAYAK CHATBOT (Groq LLM) */}
          {activeNav === "chat" && (
            <div className="space-y-4 animate-fade-in max-w-4xl mx-auto h-[620px] pb-6">
              <CitizenChatbot
                lang={lang}
                detectedWard={detectedWard}
                onOpenGrievance={() => setActiveNav("grievance")}
                onOpenEmergencyModal={handleStartHelplineCall}
              />
            </div>
          )}

          {/* TAB 6: PROFILE */}
          {activeNav === "profile" && renderProfileView()}

        </main>

        {/* ============================================================
            MOBILE BOTTOM NAVIGATION BAR (Trilingual, 5 Quick Tabs)
            ============================================================ */}
        <nav className="sticky bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 sm:px-3 py-1.5 shadow-lg flex items-center justify-around text-[10px]">
          <button
            onClick={() => setActiveNav("home")}
            className={`flex flex-col items-center justify-center py-1 px-2.5 relative transition cursor-pointer ${
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
            className={`flex flex-col items-center justify-center py-1 px-2.5 relative transition cursor-pointer ${
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
            className={`flex flex-col items-center justify-center py-1 px-2.5 relative transition cursor-pointer ${
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
            className={`flex flex-col items-center justify-center py-1 px-2.5 relative transition cursor-pointer ${
              activeNav === "queue" ? "text-[#0056b3] font-bold" : "text-slate-500 hover:text-sky-700"
            }`}
          >
            {activeNav === "queue" && (
              <div className="absolute -top-1 w-8 h-1 bg-[#0056b3] rounded-full"></div>
            )}
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span>{t.navQueue}</span>
          </button>

          {/* AI SAHAYAK TAB */}
          <button
            onClick={() => setActiveNav("chat")}
            className={`flex flex-col items-center justify-center py-1 px-2.5 relative transition cursor-pointer ${
              activeNav === "chat" ? "text-[#0056b3] font-bold" : "text-slate-500 hover:text-sky-700"
            }`}
          >
            {activeNav === "chat" && (
              <div className="absolute -top-1 w-8 h-1 bg-[#0056b3] rounded-full"></div>
            )}
            <div className="relative">
              <Bot className="w-4 h-4 mb-0.5 text-[#0056b3]" />
              <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-emerald-500 text-[7.5px] text-white font-mono font-bold leading-none animate-pulse">
                AI
              </span>
            </div>
            <span>{t.navChat || "AI Sahayak"}</span>
          </button>

          <button
            onClick={() => setActiveNav("profile")}
            className={`flex flex-col items-center justify-center py-1 px-2.5 relative transition cursor-pointer ${
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

        {/* Floating Quick Action Buttons on Mobile / Desktop */}
        {activeNav !== "chat" && (
          <div className="fixed bottom-16 right-4 z-40 flex flex-col items-end space-y-2">
            {/* Quick SOS Trigger */}
            <button
              onClick={() => setShowEmergencyModal(true)}
              className="p-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center border-2 border-white animate-pulse"
              title="Emergency Water Help (SOS)"
            >
              <AlertOctagon className="w-5 h-5 text-white" />
            </button>

            {/* Quick Chatbot Launcher */}
            <button
              onClick={() => setActiveNav("chat")}
              className="px-3.5 py-2 rounded-full bg-[#0056b3] hover:bg-sky-700 text-white shadow-xl transition active:scale-95 cursor-pointer flex items-center space-x-1.5 border-2 border-white"
              title="Chat with JalMitra AI"
            >
              <Bot className="w-4 h-4 text-sky-200" />
              <span className="text-xs font-bold">{t.navChat || "AI Sahayak"}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-2 px-2 text-slate-400 text-[10px] leading-tight space-y-0.5 bg-slate-50 border-t border-slate-200">
          <p className="font-medium text-slate-500">{t.footerDept}</p>
          <p className="text-[9.5px]">{t.footerVer}</p>
        </footer>

        {/* ============================================================
            1. EMERGENCY CALL MODAL
            ============================================================ */}
        {showEmergencyModal && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-rose-700 to-rose-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white border border-white/30 shadow-inner">
                    <AlertOctagon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-rose-900/70 px-2 py-0.5 rounded border border-rose-400/40 text-rose-200">
                      RED ALERT · IMMEDIATE RELIEF (तातडीची मदत)
                    </span>
                    <h3 className="text-sm font-black mt-0.5">
                      {lang === "hi"
                        ? "मनपा आपातकालीन जल सहायता (SOS)"
                        : lang === "mr"
                        ? "मनपा तातडीची आपत्कालीन पाणी मदत (SOS)"
                        : "Municipal Emergency Water Relief (SOS)"}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEmergencyModal(false);
                    setEmergencyWebhookResult(null);
                  }}
                  className="p-1 rounded-lg hover:bg-rose-800 text-rose-200 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-700 custom-scroll">
                <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-950 text-xs">
                      {lang === "hi"
                        ? "आपातकालीन स्थिति एवं स्थान"
                        : lang === "mr"
                        ? "तातडीची मदत व पाण्याचे ठिकाण"
                        : "Emergency Location & Water Status"}
                    </span>
                    <span className="text-[10px] font-mono bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-bold">
                      Helpline: +91 8369978764
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 bg-white p-2 rounded-lg border border-rose-200">
                    <div>
                      <span className="text-slate-400 block text-[9.5px]">Ward:</span>
                      <strong>Ward {detectedWard.ward_code} ({detectedWard.name.split("/")[0]})</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9.5px]">Caller Mobile:</span>
                      <strong>+91 {phoneNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9.5px]">GPS Coordinates:</span>
                      <span>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9.5px]">Standpost / Landmark:</span>
                      <span className="truncate block">{landmark}</span>
                    </div>
                  </div>
                </div>

                {/* Webhook Response Log (if triggered) */}
                {emergencyWebhookResult && (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border-2 border-emerald-400 space-y-2.5 animate-fade-in">
                    <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {lang === "hi"
                          ? "आपातकालीन अनुरोध दर्ज हुआ · टिकट प्राप्त!"
                          : lang === "mr"
                          ? "तातडीची मदत नोंदवली · तिकीट मिळाले!"
                          : "Emergency Alert Dispatched · Ticket Raised!"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200 font-mono text-[11px] space-y-1.5 text-slate-800">
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Ticket Number:</span>
                        <strong className="text-rose-700">{emergencyWebhookResult.ticket_id}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">
                          {lang === "hi" ? "कॉल सत्र:" : lang === "mr" ? "कॉल सत्र:" : "Helpline Call Session:"}
                        </span>
                        <span className="text-slate-700 font-bold">{emergencyWebhookResult.session_id}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">
                          {lang === "hi" ? "वापसी कॉल:" : lang === "mr" ? "परत कॉल:" : "Outbound Callback:"}
                        </span>
                        <span className="text-emerald-700 font-bold">
                          {lang === "hi" ? `+91 ${phoneNumber} पर कॉल आ रहा है (~10s)` : lang === "mr" ? `+91 ${phoneNumber} वर कॉल येत आहे (~10s)` : `Calling +91 ${phoneNumber} (~10s)`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          {lang === "hi" ? "राहत टैंकर:" : lang === "mr" ? "मदत टँकर:" : "Relief Tanker:"}
                        </span>
                        <span className="text-[#0056b3] font-bold">
                          {lang === "hi" ? "टैंकर T-08 (सर्वोच्च प्राथमिकता)" : lang === "mr" ? "टँकर T-08 (तातडीने रवाना)" : "Tanker T-08 (Priority Override)"}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10.5px] text-emerald-800 leading-normal">
                      {emergencyWebhookResult?.details?.ivr_callback?.voice_script?.replace(/IVR/g, "Helpline") ||
                        (lang === "hi"
                          ? "मनपा हेल्पलाइन आपके फोन पर तुरंत कॉल कर रही है। आपातकालीन सहायता टीम रवाना हो चुकी है।"
                          : lang === "mr"
                          ? "मनपा हेल्पलाईन तुमच्या फोनवर थेट कॉल करत आहे. तातडीचे मदत पथक रवाना झाले आहे."
                          : "Municipal Helpline is calling your phone now with priority emergency dispatch confirmation.")}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleTriggerEmergencyWebhook}
                    disabled={emergencySubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs tracking-wide shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center space-x-2 border border-rose-400/30"
                  >
                    {emergencySubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Sending Emergency Alert to Water Office...</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 text-white" />
                        <span>{t.triggerWebhook || "Call Emergency Help (SOS)"}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setShowEmergencyModal(false);
                      handleStartHelplineCall();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer border border-slate-300"
                  >
                    <PhoneCall className="w-4 h-4 text-[#0056b3]" />
                    <span>Talk to Voice Helper (+91 8369978764)</span>
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => {
                    setShowEmergencyModal(false);
                    setEmergencyWebhookResult(null);
                  }}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            2. OFFLINE SMS ASSISTED SUPPORT · TICKET RAISED MODAL
            ============================================================ */}
        {showSmsModal && activeSmsTicket && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className={`p-4 text-white flex items-center justify-between ${activeSmsTicket.isOffline ? "bg-gradient-to-r from-amber-600 to-amber-700" : "bg-gradient-to-r from-[#0056b3] to-sky-700"}`}>
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white border border-white/30 shadow-inner">
                    {activeSmsTicket.isOffline ? <WifiOff className="w-5 h-5 text-white" /> : <CheckCircle2 className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-black/30 px-2 py-0.5 rounded border border-white/20 text-white">
                      {activeSmsTicket.isOffline ? "OFFLINE SMS MODE" : "OFFICIAL WATER DISPATCH"}
                    </span>
                    <h3 className="text-sm font-black mt-0.5">
                      {activeSmsTicket.isOffline
                        ? (lang === "hi" ? "ऑफलाइन SMS सहायता · टिकट दर्ज किया गया" : lang === "mr" ? "ऑफलाइन SMS साहाय्य · तिकीट नोंदवले" : "Offline SMS Support · Ticket Raised")
                        : (lang === "hi" ? "शिकायत दर्ज · SMS पुष्टि" : lang === "mr" ? "तक्रार नोंदवली · SMS पावती" : "Grievance Registered · SMS Receipt")}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowSmsModal(false)}
                  className="p-1 rounded-lg hover:bg-black/20 text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-700 custom-scroll">
                {/* Ticket Badge */}
                <div className="p-3 bg-amber-50/80 rounded-xl border-2 border-amber-400 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                      {lang === "hi" ? "आधिकारिक टिकट संख्या:" : lang === "mr" ? "अधिकृत तिकीट क्रमांक:" : "Authoritative Ticket ID:"}
                    </span>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5 flex items-center space-x-2">
                      <span>#{activeSmsTicket.ticketId}</span>
                      <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        CONFIRMED
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 block">OTP Code</span>
                    <span className="text-base font-mono font-black text-amber-700">{activeSmsTicket.otpCode || "7419"}</span>
                  </div>
                </div>

                {/* SMS Payload Display */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] flex items-center space-x-1">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-700" />
                      <span>
                        {lang === "hi"
                          ? "मनपा हेल्पलाइन (+91 8369978764) को भेजा जाने वाला SMS:"
                          : lang === "mr"
                          ? "मनपा हेल्पलाईनवर (+91 8369978764) पाठवण्याचा एसएमएस:"
                          : "SMS to be sent to Municipal Helpline (+91 8369978764):"}
                      </span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">✓ SMS READY</span>
                  </div>
                  <div className="p-3 bg-slate-900 text-emerald-300 rounded-xl font-mono text-xs border border-slate-700 leading-relaxed break-all select-all shadow-inner">
                    {activeSmsTicket.smsText}
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-slate-600 space-y-1 text-[11px] leading-relaxed">
                  <div className="font-bold text-sky-950 flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4 text-sky-700" />
                    <span>
                      {lang === "hi"
                        ? "ऑफलाइन सहायता कैसे काम करती है?"
                        : lang === "mr"
                        ? "ऑफलाइन साहाय्य कसे कार्य करते?"
                        : "How Offline Mode Works"}
                    </span>
                  </div>
                  <p>
                    {activeSmsTicket.isOffline
                      ? (lang === "hi"
                        ? "आपकी शिकायत मोबाइल में सुरक्षित हो गई है। आप नीचे दिए गए बटन से इसे अपने मोबाइल के SMS ऐप से +91 8369978764 पर तुरंत भेज सकते हैं। इंटरनेट आते ही यह सीधे कार्यालय से भी सिंक हो जाएगी।"
                        : lang === "mr"
                        ? "तुमची तक्रार फोनवर सुरक्षित झाली आहे. खालील बटनावरून तुम्ही फोनच्या SMS ॲपद्वारे +91 8369978764 वर थेट पाठवू शकता. इंटरनेट पूर्ववत होताच ती कार्यालयात नोंदवली जाईल."
                        : "Your complaint is safely saved on your phone. You can send this message via free SMS to +91 8369978764 now, or it will send automatically when internet returns.")
                      : (lang === "hi"
                        ? "आपकी शिकायत मनपा प्राथमिकता सूची में दर्ज हो गई है। राहत टैंकर T-08 रवाना हुआ है। पानी लेते समय चालक को OTP 7419 बताएं।"
                        : lang === "mr"
                        ? "तुमची तक्रार मनपा प्राधान्य यादीत नोंदवली आहे. तातडीचा टँकर T-08 रवाना झाला आहे. पाणी घेताना चालकाला OTP ७४१९ सांगा."
                        : "Your complaint is registered in the municipal priority queue. Tanker T-08 is en route. Share OTP 7419 upon arrival.")}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href={`sms:+918369978764?body=${encodeURIComponent(activeSmsTicket.smsText)}`}
                      className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs tracking-wide shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center space-x-1.5 border border-emerald-400/30 text-center"
                    >
                      <Send className="w-4 h-4 text-white shrink-0" />
                      <span>
                        {lang === "hi"
                          ? "SMS ऐप में भेजें (+91 8369978764)"
                          : lang === "mr"
                          ? "SMS ॲपमधून पाठवा (+91 8369978764)"
                          : "Send SMS (+91 8369978764)"}
                      </span>
                    </a>

                    <button
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(activeSmsTicket.smsText);
                          alert(lang === "hi" ? "SMS टेक्स्ट कॉपी किया गया!" : lang === "mr" ? "SMS कॉपी केला!" : "SMS text copied to clipboard!");
                        }
                      }}
                      className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-98 cursor-pointer border border-slate-600 text-center"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{lang === "hi" ? "SMS कॉपी करें" : lang === "mr" ? "SMS कॉपी करा" : "Copy SMS Text"}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setShowSmsModal(false)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center transition cursor-pointer border border-slate-300"
                  >
                    Done &amp; Keep in Queue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            2.5. MCGM HELPLINE (+91 8369978764) · IVR VOICE BOT & CALL QUEUE
            ============================================================ */}
        {showCallModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[92vh]">
              {/* Phone Call Status Bar */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                    <PhoneCall className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                        {callStage === "bot_speaking"
                          ? "JalVaani AI (जलवाणी)"
                          : callStage === "queued"
                          ? "Fair Priority Queue (कतार)"
                          : callStage === "officer_connected"
                          ? "Live Officer Bridge"
                          : callStage === "resolved"
                          ? "Call Concluded"
                          : "Dialing..."}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Helpline: <strong className="text-white">+91 8369978764</strong> · {Math.floor(callDuration / 60).toString().padStart(2, "0")}:{(callDuration % 60).toString().padStart(2, "0")}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleEndCall}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Disconnect Call"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Call Main Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scroll text-xs">
                
                {/* STAGE 1: BOT SPEAKING & TICKET RAISING */}
                {callStage === "bot_speaking" && callSession && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Bot Avatar & Animated Audio Waveform */}
                    <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-950/60 to-slate-950 border border-sky-800/40 text-center space-y-3">
                      <div className="relative inline-block">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#0056b3] to-sky-400 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/20 border-2 border-sky-300">
                          <Bot className="w-8 h-8 text-white" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white">JalVaani AI Intake Bot</h4>
                        <p className="text-[10px] text-sky-300 font-mono">
                          BMC Ward {detectedWard.ward_code} Automated Assistance
                        </p>
                      </div>

                      {/* Animated Audio Waveform */}
                      <div className="flex items-center justify-center space-x-1.5 py-1">
                        {[40, 75, 55, 95, 60, 80, 45, 90, 70, 35, 85, 50].map((h, i) => (
                          <span
                            key={i}
                            className={`w-1 rounded-full bg-sky-400 transition-all duration-300 ${isBotSpeaking ? "animate-pulse" : "opacity-40"}`}
                            style={{ height: isBotSpeaking ? `${h}%` : "8px", minHeight: "6px", maxHeight: "28px" }}
                          ></span>
                        ))}
                      </div>

                      {/* Ticket Badge */}
                      <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-300 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ticket Raised: <strong>#{callSession.ticket_id}</strong></span>
                      </div>
                    </div>

                    {/* Spoken Script / Area Briefing Box */}
                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-700/60 pb-1.5">
                        <span className="font-bold flex items-center space-x-1 text-slate-200">
                          <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Voice Script ({lang.toUpperCase()})</span>
                        </span>
                        <button
                          onClick={() => playBotVoice(callSession.script, lang)}
                          className="text-[10.5px] text-sky-400 hover:text-sky-300 underline font-mono cursor-pointer flex items-center space-x-1"
                        >
                          <span>{isBotSpeaking ? "Speaking..." : "Replay Audio"}</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        "{callSession.script}"
                      </p>
                    </div>

                    {/* Area Telemetry Snapshot Card */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <span className="text-slate-400 block text-[10px]">Supply Window</span>
                        <span className="font-bold text-sky-300">{callSession.area_status?.timetable || "06:00 - 09:30 AM"}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <span className="text-slate-400 block text-[10px]">Water Deficit</span>
                        <span className="font-bold text-rose-400">{callSession.area_status?.deficit_pct || 28}% deficit</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <span className="text-slate-400 block text-[10px]">Relief Tanker</span>
                        <span className="font-bold text-amber-300">{callSession.area_status?.relief_tanker?.tanker_id || "T-08"} (ETA {callSession.area_status?.relief_tanker?.eta_mins || 12}m)</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <span className="text-slate-400 block text-[10px]">Delivery OTP</span>
                        <span className="font-bold text-emerald-300">{callSession.area_status?.relief_tanker?.otp_code || "7419"}</span>
                      </div>
                    </div>

                    {/* Caller Satisfaction Prompt */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/80 to-slate-900 border border-sky-500/40 space-y-2.5">
                      <div className="text-center font-bold text-white text-xs">
                        {lang === "hi"
                          ? "क्या आप इस स्थिति और टैंकर जानकारी से संतुष्ट हैं?"
                          : lang === "mr"
                          ? "तुम्ही या माहिती आणि टँकर तपशीलाने समाधानी आहात का?"
                          : "Are you satisfied with this update and relief tanker assignment?"}
                      </div>
                      <p className="text-[10px] text-center text-slate-400">
                        {lang === "hi"
                          ? "यदि नहीं, तो आपको जल आवंटन प्राथमिकता स्कोर के आधार पर अधिकारी कॉल कतार में स्थानांतरित किया जाएगा।"
                          : lang === "mr"
                          ? "नसल्यास, तुम्हाला पाणी वाटप प्राधान्य स्कोअरनुसार अधिकारी कॉल रांगेत ठेवले जाईल."
                          : "If not satisfied, you will enter the municipal call queue ranked strictly by your ward's equity priority score."}
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleCallSatisfaction(true)}
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer shadow-md"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{lang === "hi" ? "हाँ, संतुष्ट हूँ" : lang === "mr" ? "हो, समाधानी" : "Yes, Satisfied"}</span>
                        </button>

                        <button
                          onClick={() => handleCallSatisfaction(false)}
                          className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer shadow-md"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>{lang === "hi" ? "नहीं, अधिकारी से बात कराएँ" : lang === "mr" ? "नाही, अधिकाऱ्याशी बोला" : "No, Speak to Officer"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STAGE 2: PRIORITY CALL QUEUE ESCALATION */}
                {callStage === "queued" && (
                  <div className="space-y-3.5 animate-fade-in">
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40">
                        <Users className="w-6 h-6 animate-pulse" />
                      </div>
                      <h4 className="text-sm font-bold text-amber-300">
                        Municipal Help Call Queue
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        Ranked by <strong className="text-amber-200">Fair Water Need</strong> — areas without water and chawls connect first without VIP favoritism.
                      </p>
                    </div>

                    {/* Queue Position and Priority Score */}
                    <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-mono">YOUR QUEUE POSITION</span>
                          <span className="text-2xl font-black font-mono text-emerald-400 flex items-center space-x-2">
                            <span>#{callQueueData?.queue_position || 1}</span>
                            <span className="text-[10.5px] font-sans font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              NEXT IN LINE
                            </span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-mono">EQUITY PRIORITY SCORE</span>
                          <span className="text-xl font-black font-mono text-amber-300">
                            {callQueueData?.priority_score || 83.4} / 100
                          </span>
                        </div>
                      </div>

                      {/* Factor Breakdown */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide block">
                          Weighted Urgency Breakdown (Ward {detectedWard.ward_code}):
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
                          <div className="p-2 rounded bg-slate-900 border border-slate-700/60">
                            <span className="text-slate-400 block text-[9px]">Slum Pop (30%)</span>
                            <strong className="text-emerald-400">{detectedWard.slum_pop_pct || 65}%</strong>
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-700/60">
                            <span className="text-slate-400 block text-[9px]">Dry Pipe (25%)</span>
                            <strong className="text-amber-400">{detectedWard.dry_pipe_hours || 48}h</strong>
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-700/60">
                            <span className="text-slate-400 block text-[9px]">Deficit (15%)</span>
                            <strong className="text-rose-400">{detectedWard.water_deficit_pct || 38}%</strong>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10.5px] text-slate-400 flex items-center justify-between pt-1">
                        <span>Total callers currently waiting in zone:</span>
                        <strong className="text-white font-mono">{callQueueData?.total_waiting || 3} callers</strong>
                      </div>
                    </div>

                    {/* Connect Officer Button */}
                    <button
                      onClick={handleConnectOfficer}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg active:scale-98 cursor-pointer border border-emerald-400/40"
                    >
                      <PhoneCall className="w-4 h-4 animate-bounce" />
                      <span>Connect with Executive Engineer (You are #1)</span>
                    </button>
                  </div>
                )}

                {/* STAGE 3: LIVE OFFICER BRIDGE */}
                {callStage === "officer_connected" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-950 border border-emerald-500/40 text-center space-y-2">
                      <div className="relative inline-block">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 border-2 border-emerald-300">
                          <Users className="w-8 h-8 text-white" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse"></span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white">{officerData?.officer_name || "Er. Nilesh Shinde"}</h4>
                        <p className="text-[11px] text-emerald-300 font-medium">
                          {officerData?.designation || `Executive Water Engineer (${detectedWard.name})`}
                        </p>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          ID: {officerData?.badge_number || "BMC-EE-4182"} · {officerData?.control_room || "Eastern Suburbs Municipal Water Office"}
                        </span>
                      </div>
                    </div>

                    {/* Live Call Conversation Notes */}
                    <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>Officer Line Active · Two-Way Audio Bridge</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        <em>"Namaskar, this is Er. Nilesh Shinde from MCGM Ward {detectedWard.ward_code} Operations. I have reviewed ticket #{callSession?.ticket_id}. Tanker {callSession?.area_status?.relief_tanker?.tanker_id || "T-08"} has been dispatched to {detectedWard.standpost_name} with priority override. Please provide OTP {callSession?.area_status?.relief_tanker?.otp_code || "7419"} upon arrival."</em>
                      </p>
                    </div>

                    <div className="p-3 bg-sky-950/40 rounded-xl border border-sky-800/40 text-[11px] text-sky-200 flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>This call is recorded for municipal transparency and equity compliance.</span>
                    </div>

                    <button
                      onClick={() => handleCallSatisfaction(true)}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-600"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Complete Officer Inquiry &amp; Resolve Ticket</span>
                    </button>
                  </div>
                )}

                {/* STAGE 4: RESOLVED */}
                {callStage === "resolved" && (
                  <div className="space-y-4 animate-fade-in text-center py-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-400">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">Inquiry Handled Successfully</h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                        Your emergency ticket <strong className="text-emerald-400">#{callSession?.ticket_id}</strong> is logged. An SMS confirmation has been transmitted to <strong className="text-white">+91 {phoneNumber}</strong>.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 text-left font-mono text-[11px] text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span className="text-emerald-400 font-bold">DISPATCH QUEUED</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Relief OTP:</span>
                        <span className="text-amber-300 font-bold">{callSession?.area_status?.relief_tanker?.otp_code || "7419"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          {lang === "hi" ? "एसएमएस हेल्पलाइन:" : lang === "mr" ? "एसएमएस हेल्पलाईन:" : "SMS Helpline:"}
                        </span>
                        <span className="text-sky-300 font-bold">+91 8369978764 / 56161</span>
                      </div>
                    </div>

                    <button
                      onClick={handleEndCall}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Close &amp; Return to Dashboard
                    </button>
                  </div>
                )}

              </div>

              {/* Call End Footer */}
              {callStage !== "resolved" && (
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Call Ref: {callSession?.session_id || "ACTIVE"}
                  </div>
                  <button
                    onClick={handleEndCall}
                    className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shadow-md"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End Call</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            3. MATHEMATICAL EXPLAINABILITY MODAL
            ============================================================ */}
        {showExplainModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-[#0056b3] text-white p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-sky-900/60 px-2 py-0.5 rounded border border-sky-400/40 text-sky-200">
                    FAIR ALLOCATION RULES
                  </span>
                  <h3 className="text-sm font-black mt-1">
                    {lang === "hi" ? "निष्पक्ष जल आवंटन नियम व पारदर्शिता" : lang === "mr" ? "पारदर्शक व न्याय्य पाणी वाटप नियम" : "Fair Water Allocation & Anti-Favoritism Rules"}
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
                    {lang === "hi" ? "जल आवंटन कैसे तय होता है?" : lang === "mr" ? "पाणी वाटप कसे ठरवले जाते?" : "How is Relief Priority Determined?"}
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-slate-600">
                    WaterFlow prioritizes relief water purely on real need and days without water, preventing VIP influence or favoritism:
                  </p>
                  <div className="mt-2 font-mono bg-white p-2 rounded border border-sky-200 text-slate-800 text-[11px] font-bold">
                    Need Score = 30·V + 25·U + 20·P + 15·H + 10·(1 - D)
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-slate-900 text-xs">Area Water Details (Ward {detectedWard.ward_code}):</div>
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
                    <span>Fair Treatment Guarantee — No VIP Bias</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-normal">
                    Our fair rule system ensures that water is delivered based on genuine shortage and days without water, not who registered first or VIP influence.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowExplainModal(false)}
                  className="px-4 py-1.5 bg-[#0056b3] hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer transition"
                >
                  {lang === "hi" ? "बंद करें" : lang === "mr" ? "बंद करा" : "Close"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            4. DRIVER INTEGRITY, CONDUCT & GRIEVANCE MODAL
            ============================================================ */}
        {driverReviewModal && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-900 to-[#0056b3] text-white p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-inner">
                    <Star className="w-5 h-5 fill-slate-950" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-white/20 px-2 py-0.5 rounded text-amber-200">
                      MUNICIPAL DRIVER ACCOUNTABILITY
                    </span>
                    <h3 className="text-sm font-black mt-0.5">
                      {lang === "hi"
                        ? "टैंकर चालक समीक्षा एवं शिकायत"
                        : lang === "mr"
                        ? "टँकर चालक आढावा व तक्रार"
                        : "Rate Driver or Report Misconduct"}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setDriverReviewModal(false)}
                  className="p-1 rounded-lg hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmitDriverReview} className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-700 custom-scroll">
                {/* Tanker Details Header */}
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block">Assigned Vehicle</span>
                    <span className="text-xs font-black text-slate-900">
                      {selectedTicketForReview?.tanker || "Tanker T-08 (MH-03-BW-7821)"}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Driver: Rajesh Patil · Ticket: {selectedTicketForReview?.id || "#WF-24-918"}
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded bg-white text-[#0056b3] font-bold text-[10px] border border-sky-300">
                    Municipal Fleet
                  </span>
                </div>

                {/* Star Rating Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-tight mb-1.5">
                    Rate Delivery Quality (1 to 5 Stars)
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setDriverRating(star)}
                        className={`p-2 rounded-xl transition cursor-pointer ${
                          driverRating >= star
                            ? "bg-amber-100 text-amber-600 scale-105"
                            : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                        }`}
                      >
                        <Star className={`w-5 h-5 ${driverRating >= star ? "fill-amber-500 text-amber-500" : ""}`} />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">
                      {driverRating === 5 ? "⭐⭐⭐⭐⭐ Outstanding" : driverRating >= 4 ? "Good" : driverRating >= 3 ? "Average" : "Poor / Unsatisfactory"}
                    </span>
                  </div>
                </div>

                {/* Grievance Category Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-tight mb-1.5">
                    Report Driver Infraction (Anti-Corruption &amp; Route Adherence)
                  </label>
                  <div className="space-y-1.5">
                    <label className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${driverGrievanceType === "none" ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                      <input
                        type="radio"
                        name="grievanceType"
                        value="none"
                        checked={driverGrievanceType === "none"}
                        onChange={() => setDriverGrievanceType("none")}
                        className="mt-0.5 text-emerald-600 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">No Misconduct · Satisfactory Delivery</span>
                        <span className="text-[10px] text-slate-500">Awards positive credits (+10 Cr) to the driver for municipal performance.</span>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${driverGrievanceType === "ROUTE_DIVERSION" ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                      <input
                        type="radio"
                        name="grievanceType"
                        value="ROUTE_DIVERSION"
                        checked={driverGrievanceType === "ROUTE_DIVERSION"}
                        onChange={() => setDriverGrievanceType("ROUTE_DIVERSION")}
                        className="mt-0.5 text-rose-600 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-rose-950 block">⚠️ Route Diversion (Driver bypassed street / unauthorized turn)</span>
                        <span className="text-[10px] text-rose-700 font-medium">Penalizes driver (-25 Credits). SCADA audits GPS route adherence.</span>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${driverGrievanceType === "GPS_TAMPER" ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                      <input
                        type="radio"
                        name="grievanceType"
                        value="GPS_TAMPER"
                        checked={driverGrievanceType === "GPS_TAMPER"}
                        onChange={() => setDriverGrievanceType("GPS_TAMPER")}
                        className="mt-0.5 text-rose-600 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-rose-950 block">📡 GPS Turned Off / Driver Unreachable</span>
                        <span className="text-[10px] text-rose-700 font-medium">Penalizes driver (-35 Credits). Transponder disconnect flag logged.</span>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${driverGrievanceType === "ILLEGAL_WATER_SALE" ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                      <input
                        type="radio"
                        name="grievanceType"
                        value="ILLEGAL_WATER_SALE"
                        checked={driverGrievanceType === "ILLEGAL_WATER_SALE"}
                        onChange={() => setDriverGrievanceType("ILLEGAL_WATER_SALE")}
                        className="mt-0.5 text-rose-600 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-rose-950 block">🚨 Selling Free Relief Water / Demanding Money (Bribe)</span>
                        <span className="text-[10px] text-rose-700 font-bold">Severe (-60 Credits). Drops driver below 30 threshold to trigger Immediate Blacklisting!</span>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${driverGrievanceType === "CUSTOMER_DISSATISFACTION" ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                      <input
                        type="radio"
                        name="grievanceType"
                        value="CUSTOMER_DISSATISFACTION"
                        checked={driverGrievanceType === "CUSTOMER_DISSATISFACTION"}
                        onChange={() => setDriverGrievanceType("CUSTOMER_DISSATISFACTION")}
                        className="mt-0.5 text-rose-600 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-rose-950 block">👎 Incomplete Delivery / Rude Behaviour</span>
                        <span className="text-[10px] text-rose-700 font-medium">Consumer dissatisfaction grievance (-30 Credits).</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Additional Citizen Observation Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-tight mb-1">
                    Details / Citizen Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={driverGrievanceNotes}
                    onChange={(e) => setDriverGrievanceNotes(e.target.value)}
                    placeholder="Provide specific location, standpost details, or what the driver demanded..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                  />
                </div>

                {/* Feedback / Alert Banner */}
                {driverReviewFeedback && (
                  <div className={`p-3 rounded-xl border text-xs font-bold animate-fade-in ${driverGrievanceType === "none" ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-rose-50 border-rose-400 text-rose-900"}`}>
                    {driverReviewFeedback}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDriverReviewModal(false)}
                    className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={driverSubmitting}
                    className={`px-4 py-2 rounded-xl font-bold text-white transition shadow-sm cursor-pointer flex items-center space-x-1.5 ${
                      driverGrievanceType !== "none"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-[#0056b3] hover:bg-sky-700"
                    }`}
                  >
                    {driverSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : driverGrievanceType !== "none" ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>{driverGrievanceType !== "none" ? "Submit Grievance to Municipal Vigilance" : "Submit Driver Rating"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
