/**
 * WaterFlow OS — Field Sync & Offline Operations API
 * Idempotent synchronization, durable action queue, conflict detection
 *
 * Mode: DEMO / OPERATIONAL SIMULATION
 */

// =============================================================================
// IN-MEMORY STORES (demo mode — document restart/persistence limitations)
// =============================================================================
// NOTE: These stores are in-memory. All data is lost on server restart.
// For production use, replace with PostgreSQL-backed persistence.

const PROCESSED_OPERATIONS = new Map(); // operation_id → { result, processed_at }
const MISSION_VERSIONS = new Map();     // mission_id → { version, status, updated_at, ... }
const SYNC_LOG = [];                     // Audit trail of all sync attempts

const dbAdapters = require("./db_adapters.js");

// Initialize demo missions (authoritative mission registry)
const DELIVERY_VERIFIED_CALLBACKS = [];

function registerDeliveryVerifiedCallback(cb) {
  if (typeof cb === "function") {
    DELIVERY_VERIFIED_CALLBACKS.push(cb);
  }
}

async function getMission(idStr) {
  if (dbAdapters.getAllMissions) {
    const allDb = await dbAdapters.getAllMissions();
    if (allDb) {
       const found = allDb.find(m => m.id === idStr);
       if (found) {
          const base = MISSION_VERSIONS.get(idStr) || {};
          return { ...base, ...found };
       }
    }
  }
  return MISSION_VERSIONS.get(idStr);
}

function initDemoMissions() {
  if (MISSION_VERSIONS.size === 0) {
    MISSION_VERSIONS.set("501", {
      id: "501",
      mission_id: "501",
      version: 1,
      status: "en_route",
      delivery_status: "en_route",
      tanker_id: "T-08",
      license_plate: "MH-03-BW-7821",
      driver_name: "Rajesh Patil",
      driver_phone: "+91-9820155432",
      assigned_worker: "Rajesh Patil",
      destination_ward: "Ward M/East (Govandi)",
      destination_address: "Shivaji Nagar Community Supply Point, Sector 4, Govandi, Mumbai 400043",
      ward_code: "M/E",
      lat: 19.0550,
      lng: 72.9180,
      volume_liters: 10000,
      target_liters: 10000,
      citizen_phone: "+91-9820012345",
      otp_code: "7419",
      eta_minutes: 14,
      depot_name: "Trombay High Level Reservoir",
      verification_state: "UNVERIFIED",
      verification_status: "UNVERIFIED",
      audit_trace: [],
      created_at: new Date(Date.now() - 20 * 60000).toISOString(),
      updated_at: new Date(Date.now() - 20 * 60000).toISOString(),
      completed_at: null,
      cancelled: false,
      reassigned: false,
    });
    MISSION_VERSIONS.set("502", {
      id: "502",
      mission_id: "502",
      version: 1,
      status: "en_route",
      delivery_status: "en_route",
      tanker_id: "T-14",
      license_plate: "MH-01-CV-4921",
      driver_name: "Tanmay Menon",
      driver_phone: "+91-9820388910",
      assigned_worker: "Tanmay Menon",
      destination_ward: "Ward L (Kurla)",
      destination_address: "Asalpha Hillside Booster Point, Kurla West, Mumbai 400072",
      ward_code: "L",
      lat: 19.0720,
      lng: 72.8820,
      volume_liters: 8000,
      target_liters: 8000,
      citizen_phone: "+91-9811223344",
      otp_code: "3892",
      eta_minutes: 22,
      depot_name: "Veravali High Reservoir Depot",
      verification_state: "UNVERIFIED",
      verification_status: "UNVERIFIED",
      audit_trace: [],
      created_at: new Date(Date.now() - 12 * 60000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 60000).toISOString(),
      completed_at: null,
      cancelled: false,
      reassigned: false,
    });
  }
}

/**
 * Creates and registers a new dynamic dispatch mission.
 */
function createMission(details = {}) {
  const missionId = details.mission_id ? String(details.mission_id) : String(500 + MISSION_VERSIONS.size + 1);
  const volume = Number(details.target_liters || details.volume_liters || 10000);
  const now = new Date().toISOString();

  const mission = {
    id: missionId,
    mission_id: missionId,
    version: 1,
    status: details.status || "en_route",
    delivery_status: details.delivery_status || details.status || "en_route",
    tanker_id: details.tanker_id || "T-01",
    license_plate: details.license_plate || `MH-02-${details.tanker_id || "T-01"}-1024`,
    driver_name: details.driver_name || details.assigned_worker || "Municipal Fleet Driver",
    driver_phone: details.driver_phone || "+91-9820099999",
    assigned_worker: details.assigned_worker || details.driver_name || "Municipal Fleet Driver",
    destination_ward: details.destination_ward || `Ward ${details.ward_code || "M/E"}`,
    destination_address: details.destination_address || `Municipal Relief Standpost (${details.ward_code || "M/E"})`,
    ward_code: details.ward_code || "M/E",
    lat: Number(details.lat !== undefined ? details.lat : 19.0550),
    lng: Number(details.lng !== undefined ? details.lng : 72.9180),
    volume_liters: volume,
    target_liters: volume,
    citizen_phone: details.citizen_phone || "+91-9820012345",
    otp_code: details.otp_code || String(Math.floor(1000 + Math.random() * 9000)),
    eta_minutes: details.eta_minutes !== undefined ? Number(details.eta_minutes) : 18,
    depot_name: details.depot_name || "Bhandup Complex Mega-Hub",
    verification_state: "UNVERIFIED",
    verification_status: "UNVERIFIED",
    audit_trace: [
      {
        trace_id: `trace-dispatch-${Date.now().toString(36)}`,
        action_type: "DISPATCHED",
        version_before: 0,
        version_after: 1,
        server_timestamp: now,
        worker_identity: details.assigned_worker || details.driver_name || "Municipal Fleet Driver",
        status: "en_route",
        verification_state: "UNVERIFIED",
        details: {
          requested_by: details.requested_by || "Central Command Operator",
          depot: details.depot_name || "Bhandup Complex Mega-Hub",
        },
      },
    ],
    created_at: now,
    updated_at: now,
    completed_at: null,
    cancelled: false,
    reassigned: false,
    governance_decision_id: details.governance_decision_id || null,
  };

  MISSION_VERSIONS.set(missionId, mission);
  return mission;
}

/**
 * Authoritatively verifies a completed delivery using citizen OTP and quantity envelope check.
 * Transitions mission from PENDING_VERIFICATION to VERIFIED and invokes operational feedback.
 */
function verifyMissionDelivery(missionId, options = {}) {
  const idStr = String(missionId);
  const mission = MISSION_VERSIONS.get(idStr);
  if (!mission) {
    const err = new Error(`Mission ${idStr} not found on server`);
    err.statusCode = 404;
    throw err;
  }

  if (mission.cancelled) {
    const err = new Error(`Mission ${idStr} was CANCELLED on the server. Cannot verify cancelled mission.`);
    err.statusCode = 409;
    throw err;
  }

  // Idempotency / conflict check
  if (mission.verification_state === "VERIFIED" || mission.status === "VERIFIED") {
    const conflictErr = new Error(`Mission ${idStr} is already in state VERIFIED`);
    conflictErr.statusCode = 409;
    throw conflictErr;
  }

  // Must be in a deliverable/delivered transit status
  const verifiableStatuses = ["delivered", "arrived", "dispensing", "en_route"];
  if (!verifiableStatuses.includes(mission.status)) {
    const err = new Error(`Cannot verify mission in status '${mission.status}'.`);
    err.statusCode = 400;
    throw err;
  }

  // 1. OTP Validation
  const inputOtp = String(options.otp_code || options.otp || "").trim();
  const storedOtp = String(mission.otp_code || "").trim();
  if (!inputOtp || inputOtp !== storedOtp) {
    const otpErr = new Error(`Invalid citizen verification code: Input '${inputOtp}' does not match registered handover OTP.`);
    otpErr.statusCode = 403;
    throw otpErr;
  }

  // 2. Quantity Validation
  const maxAllowable = (mission.volume_liters || mission.target_liters || 10000) * 1.5;
  const qty = Number(
    options.quantity_liters !== undefined
      ? options.quantity_liters
      : options.delivered_liters !== undefined
      ? options.delivered_liters
      : mission.delivery_quantity_liters || mission.volume_liters || 10000
  );
  if (isNaN(qty) || qty <= 0) {
    const qtyErr = new Error("Invalid delivery quantity: quantity must be a positive number.");
    qtyErr.statusCode = 400;
    throw qtyErr;
  }
  if (qty > maxAllowable) {
    const qtyErr = new Error(`Invalid delivery quantity: ${qty}L exceeds vehicle capacity envelope (${maxAllowable}L).`);
    qtyErr.statusCode = 400;
    throw qtyErr;
  }

  const prevVersion = mission.version;
  mission.version++;
  mission.status = "VERIFIED";
  mission.delivery_status = "Delivered";
  mission.verification_state = "VERIFIED";
  mission.verification_status = "VERIFIED";
  mission.delivery_quantity_liters = qty;
  mission.verified_at = new Date().toISOString();
  mission.completed_at = mission.verified_at;
  mission.verified_by = options.verified_by || options.officer_id || "MUNICIPAL_VERIFICATION_OFFICER";
  mission.updated_at = new Date().toISOString();

  const traceRecord = {
    trace_id: `trace-verif-${Date.now().toString(36)}`,
    action_type: "DELIVERY_VERIFIED",
    version_before: prevVersion,
    version_after: mission.version,
    server_timestamp: mission.verified_at,
    worker_identity: mission.assigned_worker,
    status: "VERIFIED",
    verification_state: "VERIFIED",
    quantity: qty,
    verified_by: mission.verified_by,
    otp_authenticated: true,
  };
  mission.audit_trace = mission.audit_trace || [];
  mission.audit_trace.push(traceRecord);

  // Digital Delivery Receipt ID (hex-encoded trace identifier, not a cryptographic hash)
  const txHash = `0x${Buffer.from(traceRecord.trace_id).toString("hex").slice(0, 32)}`;
  const callbackData = {
    mission_id: idStr,
    ward_code: mission.ward_code,
    quantity_delivered_liters: qty,
    verified_at: mission.verified_at,
    authorized_by: options.officer_id || mission.verified_by,
    transaction_hash: txHash,
    receipt_reference: txHash,
    digital_delivery_receipt_id: txHash,
    mission,
    trace: traceRecord,
  };

  const callbackResults = [];
  for (const cb of DELIVERY_VERIFIED_CALLBACKS) {
    try {
      const res = cb(callbackData, mission);
      if (res) callbackResults.push(res);
    } catch (cbErr) {
      console.error(`Error in delivery verified callback: ${cbErr.message}`);
    }
  }

  const postActionEffect = callbackResults[0] || null;
  mission.post_action_effect = postActionEffect;

  return {
    success: true,
    mission_id: idStr,
    new_mission_version: mission.version,
    verification_state: "VERIFIED",
    status: "VERIFIED",
    mission: { ...mission, post_action_effect: postActionEffect },
    transaction_hash: txHash,
    receipt_reference: txHash,
    digital_delivery_receipt_id: txHash,
    volume_delivered: qty,
    verified_at: mission.verified_at,
    verified_by: mission.verified_by,
    audit_trace_id: traceRecord.trace_id,
    closed_loop_feedback: postActionEffect,
    post_action_effect: postActionEffect,
  };
}

async function verifyMissionDeliveryAsync(missionId, options = {}) {
  const result = verifyMissionDelivery(missionId, options);
  
  if (result.success) {
    const qty = result.volume_delivered;
    const mission = result.mission;
    const opId = options.operation_id || `verify-${missionId}-${Date.now()}`;
    const success = await dbAdapters.executeVerificationTransaction(
      missionId, qty, mission.ward_code, mission.tanker_id, opId, 
      { qty, officer_id: mission.verified_by, otp_authenticated: true }
    );
    if (!success) {
      const duplicateErr = new Error(`Mission ${missionId} verification already processed in DB`);
      duplicateErr.statusCode = 409;
      throw duplicateErr;
    }
  }
  return result;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

function mountFieldSyncRoutes(app) {
  initDemoMissions();

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/field/missions — Get missions for a worker (for offline caching)
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/field/missions", async (req, res) => {
    const { worker_id, tanker_id } = req.query;

    let allMissions = [];
    if (dbAdapters.getAllMissions) {
        const dbMissions = await dbAdapters.getAllMissions();
        if (dbMissions) allMissions = dbMissions;
    }

    if (allMissions.length === 0) {
      allMissions = Array.from(MISSION_VERSIONS.values());
    }

    const missions = [];
    for (const mission of allMissions) {
      if (tanker_id && mission.tanker_id !== tanker_id) continue;
      const full = await getMission(mission.id || mission.mission_id);
      if (full) missions.push({ ...full });
    }

    res.json({
      success: true,
      missions,
      server_timestamp: new Date().toISOString(),
      mode: "OPERATIONAL",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/field/missions/:id — Get a specific mission with version info
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/field/missions/:id", async (req, res) => {
    const mission = await getMission(req.params.id);
    if (!mission) {
      return res.status(404).json({ success: false, error: `Mission ${req.params.id} not found` });
    }
    res.json({
      success: true,
      mission: { ...mission },
      server_timestamp: new Date().toISOString(),
      mode: "OPERATIONAL",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/field/sync — Sync operations (from driver client/app)
  // ─────────────────────────────────────────────────────────────────────────
  app.post("/api/field/sync", async (req, res) => {
    const { operations } = req.body;

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({
        success: false,
        error: "operations array is required and must not be empty",
      });
    }

    const results = [];
    let accepted = 0;
    let rejected = 0;
    let duplicate = 0;

    for (const op of operations) {
      const opResult = await processOperationAsync(op);
      results.push(opResult);

      if (opResult.status === "ACCEPTED") accepted++;
      else if (opResult.status === "DUPLICATE") duplicate++;
      else rejected++;
    }

    // Log the sync attempt
    SYNC_LOG.push({
      sync_id: `sync-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      operations_received: operations.length,
      accepted,
      rejected,
      duplicate,
      client_info: req.headers["user-agent"] || "unknown",
    });

    res.json({
      success: true,
      results,
      summary: {
        total: operations.length,
        accepted,
        rejected,
        duplicate,
      },
      server_timestamp: new Date().toISOString(),
      mode: "OPERATIONAL",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/field/sync/log — Audit trail of sync operations
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/field/sync/log", (req, res) => {
    res.json({
      success: true,
      sync_log: SYNC_LOG.slice(-50).reverse(),
      processed_operations: PROCESSED_OPERATIONS.size,
      mode: "DEMO / OPERATIONAL SIMULATION",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/field/missions/:id/audit-trace — Specific mission audit trace
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/field/missions/:id/audit-trace", (req, res) => {
    const mission = MISSION_VERSIONS.get(req.params.id);
    if (!mission) {
      return res.status(404).json({ success: false, error: `Mission ${req.params.id} not found` });
    }
    res.json({
      success: true,
      mission_id: req.params.id,
      current_version: mission.version,
      verification_state: mission.verification_state || "UNVERIFIED",
      audit_trace: mission.audit_trace || [],
      server_timestamp: new Date().toISOString(),
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/field/missions/:id/verify — Authoritative delivery verification
  // ─────────────────────────────────────────────────────────────────────────
  app.post("/api/field/missions/:id/verify", async (req, res) => {
    try {
      const result = await verifyMissionDeliveryAsync(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      const statusCode = err.statusCode || (err.message.includes("not found") ? 404 : 400);
      res.status(statusCode).json({
        success: false,
        error: err.message,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/field/dispatch — Create and register dynamic field dispatch
  // ─────────────────────────────────────────────────────────────────────────
  app.post("/api/field/dispatch", (req, res) => {
    try {
      const mission = createMission(req.body);
      res.status(201).json({
        success: true,
        message: `Mission #${mission.mission_id} dispatched to ${mission.destination_ward}`,
        mission,
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });
}

// =============================================================================
// OPERATION PROCESSING
// =============================================================================

/**
 * Process a single offline operation.
 * Implements idempotency, version checking, and conflict detection.
 *
 * Each operation must include:
 *   - operation_id: globally unique ID (UUID recommended)
 *   - mission_id: target mission
 *   - action_type: "STATUS_UPDATE" | "DELIVERY_RECORD" | "ARRIVAL_RECORD" | "NOTES"
 *   - local_timestamp: client-side timestamp
 *   - mission_version: client's last known mission version
 *   - payload: action-specific data
 */
function processOperation(op) {
  // 1. Validate required fields
  if (!op.operation_id) {
    return { operation_id: null, status: "REJECTED", reason: "Missing operation_id" };
  }
  if (!op.mission_id) {
    return { operation_id: op.operation_id, status: "REJECTED", reason: "Missing mission_id" };
  }
  if (!op.action_type) {
    return { operation_id: op.operation_id, status: "REJECTED", reason: "Missing action_type" };
  }

  // 2. Idempotency check: if this operation was already processed, return previous result
  if (PROCESSED_OPERATIONS.has(op.operation_id)) {
    const prev = PROCESSED_OPERATIONS.get(op.operation_id);
    return {
      operation_id: op.operation_id,
      status: "DUPLICATE",
      reason: `Operation already processed at ${prev.processed_at}`,
      original_result: prev.result,
    };
  }

  // 3. Find the mission
  const missionId = String(op.mission_id);
  const mission = MISSION_VERSIONS.get(missionId);
  if (!mission) {
    const result = { operation_id: op.operation_id, status: "REJECTED", reason: `Mission ${missionId} not found` };
    PROCESSED_OPERATIONS.set(op.operation_id, { result: "REJECTED", processed_at: new Date().toISOString() });
    return result;
  }

  // 4. Check if mission has been cancelled or reassigned
  if (mission.cancelled) {
    const result = {
      operation_id: op.operation_id,
      status: "REJECTED",
      reason: `Mission ${missionId} has been CANCELLED on the server. Offline action cannot overwrite.`,
      conflict_type: "MISSION_CANCELLED",
    };
    PROCESSED_OPERATIONS.set(op.operation_id, { result: "REJECTED_CANCELLED", processed_at: new Date().toISOString() });
    return result;
  }
  if (mission.reassigned) {
    const result = {
      operation_id: op.operation_id,
      status: "REJECTED",
      reason: `Mission ${missionId} has been REASSIGNED on the server. Offline action cannot overwrite.`,
      conflict_type: "MISSION_REASSIGNED",
    };
    PROCESSED_OPERATIONS.set(op.operation_id, { result: "REJECTED_REASSIGNED", processed_at: new Date().toISOString() });
    return result;
  }

  // 5. Version conflict check
  const clientVersion = op.mission_version || 0;
  if (clientVersion < mission.version) {
    // Stale version — determine if conflict is safety-relevant
    const safetyRelevantActions = ["DELIVERY_RECORD", "RECORD_DELIVERY", "STATUS_UPDATE"];
    if (safetyRelevantActions.includes(op.action_type)) {
      const result = {
        operation_id: op.operation_id,
        status: "REJECTED",
        reason: `Version conflict: client version ${clientVersion} < server version ${mission.version}. ` +
          `Safety-relevant action "${op.action_type}" requires manual review.`,
        conflict_type: "STALE_VERSION",
        server_version: mission.version,
        requires_manual_review: true,
      };
      PROCESSED_OPERATIONS.set(op.operation_id, { result: "REJECTED_STALE", processed_at: new Date().toISOString() });
      return result;
    }
    // Non-safety actions (NOTES) can proceed with stale version
  }

  // 6. Check for worker authorization (a worker cannot modify another worker's mission)
  if (op.worker_name && mission.assigned_worker && op.worker_name !== mission.assigned_worker) {
    const result = {
      operation_id: op.operation_id,
      status: "REJECTED",
      reason: `Worker authorization failed: mission ${missionId} is assigned to "${mission.assigned_worker}", received action from "${op.worker_name}".`,
      conflict_type: "UNAUTHORIZED_WORKER",
    };
    PROCESSED_OPERATIONS.set(op.operation_id, { result: "REJECTED_UNAUTHORIZED", processed_at: new Date().toISOString() });
    return result;
  }

  // 7. Check for authorization — offline mode cannot grant new authorization (Tier 2 or Tier 3)
  const forbiddenOfflineActions = [
    "AUTHORIZE",
    "APPROVE_TIER2",
    "APPROVE_TIER3",
    "AUTHORIZE_TIER2",
    "AUTHORIZE_TIER3",
    "BYPASS_GOVERNANCE"
  ];
  if (forbiddenOfflineActions.includes(op.action_type)) {
    const result = {
      operation_id: op.operation_id,
      status: "REJECTED",
      reason: "Offline operations cannot grant Tier 2 or Tier 3 authorization. Authorization must be executed online by an authorized officer.",
      conflict_type: "OFFLINE_AUTH_DENIED",
    };
    PROCESSED_OPERATIONS.set(op.operation_id, { result: "REJECTED_AUTH", processed_at: new Date().toISOString() });
    return result;
  }

  // 7. Apply the action
  let applyResult;
  try {
    applyResult = applyAction(mission, op);
  } catch (err) {
    const result = {
      operation_id: op.operation_id,
      status: "REJECTED",
      reason: `Error applying action: ${err.message}`,
    };
    PROCESSED_OPERATIONS.set(op.operation_id, { result: "REJECTED_ERROR", processed_at: new Date().toISOString() });
    return result;
  }

  // 8. Mark operation as processed
  PROCESSED_OPERATIONS.set(op.operation_id, {
    result: "ACCEPTED",
    processed_at: new Date().toISOString(),
    mission_id: missionId,
    action_type: op.action_type,
  });

  return {
    operation_id: op.operation_id,
    status: "ACCEPTED",
    mission_id: missionId,
    new_mission_version: mission.version,
    applied: applyResult,
    server_timestamp: new Date().toISOString(),
  };
}

async function processOperationAsync(op) {
  // DB Check
  const isUnique = await dbAdapters.recordFieldOperation(op);
  if (!isUnique) {
    const prev = PROCESSED_OPERATIONS.get(op.operation_id) || { processed_at: new Date().toISOString(), result: "ACCEPTED" };
    return {
      operation_id: op.operation_id,
      status: "DUPLICATE",
      reason: `Operation already processed at ${prev.processed_at}`,
      original_result: prev.result,
    };
  }

  const res = processOperation(op);
  
  if (res.status === "ACCEPTED") {
    try {
      const mission = MISSION_VERSIONS.get(op.mission_id);
      if (mission) {
        await dbAdapters.saveMission(mission);
        if (mission.status === "en_route" || mission.status === "dispensing" || mission.status === "arrived") {
          await dbAdapters.updateTankerStatus(mission.tanker_id, mission.status, mission.ward_code, mission.target_liters || 10000, mission.eta_minutes);
        }
      }
    } catch (e) {
      console.error("DB save error in sync", e);
    }
  }
  return res;
}

/**
 * Apply an action to a mission. Mutates the mission in-place.
 */
function applyAction(mission, op) {
  const payload = op.payload || {};
  const prevVersion = mission.version;
  let applyDetails = {};

  switch (op.action_type) {
    case "STATUS_UPDATE": {
      const validStatuses = ["en_route", "arrived", "dispensing", "delivered"];
      if (!validStatuses.includes(payload.status)) {
        throw new Error(`Invalid status: ${payload.status}. Valid: ${validStatuses.join(", ")}`);
      }
      if (mission.status === "delivered" && payload.status !== "delivered") {
        throw new Error(`Invalid state transition: mission is already delivered, cannot transition backwards to ${payload.status}`);
      }
      const prevStatus = mission.status;
      mission.status = payload.status;
      mission.version++;
      mission.updated_at = new Date().toISOString();
      applyDetails = { previous_status: prevStatus, new_status: payload.status };
      break;
    }

    case "ARRIVAL_RECORD": {
      if (mission.status === "delivered") {
        throw new Error("Invalid state transition: mission is already delivered, cannot record arrival");
      }
      mission.status = "arrived";
      mission.arrival_timestamp = op.local_timestamp || new Date().toISOString();
      mission.arrival_gps = payload.gps || null;
      mission.version++;
      mission.updated_at = new Date().toISOString();
      applyDetails = { arrival_recorded: true };
      break;
    }

    case "RECORD_DELIVERY":
    case "DELIVERY_RECORD": {
      if (mission.status === "delivered" || mission.status === "VERIFIED") {
        throw new Error("Mission already delivered. Cannot record another delivery.");
      }
      const qty =
        payload.quantity_liters !== undefined
          ? Number(payload.quantity_liters)
          : payload.delivered_liters !== undefined
          ? Number(payload.delivered_liters)
          : mission.volume_liters || 10000;
      if (isNaN(qty) || qty <= 0) {
        throw new Error("Invalid delivery quantity: quantity must be a positive number");
      }
      if (qty > (mission.volume_liters || mission.target_liters || 10000) * 1.5) {
        throw new Error(`Invalid delivery quantity: ${qty}L exceeds maximum tanker capacity envelope`);
      }

      mission.status = "delivered";
      mission.delivery_status = "delivered";
      mission.delivery_timestamp = op.local_timestamp || new Date().toISOString();
      mission.delivery_quantity_liters = qty;
      mission.delivery_gps = payload.gps || null;
      mission.delivery_otp = payload.otp_code || payload.recipient_otp || null;
      mission.delivery_notes = payload.notes || payload.delivery_notes || null;
      // CRITICAL: Local delivery recording does NOT mark mission VERIFIED.
      // It sets verification_state to PENDING_VERIFICATION until civic OTP / authority verifies.
      mission.verification_state = "PENDING_VERIFICATION";
      mission.verification_status = "PENDING_VERIFICATION";
      mission.version++;
      mission.updated_at = new Date().toISOString();
      applyDetails = { delivery_recorded: true, quantity: mission.delivery_quantity_liters, verification_state: mission.verification_state };
      break;
    }

    case "NOTES": {
      mission.field_notes = mission.field_notes || [];
      mission.field_notes.push({
        note: payload.note || "",
        timestamp: op.local_timestamp || new Date().toISOString(),
        operation_id: op.operation_id,
      });
      mission.version++;
      mission.updated_at = new Date().toISOString();
      applyDetails = { note_added: true };
      break;
    }

    default:
      throw new Error(`Unknown action_type: ${op.action_type}`);
  }

  // Record into mission authoritative audit trace
  mission.audit_trace = mission.audit_trace || [];
  mission.audit_trace.push({
    trace_id: `trace-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    operation_id: op.operation_id,
    action_type: op.action_type,
    version_before: prevVersion,
    version_after: mission.version,
    server_timestamp: new Date().toISOString(),
    local_timestamp: op.local_timestamp || null,
    worker_identity: mission.assigned_worker,
    status: mission.status,
    verification_state: mission.verification_state || "UNVERIFIED",
  });

  return applyDetails;
}

// =============================================================================
// TEST HELPERS (for automated testing)
// =============================================================================

function resetFieldSyncState() {
  PROCESSED_OPERATIONS.clear();
  MISSION_VERSIONS.clear();
  SYNC_LOG.length = 0;
  initDemoMissions();
}

function cancelMission(missionId) {
  const mission = MISSION_VERSIONS.get(String(missionId));
  if (mission) {
    mission.cancelled = true;
    mission.version++;
    mission.updated_at = new Date().toISOString();
  }
}

function reassignMission(missionId) {
  const mission = MISSION_VERSIONS.get(String(missionId));
  if (mission) {
    mission.reassigned = true;
    mission.assigned_worker = "Reassigned Worker";
    mission.version++;
    mission.updated_at = new Date().toISOString();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  mountFieldSyncRoutes,
  PROCESSED_OPERATIONS,
  MISSION_VERSIONS,
  SYNC_LOG,
  processOperation,
  resetFieldSyncState,
  cancelMission,
  reassignMission,
  initDemoMissions,
  createMission,
  verifyMissionDelivery,
  registerDeliveryVerifiedCallback,
  DELIVERY_VERIFIED_CALLBACKS,
};
