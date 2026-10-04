const { 
  app, 
  resetOperationalState, 
  GOVERNANCE_DECISIONS, 
  GOVERNANCE_AUDIT_LOG, 
  OPERATIONAL_DECISION_RECORDS,
  ACTIVE_RESILIENCE_TRACES 
} = require("../backend/server.js");
const { MISSION_VERSIONS, PROCESSED_OPERATIONS } = require("../backend/field_sync.js");
const { EXECUTION_RECORDS, PROCESSED_OPERATION_IDS, automationState } = require("../backend/autonomy_engine.js");

async function runResetTest() { process.env.APP_MODE = 'DEMO';
  console.log("--- Initial State ---");
  console.log("Gov Decisions:", GOVERNANCE_DECISIONS.length);
  console.log("Missions:", MISSION_VERSIONS.size);
  
  // Mutate state
  console.log("--- Mutating State ---");
  GOVERNANCE_DECISIONS.push({ decision_id: "mutated", status: "pending" });
  GOVERNANCE_AUDIT_LOG.push({ event: "mutated" });
  OPERATIONAL_DECISION_RECORDS.set("mutated", { decision_id: "mutated" });
  ACTIVE_RESILIENCE_TRACES.set("mutated", { data: "mutated" });
  MISSION_VERSIONS.set("mutated", { status: "pending" });
  PROCESSED_OPERATIONS.set("mutated", true);
  EXECUTION_RECORDS.push({ id: "mutated" });
  PROCESSED_OPERATION_IDS.add("mutated");
  automationState.kill_switch_enabled = false;
  
  // Reset
  console.log("--- Resetting State ---");
  resetOperationalState();
  
  // Verify
  console.log("--- Verifying State ---");
  const failed = [];
  
  if (GOVERNANCE_DECISIONS.find(d => d.decision_id === "mutated")) failed.push("Stale governance decisions");
  if (GOVERNANCE_AUDIT_LOG.find(d => d.event === "mutated")) failed.push("Stale audit records");
  if (OPERATIONAL_DECISION_RECORDS.has("mutated")) failed.push("Stale decision records");
  if (ACTIVE_RESILIENCE_TRACES.has("mutated")) failed.push("Stale resilience traces");
  if (MISSION_VERSIONS.has("mutated")) failed.push("Stale missions");
  if (PROCESSED_OPERATIONS.has("mutated")) failed.push("Stale processed ops");
  if (EXECUTION_RECORDS.length > 0) failed.push("Stale autonomy records");
  if (PROCESSED_OPERATION_IDS.has("mutated")) failed.push("Stale autonomy processed ops");
  if (automationState.kill_switch_enabled !== true) failed.push("Kill switch not default");
  
  if (failed.length > 0) {
    console.error("❌ Reset test failed:", failed);
    process.exit(1);
  } else {
    console.log("✅ Reset test passed: all state restored to baseline");
    process.exit(0);
  }
}

runResetTest().catch(console.error);
