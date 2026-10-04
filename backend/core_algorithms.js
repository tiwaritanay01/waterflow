/**
 * WaterFlow OS — Core Algorithms Module
 * Pure, deterministic, independently testable business logic.
 *
 * AUTHORITATIVE implementations of:
 * - Priority scoring
 * - Constrained allocation
 * - Governance tier classification
 * - Input validation
 * - Error model
 *
 * Mode: DEMO / OPERATIONAL SIMULATION
 * Policy Version: 2.4.0-hardened
 */

// =============================================================================
// CANONICAL CONSTANTS
// =============================================================================

const WEIGHT_VULNERABILITY = 0.30;
const WEIGHT_DRY_PIPE = 0.25;
const WEIGHT_POPULATION = 0.20;
const WEIGHT_HISTORICAL_DEFICIT = 0.15;
const WEIGHT_DEPOT_DISTANCE = 0.10;

const MAX_DRY_PIPE_HOURS = 72.0;
const MAX_POPULATION = 1000000.0;
const MAX_DEPOT_DISTANCE_KM = 20.0;

const POLICY_WEIGHTS = {
  vulnerability: WEIGHT_VULNERABILITY,
  dry_pipe: WEIGHT_DRY_PIPE,
  population: WEIGHT_POPULATION,
  historical_deficit: WEIGHT_HISTORICAL_DEFICIT,
  depot_distance: WEIGHT_DEPOT_DISTANCE,
};

const CANONICAL_PROVENANCE_CLASSES = [
  "REAL_OBSERVATION",
  "REFERENCE_DATA",
  "DERIVED",
  "REFERENCE_CONSTANT",
  "LEGAL_RULE",
  "SYNTHETIC_SEEDED",
  "ENGINEERING_ASSUMPTION",
  "SCENARIO_PARAMETER",
  "DOCUMENTED_ONLY",
];

// Valid mission statuses for state machine
const MISSION_STATUSES = [
  "en_route", "arrived", "dispensing", "delivered",
  "PENDING_VERIFICATION", "VERIFIED",
];

// Valid state transitions for missions
const VALID_MISSION_TRANSITIONS = {
  en_route: ["arrived", "dispensing", "delivered"],
  arrived: ["dispensing", "delivered"],
  dispensing: ["delivered"],
  delivered: ["PENDING_VERIFICATION"],
  PENDING_VERIFICATION: ["VERIFIED"],
  VERIFIED: [], // Terminal
};

// Governance tier thresholds
const TIER_THRESHOLDS = {
  TIER_1_CRITICAL: 75.0,
  TIER_2_ELEVATED: 55.0,
  TIER_3_MODERATE: 35.0,
  TIER_4_NOMINAL: 0.0,
};

// Standard error codes
const ERROR_CODES = {
  NO_AVAILABLE_TANKER: "NO_AVAILABLE_TANKER",
  INVALID_WARD: "INVALID_WARD",
  SUPPLY_LIMIT: "SUPPLY_LIMIT",
  QUALITY_LOCKOUT: "QUALITY_LOCKOUT",
  RESERVE_PROTECTION: "RESERVE_PROTECTION",
  STALE_VERSION: "STALE_VERSION",
  UNAUTHORIZED_TIER3: "UNAUTHORIZED_TIER3",
  KILL_SWITCH_ACTIVE: "KILL_SWITCH_ACTIVE",
  NO_VALID_ROUTE: "NO_VALID_ROUTE",
  INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION",
  DUPLICATE_OPERATION: "DUPLICATE_OPERATION",
  CONFLICT: "CONFLICT",
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_VOLUME: "INVALID_VOLUME",
  INVALID_WARD_CODE: "INVALID_WARD_CODE",
  MISSION_CANCELLED: "MISSION_CANCELLED",
  MISSION_NOT_FOUND: "MISSION_NOT_FOUND",
  INVALID_OTP: "INVALID_OTP",
  CAPACITY_EXCEEDED: "CAPACITY_EXCEEDED",
};

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Validate a numeric value is finite, non-NaN, and within an optional range.
 * @param {*} value - The value to validate
 * @param {string} name - Field name for error messages
 * @param {object} opts - { min, max, allowZero, required }
 * @returns {{ valid: boolean, value: number, error?: string }}
 */
function validateNumeric(value, name, opts = {}) {
  const { min, max, allowZero = true, required = false } = opts;

  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, value: 0, error: `${name} is required` };
    }
    return { valid: true, value: 0 };
  }

  const num = Number(value);
  if (!Number.isFinite(num)) {
    return { valid: false, value: 0, error: `${name} must be a finite number, got ${value}` };
  }

  if (!allowZero && num === 0) {
    return { valid: false, value: 0, error: `${name} must not be zero` };
  }

  if (min !== undefined && num < min) {
    return { valid: false, value: num, error: `${name} must be >= ${min}, got ${num}` };
  }

  if (max !== undefined && num > max) {
    return { valid: false, value: num, error: `${name} must be <= ${max}, got ${num}` };
  }

  return { valid: true, value: num };
}

/**
 * Validate a ward code is a non-empty string.
 * @param {*} wardCode
 * @returns {{ valid: boolean, value: string, error?: string }}
 */
function validateWardCode(wardCode) {
  if (!wardCode || typeof wardCode !== "string" || wardCode.trim().length === 0) {
    return { valid: false, value: "", error: "ward_code is required and must be a non-empty string" };
  }
  return { valid: true, value: wardCode.trim() };
}

/**
 * Validate a provenance class is one of the canonical classes.
 * @param {string} cls
 * @returns {boolean}
 */
function isValidProvenanceClass(cls) {
  return CANONICAL_PROVENANCE_CLASSES.includes(cls);
}

/**
 * Validate a mission state transition is legal.
 * @param {string} currentStatus
 * @param {string} newStatus
 * @returns {{ valid: boolean, error?: string }}
 */
function validateMissionTransition(currentStatus, newStatus) {
  const allowed = VALID_MISSION_TRANSITIONS[currentStatus];
  if (!allowed) {
    return {
      valid: false,
      error: `Unknown current mission status: '${currentStatus}'`,
    };
  }
  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid state transition: '${currentStatus}' → '${newStatus}'. Allowed: ${allowed.join(", ") || "none (terminal state)"}`,
    };
  }
  return { valid: true };
}

// =============================================================================
// STANDARDIZED ERROR RESPONSE
// =============================================================================

/**
 * Create a standardized error response object.
 * @param {string} errorCode - Machine-readable error code from ERROR_CODES
 * @param {string} message - Human-readable message
 * @param {object} context - Additional context (decision_id, mission_id, etc.)
 * @returns {object}
 */
function createErrorResponse(errorCode, message, context = {}) {
  return {
    ok: false,
    error_code: errorCode,
    message,
    retryable: [
      ERROR_CODES.STALE_VERSION,
      ERROR_CODES.NO_AVAILABLE_TANKER,
    ].includes(errorCode),
    ...context,
  };
}

// =============================================================================
// PRIORITY SCORING (Authoritative Implementation)
// =============================================================================

/**
 * Compute priority score for a single ward.
 * P_i = 0.30*V_i + 0.25*D_i + 0.20*Pop_i + 0.15*H_i + 0.10*Dist_i
 *
 * @param {object} ward - Ward data object
 * @returns {object} Priority result with factors, score, tier, and provenance
 */
function computePriority(ward) {
  // --- Vulnerability ---
  const vulnRaw = Number(ward.vulnerability_index !== undefined ? ward.vulnerability_index : 0);
  const vulnNorm = Math.min(Math.max(vulnRaw, 0), 1);
  const vulnScore = Math.round(vulnNorm * WEIGHT_VULNERABILITY * 100 * 10) / 10;
  const vulnDesc = vulnNorm >= 0.85 ? "Extreme informal density" : vulnNorm >= 0.65 ? "High vulnerability" : vulnNorm >= 0.45 ? "Moderate vulnerability" : "Stable residential";

  // --- Dry Pipe ---
  const dryRaw = Number(ward.dry_pipe_hours !== undefined ? ward.dry_pipe_hours : 0);
  const dryNorm = Math.min(Math.max(dryRaw, 0) / MAX_DRY_PIPE_HOURS, 1);
  const dryScore = Math.round(dryNorm * WEIGHT_DRY_PIPE * 100 * 10) / 10;
  const dryDesc = `${Math.round(dryRaw)}h pipe dry`;

  // --- Population ---
  const popRaw = Number(ward.population !== undefined ? ward.population : 0);
  const popNorm = Math.min(Math.max(popRaw, 0) / MAX_POPULATION, 1);
  const popScore = Math.round(popNorm * WEIGHT_POPULATION * 100 * 10) / 10;
  const popDesc = `${(popRaw / 1000).toFixed(0)}k residents`;

  // --- Historical Deficit ---
  const deficitRaw = Number(ward.historical_deficit !== undefined ? ward.historical_deficit : 0);
  const deficitNorm = Math.min(Math.max(deficitRaw, 0), 1);
  const deficitScore = Math.round(deficitNorm * WEIGHT_HISTORICAL_DEFICIT * 100 * 10) / 10;
  const deficitDesc = `${Math.round(deficitNorm * 100)}% last deficit`;

  // --- Depot Distance ---
  const distRaw = Number(ward.depot_distance_km !== undefined ? ward.depot_distance_km : 0);
  const distNorm = Math.min(Math.max(distRaw, 0) / MAX_DEPOT_DISTANCE_KM, 1);
  const distScore = Math.round(distNorm * WEIGHT_DEPOT_DISTANCE * 100 * 10) / 10;
  const distDesc = `${distRaw.toFixed(1)}km to depot (peripheral transit distance)`;

  // Mathematical Invariant: total_score == sum(weighted_contributions)
  const factorSum = Math.round((vulnScore + dryScore + popScore + deficitScore + distScore) * 10) / 10;
  if (factorSum < 0 || factorSum > 100.001) {
    throw new RangeError(`Priority score invariant violation: factorSum ${factorSum} outside [0, 100]`);
  }
  const total = factorSum;
  const tier = total >= 75 ? 1 : total >= 55 ? 2 : total >= 35 ? 3 : 4;

  const factors = [
    {
      factor: "Vulnerability",
      factor_name: "Vulnerability Exposure",
      weight: WEIGHT_VULNERABILITY,
      raw_value: vulnRaw,
      normalized: Math.round(vulnNorm * 1000) / 1000,
      normalized_value: Math.round(vulnNorm * 1000) / 1000,
      weighted_score: vulnScore,
      weighted_contribution: vulnScore,
      direction: "INCREASES_PRIORITY",
      provenance: "SYNTHETIC_SEEDED",
      provenance_class: "SYNTHETIC_SEEDED",
      provenance_subtype: "SOCIOECONOMIC_SLUM_INDEX",
      provenance_metadata: { class: "SYNTHETIC_SEEDED", subtype: "SOCIOECONOMIC_SLUM_INDEX" },
      description: vulnDesc,
    },
    {
      factor: "Dry Pipe Time",
      factor_name: "Dry Pipe Duration",
      weight: WEIGHT_DRY_PIPE,
      raw_value: dryRaw,
      normalized: Math.round(dryNorm * 1000) / 1000,
      normalized_value: Math.round(dryNorm * 1000) / 1000,
      weighted_score: dryScore,
      weighted_contribution: dryScore,
      direction: "INCREASES_PRIORITY",
      provenance: "SYNTHETIC_SEEDED",
      provenance_class: "SYNTHETIC_SEEDED",
      provenance_subtype: "SCADA_TELEMETRY",
      provenance_metadata: { class: "SYNTHETIC_SEEDED", subtype: "SCADA_TELEMETRY" },
      description: dryDesc,
    },
    {
      factor: "Population",
      factor_name: "Population Density",
      weight: WEIGHT_POPULATION,
      raw_value: popRaw,
      normalized: Math.round(popNorm * 1000) / 1000,
      normalized_value: Math.round(popNorm * 1000) / 1000,
      weighted_score: popScore,
      weighted_contribution: popScore,
      direction: "INCREASES_PRIORITY",
      provenance: "REFERENCE_DATA",
      provenance_class: "REFERENCE_DATA",
      provenance_subtype: "CENSUS_2011_PROJECTED",
      provenance_metadata: { class: "REFERENCE_DATA", subtype: "CENSUS_2011_PROJECTED" },
      description: popDesc,
    },
    {
      factor: "Historical Deficit",
      factor_name: "Historical Service Deficit",
      weight: WEIGHT_HISTORICAL_DEFICIT,
      raw_value: deficitRaw,
      normalized: Math.round(deficitNorm * 1000) / 1000,
      normalized_value: Math.round(deficitNorm * 1000) / 1000,
      weighted_score: deficitScore,
      weighted_contribution: deficitScore,
      direction: "INCREASES_PRIORITY",
      provenance: "DERIVED",
      provenance_class: "DERIVED",
      provenance_subtype: "HISTORICAL_QUOTA_LOGS",
      provenance_metadata: { class: "DERIVED", subtype: "HISTORICAL_QUOTA_LOGS" },
      description: deficitDesc,
    },
    {
      factor: "Depot Distance",
      factor_name: "Depot Distance",
      weight: WEIGHT_DEPOT_DISTANCE,
      raw_value: distRaw,
      normalized: Math.round(distNorm * 1000) / 1000,
      normalized_value: Math.round(distNorm * 1000) / 1000,
      weighted_score: distScore,
      weighted_contribution: distScore,
      direction: "INCREASES_PRIORITY",
      provenance: "DERIVED",
      provenance_class: "DERIVED",
      provenance_subtype: "GIS_TRANSIT_NETWORK",
      provenance_metadata: { class: "DERIVED", subtype: "GIS_TRANSIT_NETWORK" },
      description: distDesc,
    },
  ];

  const whyFactors = [
    `+ Vulnerability exposure (${vulnRaw.toFixed(2)}) → +${vulnScore.toFixed(1)} pts`,
    `+ Dry pipe outage (${Math.round(dryRaw)}h) → +${dryScore.toFixed(1)} pts`,
    `+ Population served (${(popRaw / 1000).toFixed(0)}k residents) → +${popScore.toFixed(1)} pts`,
    `+ Historical service deficit (${Math.round(deficitNorm * 100)}%) → +${deficitScore.toFixed(1)} pts`,
    `+ Depot transit distance (${distRaw.toFixed(1)} km) → +${distScore.toFixed(1)} pts`,
  ];

  const recommendedAction = total >= 75
    ? "Prioritize immediate tanker intervention (Tier 3 emergency protocol)."
    : total >= 55
    ? "Prioritize scheduled tanker delivery (Tier 2 review protocol)."
    : "Monitor pipeline distribution; nominal supply sufficient.";

  return {
    ward_id: ward.ward_id,
    ward_number: ward.ward_number,
    ward_code: ward.ward_code || ward.ward_number,
    name: ward.name,
    zone: ward.zone,
    demand_liters: ward.demand_liters,
    total_score: total,
    tier,
    lat: ward.lat,
    lng: ward.lng,
    coverage_pct: ward.coverage_pct,
    water_deficit_pct: ward.water_deficit_pct || Math.round((1 - (ward.coverage_pct || 50) / 100) * 100),
    dry_pipe_hours: ward.dry_pipe_hours,
    population: ward.population,
    vulnerability_index: ward.vulnerability_index,
    breakdown: factors,
    priority_factors: factors,
    why_factors: whyFactors,
    why_summary: whyFactors.join(" | "),
    recommended_action: recommendedAction,
    recommended_volume: ward.demand_liters,
    description: ward.description,
  };
}

/**
 * Compute and rank priority queue for an array of wards.
 * Deterministic tie-breaking: score descending, then ward_code ascending.
 *
 * @param {object[]} wards - Array of ward objects
 * @returns {object[]} Sorted priority results
 */
function computePriorityQueue(wards) {
  const scored = wards.map(computePriority);
  scored.sort((a, b) => {
    const scoreDiff = b.total_score - a.total_score;
    if (scoreDiff !== 0) return scoreDiff;
    // Deterministic tie-breaking: ward_code ascending (lexicographic)
    const codeA = a.ward_code || a.ward_number || "";
    const codeB = b.ward_code || b.ward_number || "";
    return codeA.localeCompare(codeB);
  });
  return scored;
}

// =============================================================================
// GOVERNANCE TIER CLASSIFICATION (Authoritative)
// =============================================================================

/**
 * Classify governance tier based on ward characteristics and volume.
 * @param {object} ward - Ward data
 * @param {number} volumeLiters - Dispatch volume
 * @returns {number} Governance tier (1, 2, or 3)
 */
function classifyWardGovernanceTier(ward, volumeLiters) {
  const vol = Number(volumeLiters) || ward.demand_liters || 10000;
  if (vol > 15000 || ((ward.dry_pipe_hours || 0) >= 48 && (ward.vulnerability_index || 0) >= 0.90)) {
    return 3;
  }
  if (vol > 12000 || (ward.vulnerability_index || 0) >= 0.85) {
    return 2;
  }
  return 1;
}

/**
 * Classify governance tier based on decision attributes.
 * @param {object} decision - Decision object with decision_type, volume_liters, risk_level
 * @returns {number} Governance tier (1, 2, or 3)
 */
function classifyDecisionGovernanceTier(decision) {
  const { decision_type, volume_liters, risk_level } = decision;

  const criticalTypes = ["hospital_preemption", "reserve_breach", "fleet_freeze", "emergency_rationing"];
  if (criticalTypes.includes(decision_type)) return 3;
  if (risk_level === "critical") return 3;

  const reviewTypes = ["quota_variance", "quality_escrow", "gps_variance"];
  if (reviewTypes.includes(decision_type)) return 2;
  if (risk_level === "medium") return 2;

  if (volume_liters > 15000) return 2;

  return 1;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  WEIGHT_VULNERABILITY,
  WEIGHT_DRY_PIPE,
  WEIGHT_POPULATION,
  WEIGHT_HISTORICAL_DEFICIT,
  WEIGHT_DEPOT_DISTANCE,
  MAX_DRY_PIPE_HOURS,
  MAX_POPULATION,
  MAX_DEPOT_DISTANCE_KM,
  POLICY_WEIGHTS,
  CANONICAL_PROVENANCE_CLASSES,
  MISSION_STATUSES,
  VALID_MISSION_TRANSITIONS,
  TIER_THRESHOLDS,
  ERROR_CODES,

  // Validation
  validateNumeric,
  validateWardCode,
  isValidProvenanceClass,
  validateMissionTransition,

  // Error model
  createErrorResponse,

  // Algorithms
  computePriority,
  computePriorityQueue,
  classifyWardGovernanceTier,
  classifyDecisionGovernanceTier,
};
