/**
 * WaterFlow OS — Bounded Autonomy Engine
 * Policy executor with explicit allowlists, precondition checks,
 * state machine, and backend-enforced kill switch.
 *
 * Mode: DEMO / OPERATIONAL SIMULATION
 */

// =============================================================================
// AUTONOMY TIERS
// =============================================================================
// Tier 1 — Bounded automatic execution: Only allowlisted, low-risk, reversible demo actions
// Tier 2 — Supervised: Operator must approve
// Tier 3 — Critical: Executive authorization required. Never auto-execute.

// =============================================================================
// EXPLICIT TIER 1 ALLOWLIST
// =============================================================================

const TIER1_ALLOWLIST = [
  {
    action_type: "routine_dispatch",
    description: "Dispatch a single tanker ≤15,000 L to a standard ward with priority score ≤ 70",
    constraints: {
      max_volume_liters: 15000,
      max_priority_score: 70,
      require_tanker_available: true,
      require_depot_stock_sufficient: true,
    },
    reversible: true,
    reversal_mechanism: "Cancel dispatch and return tanker to depot",
  },
  {
    action_type: "route_optimization",
    description: "Re-optimize tanker route within ±500m of original corridor",
    constraints: {
      max_deviation_meters: 500,
    },
    reversible: true,
    reversal_mechanism: "Revert to original route",
  },
  {
    action_type: "complaint_clustering",
    description: "Deduplicate citizen complaints within 300m radius and 120-min window",
    constraints: {
      max_radius_meters: 300,
      max_window_minutes: 120,
    },
    reversible: true,
    reversal_mechanism: "Ungroup complaints and restore individual records",
  },
];

// =============================================================================
// AUTOMATION STATE
// =============================================================================

const automationState = {
  kill_switch_enabled: true,  // When TRUE, automation IS enabled (can execute)
  policy_version: "AUTONOMY-v1.0",
  last_updated: new Date().toISOString(),
  updated_by: "SYSTEM_INIT",
};

// =============================================================================
// EXECUTION STATE MACHINE
// =============================================================================
// States: PROPOSED → VALIDATING → GOVERNANCE_PENDING → AUTHORIZED → EXECUTING → EXECUTED
// Failure: REJECTED, BLOCKED, FAILED, REQUIRES_REVIEW

const VALID_TRANSITIONS = {
  PROPOSED: ["VALIDATING", "REJECTED", "BLOCKED"],
  VALIDATING: ["GOVERNANCE_PENDING", "AUTHORIZED", "EXECUTING", "REJECTED", "BLOCKED", "FAILED"],
  GOVERNANCE_PENDING: ["AUTHORIZED", "REJECTED", "BLOCKED"],
  AUTHORIZED: ["EXECUTING", "BLOCKED"],
  EXECUTING: ["EXECUTED", "FAILED"],
  // Terminal states
  EXECUTED: [],
  REJECTED: [],
  BLOCKED: [],
  FAILED: ["PROPOSED"], // Can retry from PROPOSED
  REQUIRES_REVIEW: [],
};

// In-memory execution store
const EXECUTION_RECORDS = [];
const PROCESSED_OPERATION_IDS = new Set();

// =============================================================================
// PRECONDITION CHECKER
// =============================================================================

/**
 * Validate all Tier 1 preconditions before automatic execution.
 * Returns { passed: boolean, results: [...], failed_reasons: [...] }
 */
function checkPreconditions(action) {
  const results = [];
  const failedReasons = [];

  // 1. Kill switch check
  const killSwitchOk = automationState.kill_switch_enabled === true;
  results.push({
    check: "kill_switch_enabled",
    passed: killSwitchOk,
    detail: killSwitchOk ? "Automation kill switch is ENABLED" : "Automation kill switch is DISABLED — all execution blocked",
  });
  if (!killSwitchOk) failedReasons.push("Kill switch is disabled");

  // 2. Policy allows action
  const allowlistEntry = TIER1_ALLOWLIST.find(a => a.action_type === action.action_type);
  const policyOk = !!allowlistEntry;
  results.push({
    check: "policy_allows_action",
    passed: policyOk,
    detail: policyOk ? `Action "${action.action_type}" is on the Tier 1 allowlist` : `Action "${action.action_type}" is NOT on the Tier 1 allowlist`,
  });
  if (!policyOk) failedReasons.push(`Action type "${action.action_type}" not in allowlist`);

  // 3. Inputs are valid
  const inputsValid = action.action_type && action.parameters && typeof action.parameters === "object";
  results.push({
    check: "inputs_valid",
    passed: inputsValid,
    detail: inputsValid ? "Action parameters are present and valid" : "Missing or invalid action parameters",
  });
  if (!inputsValid) failedReasons.push("Invalid action parameters");

  // 4. Inputs are fresh (not older than 5 minutes)
  const inputTimestamp = action.input_timestamp || action.timestamp;
  const inputAge = inputTimestamp ? (Date.now() - new Date(inputTimestamp).getTime()) : Infinity;
  const inputsFresh = inputAge < 5 * 60 * 1000; // 5 minutes
  results.push({
    check: "inputs_fresh",
    passed: inputsFresh,
    detail: inputsFresh
      ? `Input data is ${Math.round(inputAge / 1000)}s old (< 300s threshold)`
      : `Input data is ${Math.round(inputAge / 1000)}s old (> 300s threshold — STALE)`,
  });
  if (!inputsFresh) failedReasons.push("Input data is stale (> 5 minutes old)");

  // 5. Constraint-specific checks
  if (allowlistEntry && action.parameters) {
    const constraints = allowlistEntry.constraints;

    if (constraints.max_volume_liters && action.parameters.volume_liters) {
      const volOk = action.parameters.volume_liters <= constraints.max_volume_liters;
      results.push({
        check: "volume_within_limit",
        passed: volOk,
        detail: `Volume ${action.parameters.volume_liters}L ${volOk ? "≤" : ">"} limit ${constraints.max_volume_liters}L`,
      });
      if (!volOk) failedReasons.push(`Volume ${action.parameters.volume_liters}L exceeds limit ${constraints.max_volume_liters}L`);
    }

    if (constraints.max_priority_score && action.parameters.priority_score) {
      const prioOk = action.parameters.priority_score <= constraints.max_priority_score;
      results.push({
        check: "priority_score_within_limit",
        passed: prioOk,
        detail: `Priority ${action.parameters.priority_score} ${prioOk ? "≤" : ">"} limit ${constraints.max_priority_score}`,
      });
      if (!prioOk) failedReasons.push(`Priority score too high for autonomous execution`);
    }
  }

  // 6. No conflicting pending action
  const conflicting = EXECUTION_RECORDS.find(
    r => r.action_type === action.action_type &&
         r.parameters?.ward_code === action.parameters?.ward_code &&
         ["PROPOSED", "VALIDATING", "GOVERNANCE_PENDING", "AUTHORIZED", "EXECUTING"].includes(r.status)
  );
  const noConflict = !conflicting;
  results.push({
    check: "no_conflicting_action",
    passed: noConflict,
    detail: noConflict ? "No conflicting pending action found" : `Conflicting action ${conflicting?.execution_id} in status ${conflicting?.status}`,
  });
  if (!noConflict) failedReasons.push(`Conflicting action ${conflicting?.execution_id} already pending`);

  // 7. Operation not already executed (idempotency)
  const alreadyExecuted = action.operation_id && PROCESSED_OPERATION_IDS.has(action.operation_id);
  const notDuplicate = !alreadyExecuted;
  results.push({
    check: "not_already_executed",
    passed: notDuplicate,
    detail: notDuplicate ? "Operation ID has not been processed before" : `Operation ${action.operation_id} was already executed`,
  });
  if (!notDuplicate) failedReasons.push(`Duplicate operation ID: ${action.operation_id}`);

  // 8. Action is reversible
  const reversible = allowlistEntry ? allowlistEntry.reversible : false;
  results.push({
    check: "action_reversible",
    passed: reversible,
    detail: reversible ? `Action is reversible: ${allowlistEntry?.reversal_mechanism}` : "Action reversibility not confirmed",
  });
  if (!reversible) failedReasons.push("Action is not confirmed reversible");

  return {
    passed: failedReasons.length === 0,
    results,
    failed_reasons: failedReasons,
    checked_at: new Date().toISOString(),
  };
}

// =============================================================================
// EXECUTION ENGINE
// =============================================================================

/**
 * Create a new execution record in PROPOSED state.
 */
function createExecution(action) {
  const executionId = `exec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const record = {
    execution_id: executionId,
    operation_id: action.operation_id || `op-${Date.now().toString(36)}`,
    action_type: action.action_type,
    parameters: action.parameters || {},
    governance_tier: null,
    status: "PROPOSED",
    precondition_results: null,
    governance_decision_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    executed_at: null,
    failed_reason: null,
    audit_metadata: {
      policy_version: automationState.policy_version,
      kill_switch_state: automationState.kill_switch_enabled,
      input_timestamp: action.input_timestamp || action.timestamp || new Date().toISOString(),
    },
  };

  EXECUTION_RECORDS.push(record);
  return record;
}

/**
 * Transition an execution record to a new state.
 * Enforces valid state transitions.
 */
function transitionExecution(executionId, newStatus, metadata = {}) {
  const record = EXECUTION_RECORDS.find(r => r.execution_id === executionId);
  if (!record) return { error: `Execution ${executionId} not found` };

  const validNext = VALID_TRANSITIONS[record.status] || [];
  if (!validNext.includes(newStatus)) {
    return {
      error: `Invalid transition: ${record.status} → ${newStatus}. Valid transitions: ${validNext.join(", ") || "none (terminal state)"}`,
    };
  }

  record.status = newStatus;
  record.updated_at = new Date().toISOString();

  if (newStatus === "EXECUTED") {
    record.executed_at = new Date().toISOString();
    PROCESSED_OPERATION_IDS.add(record.operation_id);
  }

  if (metadata.failed_reason) record.failed_reason = metadata.failed_reason;
  if (metadata.governance_decision_id) record.governance_decision_id = metadata.governance_decision_id;
  if (metadata.governance_tier) record.governance_tier = metadata.governance_tier;
  if (metadata.precondition_results) record.precondition_results = metadata.precondition_results;

  return { success: true, record };
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

function mountAutonomyRoutes(app, GOVERNANCE_DECISIONS, GOVERNANCE_AUDIT_LOG) {

  // POST /api/automation/evaluate — Evaluate an action for autonomous execution
  app.post("/api/automation/evaluate", (req, res) => {
    const action = req.body;

    if (!action || !action.action_type) {
      return res.status(400).json({
        success: false,
        error: "action_type is required",
      });
    }

    // Classify governance tier
    const allowlistEntry = TIER1_ALLOWLIST.find(a => a.action_type === action.action_type);
    let tier;
    if (allowlistEntry) {
      tier = 1;
    } else {
      // Use existing governance classification logic
      const criticalTypes = ["hospital_preemption", "reserve_breach", "fleet_freeze", "emergency_rationing"];
      const reviewTypes = ["quota_variance", "quality_escrow", "gps_variance"];
      if (criticalTypes.includes(action.action_type)) tier = 3;
      else if (reviewTypes.includes(action.action_type)) tier = 2;
      else if (action.parameters?.volume_liters > 15000) tier = 2;
      else tier = 2; // Default to supervised for unknown types
    }

    // Check preconditions
    const preconditions = checkPreconditions(action);

    // Create execution record
    const execution = createExecution(action);
    execution.governance_tier = tier;

    // Transition to VALIDATING
    transitionExecution(execution.execution_id, "VALIDATING", {
      precondition_results: preconditions,
      governance_tier: tier,
    });

    // Determine next state
    if (!preconditions.passed) {
      // Preconditions failed — block
      transitionExecution(execution.execution_id, "BLOCKED", {
        failed_reason: `Preconditions failed: ${preconditions.failed_reasons.join("; ")}`,
      });

      return res.json({
        success: true,
        execution_id: execution.execution_id,
        operation_id: execution.operation_id,
        status: "BLOCKED",
        governance_tier: tier,
        preconditions,
        reason: `Preconditions failed: ${preconditions.failed_reasons.join("; ")}`,
        can_execute: false,
        mode: "DEMO / OPERATIONAL SIMULATION",
      });
    }

    if (tier >= 2) {
      // Requires governance approval
      let govDecisionId = null;

      if (GOVERNANCE_DECISIONS) {
        govDecisionId = `gov-auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

        GOVERNANCE_DECISIONS.push({
          decision_id: govDecisionId,
          decision_type: action.action_type,
          governance_tier: tier,
          status: tier === 3 ? "pending" : "pending_review",
          ward_code: action.parameters?.ward_code || "SYSTEM",
          volume_liters: action.parameters?.volume_liters || 0,
          tanker_id: action.parameters?.tanker_id || null,
          description: `🤖 AUTOMATION: ${action.action_type} — ${JSON.stringify(action.parameters || {})}. Tier ${tier} requires ${tier === 3 ? "executive authorization" : "operator approval"}.`,
          ai_recommendation: `Preconditions passed. ${tier === 3 ? "Awaiting executive PIN authorization." : "Awaiting operator review."}`,
          risk_level: tier === 3 ? "critical" : "medium",
          timestamp: new Date().toISOString(),
          authorized_by: null,
          justification: null,
          automation_source: true,
          execution_id: execution.execution_id,
        });
      }

      transitionExecution(execution.execution_id, "GOVERNANCE_PENDING", {
        governance_decision_id: govDecisionId,
      });

      return res.json({
        success: true,
        execution_id: execution.execution_id,
        operation_id: execution.operation_id,
        status: "GOVERNANCE_PENDING",
        governance_tier: tier,
        governance_decision_id: govDecisionId,
        preconditions,
        reason: `Tier ${tier} requires ${tier === 3 ? "executive authorization" : "operator approval"}`,
        can_execute: false,
        mode: "DEMO / OPERATIONAL SIMULATION",
      });
    }

    // Tier 1 with all preconditions passed — can auto-execute
    return res.json({
      success: true,
      execution_id: execution.execution_id,
      operation_id: execution.operation_id,
      status: "VALIDATING",
      governance_tier: 1,
      preconditions,
      can_execute: true,
      message: "Tier 1 action — all preconditions passed. Ready for execution.",
      mode: "DEMO / OPERATIONAL SIMULATION",
    });
  });

  // POST /api/automation/execute — Execute a validated Tier 1 action
  app.post("/api/automation/execute", (req, res) => {
    const { execution_id } = req.body;

    if (!execution_id) {
      return res.status(400).json({ success: false, error: "execution_id is required" });
    }

    const record = EXECUTION_RECORDS.find(r => r.execution_id === execution_id);
    if (!record) {
      return res.status(404).json({ success: false, error: `Execution ${execution_id} not found` });
    }

    // Check kill switch again at execution time
    if (!automationState.kill_switch_enabled) {
      transitionExecution(execution_id, "BLOCKED", {
        failed_reason: "Kill switch disabled at execution time",
      });
      return res.status(403).json({
        success: false,
        error: "Automation kill switch is disabled. No actions can be auto-executed.",
        execution_id,
        status: "BLOCKED",
      });
    }

    // Check if already executed (idempotency)
    if (record.status === "EXECUTED") {
      return res.json({
        success: true,
        execution_id,
        status: "EXECUTED",
        message: "Action was already executed. Duplicate request safely ignored.",
        executed_at: record.executed_at,
        idempotent: true,
      });
    }

    // Only VALIDATING or AUTHORIZED can proceed to EXECUTING
    if (record.status !== "VALIDATING" && record.status !== "AUTHORIZED") {
      return res.status(409).json({
        success: false,
        error: `Cannot execute from status "${record.status}". Must be VALIDATING (Tier 1) or AUTHORIZED (Tier 2/3).`,
        execution_id,
        current_status: record.status,
      });
    }

    // Tier 2/3 must be AUTHORIZED (not just VALIDATING)
    if (record.governance_tier >= 2 && record.status !== "AUTHORIZED") {
      return res.status(403).json({
        success: false,
        error: `Tier ${record.governance_tier} action requires authorization before execution. Current status: ${record.status}`,
        execution_id,
      });
    }

    // Re-check preconditions at execution time
    const recheck = checkPreconditions({
      action_type: record.action_type,
      parameters: record.parameters,
      operation_id: record.operation_id,
      input_timestamp: record.audit_metadata?.input_timestamp,
    });

    // For idempotency, the "already executed" check may fail — that's OK
    const criticalFailures = recheck.failed_reasons.filter(
      r => !r.includes("already executed")
    );

    if (criticalFailures.length > 0) {
      transitionExecution(execution_id, "BLOCKED", {
        failed_reason: `Re-check failed: ${criticalFailures.join("; ")}`,
      });
      return res.status(409).json({
        success: false,
        error: `Precondition re-check failed at execution time: ${criticalFailures.join("; ")}`,
        execution_id,
        status: "BLOCKED",
        preconditions: recheck,
      });
    }

    // Transition: VALIDATING/AUTHORIZED → EXECUTING → EXECUTED
    const t1 = transitionExecution(execution_id, "EXECUTING");
    if (t1.error) {
      return res.status(409).json({ success: false, error: t1.error });
    }

    // Simulate execution (demo mode)
    const t2 = transitionExecution(execution_id, "EXECUTED");
    if (t2.error) {
      transitionExecution(execution_id, "FAILED", { failed_reason: t2.error });
      return res.status(500).json({ success: false, error: t2.error });
    }

    // Log to audit
    if (GOVERNANCE_AUDIT_LOG) {
      GOVERNANCE_AUDIT_LOG.push({
        audit_id: `audit-auto-${Date.now().toString(36)}`,
        decision_id: record.governance_decision_id,
        execution_id: record.execution_id,
        action: "AUTO_EXECUTE",
        action_type: record.action_type,
        officer_id: "AUTOMATION_ENGINE",
        officer_name: "WaterFlow OS Automation",
        timestamp: new Date().toISOString(),
        governance_tier: record.governance_tier,
        policy_version: automationState.policy_version,
        precondition_results: recheck.results.map(r => `${r.check}: ${r.passed ? "PASS" : "FAIL"}`),
      });
    }

    return res.json({
      success: true,
      execution_id,
      operation_id: record.operation_id,
      status: "EXECUTED",
      executed_at: record.executed_at,
      governance_tier: record.governance_tier,
      action_type: record.action_type,
      audit_trace: {
        policy_version: automationState.policy_version,
        preconditions_passed: true,
        kill_switch_state: automationState.kill_switch_enabled,
      },
      mode: "DEMO / OPERATIONAL SIMULATION",
    });
  });

  // GET /api/automation/status — Get current automation state
  app.get("/api/automation/status", (req, res) => {
    const { execution_id } = req.query;

    if (execution_id) {
      const record = EXECUTION_RECORDS.find(r => r.execution_id === execution_id);
      if (!record) {
        return res.status(404).json({ success: false, error: `Execution ${execution_id} not found` });
      }
      return res.json({
        success: true,
        execution: record,
        automation_state: {
          kill_switch_enabled: automationState.kill_switch_enabled,
          policy_version: automationState.policy_version,
        },
      });
    }

    return res.json({
      success: true,
      automation_state: automationState,
      tier1_allowlist: TIER1_ALLOWLIST,
      execution_summary: {
        total: EXECUTION_RECORDS.length,
        proposed: EXECUTION_RECORDS.filter(r => r.status === "PROPOSED").length,
        validating: EXECUTION_RECORDS.filter(r => r.status === "VALIDATING").length,
        governance_pending: EXECUTION_RECORDS.filter(r => r.status === "GOVERNANCE_PENDING").length,
        executing: EXECUTION_RECORDS.filter(r => r.status === "EXECUTING").length,
        executed: EXECUTION_RECORDS.filter(r => r.status === "EXECUTED").length,
        blocked: EXECUTION_RECORDS.filter(r => r.status === "BLOCKED").length,
        failed: EXECUTION_RECORDS.filter(r => r.status === "FAILED").length,
        rejected: EXECUTION_RECORDS.filter(r => r.status === "REJECTED").length,
      },
      recent_executions: EXECUTION_RECORDS.slice(-10).reverse(),
      mode: "DEMO / OPERATIONAL SIMULATION",
    });
  });

  // POST /api/automation/kill-switch — Toggle automation enable/disable
  app.post("/api/automation/kill-switch", (req, res) => {
    const { enabled, officer_id, officer_name } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({ success: false, error: "enabled (boolean) is required" });
    }

    const previousState = automationState.kill_switch_enabled;
    automationState.kill_switch_enabled = enabled;
    automationState.last_updated = new Date().toISOString();
    automationState.updated_by = officer_name || officer_id || "UNKNOWN";

    // Log to audit
    if (GOVERNANCE_AUDIT_LOG) {
      GOVERNANCE_AUDIT_LOG.push({
        audit_id: `audit-killswitch-${Date.now().toString(36)}`,
        action: enabled ? "KILL_SWITCH_ENABLED" : "KILL_SWITCH_DISABLED",
        officer_id: officer_id || "UNKNOWN",
        officer_name: officer_name || "Unknown Officer",
        timestamp: new Date().toISOString(),
        previous_state: previousState,
        new_state: enabled,
        policy_version: automationState.policy_version,
      });
    }

    return res.json({
      success: true,
      kill_switch_enabled: enabled,
      previous_state: previousState,
      message: enabled
        ? "Automation ENABLED — Tier 1 actions may auto-execute when preconditions pass."
        : "Automation DISABLED — ALL autonomous execution is blocked. Pending actions remain visible.",
      mode: "DEMO / OPERATIONAL SIMULATION",
    });
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

function resetAutonomyState() {
  EXECUTION_RECORDS.length = 0;
  PROCESSED_OPERATION_IDS.clear();
  automationState.kill_switch_enabled = true;
}

module.exports = {
  resetAutonomyState,
  automationState,
  TIER1_ALLOWLIST,
  VALID_TRANSITIONS,
  EXECUTION_RECORDS,
  PROCESSED_OPERATION_IDS,
  checkPreconditions,
  createExecution,
  transitionExecution,
  mountAutonomyRoutes,
};
