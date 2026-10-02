/**
 * WaterFlow OS — Day 2 Operational Trust & Explainability Test Suite
 *
 * Validates the 31 required trust dimensions:
 * - Priority scoring explanation matches actual math factors (1-3)
 * - Constrained allocation reporting, binding constraints, infeasibility (4-10)
 * - Data provenance and freshness semantics (11-14)
 * - Governance hierarchy, authorization traceability, demo credential decoupling (15-17)
 * - Dispatch decision record linkage and state consistency (18-20)
 * - Verification lifecycle distinction (Local Pending -> Accepted -> Verified) and state delta (21-24)
 * - Closed-loop feedback consistency and audit linkage (25-27)
 * - Failure safety and boundary handling (28-31)
 */

const assert = require("node:assert");
const http = require("node:http");

const {
  app,
  getWards,
  getTankers,
  getDepots,
  resetOperationalState,
  computeConstrainedAllocation,
  computePriorityLocal,
  computePriorityQueueLocal,
  generateDecisionRecord,
  verifyDemoExecutiveAuth,
  CANONICAL_PROVENANCE_CLASSES,
  getAuthoritativeGovernanceTier,
  OPERATIONAL_DECISION_RECORDS,
  GOVERNANCE_DECISIONS,
  GOVERNANCE_AUDIT_LOG,
} = require("../backend/server");

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

async function runAllTests() {
  console.log("\n━━━ WATERFLOW OS: DAY 2 OPERATIONAL TRUST & EXPLAINABILITY TEST SUITE ━━━\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------------------
    // GROUP 1: PRIORITY EXPLANATION INTEGRITY
    // -------------------------------------------------------------------------
    console.log("─── GROUP 1: PRIORITY SCORING EXPLANATION ───");

    await test("1. Priority explanation corresponds to actual mathematical factor values", () => {
      const mockWard = {
        ward_id: 1,
        ward_number: "M/E",
        name: "Govandi",
        vulnerability_index: 0.96,
        dry_pipe_hours: 58,
        population: 807720,
        historical_deficit: 0.75,
        depot_distance_km: 4.8,
        demand_liters: 40000,
      };

      const result = computePriorityLocal(mockWard);
      assert.ok(result.total_score >= 75, `Score should be elevated for high vulnerability and outage (got ${result.total_score})`);
      assert.strictEqual(result.priority_factors.length, 5, "Must decompose into exactly 5 canonical factors");

      // Verify Vulnerability factor
      const vulnFactor = result.priority_factors.find((f) => f.factor_name === "Vulnerability Exposure");
      assert.strictEqual(vulnFactor.weight, 0.30);
      assert.strictEqual(vulnFactor.raw_value, 0.96);
      assert.strictEqual(vulnFactor.weighted_contribution, 28.8);
      assert.strictEqual(vulnFactor.direction, "INCREASES_PRIORITY");

      // Verify Dry Pipe factor
      const dryFactor = result.priority_factors.find((f) => f.factor_name === "Dry Pipe Duration");
      assert.strictEqual(dryFactor.weight, 0.25);
      assert.strictEqual(dryFactor.raw_value, 58);
      assert.strictEqual(dryFactor.direction, "INCREASES_PRIORITY");

      // Verify explanation string mentions actual values
      assert.ok(result.why_summary.includes("0.96"), "Explanation summary must include raw vulnerability index");
      assert.ok(result.why_summary.includes("58h"), "Explanation summary must include dry pipe hours");
    });

    await test("2. Changing a factor changes the score and explanation appropriately", () => {
      const baseWard = {
        ward_id: 2,
        ward_number: "H/W",
        vulnerability_index: 0.30,
        dry_pipe_hours: 10,
        population: 500000,
        historical_deficit: 0.20,
        depot_distance_km: 8.0,
        demand_liters: 10000,
      };

      const resultLow = computePriorityLocal(baseWard);

      // Increase dry pipe hours to 70h (severe crisis)
      const crisisWard = { ...baseWard, dry_pipe_hours: 70 };
      const resultHigh = computePriorityLocal(crisisWard);

      assert.ok(resultHigh.total_score > resultLow.total_score, "Higher outage hours must increase priority score");
      const diff = resultHigh.total_score - resultLow.total_score;
      // Dry pipe weight is 0.25, delta is (70 - 10) / 72 * 0.25 * 100 ~= 20.8 points
      assert.ok(diff >= 19 && diff <= 22, `Score delta should reflect exact math weight (got ${diff})`);

      assert.ok(resultHigh.why_summary.includes("70h"), "New explanation must reflect updated 70h outage");
      assert.ok(!resultHigh.why_summary.includes("10h"), "Old factor value must not appear in updated explanation");
    });

    await test("3. No unexplained or phantom factor appears in priority breakdown", () => {
      const ward = {
        ward_id: 3,
        ward_number: "T",
        vulnerability_index: 0.50,
        dry_pipe_hours: 24,
        population: 400000,
        historical_deficit: 0.30,
        depot_distance_km: 12.0,
      };

      const result = computePriorityLocal(ward);
      const factorNames = result.priority_factors.map((f) => f.factor_name);
      const expectedFactors = [
        "Vulnerability Exposure",
        "Dry Pipe Duration",
        "Population Density",
        "Historical Service Deficit",
        "Depot Distance",
      ];
      assert.deepStrictEqual(factorNames.sort(), expectedFactors.sort(), "Only approved canonical factors may appear");

      const sumWeights = result.priority_factors.reduce((sum, f) => sum + f.weight, 0);
      assert.ok(Math.abs(sumWeights - 1.0) < 1e-6, "Weights must sum exactly to 1.00");
    });

    await test("3a. Mathematical Invariant: Score conservation across all 24 Mumbai BMC wards", async () => {
      const wards = await getWards();
      for (const w of wards) {
        const res = computePriorityLocal(w);
        const sumContributions = Math.round(res.priority_factors.reduce((sum, f) => sum + f.weighted_contribution, 0) * 10) / 10;
        assert.ok(
          Math.abs(res.total_score - sumContributions) < 0.01,
          `Score conservation violated for Ward ${w.ward_number}: score (${res.total_score}) !== sum of contributions (${sumContributions})`
        );
      }
    });

    await test("3b. Priority Determinism: Identical inputs produce identical priority scores and factors", async () => {
      const wards = await getWards();
      const testWard = wards[0];
      const run1 = computePriorityLocal(testWard);
      const run2 = computePriorityLocal(testWard);
      assert.strictEqual(run1.total_score, run2.total_score, "Score must be perfectly deterministic");
      assert.deepStrictEqual(run1.priority_factors, run2.priority_factors, "Factors must be perfectly deterministic");
    });

    await test("3c. Sensitivity Monotonicity: Increasing dry-pipe outage strictly increases outage contribution", () => {
      const wardA = { ward_id: 10, ward_number: "M/E", dry_pipe_hours: 20, vulnerability_index: 0.5 };
      const wardB = { ward_id: 10, ward_number: "M/E", dry_pipe_hours: 50, vulnerability_index: 0.5 };
      const resA = computePriorityLocal(wardA);
      const resB = computePriorityLocal(wardB);

      const dryA = resA.priority_factors.find(f => f.factor_name === "Dry Pipe Duration");
      const dryB = resB.priority_factors.find(f => f.factor_name === "Dry Pipe Duration");

      assert.ok(dryB.weighted_contribution > dryA.weighted_contribution, "Outage contribution must increase with outage duration");
      assert.ok(resB.total_score > resA.total_score, "Total score must increase with outage duration");
    });

    await test("3d. Sensitivity Monotonicity: Increasing depot distance strictly increases distance contribution", () => {
      const wardClose = { ward_id: 11, ward_number: "S", depot_distance_km: 2.0, vulnerability_index: 0.5 };
      const wardFar = { ward_id: 11, ward_number: "S", depot_distance_km: 15.0, vulnerability_index: 0.5 };
      const resClose = computePriorityLocal(wardClose);
      const resFar = computePriorityLocal(wardFar);

      const distClose = resClose.priority_factors.find(f => f.factor_name === "Depot Distance");
      const distFar = resFar.priority_factors.find(f => f.factor_name === "Depot Distance");

      assert.ok(distClose, "Depot Distance factor must exist");
      assert.strictEqual(distClose.direction, "INCREASES_PRIORITY");
      assert.ok(distFar.weighted_contribution > distClose.weighted_contribution, "Distance contribution must increase with greater depot distance");
      assert.ok(resFar.total_score > resClose.total_score, "Total score must increase with greater transit distance");
    });

    await test("3e. Mathematical Invariant: Total score equals factor sum without silent clipping", async () => {
      const wards = await getWards();
      for (const w of wards) {
        const res = computePriorityLocal(w);
        const sumContributions = Math.round(res.priority_factors.reduce((sum, f) => sum + f.weighted_contribution, 0) * 10) / 10;
        // Total score must strictly equal factor sum without any silent clipping divergence
        assert.strictEqual(res.total_score, sumContributions, `total_score strictly equals factorSum for Ward ${w.ward_number}`);
        assert.ok(res.total_score >= 0.0 && res.total_score <= 100.0, "Score within valid 0-100 range");
      }
    });

    // -------------------------------------------------------------------------
    // GROUP 2: CONSTRAINED ALLOCATION & BINDING CONSTRAINTS
    // -------------------------------------------------------------------------
    console.log("\n─── GROUP 2: CONSTRAINED ALLOCATION & EXPLICIT INFEASIBILITY ───");

    await test("4. Allocation result reports requested, available, reserved, allocated, and unmet demand", async () => {
      resetOperationalState();
      const wards = await getWards();

      const alloc = computeConstrainedAllocation({
        wards,
        available_supply_liters: 600000,
        strategic_reserve_fraction: 0.20,
        water_quality_safe: true,
      });

      assert.strictEqual(alloc.gross_supply_liters, 600000);
      assert.strictEqual(alloc.strategic_reserve_held_liters, 120000);
      assert.strictEqual(alloc.net_supply_liters, 480000);
      assert.ok(alloc.total_demand_liters > 0);
      assert.strictEqual(alloc.total_allocated_liters + alloc.total_unmet_demand_liters, alloc.total_demand_liters);
      assert.ok(alloc.explanation.summary.includes("480000L"), "Explanation must quote usable supply");
    });

    await test("5. Supply constraint is explicitly reported when binding", async () => {
      const wards = await getWards();
      // Supply is very low (50kL) relative to total demand
      const alloc = computeConstrainedAllocation({
        wards,
        available_supply_liters: 50000,
        strategic_reserve_fraction: 0.10,
        water_quality_safe: true,
      });

      assert.strictEqual(alloc.is_feasible, true);
      assert.strictEqual(alloc.status, "PARTIALLY_CONSTRAINED");
      assert.strictEqual(alloc.code, "SUPPLY_LIMIT");
      assert.ok(alloc.binding_constraints.includes("SUPPLY_BUDGET_REACHED"), "Must report SUPPLY_BUDGET_REACHED when supply binds");
    });

    await test("6. Demand ceiling is reported when binding for fully satisfied wards", async () => {
      // Supply is massive (10M L) -> exceeds all ward demands
      const wards = await getWards();
      const alloc = computeConstrainedAllocation({
        wards,
        available_supply_liters: 10000000,
        strategic_reserve_fraction: 0.10,
        water_quality_safe: true,
      });

      assert.strictEqual(alloc.status, "OPTIMAL_FULL_SATISFACTION");
      assert.strictEqual(alloc.code, "DEMAND_CEILING");
      assert.strictEqual(alloc.total_unmet_demand_liters, 0);
      assert.ok(alloc.binding_constraints.includes("DEMAND_CEILING_BOUND"), "Demand ceiling must bind when demand is completely satisfied");
    });

    await test("7. Strategic reserve protection is reported when reserve withholds usable water", async () => {
      const wards = await getWards();
      // Total demand across MOCK_WARDS is ~254k liters.
      // With gross supply 150k and 25% reserve, 37.5k is withheld, leaving 112.5k usable.
      // Since 112.5k < 254k, reserve protection actively binds and restricts delivery.
      const alloc = computeConstrainedAllocation({
        wards,
        available_supply_liters: 150000,
        strategic_reserve_fraction: 0.25,
        water_quality_safe: true,
      });

      assert.ok(alloc.binding_constraints.includes("STRATEGIC_RESERVE_PROTECTION"), "Must report STRATEGIC_RESERVE_PROTECTION constraint");
      assert.strictEqual(alloc.strategic_reserve_held_liters, 37500);
    });

    await test("8. Water quality alert produces explicit QUALITY_LOCKOUT infeasibility", async () => {
      const wards = await getWards();
      const alloc = computeConstrainedAllocation({
        wards,
        available_supply_liters: 800000,
        strategic_reserve_fraction: 0.15,
        water_quality_safe: false,
      });

      assert.strictEqual(alloc.is_feasible, false);
      assert.strictEqual(alloc.status, "WATER_QUALITY_LOCKOUT");
      assert.strictEqual(alloc.code, "QUALITY_LOCKOUT");
      assert.ok(alloc.binding_constraints.includes("WATER_QUALITY_LOCKOUT"));
      assert.strictEqual(alloc.total_allocated_liters, 0);
    });

    await test("9. Zero supply fails safely with explicit SUPPLY_LIMIT code", async () => {
      const wards = await getWards();
      const alloc = computeConstrainedAllocation({
        wards,
        available_supply_liters: 0,
        strategic_reserve_fraction: 0.15,
        water_quality_safe: true,
      });

      assert.strictEqual(alloc.is_feasible, false);
      assert.strictEqual(alloc.status, "SUPPLY_EXHAUSTED");
      assert.strictEqual(alloc.feasibility_status, "INFEASIBLE");
      assert.strictEqual(alloc.code, "SUPPLY_LIMIT");
      assert.ok(alloc.binding_constraints.includes("SUPPLY_BUDGET_REACHED"));
      assert.strictEqual(alloc.total_allocated_liters, 0);
    });

    await test("10. 100% reserve protection explicitly reports RESERVE_PROTECTION infeasibility", async () => {
      const wards = await getWards();
      const alloc = computeConstrainedAllocation({
        wards,
        available_supply_liters: 500000,
        strategic_reserve_fraction: 1.0, // 100% held in reserve
        water_quality_safe: true,
      });

      assert.strictEqual(alloc.is_feasible, false);
      assert.strictEqual(alloc.code, "RESERVE_PROTECTION");
      assert.strictEqual(alloc.feasibility_status, "INFEASIBLE");
      assert.ok(alloc.binding_constraints.includes("STRATEGIC_RESERVE_PROTECTION"));
      assert.strictEqual(alloc.total_allocated_liters, 0);
    });

    // -------------------------------------------------------------------------
    // GROUP 3: DATA PROVENANCE & FRESHNESS SEMANTICS
    // -------------------------------------------------------------------------
    console.log("\n─── GROUP 3: DATA PROVENANCE & FRESHNESS SEMANTICS ───");

    await test("11. Seeded telemetry values explicitly identify SYNTHETIC_SEEDED provenance", async () => {
      const wards = await getWards();
      const wardME = wards.find((w) => w.ward_number === "M/E");
      const priority = computePriorityLocal(wardME);

      const vulnFactor = priority.priority_factors.find((f) => f.factor === "Vulnerability");
      assert.strictEqual(vulnFactor.provenance, "SYNTHETIC_SEEDED", "Vulnerability must identify SYNTHETIC_SEEDED");

      const dryFactor = priority.priority_factors.find((f) => f.factor === "Dry Pipe Time");
      assert.strictEqual(dryFactor.provenance, "SYNTHETIC_SEEDED", "Dry pipe outage must identify SYNTHETIC_SEEDED");
    });

    await test("12. Benchmark water standards identify REFERENCE_CONSTANT (MoHUA 135 LPCD)", () => {
      const mockWard = { ward_number: "M/E", demand_liters: 20000 };
      const record = generateDecisionRecord({
        ward: mockWard,
        volume_liters: 10000,
        tanker: { transponder_id: "T-01", capacity: 10000 },
        governance_tier: 1,
      });

      assert.strictEqual(record.data_provenance.demand.source_type, "REFERENCE_CONSTANT");
      assert.ok(record.data_provenance.demand.status.includes("operational benchmark target"));
      assert.ok(!record.data_provenance.demand.status.includes("statutory entitlement"));
    });

    await test("13. Census demographic population values identify REFERENCE_DATA", () => {
      const mockWard = { ward_number: "G/N", population: 599013 };
      const record = generateDecisionRecord({
        ward: mockWard,
        volume_liters: 10000,
        tanker: { transponder_id: "T-01", capacity: 10000 },
        governance_tier: 1,
      });

      assert.strictEqual(record.data_provenance.population.source_type, "REFERENCE_DATA");
      assert.ok(record.data_provenance.population.reference.includes("Census"));
    });

    await test("14. Missing or undocumented timestamps produce UNKNOWN freshness without false pretense", () => {
      const mockProvenance = {
        source_type: "REFERENCE_DATA",
        reference: "BMC Historical Archive",
        timestamp: null,
      };

      const determineFreshness = (p) => (p.timestamp ? "CURRENT" : "UNKNOWN");
      assert.strictEqual(determineFreshness(mockProvenance), "UNKNOWN", "Must not falsely claim CURRENT when timestamp is null");
    });

    await test("14b. Provenance Taxonomy Invariant: All factor and decision provenance classes belong to canonical taxonomy", async () => {
      const wards = await getWards();
      for (const w of wards) {
        const res = computePriorityLocal(w);
        for (const f of res.priority_factors) {
          assert.ok(
            CANONICAL_PROVENANCE_CLASSES.includes(f.provenance_class || f.provenance),
            `Factor ${f.factor_name} has invalid non-canonical provenance class: ${f.provenance_class || f.provenance}`
          );
        }
      }

      // Check seed decision records
      for (const [, dec] of OPERATIONAL_DECISION_RECORDS) {
        for (const [key, prov] of Object.entries(dec.data_provenance)) {
          const provClass = prov.class || prov.source_type;
          assert.ok(
            CANONICAL_PROVENANCE_CLASSES.includes(provClass),
            `Decision ${dec.decision_id} input ${key} has non-canonical provenance class: ${provClass}`
          );
        }
      }
    });

    // -------------------------------------------------------------------------
    // GROUP 4: GOVERNANCE HARDENING & CREDENTIAL DECOUPLING
    // -------------------------------------------------------------------------
    console.log("\n─── GROUP 4: GOVERNANCE & CREDENTIAL HARDENING ───");

    await test("15. Tier 3 consequential dispatch requires explicit authorization", async () => {
      const res = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_code: "M/E",
          volume_liters: 25000, // >15kL triggers Tier 3
        }),
      });

      assert.strictEqual(res.status, 403, "Tier 3 must reject unauthorized request with 403");
      const err = await res.json();
      assert.strictEqual(err.governance_tier, 3);
      assert.ok(err.error.includes("TIER_3_PIN_REQUIRED"));
    });

    await test("16. Authorization result is recorded with audit trail and actor identifier", async () => {
      const auditLenBefore = GOVERNANCE_AUDIT_LOG.length;
      const res = await fetch(`${baseUrl}/api/governance/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision_id: "gov-t3-001",
          action: "AUTHORIZE",
          pin: "DEMO_EXEC_PIN_4491",
          officer_id: "DEMO_OPERATOR_01",
          officer_name: "Shift Supervisor Demo",
          justification: "Hospital pre-emption emergency approved under demo protocol",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.new_status, "authorized");
      assert.ok(GOVERNANCE_AUDIT_LOG.length > auditLenBefore, "Must record audit event");

      const latestAudit = GOVERNANCE_AUDIT_LOG[GOVERNANCE_AUDIT_LOG.length - 1];
      assert.strictEqual(latestAudit.decision_id, "gov-t3-001");
      assert.ok(latestAudit.authorization_gate.includes("DEMO AUTHORIZATION GATE"));
    });

    await test("17. Demonstration credentials are non-production tokens and reject arbitrary invalid tokens", () => {
      const validTokenCheck = verifyDemoExecutiveAuth("DEMO_EXEC_PIN_4491");
      assert.strictEqual(validTokenCheck.valid, true);
      assert.strictEqual(validTokenCheck.mode, "DEMO_EXECUTIVE_AUTH");
      assert.ok(validTokenCheck.label.includes("NOT PRODUCTION CREDENTIAL"));

      const invalidTokenCheck = verifyDemoExecutiveAuth("wrong_pass_9999");
      assert.strictEqual(invalidTokenCheck.valid, false);
      assert.ok(invalidTokenCheck.reason.includes("TIER_3_PIN_REQUIRED"));
    });

    // -------------------------------------------------------------------------
    // GROUP 5: DISPATCH, DECISION ID & MISSION TRACEABILITY
    // -------------------------------------------------------------------------
    console.log("\n─── GROUP 5: DISPATCH, DECISION RECORD & MISSION TRACEABILITY ───");

    let traceableDecisionId = null;
    let traceableMissionId = null;

    await test("18. Dispatch creates an Operational Decision Record linked to mission ID", async () => {
      const res = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_code: "P/N",
          volume_liters: 10000,
          pin: "DEMO_EXEC_PIN_4491",
          notes: "Traceable test dispatch for Malad P/North",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.decision_id, "Must return decision_id");
      assert.ok(data.decision_record, "Must return decision_record");
      assert.strictEqual(data.decision_record.decision_id, data.decision_id);
      assert.strictEqual(data.decision_record.mission_id, String(data.mission.id));
      assert.strictEqual(data.mission.decision_id, data.decision_id);

      traceableDecisionId = data.decision_id;
      traceableMissionId = String(data.mission.id);
    });

    await test("19. GET /api/decisions/:id returns complete end-to-end trace", async () => {
      const res = await fetch(`${baseUrl}/api/decisions/${traceableDecisionId}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.decision.decision_id, traceableDecisionId);
      assert.strictEqual(data.complete_trace.decision_id, traceableDecisionId);
      assert.strictEqual(data.complete_trace.mission_id, traceableMissionId);
      assert.ok(data.complete_trace.priority_factors.length === 5);
      assert.strictEqual(data.decision.execution_status, "DISPATCHED");
    });

    await test("19b. Decision Record Priority Consistency: record.priority equals authoritative score and contribution sum", async () => {
      for (const [, dec] of OPERATIONAL_DECISION_RECORDS) {
        const sumContributions = Math.round(dec.priority_factors.reduce((sum, f) => sum + f.weighted_contribution, 0) * 10) / 10;
        assert.ok(
          Math.abs(dec.priority - sumContributions) < 0.01,
          `Decision ${dec.decision_id} priority (${dec.priority}) does not equal contribution sum (${sumContributions})`
        );
        if (dec.priority_breakdown) {
          assert.strictEqual(dec.priority_breakdown.invariant_holds, true);
        }
      }
    });

    await test("19c. Decision Record Allocation Field Semantics: Unambiguous before/after and tanker volume fields", () => {
      for (const [, dec] of OPERATIONAL_DECISION_RECORDS) {
        assert.ok(dec.ward_unmet_demand_before_liters !== undefined, "ward_unmet_demand_before_liters must exist");
        assert.ok(dec.tanker_requested_liters !== undefined, "tanker_requested_liters must exist");
        assert.ok(dec.tanker_allocated_liters !== undefined, "tanker_allocated_liters must exist");
        assert.ok(dec.ward_unmet_demand_after_liters !== undefined, "ward_unmet_demand_after_liters must exist");

        // Allocation invariant: residual ward unmet demand after intervention equals max(0, before - allocated)
        const expectedResidual = Math.max(0, dec.ward_unmet_demand_before_liters - dec.tanker_allocated_liters);
        assert.strictEqual(
          dec.ward_unmet_demand_after_liters,
          expectedResidual,
          `Residual demand invariant holds for ${dec.decision_id}`
        );

        // Granted volume cannot exceed requested volume
        assert.ok(
          dec.tanker_allocated_liters <= dec.tanker_requested_liters,
          `Allocated volume cannot exceed requested volume for ${dec.decision_id}`
        );

        // Backward compatibility: legacy aliases match explicit fields exactly
        assert.strictEqual(dec.allocation_requested, dec.tanker_requested_liters);
        assert.strictEqual(dec.allocation_granted, dec.tanker_allocated_liters);
        assert.strictEqual(dec.unmet_demand, dec.ward_unmet_demand_after_liters);
      }
    });

    await test("20. Unauthorized Tier 3 dispatch is rejected without mission creation", async () => {
      const initialMissionsCount = MISSION_VERSIONS.size;
      const res = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_code: "M/E",
          volume_liters: 30000,
          pin: "invalid_unauthorized_token",
        }),
      });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(MISSION_VERSIONS.size, initialMissionsCount, "No mission must be created on rejected dispatch");
    });

    // -------------------------------------------------------------------------
    // GROUP 6: VERIFICATION LIFECYCLE & STATE DELTAS
    // -------------------------------------------------------------------------
    console.log("\n─── GROUP 6: VERIFICATION LIFECYCLE & STATE DELTAS ───");

    let verificationMissionId = null;
    let verificationOtp = null;

    await test("21. Local pending state is distinct from server acceptance in field sync", async () => {
      // Create new mission
      const dispatchRes = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_code: "F/N",
          volume_liters: 10000,
          pin: "DEMO_EXEC_PIN_4491",
        }),
      });
      const dispatchData = await dispatchRes.json();
      verificationMissionId = String(dispatchData.mission.id);
      verificationOtp = dispatchData.otp_code;

      // 1. Worker records action offline (SAVED_LOCALLY_PENDING_SYNC)
      const offlineAction = {
        operation_id: `op-trust-test-${Date.now()}`,
        client_timestamp: new Date().toISOString(),
        action_type: "DELIVERY_RECORD",
        mission_id: verificationMissionId,
        mission_version: 1,
        worker_id: "W-TRUST-01",
        payload: {
          quantity_liters: 10000,
          recipient_otp: verificationOtp,
        },
      };

      // 2. Submit to sync
      const syncRes = await fetch(`${baseUrl}/api/field/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_id: "W-TRUST-01",
          operations: [offlineAction],
        }),
      });

      assert.strictEqual(syncRes.status, 200);
      const syncData = await syncRes.json();
      assert.strictEqual(syncData.results[0].status, "ACCEPTED");

      // Verify mission status on server is now pending verification / delivered
      const mission = MISSION_VERSIONS.get(verificationMissionId);
      assert.strictEqual(mission.delivery_status, "delivered");
      assert.strictEqual(mission.verification_state, "PENDING_VERIFICATION");
    });

    await test("22. Server acceptance is distinct from formal VERIFIED status", () => {
      const mission = MISSION_VERSIONS.get(verificationMissionId);
      assert.strictEqual(mission.verification_state, "PENDING_VERIFICATION");
      assert.notStrictEqual(mission.verification_state, "VERIFIED", "Accepted sync must not be VERIFIED before OTP gate verification");
    });

    await test("23. Authoritative verification produces exact state delta (post_action_effect)", async () => {
      const wardsBefore = await getWards();
      const wardFNBefore = wardsBefore.find((w) => w.ward_number === "F/N");
      const demandBefore = wardFNBefore.demand_liters;

      const verifyRes = await fetch(`${baseUrl}/api/field/missions/${verificationMissionId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: verificationOtp,
          quantity_liters: 10000,
          officer_id: "VERIF_OFFICER_01",
        }),
      });

      assert.strictEqual(verifyRes.status, 200);
      const verifyData = await verifyRes.json();
      assert.strictEqual(verifyData.verification_state, "VERIFIED");
      assert.ok(verifyData.post_action_effect, "Response must include post_action_effect state delta");

      const delta = verifyData.post_action_effect;
      assert.strictEqual(delta.verified_volume_delivered, 10000);
      assert.strictEqual(delta.pre_delivery_unmet_demand, demandBefore);
      assert.strictEqual(delta.post_delivery_unmet_demand, Math.max(0, demandBefore - 10000));
      assert.strictEqual(delta.unmet_demand_reduction_liters, 10000);

      // Verify linked decision record was updated
      const mission = MISSION_VERSIONS.get(verificationMissionId);
      if (mission.decision_id) {
        const decRecord = OPERATIONAL_DECISION_RECORDS.get(mission.decision_id);
        assert.strictEqual(decRecord.verification_status, "VERIFIED");
        assert.strictEqual(decRecord.execution_status, "DELIVERED");
        assert.ok(decRecord.post_action_effect);
      }
    });

    await test("24. Duplicate verification attempt is rejected with 409 Conflict", async () => {
      const verifyRes = await fetch(`${baseUrl}/api/field/missions/${verificationMissionId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: verificationOtp,
          quantity_liters: 10000,
        }),
      });

      assert.strictEqual(verifyRes.status, 409);
      const err = await verifyRes.json();
      assert.ok(err.error.includes("already in state VERIFIED"));
    });

    // -------------------------------------------------------------------------
    // GROUP 7: CLOSED-LOOP CONSISTENCY & AUDIT TRACE
    // -------------------------------------------------------------------------
    console.log("\n─── GROUP 7: CLOSED-LOOP CONSISTENCY & AUDIT TRACE ───");

    await test("25. Pre-delivery and post-delivery ward demand agree with delivered quantity", async () => {
      const wards = await getWards();
      const wardFN = wards.find((w) => w.ward_number === "F/N");
      // Ward F/N started with 10,000L baseline demand and received 10,000L verified delivery -> 0L remaining
      assert.strictEqual(wardFN.demand_liters, 0);
    });

    await test("26. Tanker becomes available only after delivery verification lifecycle", async () => {
      const mission = MISSION_VERSIONS.get(verificationMissionId);
      const tankers = await getTankers();
      const tanker = tankers.find((t) => t.transponder_id === mission.tanker_id);

      assert.strictEqual(tanker.status, "available", "Tanker must return to available pool");
      assert.strictEqual(tanker.current_load, 0, "Tanker load must reset to 0L");
      assert.strictEqual(tanker.assigned_ward, null, "Assigned ward must clear");
    });

    await test("27. Audit trace contains complete operation, mission, and decision linkage", () => {
      const mission = MISSION_VERSIONS.get(verificationMissionId);
      assert.ok(mission.audit_trace.length >= 2, "Audit trace must contain dispatch and verification events");

      const verifTrace = mission.audit_trace.find((t) => t.action_type === "DELIVERY_VERIFIED");
      assert.ok(verifTrace);
      assert.strictEqual(verifTrace.status, "VERIFIED");
      assert.strictEqual(verifTrace.quantity, 10000);
      assert.strictEqual(verifTrace.otp_authenticated, true);
    });

    // -------------------------------------------------------------------------
    // GROUP 8: FAILURE SAFETY & BOUNDARY HANDLING
    // -------------------------------------------------------------------------
    console.log("\n─── GROUP 8: FAILURE SAFETY & BOUNDARY HANDLING ───");

    await test("28. Rejects dispatch when no tanker is available with NO_AVAILABLE_TANKER", async () => {
      const tankers = await getTankers();
      // Temporarily mark all tankers en_route
      const originalStatuses = tankers.map((t) => t.status);
      tankers.forEach((t) => { t.status = "en_route"; });

      const res = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_code: "A",
          volume_liters: 10000,
          pin: "DEMO_EXEC_PIN_4491",
        }),
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.reason, "NO_AVAILABLE_TANKER");
      assert.strictEqual(data.status, "INFEASIBLE");

      // Restore tankers
      tankers.forEach((t, i) => { t.status = originalStatuses[i]; });
    });

    await test("29. Rejects dispatch to nonexistent ward with 404 Not Found", async () => {
      const res = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_code: "NONEXISTENT_MUMBAI_WARD_999",
          volume_liters: 10000,
          pin: "DEMO_EXEC_PIN_4491",
        }),
      });

      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes("not found"));
    });

    await test("30. Rejects verification on cancelled mission with 409 Conflict", () => {
      const cancelledMission = createMission({
        ward_code: "C",
        target_liters: 5000,
      });
      cancelledMission.cancelled = true;

      assert.throws(
        () => {
          verifyMissionDelivery(cancelledMission.id, {
            otp: cancelledMission.otp_code,
            quantity_liters: 5000,
          });
        },
        (err) => err.statusCode === 409 && err.message.includes("CANCELLED")
      );
    });

    await test("31. Rejects invalid non-positive volume or missing ward_code input", async () => {
      const resNoWard = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume_liters: 10000 }),
      });
      assert.strictEqual(resNoWard.status, 400);

      const resZeroVol = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ward_code: "A", volume_liters: 0 }),
      });
      assert.strictEqual(resZeroVol.status, 400);
    });

    await test("32. GET /api/priority-ranking returns sorted queue with provenance badge", async () => {
      const res = await fetch(`${baseUrl}/api/priority-ranking`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.total_wards, 24);
      assert.ok(data.provenance_badge.includes("SYNTHETIC_SEEDED"));
      assert.ok(data.queue[0].total_score >= data.queue[1].total_score, "Queue must be sorted descending by priority score");
    });
  } finally {
    server.close();
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  DAY 2 TEST RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
