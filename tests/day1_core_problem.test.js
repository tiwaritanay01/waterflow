/**
 * WaterFlow OS — Day 1 Core Operational Problem Test Suite
 * Closed-Loop Decision Cycle & Operational Execution Integrity
 *
 * Tests the complete operational cycle:
 * Observe -> Diagnose -> Prioritize -> Constrained Allocate -> Dispatch ->
 * Offline Queue -> Idempotent Sync -> Verification Gate -> Closed-Loop State Update -> Audit Trail
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
  console.log("\n━━━ WATERFLOW OS: DAY 1 CORE PROBLEM TEST SUITE ━━━\n");

  // Spin up ephemeral test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------------------
    // Phase A: Constrained Allocation Decision Support
    // -------------------------------------------------------------------------
    console.log("─── PHASE A: CONSTRAINED ALLOCATION & DECISION SUPPORT ───");

    await test("1. Constrained allocation respects demand ceilings and non-negativity across all 24 wards", async () => {
      resetOperationalState();
      const wards = await getWards();
      assert.strictEqual(wards.length, 24, "Must load 24 Mumbai BMC wards");

      const result = computeConstrainedAllocation({
        wards,
        available_supply_liters: 800000,
        strategic_reserve_fraction: 0.15,
        water_quality_safe: true,
      });

      assert.strictEqual(result.is_feasible, true, "Allocation should be feasible with positive supply");
      assert.strictEqual(result.gross_supply_liters, 800000);
      assert.strictEqual(result.strategic_reserve_held_liters, 120000, "15% of 800k is 120k reserve");
      assert.strictEqual(result.net_supply_liters, 680000, "Net supply must equal gross minus reserve");

      for (const a of result.allocations) {
        assert.ok(a.allocated_liters >= 0, `Allocation for ${a.ward_number} cannot be negative`);
        assert.ok(
          a.allocated_liters <= a.demand_liters,
          `Allocation for ${a.ward_number} (${a.allocated_liters}) cannot exceed demand (${a.demand_liters})`
        );
        assert.strictEqual(a.unmet_demand_liters, a.demand_liters - a.allocated_liters);
      }

      assert.ok(
        result.total_allocated_liters <= result.net_supply_liters,
        `Total allocated (${result.total_allocated_liters}) cannot exceed net supply (${result.net_supply_liters})`
      );
    });

    await test("2. Constrained allocation handles zero or negative supply safely without crashes", async () => {
      const wards = await getWards();
      const zeroResult = computeConstrainedAllocation({
        wards,
        available_supply_liters: 0,
        strategic_reserve_fraction: 0.15,
        water_quality_safe: true,
      });

      assert.strictEqual(zeroResult.total_allocated_liters, 0);
      assert.strictEqual(zeroResult.is_feasible, false);
      assert.strictEqual(zeroResult.status, "SUPPLY_EXHAUSTED");

      const negResult = computeConstrainedAllocation({
        wards,
        available_supply_liters: -50000,
        strategic_reserve_fraction: 0.15,
        water_quality_safe: true,
      });
      assert.strictEqual(negResult.total_allocated_liters, 0);
      assert.strictEqual(negResult.is_feasible, false);
    });

    await test("3. Water quality alert triggers emergency zero-dispatch lockout", async () => {
      const wards = await getWards();
      const result = computeConstrainedAllocation({
        wards,
        available_supply_liters: 800000,
        strategic_reserve_fraction: 0.15,
        water_quality_safe: false, // Contamination simulated
      });

      assert.strictEqual(result.is_feasible, false);
      assert.strictEqual(result.status, "WATER_QUALITY_LOCKOUT");
      assert.strictEqual(result.net_supply_liters, 0);
      assert.strictEqual(result.total_allocated_liters, 0);
      assert.ok(result.reason.includes("Contamination"), "Reason must mention contamination or quality freeze");
    });

    await test("4. POST /api/allocation/evaluate endpoint returns explicit unmet demand and provenance", async () => {
      const res = await fetch(`${baseUrl}/api/allocation/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          available_supply_liters: 500000,
          strategic_reserve_fraction: 0.20,
          water_quality_safe: true,
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.gross_supply_liters, 500000);
      assert.strictEqual(data.strategic_reserve_held_liters, 100000);
      assert.strictEqual(data.net_supply_liters, 400000);
      assert.ok(data.total_unmet_demand_liters >= 0);
      assert.strictEqual(data.provenance, "CONSTRAINED_ALLOCATION_ENGINE");
      assert.strictEqual(data.policy_benchmark, "MoHUA_135_LPCD_BENCHMARK_TARGET");
    });

    // -------------------------------------------------------------------------
    // Phase B: Operational Dispatch & Fleet Assignment
    // -------------------------------------------------------------------------
    console.log("\n─── PHASE B: OPERATIONAL DISPATCH & FLEET ASSIGNMENT ───");

    await test("5. Tier 3 critical dispatch requires executive authorization PIN", async () => {
      resetOperationalState();

      // Attempt Tier 3 dispatch to Govandi (Ward M/E, 58h dry, 32,000L demand) without PIN
      const resWithoutPin = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_code: "M/E",
          volume_liters: 20000, // >15kL triggers Tier 3
        }),
      });

      assert.strictEqual(resWithoutPin.status, 403, "Must return 403 Forbidden without valid PIN");
      const errJson = await resWithoutPin.json();
      assert.strictEqual(errJson.success, false);
      assert.ok(errJson.error.includes("TIER_3_PIN_REQUIRED"));
      assert.strictEqual(errJson.governance_tier, 3);
    });

    await test("6. Tier 3 dispatch with valid PIN successfully creates mission and assigns tanker", async () => {
      const tankersBefore = await getTankers();
      const availableTankersBefore = tankersBefore.filter((t) => t.status === "available");
      assert.ok(availableTankersBefore.length > 0, "Must have available tankers");

      const res = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_code: "M/E",
          volume_liters: 10000,
          pin: "4491", // Valid executive PIN
          officer_name: "Executive Engineer Patil",
          notes: "Priority dispatch for Shivaji Nagar informal settlement",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.mission, "Response must include created mission");
      assert.ok(data.mission.id, "Mission must have an ID");
      assert.strictEqual(data.mission.ward_code, "M/E");
      assert.strictEqual(data.mission.target_liters, 10000);
      assert.ok(data.otp_code, "Mission must contain citizen OTP code");

      // Verify tanker mutated to en_route
      assert.strictEqual(data.tanker.status, "en_route");
      assert.strictEqual(data.tanker.assigned_ward, "M/E");

      // Verify mission is present in authoritative field_sync store
      assert.ok(MISSION_VERSIONS.get(String(data.mission.id)), "Mission must exist in MISSION_VERSIONS");
    });

    await test("7. Dispatch rejects invalid ward code with 404", async () => {
      const res = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_code: "NONEXISTENT_WARD_XYZ",
          volume_liters: 5000,
        }),
      });
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // -------------------------------------------------------------------------
    // Phase C: Field Execution, Offline Resilience & Verification
    // -------------------------------------------------------------------------
    console.log("\n─── PHASE C: FIELD EXECUTION, OFFLINE QUEUE & VERIFICATION ───");

    let dynamicMissionId = null;
    let citizenOtp = null;

    await test("8. Generate dynamic mission for field worker delivery", async () => {
      const res = await fetch(`${baseUrl}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_code: "G/N", // Dharavi
          volume_liters: 8000,
          pin: "admin123",
          officer_name: "Assistant Commissioner",
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      dynamicMissionId = String(data.mission.id);
      citizenOtp = data.otp_code;
      assert.ok(dynamicMissionId);
      assert.ok(citizenOtp);
    });

    await test("9. Offline delivery action records locally with SAVED_LOCALLY_PENDING_SYNC", () => {
      // Simulating offline client recording
      const offlineAction = {
        operation_id: `op-day1-${Date.now()}`,
        client_timestamp: new Date().toISOString(),
        action_type: "DELIVERY_RECORD",
        mission_id: dynamicMissionId,
        mission_version: 1,
        worker_id: "W-4892",
        payload: {
          quantity_liters: 8000,
          recipient_otp: citizenOtp,
          delivery_notes: "Delivered to Dharavi transit camp standpost",
        },
        sync_stage: "SAVED_LOCALLY_PENDING_SYNC",
      };

      assert.strictEqual(offlineAction.sync_stage, "SAVED_LOCALLY_PENDING_SYNC");
      assert.strictEqual(offlineAction.payload.quantity_liters, 8000);
    });

    let lastProcessedOpId = null;

    await test("10. Field sync processes offline delivery and transitions to PENDING_VERIFICATION", () => {
      const opId = `op-day1-sync-${Date.now()}`;
      lastProcessedOpId = opId;
      const result = processOperation({
        operation_id: opId,
        action_type: "DELIVERY_RECORD",
        mission_id: dynamicMissionId,
        mission_version: 1,
        worker_id: "W-4892",
        payload: {
          quantity_liters: 8000,
          recipient_otp: citizenOtp,
        },
      });

      assert.strictEqual(result.status, "ACCEPTED");
      assert.strictEqual(result.new_mission_version, 2);

      const mission = MISSION_VERSIONS.get(dynamicMissionId);
      assert.strictEqual(mission.status, "delivered");
      assert.strictEqual(mission.delivery_quantity_liters, 8000);
      assert.strictEqual(mission.verification_status, "PENDING_VERIFICATION");
    });

    await test("11. Idempotent sync retry returns DUPLICATE without duplicate mutation", () => {
      const missionBefore = { ...MISSION_VERSIONS.get(dynamicMissionId) };

      const retryResult = processOperation({
        operation_id: lastProcessedOpId,
        action_type: "DELIVERY_RECORD",
        mission_id: dynamicMissionId,
        mission_version: 1,
        worker_id: "W-4892",
        payload: {
          quantity_liters: 8000,
          recipient_otp: citizenOtp,
        },
      });

      assert.strictEqual(retryResult.status, "DUPLICATE");
      const missionAfter = MISSION_VERSIONS.get(dynamicMissionId);
      assert.strictEqual(missionAfter.version, missionBefore.version, "Version must not increment on duplicate");
      assert.strictEqual(
        missionAfter.delivery_quantity_liters,
        missionBefore.delivery_quantity_liters,
        "Quantity must not double"
      );
    });

    await test("12. Delivery verification rejects incorrect citizen OTP", async () => {
      const res = await fetch(`${baseUrl}/api/field/missions/${dynamicMissionId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: "0000", // Deliberately incorrect OTP
          delivered_liters: 8000,
        }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes("Invalid citizen verification code"));
    });

    await test("13. Delivery verification rejects quantity exceeding capacity envelope (>150%)", async () => {
      const res = await fetch(`${baseUrl}/api/field/missions/${dynamicMissionId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: citizenOtp,
          delivered_liters: 25000, // > 150% of 8,000L target capacity (12,000L max)
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes("exceeds vehicle capacity envelope"));
    });

    // -------------------------------------------------------------------------
    // Phase D: Closed-Loop Operational State Mutation & Audit
    // -------------------------------------------------------------------------
    console.log("\n─── PHASE D: CLOSED-LOOP MUTATION & AUDIT TRAIL ───");

    await test("14. Valid verification triggers closed-loop demand decrement and tanker release", async () => {
      const wardsBefore = await getWards();
      const wardGNBefore = wardsBefore.find((w) => w.ward_number === "G/N");
      const demandBefore = wardGNBefore.demand_liters;
      const dryHoursBefore = wardGNBefore.dry_pipe_hours;

      const mission = MISSION_VERSIONS.get(dynamicMissionId);
      const tankerId = mission.tanker_id;

      const auditLogLenBefore = GOVERNANCE_AUDIT_LOG.length;

      // Execute verification
      const res = await fetch(`${baseUrl}/api/field/missions/${dynamicMissionId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: citizenOtp,
          delivered_liters: 8000,
          officer_id: "SUP_DHARAVI_01",
        }),
      });

      assert.strictEqual(res.status, 200);
      const verifyJson = await res.json();
      assert.strictEqual(verifyJson.success, true);
      assert.strictEqual(verifyJson.mission.status, "VERIFIED");
      assert.strictEqual(verifyJson.mission.verification_status, "VERIFIED");
      assert.ok(verifyJson.transaction_hash, "Must provide Digital Delivery Receipt ID");

      // Verify closed-loop demand decrement in ward state
      const wardsAfter = await getWards();
      const wardGNAfter = wardsAfter.find((w) => w.ward_number === "G/N");
      assert.strictEqual(
        wardGNAfter.demand_liters,
        Math.max(0, demandBefore - 8000),
        "Ward demand must decrement by delivered liters"
      );
      assert.ok(
        wardGNAfter.dry_pipe_hours <= dryHoursBefore,
        "Ward dry pipe hours must decrease or normalize"
      );

      // Verify tanker returned to 'available' pool
      const tankersAfter = await getTankers();
      const releasedTanker = tankersAfter.find(
        (t) => t.transponder_id === tankerId || t.tanker_id === tankerId
      );
      assert.ok(releasedTanker, "Tanker must exist in tanker state");
      assert.strictEqual(releasedTanker.status, "available", "Tanker must return to status 'available'");
      assert.strictEqual(releasedTanker.current_load, 0, "Tanker load must reset to 0");
      assert.strictEqual(releasedTanker.assigned_ward, null, "Assigned ward must be cleared");

      // Verify audit log appended
      assert.ok(
        GOVERNANCE_AUDIT_LOG.length > auditLogLenBefore,
        "Audit log must record closed-loop delivery verification"
      );
      const lastAudit = GOVERNANCE_AUDIT_LOG[GOVERNANCE_AUDIT_LOG.length - 1];
      assert.strictEqual(lastAudit.action, "DELIVERY_VERIFIED_CLOSED_LOOP");
      assert.strictEqual(lastAudit.ward_code, "G/N");
      assert.strictEqual(lastAudit.volume_delivered, 8000);
      assert.ok(lastAudit.transaction_hash);
    });

    await test("15. Verified mission cannot be verified twice (conflict protection)", async () => {
      const res = await fetch(`${baseUrl}/api/field/missions/${dynamicMissionId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: citizenOtp,
          delivered_liters: 8000,
        }),
      });

      assert.strictEqual(res.status, 409, "Must return 409 Conflict when already verified");
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes("already in state VERIFIED"));
    });

    await test("16. Full dashboard payload reflects active missions, pending verifications, and provenance metadata", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard`);
      assert.strictEqual(res.status, 200);
      const dashboard = await res.json();

      assert.strictEqual(dashboard.city, "Mumbai (Brihanmumbai Municipal Corporation)");
      assert.strictEqual(dashboard.total_wards, 24);
      assert.ok(dashboard.kpis);
      assert.ok(Array.isArray(dashboard.active_missions));
      assert.ok(typeof dashboard.pending_verifications_count === "number");
      assert.ok(dashboard.constrained_allocation);
      assert.ok(
        ["OPTIMAL_FULL_SATISFACTION", "PARTIALLY_CONSTRAINED"].includes(
          dashboard.constrained_allocation.status
        )
      );
      assert.ok(dashboard.provenance_metadata);
      assert.strictEqual(
        dashboard.provenance_metadata.policy_standard,
        "MoHUA_135_LPCD_SERVICE_BENCHMARK"
      );
      assert.strictEqual(dashboard.provenance_metadata.baseline_seed, 42);
    });

    await test("17. Operational state reset deterministically restores Seed 42 baseline", async () => {
      const resetRes = await fetch(`${baseUrl}/api/operational-state/reset`, { method: "POST" });
      assert.strictEqual(resetRes.status, 200);

      const wards = await getWards();
      const meWard = wards.find((w) => w.ward_number === "M/E");
      assert.strictEqual(meWard.demand_liters, 32000, "Ward M/E demand must be restored to 32,000L");
      assert.strictEqual(meWard.dry_pipe_hours, 58, "Ward M/E dry hours restored to 58h");

      const gnWard = wards.find((w) => w.ward_number === "G/N");
      assert.strictEqual(gnWard.demand_liters, 28000, "Ward G/N demand restored to 28,000L");
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  // ---------------------------------------------------------------------------
  // Summary Report
  // ---------------------------------------------------------------------------
  console.log("\n" + "━".repeat(55));
  console.log(`  DAY 1 TEST RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log("━".repeat(55) + "\n");

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runAllTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exitCode = 1;
});
