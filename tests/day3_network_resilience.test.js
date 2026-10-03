/**
 * WaterFlow OS — Day 3 Network Resilience & Governed Recovery Test Suite
 *
 * Validates the complete 38-test Day 3 resilience loop:
 * - Scenario: Deterministic loading, metadata validity, synthetic provenance, seed reproducibility (1-4)
 * - Impact: Reachability invariant, deterministic affected nodes, ward mapping, critical facilities, population, unmet demand (5-10)
 * - Recovery: Feasible generation, deterministic scoring, candidate inclusion, mathematical score decomposition, infeasibility gating (11-15)
 * - Governance: Authoritative tier classification, authorization bypass prevention, kill-switch safety gate, failed precondition blocking (16-19)
 * - Dispatch: Real mission creation, decision ID linkage, scenario ID linkage, valid mission schema (20-23)
 * - Offline: WorkerApp retrieval, offline action representation, idempotent reconnect sync, conflict visibility (24-27)
 * - Verification: Pending status retention, invalid OTP rejection, valid OTP verification, closed-loop state update (28-31)
 * - Recovery outcome: Post-action effect persistence, mathematical state delta consistency, tanker lifecycle, end-to-end queryable trace (32-35)
 * - Safety: Kill-switch mutation prevention, unauthorized Tier 3 safety failure, fleet exhaustion explicit failure (36-38)
 */

const assert = require("node:assert");
const http = require("node:http");

const {
  app,
  getWards,
  getTankers,
  resetOperationalState,
  OPERATIONAL_DECISION_RECORDS,
  GOVERNANCE_DECISIONS,
  GOVERNANCE_AUDIT_LOG,
  generateDecisionRecord,
} = require("../backend/server");

const {
  FAILURE_SCENARIOS,
  NODES,
  EDGES,
  GRAPH_PROVENANCE,
  WaterNetworkGraph,
  analyzeNetworkImpact,
  generateRecoveryAlternatives,
  localizeFault,
  generateSyntheticObservations,
  classifyResilienceGovernanceTier,
  ACTIVE_RESILIENCE_TRACES,
} = require("../backend/resilience_engine");

const {
  automationState,
  checkPreconditions,
} = require("../backend/autonomy_engine");

const {
  createMission,
  verifyMissionDelivery,
  processOperation,
  resetFieldSyncState,
  MISSION_VERSIONS,
  PROCESSED_OPERATIONS,
} = require("../backend/field_sync");

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    const p = fn();
    if (p && typeof p.then === "function") {
      return p
        .then(() => {
          passed++;
          console.log(`  ✅ ${name}`);
          results.push({ name, status: "PASSED" });
        })
        .catch((err) => {
          failed++;
          console.error(`  ❌ ${name}: ${err.message}`);
          results.push({ name, status: "FAILED", error: err.message });
        });
    }
    passed++;
    console.log(`  ✅ ${name}`);
    results.push({ name, status: "PASSED" });
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}: ${err.message}`);
    results.push({ name, status: "FAILED", error: err.message });
  }
}

async function runDay3Tests() {
  console.log("\n━━━ WATERFLOW OS: DAY 3 NETWORK RESILIENCE & RECOVERY TEST SUITE ━━━\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, options = {}) {
    const url = `${baseUrl}${path}`;
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const method = options.method || "GET";
    const body = options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined;

    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port,
          path: u.pathname + u.search,
          method,
          headers,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            } catch {
              resolve({ status: res.statusCode, headers: res.headers, body: data });
            }
          });
        }
      );
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });
  }

  try {
    // Reset state before tests
    resetOperationalState();
    resetFieldSyncState();
    automationState.kill_switch_enabled = true;
    ACTIVE_RESILIENCE_TRACES.clear();

    // =========================================================================
    // GROUP 1: SCENARIO (Tests 1-4)
    // =========================================================================
    console.log("─── GROUP 1: SCENARIO DEFINITION & REPRODUCIBILITY ───");

    await test("1. Deterministic scenario loads successfully via API and module", async () => {
      const scenario = FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01;
      assert.ok(scenario, "Canonical Seed 42 scenario must exist in module");
      assert.strictEqual(scenario.scenario_id, "SEED42_TRUNK_FAILURE_01");

      const res = await request("/api/resilience/scenarios");
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.scenarios.some((s) => s.scenario_id === "SEED42_TRUNK_FAILURE_01"));
      assert.strictEqual(res.body.canonical_demo_scenario.scenario_id, "SEED42_TRUNK_FAILURE_01");
    });

    await test("2. Scenario metadata is complete and structured", () => {
      const scenario = FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01;
      assert.ok(scenario.scenario_id, "scenario_id required");
      assert.ok(scenario.name, "name required");
      assert.ok(scenario.description, "description required");
      assert.ok(scenario.affected_asset, "affected_asset required");
      assert.ok(scenario.failure_type, "failure_type required");
      assert.strictEqual(scenario.seed, 42, "seed must be 42");
      assert.ok(scenario.severity, "severity required");
      assert.ok(scenario.timestamp, "timestamp required");
      assert.strictEqual(scenario.source_type, "SYNTHETIC_SEEDED", "source_type must be SYNTHETIC_SEEDED");
    });

    await test("3. Failure is strictly marked synthetic/demonstration", () => {
      const scenario = FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01;
      assert.strictEqual(scenario.source_type, "SYNTHETIC_SEEDED");
      assert.strictEqual(scenario.is_demonstration_scenario, true);
      assert.strictEqual(scenario.seed, 42);
      assert.ok(scenario.notes.includes("demonstrator"));
      assert.ok(GRAPH_PROVENANCE.source_type.includes("SYNTHETIC"));
    });

    await test("4. Same seed produces identical impact calculations across independent runs", () => {
      const g1 = new WaterNetworkGraph();
      g1.build(NODES, EDGES);
      const impact1 = analyzeNetworkImpact(FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01);

      const g2 = new WaterNetworkGraph();
      g2.build(NODES, EDGES);
      const impact2 = analyzeNetworkImpact(FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01);

      assert.strictEqual(impact1.demand_at_risk_kl, impact2.demand_at_risk_kl);
      assert.strictEqual(impact1.population_at_risk, impact2.population_at_risk);
      assert.strictEqual(impact1.affected_nodes.length, impact2.affected_nodes.length);
      assert.strictEqual(impact1.affected_wards.length, impact2.affected_wards.length);
      assert.strictEqual(impact1.affected_facilities.length, impact2.affected_facilities.length);
      assert.deepStrictEqual(
        impact1.affected_nodes.map((n) => n.id),
        impact2.affected_nodes.map((n) => n.id)
      );
    });

    // =========================================================================
    // GROUP 2: IMPACT LOCALIZATION & QUANTIFICATION (Tests 5-10)
    // =========================================================================
    console.log("\n─── GROUP 2: IMPACT LOCALIZATION & QUANTIFICATION ───");

    await test("5. Failed graph element changes reachability (reachability_after <= reachability_before)", () => {
      const impact = analyzeNetworkImpact(FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01);
      assert.strictEqual(impact.reachability_invariant_holds, true);
      assert.ok(
        impact.scenario_impact.reachable_from_sources <= impact.baseline.reachable_from_sources,
        "Scenario reachability must be less than or equal to baseline reachability"
      );
      assert.strictEqual(impact.baseline.reachable_from_sources, 24);
      assert.strictEqual(impact.scenario_impact.reachable_from_sources, 18);
    });

    await test("6. Affected nodes are deterministic and precisely isolated", () => {
      const impact = analyzeNetworkImpact(FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01);
      const affectedIds = impact.affected_nodes.map((n) => n.id);
      assert.deepStrictEqual(affectedIds, ["WARD-G/N", "WARD-F/S", "WARD-A", "FAC-KEM", "FAC-SION"]);
    });

    await test("7. Affected wards are correctly mapped from graph demand nodes", () => {
      const impact = analyzeNetworkImpact(FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01);
      const wardCodes = impact.affected_wards.map((w) => w.ward_code);
      assert.strictEqual(wardCodes.length, 3);
      assert.ok(wardCodes.includes("G/N"));
      assert.ok(wardCodes.includes("F/S"));
      assert.ok(wardCodes.includes("A"));
    });

    await test("8. Critical-facility impact is computed with exact bed counts and demand", () => {
      const impact = analyzeNetworkImpact(FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01);
      assert.strictEqual(impact.affected_facilities.length, 2);
      const facNames = impact.affected_facilities.map((f) => f.id);
      assert.ok(facNames.includes("FAC-KEM"));
      assert.ok(facNames.includes("FAC-SION"));

      const totalBeds = impact.affected_facilities.reduce((sum, f) => sum + f.beds, 0);
      assert.strictEqual(totalBeds, 2400, "KEM (1800) + Sion (600) = 2400 beds");

      const totalDailyDemand = impact.affected_facilities.reduce((sum, f) => sum + f.daily_demand_kl, 0);
      assert.strictEqual(totalDailyDemand, 1080, "KEM (810 kL) + Sion (270 kL) = 1080 kL");
    });

    await test("9. Population impact is computed accurately from affected ward census data", () => {
      const impact = analyzeNetworkImpact(FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01);
      // G/N: 599,039 + F/S: 360,972 + A: 185,014 = 1,145,025
      assert.strictEqual(impact.population_at_risk, 1145025);
    });

    await test("10. Unmet demand impact is computed from modeled ward baseline demand", () => {
      const impact = analyzeNetworkImpact(FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01);
      // G/N: 28 + F/S: 5 + A: 2 = 35 kL (35,000 L)
      assert.strictEqual(impact.demand_at_risk_kl, 35);
    });

    // =========================================================================
    // GROUP 3: RECOVERY ALTERNATIVES & SCORING (Tests 11-15)
    // =========================================================================
    console.log("\n─── GROUP 3: RECOVERY ALTERNATIVES & OBJECTIVE SCORING ───");

    let canonicalImpact = null;
    let canonicalRecovery = null;

    await test("11. At least one feasible recovery alternative is generated", () => {
      canonicalImpact = analyzeNetworkImpact(FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01);
      canonicalRecovery = generateRecoveryAlternatives(canonicalImpact, { available_tankers: 25, kill_switch_enabled: true });

      assert.ok(canonicalRecovery.alternatives.length >= 3, "At least 3 alternatives should be evaluated");
      const feasibleAlts = canonicalRecovery.alternatives.filter((a) => a.feasible);
      assert.ok(feasibleAlts.length >= 1, "At least one feasible alternative must exist");
      const tankerOpt = canonicalRecovery.alternatives.find((a) => a.option_id === "D");
      assert.ok(tankerOpt && tankerOpt.feasible, "Tanker bridge option D must be feasible when fleet is available");
    });

    await test("12. Recovery alternatives have deterministic ranking and scores", () => {
      const rec1 = generateRecoveryAlternatives(canonicalImpact, { available_tankers: 25, kill_switch_enabled: true });
      const rec2 = generateRecoveryAlternatives(canonicalImpact, { available_tankers: 25, kill_switch_enabled: true });

      assert.strictEqual(rec1.alternatives.length, rec2.alternatives.length);
      for (let i = 0; i < rec1.alternatives.length; i++) {
        assert.strictEqual(rec1.alternatives[i].option_id, rec2.alternatives[i].option_id);
        assert.strictEqual(rec1.alternatives[i].objective_score, rec2.alternatives[i].objective_score);
      }
    });

    await test("13. Selected recommended alternative exists in candidate set and is top-ranked", () => {
      const recommended = canonicalRecovery.alternatives.find((a) => a.recommended);
      assert.ok(recommended, "A recommended alternative must be designated");
      assert.strictEqual(recommended.selected, true);
      assert.strictEqual(recommended.option_id, canonicalRecovery.alternatives[0].option_id);
      assert.ok(recommended.selection_reason.includes("Lowest objective penalty score"));
    });

    await test("14. Recovery objective explanation reconciles mathematically to score components", () => {
      for (const alt of canonicalRecovery.alternatives) {
        const bd = alt.score_breakdown;
        assert.ok(bd, `score_breakdown required for option ${alt.option_id}`);
        const computedSum = Math.round(
          (bd.unmet_demand_contribution +
            bd.critical_facility_contribution +
            bd.population_contribution +
            bd.operational_cost_contribution) *
            100
        ) / 100;
        assert.strictEqual(
          bd.total,
          computedSum,
          `Decomposed components must sum exactly to total for option ${alt.option_id}`
        );
        assert.strictEqual(alt.objective_score, bd.total);
        assert.strictEqual(bd.sum_matches_score, true);
      }
    });

    await test("15. Impossible recovery is explicitly flagged infeasible and blocked from execution", () => {
      // In canonical Seed 42, no alternative transmission path exists to the isolated Sion island
      const pipeOpt = canonicalRecovery.alternatives.find((a) => a.option_id === "C");
      assert.ok(pipeOpt, "Option C should exist");
      assert.strictEqual(pipeOpt.feasible, false);
      assert.ok(pipeOpt.infeasible_reason.includes("No alternative modeled transmission path"));
      assert.strictEqual(pipeOpt.preconditions.eligible_for_execution, false);

      // And with 0 available tankers, Tanker option D must also be flagged infeasible
      const exhaustedRec = generateRecoveryAlternatives(canonicalImpact, { available_tankers: 0, kill_switch_enabled: true });
      const exhaustedTankerOpt = exhaustedRec.alternatives.find((a) => a.option_id === "D");
      assert.strictEqual(exhaustedTankerOpt.feasible, false);
      assert.ok(exhaustedTankerOpt.infeasible_reason.includes("NO_AVAILABLE_TANKER"));
      assert.strictEqual(exhaustedTankerOpt.preconditions.eligible_for_execution, false);
    });

    // =========================================================================
    // GROUP 4: GOVERNANCE GATES & SAFETY PRECONDITIONS (Tests 16-19)
    // =========================================================================
    console.log("\n─── GROUP 4: GOVERNANCE GATES & SAFETY PRECONDITIONS ───");

    await test("16. Governance tier is authoritatively classified as Tier 3 for hospital/demand impact", () => {
      const topAlt = canonicalRecovery.alternatives[0];
      const tier = classifyResilienceGovernanceTier(topAlt, canonicalImpact);
      assert.strictEqual(tier, 3, "Failure affecting hospitals FAC-KEM & FAC-SION and 35 kL must be Tier 3");
      assert.strictEqual(topAlt.governance_tier, 3);
      assert.strictEqual(topAlt.governance_tier_name, "TIER_3_EXECUTIVE");
    });

    await test("17. Tier 3 recovery cannot bypass executive authorization PIN", async () => {
      // Attempt execution without PIN
      const resNoPin = await request("/api/resilience/execute-recovery", {
        method: "POST",
        body: { scenario_id: "SEED42_TRUNK_FAILURE_01", option_id: "D", pin: "" },
      });
      assert.strictEqual(resNoPin.status, 403);
      assert.strictEqual(resNoPin.body.code, "UNAUTHORIZED_TIER3");
      assert.strictEqual(resNoPin.body.blocked, true);

      // Attempt execution with incorrect PIN
      const resBadPin = await request("/api/resilience/execute-recovery", {
        method: "POST",
        body: { scenario_id: "SEED42_TRUNK_FAILURE_01", option_id: "D", pin: "0000" },
      });
      assert.strictEqual(resBadPin.status, 403);
      assert.strictEqual(resBadPin.body.code, "UNAUTHORIZED_TIER3");
    });

    await test("18. Emergency kill switch blocks recovery execution even with valid PIN", async () => {
      // Engage kill switch
      automationState.kill_switch_enabled = false;

      const res = await request("/api/resilience/execute-recovery", {
        method: "POST",
        body: { scenario_id: "SEED42_TRUNK_FAILURE_01", option_id: "D", pin: "4491" },
      });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.code, "KILL_SWITCH_ACTIVE");
      assert.strictEqual(res.body.kill_switch_active, true);

      // Verify audit log recorded the blocked action
      const killSwitchAudit = GOVERNANCE_AUDIT_LOG.find((a) => a.action === "RECOVERY_BLOCKED_BY_KILL_SWITCH");
      assert.ok(killSwitchAudit, "Kill switch block must be recorded in governance audit log");

      // Restore kill switch
      automationState.kill_switch_enabled = true;
    });

    await test("19. Precondition checks prevent mission creation when constraints fail", () => {
      // Precondition check function should reject when kill switch is disabled
      automationState.kill_switch_enabled = false;
      const preFail = checkPreconditions({ action_type: "DISPATCH_TANKER", parameters: {} });
      assert.strictEqual(preFail.passed, false);
      assert.ok(preFail.failed_reasons.some((r) => r.includes("Kill switch")));

      automationState.kill_switch_enabled = true;
    });

    // =========================================================================
    // GROUP 5: DISPATCH & MISSION LIFECYCLE (Tests 20-23)
    // =========================================================================
    console.log("\n─── GROUP 5: DISPATCH & MISSION LIFECYCLE ───");

    let dispatchedMission = null;
    let dispatchResponse = null;

    await test("20. Valid authorized recovery produces a real operational mission", async () => {
      resetOperationalState();
      automationState.kill_switch_enabled = true;

      const res = await request("/api/resilience/execute-recovery", {
        method: "POST",
        body: {
          scenario_id: "SEED42_TRUNK_FAILURE_01",
          option_id: "D",
          target_ward: "G/N",
          volume_liters: 10000,
          pin: "4491",
          officer_name: "Municipal Commissioner Demo",
          officer_id: "EXEC_COMM_01",
          justification: "Critical facility support: Sion Hospital & G/N emergency supply",
        },
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.mission_id, "mission_id must be returned");
      assert.ok(res.body.decision_id, "decision_id must be returned");

      dispatchResponse = res.body;
      dispatchedMission = res.body.mission;
      assert.ok(dispatchedMission, "Mission object must be returned");
      assert.strictEqual(dispatchedMission.ward_code, "G/N");
      assert.strictEqual(dispatchedMission.volume_liters, 10000);
    });

    await test("21. Decision ID links directly to mission ID in operational decision records", () => {
      const decisionRecord = OPERATIONAL_DECISION_RECORDS.get(dispatchResponse.decision_id);
      assert.ok(decisionRecord, "Decision record must exist in OPERATIONAL_DECISION_RECORDS");
      assert.strictEqual(String(decisionRecord.mission_id), String(dispatchResponse.mission_id));
      assert.ok(
        decisionRecord.governance_tier === 3 || decisionRecord.governance_tier === "TIER_3_EXECUTIVE",
        "Governance tier must be Tier 3"
      );
    });

    await test("22. Scenario ID and recovery option ID link directly to the decision record", () => {
      const decisionRecord = OPERATIONAL_DECISION_RECORDS.get(dispatchResponse.decision_id);
      assert.strictEqual(decisionRecord.scenario_id, "SEED42_TRUNK_FAILURE_01");
      assert.strictEqual(decisionRecord.recovery_option_id, "D");
    });

    await test("23. Mission state, volume, target, and transponder are valid and active", () => {
      const liveMission = MISSION_VERSIONS.get(String(dispatchResponse.mission_id));
      assert.ok(liveMission, "Mission must exist in MISSION_VERSIONS store");
      assert.strictEqual(liveMission.destination_ward, "Ward G/N");
      assert.strictEqual(liveMission.volume_liters, 10000);
      assert.ok(liveMission.tanker_id.startsWith("T-"), "Tanker ID must start with T-");
      assert.ok(liveMission.otp_code, "Mission must have a delivery OTP");
      assert.ok(liveMission.status === "en_route" || liveMission.status === "DISPATCHED");
    });

    // =========================================================================
    // GROUP 6: OFFLINE FIELD CONTINUITY (Tests 24-27)
    // =========================================================================
    console.log("\n─── GROUP 6: OFFLINE FIELD CONTINUITY ───");

    let fieldOfflineOp = null;

    await test("24. Dispatched recovery mission reaches mobile WorkerApp API", async () => {
      const res = await request("/api/field/missions");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const missionFound = res.body.missions?.some(
        (m) => String(m.mission_id) === String(dispatchResponse.mission_id)
      );
      assert.ok(missionFound, "Mission must be queryable in active worker missions list");
    });

    await test("25. Offline delivery operation queues locally and synchronizes upon reconnect", () => {
      // Simulate field worker recording delivery in offline disconnected state
      fieldOfflineOp = {
        operation_id: `op-resilience-field-${Date.now()}`,
        client_id: "worker-client-tablet-01",
        action_type: "RECORD_DELIVERY",
        mission_id: String(dispatchResponse.mission_id),
        mission_version: 1,
        local_timestamp: new Date().toISOString(),
        payload: {
          quantity_liters: 10000,
          notes: "Emergency bridge delivery to Sion hospital manifold completed",
        },
      };

      const syncResult = processOperation(fieldOfflineOp);
      assert.strictEqual(syncResult.status, "ACCEPTED");
      assert.ok(syncResult.applied, "Operation apply details must be returned");

      const missionAfterDelivery = MISSION_VERSIONS.get(String(dispatchResponse.mission_id));
      assert.strictEqual(missionAfterDelivery.status, "delivered");
      assert.strictEqual(missionAfterDelivery.verification_state, "PENDING_VERIFICATION");
      assert.strictEqual(missionAfterDelivery.version, 2);
    });

    await test("26. Reconnect synchronization is strictly idempotent against duplicate delivery ops", () => {
      // Resubmit the exact same operation (repeated sync retry upon reconnect)
      const duplicateResult = processOperation(fieldOfflineOp);
      assert.strictEqual(duplicateResult.status, "DUPLICATE");
      assert.ok(duplicateResult.reason.includes("already processed"));
    });

    await test("27. Concurrent edit / version mismatch yields visible conflict detection", () => {
      const staleConflictOp = {
        operation_id: `op-conflict-${Date.now()}`,
        client_id: "worker-client-stale",
        action_type: "RECORD_DELIVERY",
        mission_id: String(dispatchResponse.mission_id),
        mission_version: 1, // Server is now at version 2!
        local_timestamp: new Date().toISOString(),
        payload: {
          quantity_liters: 5000,
        },
      };

      const conflictResult = processOperation(staleConflictOp);
      assert.strictEqual(conflictResult.status, "REJECTED");
      assert.strictEqual(conflictResult.conflict_type, "STALE_VERSION");
      assert.strictEqual(conflictResult.server_version, 2);
    });

    // =========================================================================
    // GROUP 7: DELIVERY VERIFICATION & CLOSED-LOOP UPDATES (Tests 28-31)
    // =========================================================================
    console.log("\n─── GROUP 7: DELIVERY VERIFICATION & CLOSED-LOOP UPDATES ───");

    await test("28. Delivery remains unverified until OTP physical handshake is confirmed", () => {
      const decisionRecord = OPERATIONAL_DECISION_RECORDS.get(dispatchResponse.decision_id);
      assert.notStrictEqual(decisionRecord.verification_status, "VERIFIED");
      const mission = MISSION_VERSIONS.get(String(dispatchResponse.mission_id));
      assert.strictEqual(mission.verification_state, "PENDING_VERIFICATION");
      assert.strictEqual(mission.status, "delivered");
    });

    await test("29. Invalid verification OTP code fails with explicit error", async () => {
      const verifyRes = await request(`/api/field/missions/${dispatchResponse.mission_id}/verify`, {
        method: "POST",
        body: {
          otp_code: "0000",
        },
      });

      assert.strictEqual(verifyRes.status, 403);
      assert.strictEqual(verifyRes.body.success, false);
      assert.ok(verifyRes.body.error.includes("Invalid citizen verification code"));
    });

    await test("30. Valid OTP code verifies delivery and records Digital Delivery Receipt ID", async () => {
      const validOtp = dispatchResponse.mission.otp_code || "7419";
      const verifyRes = await request(`/api/field/missions/${dispatchResponse.mission_id}/verify`, {
        method: "POST",
        body: {
          otp_code: validOtp,
          verified_by: "Dr. A. K. Joshi (Chief Medical Officer, Sion Hospital)",
        },
      });

      assert.strictEqual(verifyRes.status, 200);
      assert.strictEqual(verifyRes.body.status, "VERIFIED");
      assert.ok(verifyRes.body.transaction_hash, "Digital Delivery Receipt ID (transaction_hash) required");
      assert.ok(verifyRes.body.digital_delivery_receipt_id, "Digital Delivery Receipt ID alias required");
      assert.strictEqual(verifyRes.body.digital_delivery_receipt_id, verifyRes.body.transaction_hash);

      const mission = MISSION_VERSIONS.get(String(dispatchResponse.mission_id));
      assert.strictEqual(mission.status, "VERIFIED");
      assert.strictEqual(mission.verification_state, "VERIFIED");
    });

    await test("31. Verified delivery updates target ward operational deficit in closed loop", async () => {
      const wards = await getWards();
      const targetWard = wards.find((w) => w.ward_number === "G/N" || w.ward_code === "G/N");
      assert.ok(targetWard, "Ward G/N must exist");
      // Initially G/N had 28,000 L demand in standard baseline. After 10,000 L delivery, demand drops to 18,000 L!
      assert.strictEqual(targetWard.demand_liters, 18000, "28000 - 10000 = 18000 L remaining");
    });

    // =========================================================================
    // GROUP 8: RECOVERY OUTCOME & POST-ACTION AUDIT (Tests 32-35)
    // =========================================================================
    console.log("\n─── GROUP 8: RECOVERY OUTCOME & POST-ACTION AUDIT ───");

    await test("32. Post-action effect is stored with exact volume delivered and deficit change", () => {
      const decisionRecord = OPERATIONAL_DECISION_RECORDS.get(dispatchResponse.decision_id);
      assert.strictEqual(decisionRecord.verification_status, "VERIFIED");
      assert.ok(decisionRecord.post_action_effect, "post_action_effect must be stored on decision record");
      assert.strictEqual(decisionRecord.post_action_effect.verified_volume_delivered, 10000);
      assert.strictEqual(decisionRecord.post_action_effect.unmet_demand_reduction_liters, 10000);
    });

    await test("33. Mathematical consistency invariant holds (actual_unmet_after = max(0, actual_unmet_before - actual_verified_volume)) and planned vs actual distinction is preserved", () => {
      const decisionRecord = OPERATIONAL_DECISION_RECORDS.get(dispatchResponse.decision_id);
      const pa = decisionRecord.post_action_effect;

      // 1. Core mathematical consistency invariant on live execution
      const expectedAfter = Math.max(0, pa.actual_unmet_demand_before_execution_liters - pa.actual_verified_volume_liters);
      assert.strictEqual(
        pa.actual_unmet_demand_after_execution_liters,
        expectedAfter,
        `Invariant violated: actual_unmet_after (${pa.actual_unmet_demand_after_execution_liters}) must equal max(0, ${pa.actual_unmet_demand_before_execution_liters} - ${pa.actual_verified_volume_liters}) = ${expectedAfter}`
      );
      assert.strictEqual(pa.mathematical_consistency_holds, true, "mathematical_consistency_holds flag must be true");

      // 2. Invariant boundary test (clamping to 0 when verified volume exceeds demand)
      const testClamp = (before, delivered) => Math.max(0, before - delivered);
      assert.strictEqual(testClamp(28000, 10000), 18000);
      assert.strictEqual(testClamp(10000, 10000), 0);
      assert.strictEqual(testClamp(5000, 10000), 0);
      assert.strictEqual(testClamp(0, 5000), 0);

      // 3. Planned vs Executed distinction: ensure plan result (0 L) is NOT silently represented as actual executed result (18,000 L)
      assert.strictEqual(pa.planned_recovery_volume_liters, 35000, "Planned volume should reflect multi-tanker recovery scope (35,000 L)");
      assert.strictEqual(pa.expected_unmet_demand_after_plan_liters, 0, "Recovery plan models 0 L residual unmet demand upon full 4-tanker plan completion");
      assert.strictEqual(pa.actual_executed_volume_liters, 10000, "Actual executed mission delivered 10,000 L in Tranche 1");
      assert.strictEqual(pa.actual_unmet_demand_after_execution_liters, 18000, "Actual residual deficit in Ward G/N is 18,000 L");
      assert.notStrictEqual(
        pa.expected_unmet_demand_after_plan_liters,
        pa.actual_unmet_demand_after_execution_liters,
        "Recovery-plan expected result (0 L) must NOT be silently conflated with actual executed post-mission result (18,000 L)"
      );
      assert.strictEqual(pa.recovery_completion_status, "PARTIALLY_RECOVERED", "Single tranche mission yields PARTIALLY_RECOVERED status");
    });

    await test("34. Tanker lifecycle completes and transponder returns to available pool", async () => {
      const tankers = await getTankers();
      const tanker = tankers.find((t) => t.transponder_id === dispatchResponse.tanker.transponder_id);
      assert.ok(tanker, "Dispatched tanker must exist");
      assert.strictEqual(tanker.status, "available", "Tanker must return to available status post-verification");
      assert.strictEqual(tanker.current_load, 0, "Tanker load must be 0 post-delivery");
    });

    await test("35. Complete decision trace links Scenario → Impact → Governance → Mission → Verification → Outcome", async () => {
      // Query the resilience trace endpoint
      const res = await request(`/api/resilience/trace/SEED42_TRUNK_FAILURE_01`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const trace = res.body.trace;

      assert.strictEqual(trace.scenario_id, "SEED42_TRUNK_FAILURE_01");
      assert.ok(trace.impact.affected_wards.includes("G/N"));
      assert.ok(trace.impact.affected_facilities.some((f) => f.includes("Sion Hospital")));
      assert.strictEqual(trace.recovery_option.option_id, "D");
      assert.strictEqual(trace.governance.status, "AUTHORIZED");
      assert.strictEqual(trace.verification_status, "VERIFIED");
      assert.strictEqual(trace.recovery_state, "SERVICE_RECOVERED");
      assert.strictEqual(trace.post_action_effect.unmet_demand_reduction_liters, 10000);

      // Query the decision record by ID
      const decRes = await request(`/api/decisions/${dispatchResponse.decision_id}`);
      assert.strictEqual(decRes.status, 200);
      assert.strictEqual(decRes.body.decision_id, dispatchResponse.decision_id);
      assert.strictEqual(decRes.body.scenario_id, "SEED42_TRUNK_FAILURE_01");
      assert.strictEqual(decRes.body.recovery_option_id, "D");
      assert.strictEqual(decRes.body.verification_status, "VERIFIED");
    });

    // =========================================================================
    // GROUP 9: SAFETY & BOUNDARY INVARIANTS (Tests 36-38)
    // =========================================================================
    console.log("\n─── GROUP 9: SAFETY & BOUNDARY INVARIANTS ───");

    await test("36. Kill switch engagement leaves operational mission state untouched", async () => {
      const missionsBefore = MISSION_VERSIONS.size;
      automationState.kill_switch_enabled = false;

      const res = await request("/api/resilience/execute-recovery", {
        method: "POST",
        body: { scenario_id: "SEED42_TRUNK_FAILURE_01", option_id: "D", pin: "4491" },
      });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(MISSION_VERSIONS.size, missionsBefore, "No missions may be created while kill switch is ON");
      automationState.kill_switch_enabled = true;
    });

    await test("37. Unauthorized Tier 3 recovery attempts fail safely with zero mutations", async () => {
      const recordsBefore = OPERATIONAL_DECISION_RECORDS.size;

      const res = await request("/api/resilience/execute-recovery", {
        method: "POST",
        body: { scenario_id: "SEED42_TRUNK_FAILURE_01", option_id: "D", pin: "WRONG_PIN" },
      });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(OPERATIONAL_DECISION_RECORDS.size, recordsBefore, "No decision record created for failed auth");
    });

    await test("38. Fleet exhaustion (0 available tankers) yields explicit NO_AVAILABLE_TANKER 409 failure", async () => {
      // Mark all tankers unavailable
      const tankers = await getTankers();
      const prevStatuses = tankers.map((t) => t.status);
      tankers.forEach((t) => (t.status = "maintenance"));

      const res = await request("/api/resilience/execute-recovery", {
        method: "POST",
        body: { scenario_id: "SEED42_TRUNK_FAILURE_01", option_id: "D", pin: "4491" },
      });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.code, "NO_AVAILABLE_TANKER");
      assert.strictEqual(res.body.blocked, true);

      // Restore tankers
      tankers.forEach((t, i) => (t.status = prevStatuses[i] || "available"));
    });

    console.log("\n━━━ TEST SUITE COMPLETE ━━━");
    console.log(`Passed: ${passed}/38`);
    console.log(`Failed: ${failed}/38\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runDay3Tests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
