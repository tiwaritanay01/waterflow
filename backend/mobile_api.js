/**
 * WaterFlow OS — Mobile API Router
 * Dedicated endpoints for Citizen Portal & Worker Portal
 *
 * Endpoints:
 * - POST /api/citizen/report: Accepts GPS coordinates, phone number, issue type
 * - GET  /api/citizen/track: Checks if a tanker is dispatched near citizen GPS / phone and returns ETA & OTP
 * - GET  /api/worker/mission: Fetches current active dispatch for specific tanker_id
 * - POST /api/worker/verify-delivery: Validates 4-digit OTP against database and updates to 'Delivered'
 * - POST /api/worker/status: Updates tanker mission status (en_route, arrived, dispensing)
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// Load local .env file if present
try {
  const rootEnv = path.resolve(__dirname, "../.env");
  const localEnv = path.resolve(__dirname, "./.env");
  const envTarget = fs.existsSync(rootEnv) ? rootEnv : (fs.existsSync(localEnv) ? localEnv : null);
  if (envTarget) {
    const rawLines = fs.readFileSync(envTarget, "utf8").split(/\r?\n/);
    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (line && !line.startsWith("#") && line.includes("=")) {
        const [k, ...v] = line.split("=");
        const key = k.trim();
        if (key && !process.env[key]) {
          process.env[key] = v.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  }
} catch (_) {}

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
const GROQ_CHAT_MODEL = process.env.GROQ_CHAT_MODEL || "qwen/qwen3.8-27b";

const { MISSION_VERSIONS, verifyMissionDelivery, initDemoMissions } = require("./field_sync");
const { computePriority } = require("./core_algorithms");
const {
  getCitizenProfile,
  rewardVerifiedComplaint,
  downvoteFalseComplaint,
  rewardDeliveryOtpConfirmation,
  redeemFastTrackCredit,
  getDriverProfile,
  getAllDrivers,
  recordDriverInfraction,
  recordDriverReward,
  setTankerBlacklist,
} = require("./integrity_engine");

// ---------------------------------------------------------------------------
// In-Memory Fallback State (Synchronized with PostgreSQL if available)
// ---------------------------------------------------------------------------

let activeReports = [
  {
    report_id: 1001,
    phone_number: "+91-9820012345",
    issue_type: "Severe Dry Pipe (>48h)",
    status: "dispatched",
    lat: 19.0550,
    lng: 72.9180,
    ward_code: "M/E",
    ward_name: "Govandi / Mankhurd / Shivaji Nagar",
    assigned_tanker_id: "T-08",
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    report_id: 1002,
    phone_number: "+91-9876543210",
    issue_type: "Pipeline Contamination",
    status: "pending",
    lat: 19.0430,
    lng: 72.8460,
    ward_code: "G/N",
    ward_name: "Dharavi / Mahim",
    assigned_tanker_id: null,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

// Authoritative mission access helper (synced with field_sync.js)
function getActiveDispatches() {
  initDemoMissions();
  return Array.from(MISSION_VERSIONS.values());
}

// Helper: Find closest active dispatch to a lat/lng coordinate (within ~5 km)
function findNearbyDispatch(lat, lng, phone) {
  const dispatches = getActiveDispatches();
  if (phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const match = dispatches.find((d) => {
      const dPhone = (d.citizen_phone || "").replace(/[^0-9]/g, "");
      return dPhone.endsWith(cleanPhone.slice(-8)) || cleanPhone.endsWith(dPhone.slice(-8));
    });
    if (match) return match;
  }

  if (lat && lng) {
    const cLat = parseFloat(lat);
    const cLng = parseFloat(lng);
    let best = null;
    let minDist = 0.08; // ~8km threshold
    for (const d of dispatches) {
      const dist = Math.sqrt((d.lat - cLat) ** 2 + (d.lng - cLng) ** 2);
      if (dist < minDist) {
        minDist = dist;
        best = d;
      }
    }
    if (best) return best;
  }

  // Default to the first active dispatch if user is testing
  return dispatches.find((d) => d.delivery_status !== "delivered" && d.status !== "delivered") || dispatches[0];
}

// ---------------------------------------------------------------------------
// 1. POST /api/citizen/report
// Accepts GPS coordinates and phone number. Inserts into the database.
// ---------------------------------------------------------------------------

router.post("/citizen/report", async (req, res) => {
  try {
    const { phone_number, lat, lng, latitude, longitude, issue_type, notes, use_fast_track } = req.body;

    const reportLat = parseFloat(lat || latitude || 19.0550);
    const reportLng = parseFloat(lng || longitude || 72.9180);
    const phone = phone_number || "+91-9820012345";
    const issue = issue_type || "Severe Dry Pipe (>48h)";

    // Redeem Fast-Track priority credits if requested
    let fastTrackResult = null;
    if (use_fast_track) {
      const generatedId = 1000 + activeReports.length + 1;
      fastTrackResult = redeemFastTrackCredit(phone, generatedId);
    }

    // Attempt PostgreSQL insert if database pool is attached
    if (req.app.locals.pool && req.app.locals.dbAvailable) {
      try {
        const query = `
          INSERT INTO citizen_reports (
            phone_number, issue_type, status, gps_location, notes, created_at
          ) VALUES (
            $1, $2, 'dispatched', ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, NOW()
          ) RETURNING report_id, phone_number, issue_type, status, created_at;
        `;
        const result = await req.app.locals.pool.query(query, [
          phone,
          issue,
          reportLng,
          reportLat,
          notes || "Reported via WaterFlow Citizen Mobile Web App",
        ]);

        const dbReport = result.rows[0];
        return res.status(201).json({
          success: true,
          message: "Water shortage report logged in Municipal SCADA",
          report: {
            report_id: dbReport.report_id,
            phone_number: dbReport.phone_number,
            issue_type: dbReport.issue_type,
            status: "dispatched",
            lat: reportLat,
            lng: reportLng,
            created_at: dbReport.created_at,
          },
          matched_tanker: activeDispatches[0],
        });
      } catch (dbErr) {
        console.warn("Database report insert failed, falling back to memory:", dbErr.message);
      }
    }

    // In-memory record creation
    const newReport = {
      report_id: 1000 + activeReports.length + 1,
      phone_number: phone,
      issue_type: issue,
      status: "dispatched",
      lat: reportLat,
      lng: reportLng,
      ward_code: "M/E",
      ward_name: "Govandi / Mankhurd / Shivaji Nagar",
      assigned_tanker_id: "T-08",
      notes: notes || "Submitted via Citizen Portal",
      is_fast_track: Boolean(fastTrackResult?.success),
      priority_boost: fastTrackResult?.success ? "FAST_TRACK_CIVIC_CREDIT" : "NORMAL",
      created_at: new Date().toISOString(),
    };
    activeReports.unshift(newReport);

    // Link or assign active mission
    const matchedDispatch = activeDispatches[0];
    matchedDispatch.citizen_phone = phone;

    res.status(201).json({
      success: true,
      message: fastTrackResult?.success
        ? "Water shortage report fast-tracked with Civic Credits (+Top Priority)!"
        : "Water shortage report logged in Municipal SCADA",
      report: newReport,
      fast_track_applied: Boolean(fastTrackResult?.success),
      matched_tanker: matchedDispatch,
    });
  } catch (err) {
    console.error("Error in POST /api/citizen/report:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /api/citizen/track
// Checks if a tanker is dispatched near the citizen's GPS location and returns its ETA.
// ---------------------------------------------------------------------------

router.get("/citizen/track", async (req, res) => {
  try {
    const { lat, lng, phone_number } = req.query;

    const dispatch = findNearbyDispatch(lat, lng, phone_number);

    if (!dispatch) {
      return res.json({
        is_dispatched: false,
        message: "No municipal tanker is currently dispatched to this exact sector.",
      });
    }

    res.json({
      is_dispatched: true,
      mission_id: dispatch.mission_id,
      tanker_id: dispatch.tanker_id,
      license_plate: dispatch.license_plate,
      driver_name: dispatch.driver_name,
      driver_phone: dispatch.driver_phone,
      eta_minutes: dispatch.eta_minutes,
      volume_liters: dispatch.volume_liters,
      otp_code: dispatch.otp_code, // 4-digit code to share with driver
      delivery_status: dispatch.delivery_status,
      destination_ward: dispatch.destination_ward,
      destination_address: dispatch.destination_address,
      lat: dispatch.lat,
      lng: dispatch.lng,
      depot_name: dispatch.depot_name,
      dispatched_at: dispatch.dispatched_at,
    });
  } catch (err) {
    console.error("Error in GET /api/citizen/track:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. GET /api/worker/mission
// Fetches the current active dispatch for a specific tanker_id.
// ---------------------------------------------------------------------------

router.get("/worker/mission", async (req, res) => {
  try {
    const requestedId = req.query.tanker_id || "T-08";

    // Attempt DB query if pool exists
    if (req.app.locals.pool && req.app.locals.dbAvailable) {
      try {
        const query = `
          SELECT dl.id AS mission_id, t.transponder_id AS tanker_id,
                 'MH-03-BW-7821' AS license_plate,
                 COALESCE(t.driver_name, 'Rajesh Patil') AS driver_name,
                 w.name AS destination_ward,
                 COALESCE(w.description, 'Shivaji Nagar Community Supply Point') AS destination_address,
                 ST_Y(w.centroid) AS lat, ST_X(w.centroid) AS lng,
                 dl.volume_liters,
                 COALESCE(dl.otp_code, '7419') AS otp_code,
                 COALESCE(dl.delivery_status, 'en_route') AS delivery_status,
                 dl.dispatched_at
          FROM dispatch_logs dl
          JOIN tankers t ON dl.tanker_id = t.id
          JOIN wards w ON dl.ward_id = w.id
          WHERE t.transponder_id = $1 OR dl.tanker_id::text = $1
          ORDER BY dl.dispatched_at DESC LIMIT 1;
        `;
        const result = await req.app.locals.pool.query(query, [requestedId]);
        if (result.rows.length > 0) {
          const row = result.rows[0];
          return res.json({
            success: true,
            mission: {
              ...row,
              lat: row.lat || 19.0550,
              lng: row.lng || 72.9180,
              eta_minutes: 14,
              citizen_phone: "+91-9820012345",
            },
          });
        }
      } catch (dbErr) {
        console.warn("DB mission fetch failed, using memory:", dbErr.message);
      }
    }

    // Fallback to in-memory active dispatch
    const dispatches = getActiveDispatches();
    const mission =
      dispatches.find(
        (d) =>
          d.tanker_id.toUpperCase() === requestedId.toUpperCase() ||
          String(d.mission_id) === String(requestedId)
      ) || dispatches[0];

    res.json({
      success: true,
      mission,
    });
  } catch (err) {
    console.error("Error in GET /api/worker/mission:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. POST /api/worker/verify-delivery
// Accepts tanker_id, gps_location, and otp_code. Validates the OTP against the database and updates status to "Delivered".
// ---------------------------------------------------------------------------

router.post("/worker/verify-delivery", async (req, res) => {
  try {
    const { tanker_id, gps_location, otp_code } = req.body;

    if (!otp_code) {
      return res.status(400).json({
        success: false,
        error: "4-Digit Delivery OTP is required.",
      });
    }

    const cleanInputOtp = String(otp_code).trim();
    const reqTankerId = tanker_id || "T-08";

    // Find the active dispatch from authoritative store
    const dispatches = getActiveDispatches();
    const mission = dispatches.find(
      (d) =>
        d.tanker_id.toUpperCase() === String(reqTankerId).toUpperCase() ||
        String(d.mission_id) === String(reqTankerId)
    ) || dispatches[0];

    // Attempt PostgreSQL verification if connected
    if (req.app.locals.pool && req.app.locals.dbAvailable) {
      try {
        const query = `
          UPDATE dispatch_logs
          SET delivery_status = 'Delivered', status = 'delivered', completed_at = NOW()
          WHERE (tanker_id = (SELECT id FROM tankers WHERE transponder_id = $1) OR id = $2)
            AND otp_code = $3
          RETURNING *;
        `;
        const result = await req.app.locals.pool.query(query, [
          mission.tanker_id,
          mission.mission_id,
          cleanInputOtp,
        ]);

        if (result.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: "Invalid Delivery OTP code. Please cross-check with citizen.",
          });
        }
      } catch (dbErr) {
        console.warn("DB verification failed, using memory logic:", dbErr.message);
      }
    }

    // Call authoritative verification engine (triggers closed-loop state update)
    let verifyResult;
    try {
      verifyResult = verifyMissionDelivery(mission.mission_id, {
        otp_code: cleanInputOtp,
        verified_by: "WORKER_OTP_HANDOVER",
        quantity_liters: mission.volume_liters,
      });
    } catch (verifErr) {
      return res.status(400).json({
        success: false,
        error: verifErr.message,
      });
    }

    // Update corresponding citizen reports
    for (const r of activeReports) {
      if (r.assigned_tanker_id === mission.tanker_id) {
        r.status = "resolved";
      }
    }

    // Award +15 credits to citizen for verified handover and +15 credits to driver
    const citReward = rewardDeliveryOtpConfirmation(mission.citizen_phone || "+91-9820012345", mission.mission_id);
    const drvReward = recordDriverReward(mission.tanker_id, "ON_TIME_DELIVERY", `Verified OTP handover at ${mission.destination_address || "Ward Standpost"}`);

    res.json({
      success: true,
      message: "Proof of Delivery authenticated via Citizen OTP.",
      status: "Delivered",
      delivery_timestamp: mission.completed_at || verifyResult.verified_at,
      tanker_id: mission.tanker_id,
      volume_delivered_liters: mission.volume_liters,
      destination: mission.destination_address,
      verification_state: "VERIFIED",
      audit_token: verifyResult.audit_trace_id || `VERIF-SCADA-${Date.now()}-${cleanInputOtp}`,
      closed_loop_feedback: verifyResult.closed_loop_feedback || null,
    });
  } catch (err) {
    console.error("Error in POST /api/worker/verify-delivery:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. POST /api/worker/status
// Allows the driver to toggle transit status (En Route -> Arrived -> Dispensing)
// ---------------------------------------------------------------------------

router.post("/worker/status", (req, res) => {
  try {
    const { tanker_id, status } = req.body;
    const dispatches = getActiveDispatches();
    const mission = dispatches.find(
      (d) => d.tanker_id.toUpperCase() === String(tanker_id || "T-08").toUpperCase()
    ) || dispatches[0];

    mission.delivery_status = status || "arrived";
    mission.status = status || "arrived";
    mission.updated_at = new Date().toISOString();
    if (status === "arrived") {
      mission.eta_minutes = 0;
    }

    res.json({
      success: true,
      message: `Status updated to ${mission.delivery_status}`,
      mission,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. POST /api/emergency/call-webhook (and /api/citizen/emergency-call-webhook)
// Emergency SOS Hotline Webhook: Registers immediate red-alert Tier-1 ticket,
// triggers municipal IVR outbound callback, and assigns priority relief tanker.
// ---------------------------------------------------------------------------

const emergencyCallLogs = [];

const handleEmergencyCallWebhook = async (req, res) => {
  try {
    const {
      phone_number,
      caller_phone,
      ward_code,
      ward_name,
      lat,
      lng,
      landmark,
      emergency_type,
      notes,
      source,
    } = req.body;

    const phone = caller_phone || phone_number || "+91-9820012345";
    const ward = ward_code || "M/E";
    const callLat = parseFloat(lat || 19.0550);
    const callLng = parseFloat(lng || 72.9180);
    const emergencyCategory = emergency_type || "Critical Standpost Dry Out (>72 Hours) / Contamination Outbreak";
    const emergencyTicketId = `WF-EMERG-${Math.floor(100000 + Math.random() * 900000)}`;
    const sessionId = `IVR-BMC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const emergencyRecord = {
      ticket_id: emergencyTicketId,
      session_id: sessionId,
      phone_number: phone,
      ward_code: ward,
      ward_name: ward_name || "Govandi / Mankhurd (Ward M/E)",
      lat: callLat,
      lng: callLng,
      landmark: landmark || "Central Slum Standpost",
      emergency_type: emergencyCategory,
      notes: notes || "Triggered via Citizen Portal Emergency SOS Webhook",
      source: source || "citizen_mobile_sos_button",
      priority_tier: "Tier-1 Critical (RED_ALERT)",
      assigned_tanker_id: "T-08",
      driver_name: "Rajesh Patil",
      driver_phone: "+91 98201 55432",
      eta_minutes: 8, // Accelerated emergency response
      otp_code: "7419",
      ivr_callback: {
        scheduled: true,
        channel: "MCGM_VOICE_OUTBOUND_IVR",
        dest_number: phone,
        status: "QUEUED_IMMEDIATE_RING",
        expected_callback_seconds: 10,
        voice_script: `नमस्कार. बृहन्मुंबई महानगरपालिका जल विभाग. तुमची तातडीची तक्रार #${emergencyTicketId} नोंदवली आहे. तातडीचा टँकर T-08 रवाना करण्यात आला आहे. हेल्पलाइन: +91 8369978764.`,
      },
      sms_notification: {
        dispatched: true,
        gateway: "+91 8369978764 / 56161",
        sms_text: `MCGM WATERFLOW RED ALERT: Emergency Ticket #${emergencyTicketId} logged for Ward ${ward}. Tanker T-08 en route (ETA 8 mins). Delivery OTP: 7419. Helpline: +91 8369978764.`,
      },
      webhook_delivered_to_scada: true,
      timestamp: new Date().toISOString(),
    };

    emergencyCallLogs.unshift(emergencyRecord);

    // Also register in active citizen reports for tracking
    activeReports.unshift({
      report_id: emergencyTicketId,
      phone_number: phone,
      issue_type: `🚨 EMERGENCY SOS: ${emergencyCategory}`,
      status: "emergency_dispatched",
      lat: callLat,
      lng: callLng,
      ward_code: ward,
      ward_name: ward_name || "Govandi / Mankhurd (Ward M/E)",
      assigned_tanker_id: "T-08",
      notes: `SOS Webhook Triggered from ${source || "Mobile Portal"}`,
      created_at: new Date().toISOString(),
    });

    console.log(`🚨 [EMERGENCY WEBHOOK] Dispatched for phone ${phone} | Ticket: ${emergencyTicketId} | Ward: ${ward}`);

    return res.status(201).json({
      success: true,
      message: "Emergency Webhook processed: Red Alert Ticket raised & IVR Callback queued",
      ticket_id: emergencyTicketId,
      session_id: sessionId,
      details: emergencyRecord,
    });
  } catch (err) {
    console.error("Error in emergency call webhook:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

router.post("/emergency/call-webhook", handleEmergencyCallWebhook);
router.post("/citizen/emergency-call-webhook", handleEmergencyCallWebhook);

// GET /api/emergency/status: Read latest emergency webhook events
router.get("/emergency/status", (req, res) => {
  res.json({
    success: true,
    helpline_number: "+91 8369978764",
    active_red_alerts: emergencyCallLogs.length,
    recent_emergency_calls: emergencyCallLogs.slice(0, 10),
  });
});

// ===========================================================================
// HELPLINE IVR & PRIORITY ESCALATION CALL QUEUE (+91 8369978764)
//
// 1. Citizen connects to Helpline +91 8369978764
// 2. Automated Voice Bot ("JalVaani AI") answers (not an officer!)
// 3. Bot instantly generates Ticket ID (WF-CALL-XXXXXX)
// 4. Bot speaks real-time area status in preferred language (EN, HI, MR)
// 5. Bot verifies satisfaction ("Satisfied" vs "Speak to Officer")
// 6. If unsatisfied, caller is inserted into Municipal Mobile Call Queue
//    PRIORITIZED strictly by the water distress equity algorithm (computePriority)
// 7. Officer bridge connects caller based on priority rank
// ===========================================================================

const HELPLINE_PHONE_NUMBER = "+91 8369978764";

const WARD_MUNICIPAL_DATA = {
  "M/E": {
    ward_code: "M/E",
    name: "Govandi / Mankhurd / Shivaji Nagar",
    vulnerability_index: 0.96,
    dry_pipe_hours: 58,
    historical_deficit: 0.78,
    population: 807720,
    depot_distance_km: 4.8,
    timetable: "06:00 - 09:30 AM",
    deficit_pct: 32,
    tanker_id: "T-08",
    driver_name: "Rajesh Patil",
    driver_phone: "+91 98201 55432",
    eta_mins: 12,
    otp_code: "7419",
  },
  "G/N": {
    ward_code: "G/N",
    name: "Dharavi / Mahim / Dadar West",
    vulnerability_index: 0.93,
    dry_pipe_hours: 52,
    historical_deficit: 0.70,
    population: 599039,
    depot_distance_km: 3.6,
    timetable: "05:30 - 08:30 AM",
    deficit_pct: 28,
    tanker_id: "T-03",
    driver_name: "Sunil Shinde",
    driver_phone: "+91 98203 11223",
    eta_mins: 15,
    otp_code: "3892",
  },
  "K/E": {
    ward_code: "K/E",
    name: "Andheri East / Marol",
    vulnerability_index: 0.65,
    dry_pipe_hours: 36,
    historical_deficit: 0.52,
    population: 824586,
    depot_distance_km: 6.2,
    timetable: "07:00 - 10:00 AM",
    deficit_pct: 20,
    tanker_id: "T-11",
    driver_name: "Amit Kamble",
    driver_phone: "+91 98204 44556",
    eta_mins: 22,
    otp_code: "5124",
  },
  "L": {
    ward_code: "L",
    name: "Kurla / Chunabhatti",
    vulnerability_index: 0.88,
    dry_pipe_hours: 44,
    historical_deficit: 0.62,
    population: 902227,
    depot_distance_km: 5.1,
    timetable: "06:30 - 09:30 AM",
    deficit_pct: 25,
    tanker_id: "T-05",
    driver_name: "Vikas More",
    driver_phone: "+91 98205 66778",
    eta_mins: 18,
    otp_code: "6431",
  },
  "A": {
    ward_code: "A",
    name: "Colaba / Fort / Churchgate",
    vulnerability_index: 0.35,
    dry_pipe_hours: 12,
    historical_deficit: 0.20,
    population: 185014,
    depot_distance_km: 2.1,
    timetable: "04:30 - 07:00 AM",
    deficit_pct: 8,
    tanker_id: "T-14",
    driver_name: "Pradeep Joshi",
    driver_phone: "+91 98206 77889",
    eta_mins: 35,
    otp_code: "8910",
  },
};

function getWardMunicipalProfile(wardCode) {
  const code = (wardCode || "M/E").toUpperCase().trim();
  if (WARD_MUNICIPAL_DATA[code]) return WARD_MUNICIPAL_DATA[code];
  return {
    ward_code: code,
    name: `BMC Ward ${code}`,
    vulnerability_index: 0.60,
    dry_pipe_hours: 30,
    historical_deficit: 0.45,
    population: 450000,
    depot_distance_km: 5.0,
    timetable: "06:00 - 09:00 AM",
    deficit_pct: 20,
    tanker_id: "T-08",
    driver_name: "Rajesh Patil",
    driver_phone: "+91 98201 55432",
    eta_mins: 15,
    otp_code: "7419",
  };
}

const activeCallSessions = new Map();

// Seeded background callers in queue waiting for an officer
let prioritizedCallQueue = [
  {
    ticket_id: "WF-CALL-310482",
    session_id: "IVR-BMC-QUEUE-1",
    phone_number: "+91 98200 88111",
    ward_code: "L",
    ward_name: "Kurla / Chunabhatti",
    issue_type: "Pressure Deficit at Standpost",
    priority_score: 64.2,
    tier: 2,
    tier_name: "Tier-2 Elevated Priority",
    queued_at: new Date(Date.now() - 180000).toISOString(),
    lang: "mr",
  },
  {
    ticket_id: "WF-CALL-194028",
    session_id: "IVR-BMC-QUEUE-2",
    phone_number: "+91 98200 77222",
    ward_code: "A",
    ward_name: "Colaba / Fort",
    issue_type: "General Supply Inquiries",
    priority_score: 28.5,
    tier: 4,
    tier_name: "Tier-4 Nominal Priority",
    queued_at: new Date(Date.now() - 300000).toISOString(),
    lang: "en",
  },
];

// 1. POST /api/call/ivr-connect
// Citizen calls helpline +91 8369978764 -> Bot answers, raises ticket, briefs status in caller's language
router.post("/call/ivr-connect", async (req, res) => {
  try {
    const { phone_number, caller_phone, ward_code, lang, source, caller_speech } = req.body;
    const phone = caller_phone || phone_number || "+91-9820012345";
    const wardCode = (ward_code || "M/E").toUpperCase().trim();
    const currentLang = (lang || "mr").toLowerCase();
    const wardProfile = getWardMunicipalProfile(wardCode);

    const ticketId = `WF-CALL-${Math.floor(100000 + Math.random() * 900000)}`;
    const sessionId = `CALL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const defaultScripts = {
      mr: `नमस्कार! मी मनपा जलवाणी मदत सेवेतून बोलत आहे. काळजी करू नका, तुमची तक्रार नोंदवली आहे (तक्रार क्र. #${ticketId}). वॉर्ड ${wardProfile.ward_code} (${wardProfile.name}) मध्ये आज नळाचे पाणी सकाळी ${wardProfile.timetable} येणार होते. भागात पाणी कमी असल्यामुळे तुमच्या मदतीसाठी मनपाचा पाण्याचा टँकर ${wardProfile.tanker_id} निघाला आहे. ड्रायव्हर ${wardProfile.driver_name} साधारण ${wardProfile.eta_mins} मिनिटांत पोहोचेल. पाणी घेताना ड्रायव्हरला OTP ${wardProfile.otp_code} सांगा. ही माहिती समजली का? तुम्हाला पाणी अधिकाऱ्यांशी थेट बोलायचे असल्यास 'अधिकाऱ्यांशी बोला' हे बटण दाबा.`,
      hi: `नमस्ते! मैं मनपा जलवाणी सहायता से बोल रहा हूँ। परेशान मत होइए, आपकी शिकायत दर्ज हो गई है (शिकायत क्र. #${ticketId})। वार्ड ${wardProfile.ward_code} (${wardProfile.name}) में आज नल का पानी सुबह ${wardProfile.timetable} आना था। इलाके में पानी की किल्लत की वजह से आपके लिए राहत टैंकर ${wardProfile.tanker_id} भेज दिया गया है। ड्राइवर ${wardProfile.driver_name} लगभग ${wardProfile.eta_mins} मिनट में पहुँच रहा है। पानी लेते समय ड्राइवर को OTP ${wardProfile.otp_code} बता दीजिएगा। क्या आपको पूरी जानकारी मिल गई? यदि आप किसी अधिकारी से सीधे बात करना चाहते हैं, तो 'अधिकारी से बात करें' दबाएं।`,
      en: `Hello! This is the BMC Water Helpline. Don't worry, your water complaint is registered (Ticket #${ticketId}). In Ward ${wardProfile.ward_code} (${wardProfile.name}), tap water was scheduled for ${wardProfile.timetable}. Because water is short today, relief tanker ${wardProfile.tanker_id} has already been sent to your street. Driver ${wardProfile.driver_name} will reach in about ${wardProfile.eta_mins} minutes. When you collect water, please give him OTP ${wardProfile.otp_code}. Does this help you? If you still need to speak directly with an officer, choose 'Speak to Officer'.`,
    };

    let selectedScript = defaultScripts[currentLang] || defaultScripts.mr;

    // Dynamically generate personalized spoken briefing using Groq LLM if available
    if (GROQ_API_KEY) {
      try {
        const voicePrompt = `You are the automated BMC Municipal Voice Helper speaking on phone helpline +91 8369978764 to a Mumbai citizen.
Caller Context:
- Language: ${currentLang === "hi" ? "Hindi (हिंदी)" : currentLang === "mr" ? "Marathi (मराठी)" : "English"}
- Ward: Ward ${wardProfile.ward_code} (${wardProfile.name})
- Auto-Generated Ticket ID: #${ticketId}
- Scheduled tap water time: ${wardProfile.timetable}
- Dispatched relief tanker: ${wardProfile.tanker_id} (Driver: ${wardProfile.driver_name}, ETA ~${wardProfile.eta_mins} mins, Delivery OTP: ${wardProfile.otp_code})
${caller_speech ? `- Caller's words: "${caller_speech}"` : ""}

Generate a caring, short spoken briefing (3-4 natural sentences) in plain everyday spoken language without bureaucratic jargon. Reassure the caller, state their ticket ID and tanker details, remind them to give OTP ${wardProfile.otp_code} to the driver, and ask if they are satisfied or want to connect with an officer.`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: GROQ_CHAT_MODEL,
            messages: [{ role: "system", content: voicePrompt }],
            max_tokens: 220,
            temperature: 0.5,
          }),
        });

        if (groqRes.ok) {
          const gData = await groqRes.json();
          const llmScript = gData.choices?.[0]?.message?.content;
          if (llmScript && llmScript.trim().length > 30) {
            selectedScript = llmScript.trim();
          }
        }
      } catch (voiceErr) {
        console.warn("Groq voice script generation fallback:", voiceErr.message);
      }
    }

    const sessionData = {
      session_id: sessionId,
      ticket_id: ticketId,
      phone_number: phone,
      helpline_number: HELPLINE_PHONE_NUMBER,
      ward_code: wardProfile.ward_code,
      ward_name: wardProfile.name,
      lang: currentLang,
      stage: "BOT_BRIEFING",
      area_status: {
        timetable: wardProfile.timetable,
        deficit_pct: wardProfile.deficit_pct,
        relief_tanker: {
          tanker_id: wardProfile.tanker_id,
          driver_name: wardProfile.driver_name,
          driver_phone: wardProfile.driver_phone,
          eta_mins: wardProfile.eta_mins,
          otp_code: wardProfile.otp_code,
        },
      },
      bot_voice_script: selectedScript,
      scripts: defaultScripts,
      created_at: new Date().toISOString(),
    };

    activeCallSessions.set(sessionId, sessionData);

    // Register inquiry in active reports
    activeReports.unshift({
      report_id: ticketId,
      phone_number: phone,
      issue_type: `📞 HELPLINE IVR INTAKE (Ward ${wardProfile.ward_code})`,
      status: "ivr_ticket_raised",
      lat: 19.055,
      lng: 72.918,
      ward_code: wardProfile.ward_code,
      ward_name: wardProfile.name,
      assigned_tanker_id: wardProfile.tanker_id,
      notes: `Auto-ticket raised via Voice Bot Helpline (${HELPLINE_PHONE_NUMBER})`,
      created_at: new Date().toISOString(),
    });

    console.log(`📞 [IVR BOT CALL] Handled call on ${HELPLINE_PHONE_NUMBER} | Auto-Ticket: ${ticketId} | Ward: ${wardProfile.ward_code} | Lang: ${currentLang}`);

    return res.status(200).json({
      success: true,
      helpline_number: HELPLINE_PHONE_NUMBER,
      ticket_id: ticketId,
      session_id: sessionId,
      ward_code: wardProfile.ward_code,
      ward_name: wardProfile.name,
      lang: currentLang,
      stage: "BOT_BRIEFING",
      area_status: sessionData.area_status,
      bot_voice_script: selectedScript,
      script: selectedScript,
      scripts: defaultScripts,
      message: "AI Voice Bot connected. Inquiry ticket raised and area status briefed to caller in preferred language.",
    });
  } catch (err) {
    console.error("Error in /api/call/ivr-connect:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/call/satisfaction
// Caller confirms whether bot's status briefing was sufficient
router.post("/call/satisfaction", (req, res) => {
  try {
    const { session_id, ticket_id, satisfied, notes } = req.body;
    const session = activeCallSessions.get(session_id);

    if (satisfied) {
      if (session) {
        session.stage = "RESOLVED_BY_BOT";
        session.resolved_at = new Date().toISOString();
      }

      // Update in activeReports
      const rep = activeReports.find((r) => r.report_id === ticket_id);
      if (rep) {
        rep.status = "resolved_by_ivr_bot";
        rep.notes = notes || "Caller satisfied with automated area timetable and tanker status.";
      }

      return res.json({
        success: true,
        ticket_id,
        status: "RESOLVED_BY_BOT",
        message: "Ticket marked resolved. Caller satisfied with automated area briefing.",
        sms_confirmation: `MCGM WATERFLOW: Inquiry #${ticket_id} resolved via AI JalVaani Voice Bot. For future queries, dial ${HELPLINE_PHONE_NUMBER}.`,
      });
    } else {
      return res.json({
        success: true,
        ticket_id,
        status: "PENDING_ESCALATION",
        message: "Caller not satisfied. Ready for priority queue escalation.",
      });
    }
  } catch (err) {
    console.error("Error in /api/call/satisfaction:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/call/escalate
// Caller is unsatisfied -> Enqueued into Municipal Mobile Call Queue strictly prioritized by WaterFlow equity algorithm
router.post("/call/escalate", (req, res) => {
  try {
    const { session_id, ticket_id, phone_number, ward_code, issue_type, lang } = req.body;
    const wardCode = (ward_code || "M/E").toUpperCase().trim();
    const wardProfile = getWardMunicipalProfile(wardCode);
    const phone = phone_number || "+91-9820012345";
    const ticket = ticket_id || `WF-CALL-${Math.floor(100000 + Math.random() * 900000)}`;

    // Evaluate equity priority using authoritative core algorithm
    const priorityResult = computePriority(wardProfile);
    const score = Number(priorityResult.total_score ?? priorityResult.total ?? 0);
    const factors = priorityResult.priority_factors || priorityResult.factors || priorityResult.breakdown || [];

    // Remove existing entry for this ticket if already present
    prioritizedCallQueue = prioritizedCallQueue.filter((item) => item.ticket_id !== ticket);

    const queueItem = {
      ticket_id: ticket,
      session_id: session_id || `IVR-BMC-${Date.now()}`,
      phone_number: phone,
      ward_code: wardProfile.ward_code,
      ward_name: wardProfile.name,
      issue_type: issue_type || "Water Deficit Escalation (Unsatisfied with Bot)",
      priority_score: score,
      tier: priorityResult.tier || 1,
      tier_name:
        priorityResult.tier === 1
          ? "Tier-1 Critical Priority"
          : priorityResult.tier === 2
          ? "Tier-2 Elevated Priority"
          : "Tier-3 Moderate Priority",
      factors: factors,
      queued_at: new Date().toISOString(),
      lang: lang || "mr",
    };

    // Add and sort queue descending by priority_score (CRITICAL EQUITY INVARIANT)
    prioritizedCallQueue.push(queueItem);
    prioritizedCallQueue.sort((a, b) => b.priority_score - a.priority_score);

    const queuePosition = prioritizedCallQueue.findIndex((item) => item.ticket_id === ticket) + 1;
    const estimatedWaitSeconds = Math.max(30, queuePosition * 45);

    // Update session state
    if (session_id && activeCallSessions.has(session_id)) {
      const s = activeCallSessions.get(session_id);
      s.stage = "QUEUED_ESCALATION";
      s.priority_score = score;
      s.queue_position = queuePosition;
    }

    console.log(`📋 [PRIORITY CALL QUEUE] Caller ticket ${ticket} (Ward ${wardCode}) queued at Position #${queuePosition}/${prioritizedCallQueue.length} (Score: ${score})`);

    return res.status(200).json({
      success: true,
      ticket_id: ticket,
      queue_position: queuePosition,
      total_waiting: prioritizedCallQueue.length,
      priority_score: score,
      tier: priorityResult.tier,
      tier_name: queueItem.tier_name,
      factors: factors,
      estimated_wait_seconds: estimatedWaitSeconds,
      active_queue: prioritizedCallQueue,
      message: "Caller prioritized in mobile call escalation queue based on municipal water distress equity metrics.",
    });
  } catch (err) {
    console.error("Error in /api/call/escalate:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET /api/call/queue: Read live prioritized municipal call escalation queue
router.get("/call/queue", (req, res) => {
  res.json({
    success: true,
    helpline_number: HELPLINE_PHONE_NUMBER,
    total_waiting: prioritizedCallQueue.length,
    queue_length: prioritizedCallQueue.length,
    queue: prioritizedCallQueue,
  });
});

// 5. POST /api/call/connect-officer: Connects caller to available municipal officer
router.post("/call/connect-officer", (req, res) => {
  try {
    const { ticket_id, ward_code } = req.body;
    const wardCode = (ward_code || "M/E").toUpperCase().trim();
    const wardProfile = getWardMunicipalProfile(wardCode);

    const officerData = {
      officer_name: "Er. Nilesh Shinde",
      designation: `Executive Water Engineer (${wardProfile.name})`,
      badge_number: "BMC-EE-4182",
      control_room: "Eastern Suburbs Zonal Water SCADA Control Room, Chembur",
      call_channel: "SECURE_VOIP_ENCRYPTED_BRIDGE",
      connected_at: new Date().toISOString(),
      ticket_id: ticket_id || "WF-CALL-LIVE",
    };

    // Remove from queue once connected
    if (ticket_id) {
      prioritizedCallQueue = prioritizedCallQueue.filter((item) => item.ticket_id !== ticket_id);
    }

    return res.json({
      success: true,
      message: "Caller successfully connected with Municipal Zonal Water Engineer.",
      officer: officerData,
    });
  } catch (err) {
    console.error("Error in /api/call/connect-officer:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 7. POST /api/citizen/chat
// Groq LLM-powered multilingual AI water assistant ("JalMitra / जलमित्र")
// Supports English, Hindi, and Marathi with strict municipal relevance guardrails,
// nonsense / confusion redirection to helpline (+91 8369978764), and water allocation queue integration.
// ---------------------------------------------------------------------------

const GROQ_CANDIDATE_MODELS = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  process.env.GROQ_CHAT_MODEL || "qwen/qwen3.8-27b",
];

const JALMITRA_SYSTEM_PROMPT = `You are "JalMitra" (जलमित्र), the official AI Municipal Water Operations Assistant for Brihanmumbai Municipal Corporation (BMC / मनपा) Water Department.

STRICT DOMAIN SCOPE & RELEVANCE RULES (MANDATORY):
1. You are EXCLUSIVELY the assistant for BMC Municipal Water Operations (WaterFlow OS) in Mumbai.
2. You ONLY accept and answer requests directly relevant to the WaterFlow OS municipal water system:
   - Drinking water supply schedules, timings, and water pressure for Mumbai's 24 wards (e.g. Ward M/E, G/N, K/E, L, A)
   - Reporting dry taps, water shortage, pipeline bursts, low pressure, or contamination
   - Requesting or booking emergency relief water tankers (allocated fairly by the municipal equity queue)
   - Live tracking of relief tankers, vehicle registration plate, driver details, and 4-digit Delivery OTP
   - Water safety precautions (boiling muddy water 15+ mins, chlorine purification tablets)
   - Citizen civic credits, credibility score, verified report rewards (+25 Cr), and fast-track ticket priority
   - Driver conduct grievances (route diversion, GPS transponder tampering, illegal water sales)
   - Official BMC Water Operations Helpline: 8369978764

3. IRRELEVANT REQUESTS, NONSENSE, OR CONFUSION GUARDRAIL (CRITICAL):
   - If the user asks about ANYTHING outside municipal water (such as cooking recipes, Bollywood/movies, coding/programming, politics, jokes, homework, general chit-chat, sports, unrelated trivia), OR if the user provides nonsense, gibberish (e.g. "asdfghjkl", random letters), abusive text, or an incomprehensible/confusing prompt:
   - DO NOT answer or entertain the unrelated topic.
   - Respond politely stating that you are exclusively the BMC Water Operations Assistant and can only assist with Mumbai water supply, tanker deliveries, shortage grievances, and water emergencies.
   - ALWAYS give the customer the contact number to be called: 8369978764.
   - Explicitly instruct them that if they are confused or need human assistance, they can call the BMC Water Operations Helpline directly at 8369978764.
   - Example (English): "I am JalMitra, your BMC Water Operations Assistant. I can only assist with Mumbai water supply, tanker deliveries, shortage grievances, and water emergencies. If you have any doubts or need assistance, please call our 24/7 Helpline directly at 8369978764."
   - Example (Hindi): "मैं जलमित्र, बीएमसी (BMC) जल विभाग का विशेष सहायक हूँ। मैं केवल मुंबई जल आपूर्ति, टैंकर वितरण, पानी की किल्लत और शिकायतों में सहायता कर सकता हूँ। किसी भी सहायता या प्रश्न के लिए, कृपया बीएमसी जल हेल्पलाइन 8369978764 पर कॉल करें।"
   - Example (Marathi): "मी जलमित्र, मनपा (BMC) पाणी पुरवठा विभागाचा साहाय्यक आहे. मी फक्त मुंबई पाणीपुरवठा, टँकर वाटप व तक्रारींविषयी मदत करू शकतो. कोणत्याही मदतीसाठी कृपया मनपा पाणी हेल्पलाइन 8369978764 वर थेट कॉल करा."

4. WATER ALLOCATION & EMERGENCY TANKER REQUESTS (QUEUE INTEGRATION):
   - If the citizen indicates they have no water, need a tanker, or want to register a shortage complaint:
   - Reassure them warmly that an emergency relief request is being processed directly into the Municipal Water Allocation Queue.
   - Remind them that water is prioritized based on distress metrics (dry pipe hours, ward vulnerability).
   - Inform them of their assigned tanker (e.g. Tanker T-08, Driver Rajesh Patil), ETA (~12 mins), Delivery OTP (7419), and helpline 8369978764.

Tone: Warm, simple, everyday conversational language suitable for any resident, chawl dweller, or elderly citizen. No bureaucratic jargon. Respond in the user's exact language (Hindi, Marathi, or English).`;

router.post("/citizen/chat", async (req, res) => {
  try {
    const { messages, ward_code, lang, phone } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: "Messages array is required" });
    }

    const currentLang = lang || "en";
    const ward = ward_code || "M/E";
    const wardData = WARD_MUNICIPAL_DATA[ward] || WARD_MUNICIPAL_DATA["M/E"];
    const userPhone = phone || "+91-9820012345";

    const lastMsgObj = messages[messages.length - 1];
    const lastUserMsg = (lastMsgObj?.content || "").trim();
    const lastUserMsgLower = lastUserMsg.toLowerCase();

    // Check for Water Allocation / Shortage Complaint intent
    const isWaterAllocationIntent =
      /water|tanker|paani|pani|sukha|nal|shortage|dry|pipe|tap|deliver|bhejo|pathwa|chahiye|pahije|book|queue|grievance|burst|leak|dirty|ganda|gadul|किल्लत|टैंकर|पानी|नळ|टँकर|तक्रार|कोरडा/i.test(
        lastUserMsgLower
      );

    // Check for obvious off-topic / nonsense keywords
    const isOffTopicOrNonsense =
      /recipe|cook|movie|film|cinema|cricket|football|joke|weather in|who is|code|python|java|react|song|dance|actor|actress|politics|modi|election|modelling|girlfriend|boyfriend|homework|algebra|capital of/i.test(
        lastUserMsgLower
      ) ||
      (!isWaterAllocationIntent && /^[a-z0-9]{8,}$/i.test(lastUserMsgLower.replace(/\s+/g, ""))) ||
      (!isWaterAllocationIntent && !/time|when|schedule|help|call|status|hello|hi|namaste|kasa|kay|kaise|kya|bhai|sir/i.test(lastUserMsgLower) && lastUserMsg.length > 25);

    let allocationQueueData = null;

    // If citizen is requesting water / reporting shortage, enqueue into official municipal allocation queue
    if (isWaterAllocationIntent && /need|shortage|no water|dry|tanker|bhejo|chahiye|pahije|pathwa|nahi|नाही|नहीं|भेजो|चाहिए|मागवा/i.test(lastUserMsgLower)) {
      // Calculate priority score matching WaterFlow OS equity algorithm
      const priorityScore = Number(
        (
          (wardData.vulnerability_index * 40) +
          ((wardData.dry_pipe_hours / 72) * 35) +
          (wardData.historical_deficit * 25)
        ).toFixed(1)
      );

      const generatedTicket = `WF-CHAT-${1000 + activeReports.length + 1}`;
      const queuedReport = {
        report_id: 1000 + activeReports.length + 1,
        ticket_code: generatedTicket,
        phone_number: userPhone,
        issue_type: "🔴 Dry Tap Shortage (Chatbot AI Allocation Queue)",
        status: "dispatched",
        lat: 19.0607,
        lng: 72.9263,
        ward_code: ward,
        ward_name: wardData.name,
        priority_score: priorityScore,
        queue_position: 1,
        assigned_tanker_id: wardData.tanker_id || "T-08",
        assigned_plate: "MH-03-BW-7821",
        driver_name: wardData.driver_name || "Rajesh Patil",
        driver_phone: wardData.driver_phone || "+91 98201 55432",
        eta_mins: wardData.eta_mins || 12,
        otp_code: wardData.otp_code || "7419",
        notes: "Queued directly via JalMitra AI Assistant into Municipal Water Allocation Queue",
        created_at: new Date().toISOString(),
      };

      activeReports.unshift(queuedReport);

      allocationQueueData = {
        ticket_id: generatedTicket,
        report_id: queuedReport.report_id,
        ward_code: ward,
        ward_name: wardData.name,
        priority_score: priorityScore,
        queue_position: 1,
        total_in_queue: activeReports.length,
        assigned_tanker: wardData.tanker_id || "T-08",
        plate: "MH-03-BW-7821",
        driver: wardData.driver_name || "Rajesh Patil",
        driver_phone: wardData.driver_phone || "+91 98201 55432",
        eta_mins: wardData.eta_mins || 12,
        otp_code: wardData.otp_code || "7419",
        helpline: "8369978764",
      };
    }

    const enhancedSystemPrompt = `${JALMITRA_SYSTEM_PROMPT}

CURRENT CONTEXT:
- Citizen Location: Ward ${ward} (${wardData.name})
- Regular Water Timetable: ${wardData.timetable}
- Dry Pipe Duration: ${wardData.dry_pipe_hours} hours continuous
- Relief Tanker Assigned: ${wardData.tanker_id} (Driver: ${wardData.driver_name}, Vehicle Plate: MH-03-BW-7821, ETA: ${wardData.eta_mins} mins)
- Delivery Verification OTP: ${wardData.otp_code}
- Official BMC Water Helpline: 8369978764
- User Language: ${currentLang === "hi" ? "Hindi (हिंदी)" : currentLang === "mr" ? "Marathi (मराठी)" : "English"}.

REMEMBER: If the user input is nonsense or unrelated to water operations, politely decline and provide the contact number 8369978764.`;

    const groqApiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
    let generatedReply = "";
    let usedModel = "";

    // Attempt Groq LLM API call across candidate models
    if (groqApiKey) {
      for (const candidateModel of GROQ_CANDIDATE_MODELS) {
        try {
          const groqPayload = {
            model: candidateModel,
            messages: [
              { role: "system", content: enhancedSystemPrompt },
              ...messages.slice(-6),
            ],
            max_tokens: 450,
            temperature: 0.5,
          };

          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqApiKey}`,
            },
            body: JSON.stringify(groqPayload),
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            const reply = groqData.choices?.[0]?.message?.content;
            if (reply && reply.trim().length > 0) {
              generatedReply = reply.trim();
              usedModel = candidateModel;
              break;
            }
          } else {
            const errText = await groqRes.text();
            console.warn(`Groq candidate model ${candidateModel} failed:`, groqRes.status, errText);
          }
        } catch (llmErr) {
          console.warn(`Direct Groq API fetch failed for model ${candidateModel}:`, llmErr.message);
        }
      }
    }

    // Intelligent local fallback if LLM is offline or returned empty
    if (!generatedReply) {
      if (isOffTopicOrNonsense) {
        if (currentLang === "mr") {
          generatedReply = `मी जलमित्र, बृहन्मुंबई महानगरपालिकेचा (BMC) अधिकृत जल साहाय्यक आहे. मी फक्त मुंबई पाणीपुरवठा, टँकर वाटप, पाण्याची वेळ आणि जल तक्रारींविषयी मदत करू शकतो. आपल्याला कोणत्याही शंका असल्यास किंवा मदत हवी असल्यास कृपया मनपा पाणी हेल्पलाइन 8369978764 वर थेट कॉल करा.`;
        } else if (currentLang === "hi") {
          generatedReply = `मैं जलमित्र, बृहन्मुंबई महानगरपालिका (BMC) का आधिकारिक जल सहायक हूँ। मैं केवल मुंबई जल आपूर्ति, टैंकर वितरण, पानी के समय और जल शिकायतों में सहायता कर सकता हूँ। किसी भी प्रकार के संशय या सहायता के लिए, कृपया बीएमसी जल हेल्पलाइन 8369978764 पर सीधे संपर्क करें।`;
        } else {
          generatedReply = `I am JalMitra, the official BMC Municipal Water Operations Assistant. I can only assist with Mumbai water supply schedules, emergency tanker deliveries, shortage grievances, and water emergencies. If you are confused or require assistance, please call our 24/7 Helpline directly at 8369978764.`;
        }
      } else if (allocationQueueData) {
        if (currentLang === "mr") {
          generatedReply = `तुमची तातडीची पाण्याची मागणी पालिकेच्या अधिकृत वाटप रांगेत (Water Allocation Queue) समाविष्ट केली आहे!\n\n📋 तक्रार क्रमांक: ${allocationQueueData.ticket_id}\n🎯 प्राधान्य गुण (Priority Score): ${allocationQueueData.priority_score}/100 (स्थान: क्र. ${allocationQueueData.queue_position})\n🚛 नेमलेला टँकर: ${allocationQueueData.assigned_tanker} (${allocationQueueData.plate}, चालक: ${allocationQueueData.driver})\n⏱️ अंदाजे वेळ: ~${allocationQueueData.eta_mins} मिनिटे\n🔑 डिलिव्हरी OTP: ${allocationQueueData.otp_code}\n\nकोणत्याही तातडीच्या मदतीसाठी थेट हेल्पलाइन 8369978764 वर कॉल करा.`;
        } else if (currentLang === "hi") {
          generatedReply = `आपकी पानी की मांग को आधिकारिक मनपा जल आवंटन कतार (Water Allocation Queue) में दर्ज कर लिया गया है!\n\n📋 टिकट क्र.: ${allocationQueueData.ticket_id}\n🎯 प्राथमिकता स्कोर: ${allocationQueueData.priority_score}/100 (कतार स्थान: #1)\n🚛 आवंटित टैंकर: ${allocationQueueData.assigned_tanker} (${allocationQueueData.plate}, ड्राइवर: ${allocationQueueData.driver})\n⏱️ संभावित आगमन: ~${allocationQueueData.eta_mins} मिनट\n🔑 डिलीवरी OTP: ${allocationQueueData.otp_code}\n\nसीधी सहायता या जानकारी के लिए बीएमसी हेल्पलाइन 8369978764 पर कॉल करें।`;
        } else {
          generatedReply = `Your emergency water request has been enqueued into the official Municipal Water Allocation Queue!\n\n📋 Ticket ID: ${allocationQueueData.ticket_id}\n🎯 Priority Score: ${allocationQueueData.priority_score}/100 (Queue Rank: #${allocationQueueData.queue_position})\n🚛 Assigned Relief Tanker: ${allocationQueueData.assigned_tanker} (${allocationQueueData.plate}, Driver: ${allocationQueueData.driver})\n⏱️ Estimated Arrival: ~${allocationQueueData.eta_mins} mins\n🔑 Delivery Verification OTP: ${allocationQueueData.otp_code}\n\nFor urgent escalations or queries, call Helpline 8369978764 directly.`;
        }
      } else if (lastUserMsgLower.includes("when") || lastUserMsgLower.includes("time") || lastUserMsgLower.includes("schedule") || lastUserMsgLower.includes("समय") || lastUserMsgLower.includes("वेळ")) {
        if (currentLang === "mr") {
          generatedReply = `नमस्कार! वॉर्ड ${ward} (${wardData.name}) साठी नियमित नळाचे पाणी सकाळी ${wardData.timetable} वाजता येते. जर पाणी आले नसेल, तर काळजी करू नका—तुम्ही थेट टँकर मागवू शकता किंवा हेल्पलाइन 8369978764 वर कॉल करू शकता.`;
        } else if (currentLang === "hi") {
          generatedReply = `नमस्ते! वार्ड ${ward} (${wardData.name}) के लिए नल का पानी सुबह ${wardData.timetable} बजे निर्धारित है। अगर आज पानी नहीं आया है तो परेशान न हों, आप आपातकालीन टैंकर मंगा सकते हैं या हेल्पलाइन 8369978764 पर कॉल कर सकते हैं।`;
        } else {
          generatedReply = `Hello! Tap water for Ward ${ward} (${wardData.name}) is scheduled for ${wardData.timetable}. If your taps are currently dry, you can request an emergency relief tanker right here or call helpline 8369978764.`;
        }
      } else if (/priority|score|calculate|formula|कैलकुलेट|स्कोर|गुण|कसा/i.test(lastUserMsgLower)) {
        if (currentLang === "mr") {
          generatedReply = `प्राधान्य गुण (Priority Score) वॉटरफ्लो समता मॉडेलद्वारे मोजला जातो:\n• वॉर्ड संवेदनशीलता निर्देशांक (४०%)\n• नळ कोरडे राहण्याचा कालावधी (३५%)\n• ऐतिहासिक पाण्याचा तुटवडा (२५%)\n• चाळ लोकसंख्या आणि जल तक्रारी\n\nसर्वाधिक टंचाई असलेल्या भागांना आपत्कालीन टँकर वाटपात प्रथम प्राधान्य दिले जाते.`;
        } else if (currentLang === "hi") {
          generatedReply = `प्राथमिकता स्कोर (Priority Score) जल आवंटन समानता फॉर्मूले से तय होता है:\n• वार्ड संवेदनशीलता सूचकांक (40%)\n• नल सूखा रहने का समय (35%)\n• ऐतिहासिक जल अभाव प्रतिशत (25%)\n• आबादी घनत्व और नागरिक शिकायतें\n\nअधिक किल्लत वाले वार्डों को आपातकालीन राहत टैंकर कतार में शीर्ष स्थान मिलता है।`;
        } else {
          generatedReply = `Your Municipal Priority Score is calculated using the WaterFlow OS Equity Formula:\n• Ward Vulnerability Index: 40%\n• Dry-Pipe Hours: 35%\n• Historical Deficit %: 25%\n• Population Density & Spatially Corroborated Complaints.\n\nWards facing severe deficits receive highest ranking in the tanker dispatch queue.`;
        }
      } else if (/hello|hi|heeloo|hey|namaste|नमस्ते|नमस्कार/i.test(lastUserMsgLower)) {
        if (currentLang === "mr") {
          generatedReply = `नमस्कार! मी जलमित्र, मनपा (BMC) जल विभागाचा साहाय्यक आहे. मी वॉर्ड ${ward} पाणी पुरवठा वेळ, टँकर वाटप किंवा पाणी तक्रारीत कशी मदत करू?`;
        } else if (currentLang === "hi") {
          generatedReply = `नमस्ते! मैं जलमित्र, बीएमसी (BMC) जल विभाग का सहायक हूँ। मैं वार्ड ${ward} में जलापूर्ति समय, आपातकालीन टैंकर या पानी की समस्या में आपकी क्या मदद कर सकता हूँ?`;
        } else {
          generatedReply = `Hello! I am JalMitra, your official BMC Water Operations Assistant. How can I assist you with Ward ${ward} water supply timings, emergency tanker delivery, or reporting a shortage?`;
        }
      } else {
        if (currentLang === "mr") {
          generatedReply = `नमस्कार! मी जलमित्र (मनपा पाणी साहाय्यक) आहे. मी वॉर्ड ${ward} मधील पाण्याचा वेळ, टँकर ट्रॅकिंग किंवा टंचाई तक्रारीत मदत करू शकतो. आपल्याला काही अडचण असल्यास कृपया 8369978764 वर थेट संपर्क साधा.`;
        } else if (currentLang === "hi") {
          generatedReply = `नमस्ते! मैं जलमित्र (मनपा जल सहायक) हूँ। मैं वार्ड ${ward} में पानी की आपूर्ति, टैंकर ट्रैकिंग और शिकायतों में सहायता कर सकता हूँ। किसी भी सहायता के लिए हेल्पलाइन 8369978764 पर संपर्क करें।`;
        } else {
          generatedReply = `Hello! I am JalMitra, your BMC Water Operations Assistant. How can I assist you with Ward ${ward} water supply timings, relief tanker status, or logging a shortage complaint? For immediate voice help, call 8369978764.`;
        }
      }
      usedModel = "municipal-knowledge-rules";
    }

    return res.json({
      success: true,
      reply: generatedReply,
      model: usedModel,
      provider: usedModel === "municipal-knowledge-rules" ? "local-fallback" : "groq",
      allocation_queue: allocationQueueData,
      helpline: "8369978764",
      is_nonsense_or_confused: isOffTopicOrNonsense,
    });
  } catch (err) {
    console.error("Error in /api/citizen/chat:", err);
    res.status(500).json({ success: false, error: err.message, helpline: "8369978764" });
  }
});

// ---------------------------------------------------------------------------
// 8. POST /api/citizen/offline-sync
// Synchronizes queued offline reports & SMS tokens once connection is restored
// ---------------------------------------------------------------------------

router.post("/citizen/offline-sync", (req, res) => {
  try {
    const { offline_reports } = req.body;
    if (!offline_reports || !Array.isArray(offline_reports)) {
      return res.status(400).json({ success: false, error: "offline_reports array required" });
    }

    const syncedResults = [];
    for (const report of offline_reports) {
      const ticketId = report.ticket_id || report.report_id || `WF-SMS-${Math.floor(1000 + Math.random() * 9000)}`;
      const syncedRecord = {
        report_id: ticketId,
        phone_number: report.phone_number || "+91-9820012345",
        issue_type: report.issue_type || "Offline Logged Shortage",
        status: "synced_dispatched",
        lat: report.lat || 19.055,
        lng: report.lng || 72.918,
        ward_code: report.ward_code || "M/E",
        ward_name: report.ward_name || "Govandi / Mankhurd",
        assigned_tanker_id: "T-08",
        notes: `Offline Queued Sync: Transmitted at ${new Date().toISOString()}`,
        created_at: report.created_at || new Date().toISOString(),
      };
      activeReports.unshift(syncedRecord);
      syncedResults.push(syncedRecord);
    }

    res.json({
      success: true,
      synced_count: syncedResults.length,
      reports: syncedResults,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// CITIZEN CREDIBILITY & CIVIC CREDITS ENDPOINTS
// ============================================================================

// GET /api/citizen/credits - Fetch citizen credit balance & debit/credit ledger
router.get("/citizen/credits", (req, res) => {
  try {
    const phone = req.query.phone || "+91-9820012345";
    const profile = getCitizenProfile(phone);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/citizen/review-complaint - Admin verifies genuine complaint (+25) or downvotes false report (-40)
router.post("/citizen/review-complaint", (req, res) => {
  try {
    const { report_id, action, reviewer_name, reason, phone } = req.body;
    const rPhone = phone || "+91-9820012345";

    if (action === "verify") {
      const result = rewardVerifiedComplaint(rPhone, report_id, reviewer_name || "Ward Junior Engineer");
      // Update report status in activeReports
      for (const r of activeReports) {
        if (String(r.report_id) === String(report_id)) {
          r.status = "verified_genuine";
          r.admin_reviewed = true;
        }
      }
      return res.json({
        success: true,
        message: `Complaint #${report_id} verified as genuine! +25 Civic Credits awarded to citizen.`,
        ...result,
      });
    } else if (action === "false" || action === "downvote") {
      const result = downvoteFalseComplaint(rPhone, report_id, reviewer_name || "Ward Junior Engineer", reason || "False / Unverified claim");
      // Update report status in activeReports
      for (const r of activeReports) {
        if (String(r.report_id) === String(report_id)) {
          r.status = "flagged_false";
          r.admin_reviewed = true;
        }
      }
      return res.json({
        success: true,
        message: `Complaint #${report_id} detected as false report. -40 Credits debited and citizen credibility decreased.`,
        ...result,
      });
    }

    res.status(400).json({ success: false, error: "Action must be 'verify' or 'false'" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/citizen/driver-grievance - Citizen logs grievance against tanker driver
router.post("/citizen/driver-grievance", (req, res) => {
  try {
    const { tanker_id, citizen_phone, issue_type, notes } = req.body;
    const tId = tanker_id || "T-08";
    const result = recordDriverInfraction(
      tId,
      "CUSTOMER_GRIEVANCE",
      notes || issue_type || "Customer grievance filed via Citizen App (Poor service / diversion)"
    );

    res.json({
      success: true,
      message: `Grievance registered against Tanker ${tId}. Driver integrity docked by 30 Credits.`,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// DRIVER & TANKER INTEGRITY ENDPOINTS
// ============================================================================

// GET /api/driver/integrity - Fetch all driver integrity scores or specific tanker
router.get("/driver/integrity", (req, res) => {
  try {
    const { tanker_id } = req.query;
    if (tanker_id) {
      const driver = getDriverProfile(tanker_id);
      return res.json({ success: true, driver });
    }
    const drivers = getAllDrivers();
    res.json({ success: true, drivers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/driver/infraction - Record route diversion, GPS cut, customer grievance, or illegal water sale
router.post("/driver/infraction", (req, res) => {
  try {
    const { tanker_id, infraction_type, details } = req.body;
    const tId = tanker_id || "T-08";
    const result = recordDriverInfraction(tId, infraction_type || "ROUTE_DIVERSION", details);
    res.json({
      success: true,
      message: `Infraction ${infraction_type} recorded against Tanker ${tId}.`,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/driver/reward - Reward on-time delivery or praise
router.post("/driver/reward", (req, res) => {
  try {
    const { tanker_id, reward_type, details } = req.body;
    const tId = tanker_id || "T-08";
    const result = recordDriverReward(tId, reward_type || "ON_TIME_DELIVERY", details);
    res.json({
      success: true,
      message: `Reward applied to Tanker ${tId}.`,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/driver/blacklist - Manually blacklist or restore tanker plate contract
router.post("/driver/blacklist", (req, res) => {
  try {
    const { tanker_id, should_blacklist, reason } = req.body;
    const tId = tanker_id || "T-08";
    const driver = setTankerBlacklist(tId, should_blacklist !== false, reason);
    res.json({
      success: true,
      message: driver.is_blacklisted
        ? `Tanker ${driver.transponder_id} (${driver.plate}) has been BLACKLISTED. Contract revoked.`
        : `Tanker ${driver.transponder_id} (${driver.plate}) contract has been RESTORED.`,
      driver,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;


