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

// Initialize demo missions (linked to existing activeDispatches in mobile_api.js)
function initDemoMissions() {
  if (MISSION_VERSIONS.size === 0) {
    MISSION_VERSIONS.set("501", {
      mission_id: "501",
      version: 1,
      status: "en_route",
      tanker_id: "T-08",
      ward_code: "M/E",
      volume_liters: 10000,
      assigned_worker: "Rajesh Patil",
      created_at: new Date(Date.now() - 20 * 60000).toISOString(),
      updated_at: new Date(Date.now() - 20 * 60000).toISOString(),
      cancelled: false,
      reassigned: false,
    });
    MISSION_VERSIONS.set("502", {
      mission_id: "502",
      version: 1,
      status: "en_route",
      tanker_id: "T-14",
      ward_code: "L",
      volume_liters: 8000,
      assigned_worker: "Tanmay Menon",
      created_at: new Date(Date.now() - 12 * 60000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 60000).toISOString(),
      cancelled: false,
      reassigned: false,
    });
  }
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

function mountFieldSyncRoutes(app) {
  initDemoMissions();

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/field/missions — Get missions for a worker (for offline caching)
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/field/missions", (req, res) => {
    const { worker_id, tanker_id } = req.query;

    const missions = [];
    for (const [, mission] of MISSION_VERSIONS) {
      if (tanker_id && mission.tanker_id !== tanker_id) continue;
      missions.push({ ...mission });
    }

    res.json({
      success: true,
      missions,
      server_timestamp: new Date().toISOString(),
      mode: "DEMO / OPERATIONAL SIMULATION",
      persistence_note: "In-memory store. Data does not survive server restart.",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/field/missions/:id — Get a specific mission with version info
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/field/missions/:id", (req, res) => {
    const mission = MISSION_VERSIONS.get(req.params.id);
    if (!mission) {
      return res.status(404).json({ success: false, error: `Mission ${req.params.id} not found` });
    }
    res.json({
      success: true,
      mission: { ...mission },
      server_timestamp: new Date().toISOString(),
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/field/sync — Idempotent synchronization endpoint
  // Accepts a batch of offline actions from the field worker.
  // Each action must have a globally unique operation_id.
  // ─────────────────────────────────────────────────────────────────────────
  app.post("/api/field/sync", (req, res) => {
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
      const opResult = processOperation(op);
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
      mode: "DEMO / OPERATIONAL SIMULATION",
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
    const safetyRelevantActions = ["DELIVERY_RECORD", "STATUS_UPDATE"];
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

  // 6. Check for authorization — offline mode cannot grant new authorization
  if (op.action_type === "AUTHORIZE" || op.action_type === "APPROVE_TIER3") {
    const result = {
      operation_id: op.operation_id,
      status: "REJECTED",
      reason: "Offline operations cannot grant Tier 3 or higher authorization. Authorization must be done online.",
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

/**
 * Apply an action to a mission. Mutates the mission in-place.
 */
function applyAction(mission, op) {
  const payload = op.payload || {};

  switch (op.action_type) {
    case "STATUS_UPDATE": {
      const validStatuses = ["en_route", "arrived", "dispensing", "delivered"];
      if (!validStatuses.includes(payload.status)) {
        throw new Error(`Invalid status: ${payload.status}. Valid: ${validStatuses.join(", ")}`);
      }
      const prevStatus = mission.status;
      mission.status = payload.status;
      mission.version++;
      mission.updated_at = new Date().toISOString();
      return { previous_status: prevStatus, new_status: payload.status };
    }

    case "ARRIVAL_RECORD": {
      mission.status = "arrived";
      mission.arrival_timestamp = op.local_timestamp || new Date().toISOString();
      mission.arrival_gps = payload.gps || null;
      mission.version++;
      mission.updated_at = new Date().toISOString();
      return { arrival_recorded: true };
    }

    case "DELIVERY_RECORD": {
      if (mission.status === "delivered") {
        throw new Error("Mission already delivered. Cannot record another delivery.");
      }
      mission.status = "delivered";
      mission.delivery_timestamp = op.local_timestamp || new Date().toISOString();
      mission.delivery_quantity_liters = payload.quantity_liters || mission.volume_liters;
      mission.delivery_gps = payload.gps || null;
      mission.delivery_otp = payload.otp_code || null;
      mission.delivery_notes = payload.notes || null;
      mission.version++;
      mission.updated_at = new Date().toISOString();
      return { delivery_recorded: true, quantity: mission.delivery_quantity_liters };
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
      return { note_added: true };
    }

    default:
      throw new Error(`Unknown action_type: ${op.action_type}`);
  }
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
};
