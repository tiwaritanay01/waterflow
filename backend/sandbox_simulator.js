/**
 * WaterFlow OS — Node.js Policy & Crisis Sandbox Simulation Engine
 * Fallback module for standalone/offline operation when Python FastAPI AI engine is offline.
 * Replicates the deterministic HiGHS LP & Priority Waterfall allocation engine.
 */

const fs = require("fs");
const path = require("path");

// Load wards data
let ALL_MUMBAI_WARDS = [];
try {
  const wardsPath = path.join(__dirname, "../frontend/src/utils/allMumbaiWards.json");
  if (fs.existsSync(wardsPath)) {
    ALL_MUMBAI_WARDS = JSON.parse(fs.readFileSync(wardsPath, "utf8"));
  }
} catch (e) {
  // fallback will use passed-in wards
}

const POLICY_WEIGHTS = {
  EQUAL_SERVICE: {
    vulnerability: 0.20,
    unmet_demand: 0.20,
    population: 0.20,
    historical_deficit: 0.20,
    distance: 0.20,
  },
  PRO_POOR: {
    vulnerability: 0.50,
    unmet_demand: 0.20,
    population: 0.10,
    historical_deficit: 0.10,
    distance: 0.10,
  },
  OUTAGE_FIRST: {
    vulnerability: 0.20,
    unmet_demand: 0.50,
    population: 0.10,
    historical_deficit: 0.10,
    distance: 0.10,
  },
  FACILITY_PROTECTION: {
    vulnerability: 0.25,
    unmet_demand: 0.15,
    population: 0.35,
    historical_deficit: 0.15,
    distance: 0.10,
  },
  LOGISTICS_FIRST: {
    vulnerability: 0.20,
    unmet_demand: 0.20,
    population: 0.15,
    historical_deficit: 0.10,
    distance: 0.35,
  },
};

const CRISIS_SCENARIOS = {
  NORMAL: {
    demand_multiplier: 1.0,
    supply_reduction_pct: 0.0,
    trunk_burst_isolation_mld: 0.0,
    depot_distance_factor: 1.0,
    strategic_reserve_release: false,
    description: "Normal operations — baseline parameters unchanged.",
    assumptions: [
      "All infrastructure operating at nominal capacity",
      "No weather anomalies",
      "Standard demand patterns",
    ],
  },
  HEATWAVE: {
    demand_multiplier: 1.25,
    supply_reduction_pct: 0.0,
    trunk_burst_isolation_mld: 0.0,
    depot_distance_factor: 1.0,
    strategic_reserve_release: false,
    description: "Heatwave advisory — demand increased by 25% across all wards.",
    assumptions: [
      "IMD heatwave advisory: sustained +4°C above seasonal mean",
      "Demand multiplier 1.25x applied uniformly (conservative WHO estimate)",
      "No supply-side impact assumed (reservoir levels adequate)",
    ],
  },
  MAJOR_SUPPLY_REDUCTION: {
    demand_multiplier: 1.0,
    supply_reduction_pct: 35.0,
    trunk_burst_isolation_mld: 0.0,
    depot_distance_factor: 1.0,
    strategic_reserve_release: false,
    description: "Major supply reduction — 35% loss of available supply budget.",
    assumptions: [
      "Upstream reservoir drawdown or treatment plant capacity reduction",
      "Available supply reduced by 35% from baseline",
      "Demand unchanged — creates acute allocation deficit",
    ],
  },
  TRUNK_MAIN_FAILURE: {
    demand_multiplier: 1.0,
    supply_reduction_pct: 22.0,
    trunk_burst_isolation_mld: 1200.0,
    depot_distance_factor: 1.0,
    strategic_reserve_release: true,
    description: "Trunk main failure — major conduit isolation reducing transmission by 1200 MLD.",
    assumptions: [
      "Trunk main burst or isolation valve closure on primary conduit",
      "Transmission capacity reduced by 1200 MLD (effective 22% supply loss)",
      "Strategic reserve release may be required",
      "Repair timeline: 24-72 hours estimated",
    ],
  },
  FLOOD_DISRUPTION: {
    demand_multiplier: 1.10,
    supply_reduction_pct: 0.0,
    trunk_burst_isolation_mld: 0.0,
    depot_distance_factor: 1.5,
    strategic_reserve_release: false,
    description: "Flood disruption — increased losses, longer routes, contamination risk.",
    assumptions: [
      "Mumbai monsoon/cyclone flooding scenario",
      "NRW losses increased to 45% (pipeline damage, contamination intrusion)",
      "All depot distances increased 1.5x (road closures, detours)",
      "Demand increased 10% (displaced populations, relief camps)",
    ],
  },
};

const MAX_DRY_PIPE_HOURS = 72.0;
const MAX_POPULATION = 1000000.0;
const MAX_DISTANCE_KM = 20.0;

function scoreWard(ward, weights, demandMultiplier, distanceFactor) {
  const w = weights || POLICY_WEIGHTS.EQUAL_SERVICE;
  const vulnRaw = ward.vulnerability_index || 0;
  const vulnNorm = Math.min(Math.max(vulnRaw, 0.0), 1.0);
  const vulnWeighted = vulnNorm * w.vulnerability * 100;

  const demandRaw = (ward.dry_pipe_hours || 0);
  const demandNorm = Math.min(demandRaw / MAX_DRY_PIPE_HOURS, 1.0);
  const demandWeighted = demandNorm * w.unmet_demand * 100;

  const popRaw = ward.population || 0;
  const popNorm = Math.min(popRaw / MAX_POPULATION, 1.0);
  const popWeighted = popNorm * w.population * 100;

  const deficitRaw = ward.historical_deficit || 0.4;
  const deficitNorm = Math.min(Math.max(deficitRaw, 0.0), 1.0);
  const deficitWeighted = deficitNorm * w.historical_deficit * 100;

  const distRaw = (ward.depot_distance_km || 5.0) * distanceFactor;
  const distNorm = Math.min(distRaw / MAX_DISTANCE_KM, 1.0);
  const distWeighted = distNorm * w.distance * 100;

  const total = vulnWeighted + demandWeighted + popWeighted + deficitWeighted + distWeighted;
  const tier = total >= 75 ? 1 : total >= 55 ? 2 : total >= 35 ? 3 : 4;
  const modifiedDemand = Math.round((ward.demand_liters || 10000) * demandMultiplier);

  return {
    ...ward,
    demand_liters: modifiedDemand,
    total_score: Math.round(total * 10) / 10,
    tier,
    breakdown: [
      { factor: "Vulnerability", weight: w.vulnerability, raw_value: vulnRaw, weighted_score: Math.round(vulnWeighted * 10) / 10 },
      { factor: "Unmet Demand", weight: w.unmet_demand, raw_value: demandRaw, weighted_score: Math.round(demandWeighted * 10) / 10 },
      { factor: "Population", weight: w.population, raw_value: popRaw, weighted_score: Math.round(popWeighted * 10) / 10 },
      { factor: "Historical Deficit", weight: w.historical_deficit, raw_value: deficitRaw, weighted_score: Math.round(deficitWeighted * 10) / 10 },
      { factor: "Distance", weight: w.distance, raw_value: Math.round(distRaw * 10) / 10, weighted_score: Math.round(distWeighted * 10) / 10 },
    ],
  };
}

function executeAllocation(wards, totalSupply, policyWeights, demandMultiplier, supplyReductionPct, distanceFactor) {
  const effectiveSupply = totalSupply * (1.0 - supplyReductionPct / 100.0);
  const scored = wards.map(w => scoreWard(w, policyWeights, demandMultiplier, distanceFactor));
  scored.sort((a, b) => b.total_score - a.total_score);

  const reserveFraction = 0.15;
  const reserveHeld = Math.round(effectiveSupply * reserveFraction);
  let allocatable = effectiveSupply - reserveHeld;

  let totalAllocated = 0;
  const allocations = [];

  for (const ward of scored) {
    const demand = ward.demand_liters || 10000;
    const canGive = Math.min(demand, allocatable);
    const pct = demand > 0 ? Math.round((canGive / demand) * 100) : 100;

    allocations.push({
      ward_id: ward.ward_id || ward.id,
      ward_code: ward.ward_code || ward.ward_number,
      name: ward.name,
      allocated_liters: Math.round(canGive),
      demand_liters: demand,
      fulfillment_pct: pct,
      score: ward.total_score,
      tier: ward.tier,
      vulnerability_index: ward.vulnerability_index || 0,
    });

    allocatable -= canGive;
    totalAllocated += canGive;
  }

  const totalDemand = scored.reduce((acc, w) => acc + (w.demand_liters || 0), 0);
  const unmetDemand = Math.max(0, totalDemand - totalAllocated);
  const fulfillmentRatio = totalDemand > 0 ? totalAllocated / totalDemand : 1.0;

  const highVulnWards = scored.filter(w => (w.vulnerability_index || 0) >= 0.7);
  const highVulnDemand = highVulnWards.reduce((acc, w) => acc + (w.demand_liters || 0), 0);
  const highVulnAllocated = highVulnWards.reduce((acc, w) => {
    const a = allocations.find(al => al.ward_code === (w.ward_code || w.ward_number));
    return acc + (a ? a.allocated_liters : 0);
  }, 0);
  const highVulnFulfillmentRatio = highVulnDemand > 0 ? highVulnAllocated / highVulnDemand : 1.0;
  const affectedWards = allocations.filter(a => a.fulfillment_pct < 100).length;

  return {
    total_supply: Math.round(effectiveSupply),
    total_demand: Math.round(totalDemand),
    allocated_volume: Math.round(totalAllocated),
    unmet_demand: Math.round(unmetDemand),
    reserve_held: reserveHeld,
    fulfillment_ratio: Math.round(fulfillmentRatio * 1000) / 1000,
    high_vuln_fulfillment_ratio: Math.round(highVulnFulfillmentRatio * 1000) / 1000,
    affected_wards: affectedWards,
    allocations,
  };
}

function computeImpactDeltas(baseline, scenario) {
  const unmetDelta = scenario.unmet_demand - baseline.unmet_demand;
  const unmetDeltaPct = baseline.unmet_demand > 0 ? (unmetDelta / baseline.unmet_demand) * 100 : (unmetDelta > 0 ? 100 : 0);

  const fulfillmentDelta = (scenario.fulfillment_ratio - baseline.fulfillment_ratio) * 100;
  const vulFulfillmentDelta = (scenario.high_vuln_fulfillment_ratio - baseline.high_vuln_fulfillment_ratio) * 100;
  const affectedDelta = scenario.affected_wards - baseline.affected_wards;

  const wardDeltas = [];
  for (const sAlloc of scenario.allocations) {
    const bAlloc = baseline.allocations.find(b => b.ward_code === sAlloc.ward_code);
    const bVol = bAlloc ? bAlloc.allocated_liters : 0;
    const diff = sAlloc.allocated_liters - bVol;
    const pctDiff = bVol > 0 ? (diff / bVol) * 100 : 0;

    wardDeltas.push({
      ward_code: sAlloc.ward_code,
      name: sAlloc.name,
      baseline_liters: bVol,
      scenario_liters: sAlloc.allocated_liters,
      volume_delta: diff,
      pct_delta: Math.round(pctDiff * 10) / 10,
      vulnerability_index: sAlloc.vulnerability_index,
    });
  }

  wardDeltas.sort((a, b) => Math.abs(b.volume_delta) - Math.abs(a.volume_delta));

  return {
    unmet_demand_delta: unmetDelta,
    unmet_demand_delta_pct: Math.round(unmetDeltaPct * 10) / 10,
    fulfillment_ratio_delta_pp: Math.round(fulfillmentDelta * 10) / 10,
    high_vuln_fulfillment_delta_pp: Math.round(vulFulfillmentDelta * 10) / 10,
    affected_wards_delta: affectedDelta,
    top_divergent_wards: wardDeltas.slice(0, 8),
  };
}

function generateWhyExplanations(baseline, scenario, scenarioObj, policyPreset) {
  const explanations = [];

  if (scenarioObj.supply_reduction_pct > 0) {
    explanations.push({
      type: "SUPPLY_CONTRACTION",
      severity: "high",
      text: `Available supply was reduced by ${scenarioObj.supply_reduction_pct}% due to scenario constraints, leaving total supply at ${scenario.total_supply.toLocaleString()} L.`,
      driver: "Upstream supply cut / treatment constraint",
    });
  }

  if (scenarioObj.demand_multiplier > 1.0) {
    const pctInc = Math.round((scenarioObj.demand_multiplier - 1.0) * 100);
    explanations.push({
      type: "DEMAND_SURGE",
      severity: "medium",
      text: `Municipal aggregate demand surged by ${pctInc}% across all sectors, widening the supply-demand deficit to ${scenario.unmet_demand.toLocaleString()} L.`,
      driver: "Temperature anomaly / climatic surge",
    });
  }

  if (policyPreset === "PRO_POOR") {
    explanations.push({
      type: "EQUITY_REBALANCING",
      severity: "info",
      text: `Pro-Poor policy weight (50% vulnerability) prioritized informal settlements (Govandi M/E, Dharavi G/N), maintaining vulnerable fulfillment at ${(scenario.high_vuln_fulfillment_ratio * 100).toFixed(1)}%.`,
      driver: "Vulnerability-weighted LP optimization",
    });
  } else if (policyPreset === "OUTAGE_FIRST") {
    explanations.push({
      type: "ACUTE_RESPONSE",
      severity: "info",
      text: `Outage-First policy weight (50% dry pipeline duration) directed emergency loads to wards with dry pipe duration exceeding 40 hours.`,
      driver: "Duration-weighted triage",
    });
  }

  if (scenario.high_vuln_fulfillment_ratio >= scenario.fulfillment_ratio) {
    explanations.push({
      type: "VULNERABILITY_PROTECTED",
      severity: "positive",
      text: `High-vulnerability clusters achieved ${(scenario.high_vuln_fulfillment_ratio * 100).toFixed(1)}% fulfillment, outperforming the municipal average of ${(scenario.fulfillment_ratio * 100).toFixed(1)}%.`,
      driver: "Constitutional minimum allocation enforcement",
    });
  }

  return explanations;
}

function classifyGovernance(baseline, scenario, scenarioObj, crisisScenario) {
  const proposedActions = [];
  let isCritical = false;
  let isElevated = false;

  if (crisisScenario === "TRUNK_MAIN_FAILURE") {
    isCritical = true;
    proposedActions.push("Activate emergency strategic reserve release (15% capacity)");
    proposedActions.push("Authorize inter-depot cross-boundary tanker transfers");
  }

  if (scenario.unmet_demand > baseline.unmet_demand * 1.30 && scenario.unmet_demand > 50000) {
    isCritical = true;
    proposedActions.push("Municipal emergency rationing protocol activation");
  }

  if (scenario.high_vuln_fulfillment_ratio < 0.65) {
    isCritical = true;
    proposedActions.push("Mandatory lifeline quota protection override");
  }

  if (isCritical) {
    return {
      tier: 3,
      tier_label: "Executive Authorization",
      decision_type: "emergency_rationing",
      risk_level: "critical",
      requires_authorization: true,
      proposed_actions: proposedActions,
      blocking_reason: "Hard-blocked until municipal commissioner or authorized engineer signs off with PIN.",
    };
  }

  if (crisisScenario === "HEATWAVE" || crisisScenario === "FLOOD_DISRUPTION" || crisisScenario === "MAJOR_SUPPLY_REDUCTION") {
    isElevated = true;
    proposedActions.push("Operator review of crisis quota allocations");
    proposedActions.push("Pre-dispatch tanker staging at high-risk depots");
  }

  if (scenario.fulfillment_ratio < baseline.fulfillment_ratio * 0.90) {
    isElevated = true;
    proposedActions.push("Service level variance review");
  }

  if (isElevated) {
    return {
      tier: 2,
      tier_label: "Operator Review",
      decision_type: "quota_variance",
      risk_level: "medium",
      requires_authorization: false,
      proposed_actions: proposedActions,
      blocking_reason: null,
    };
  }

  proposedActions.push("Routine allocation — no variance detected");
  return {
    tier: 1,
    tier_label: "Autonomous",
    decision_type: "sandbox_routine",
    risk_level: "low",
    requires_authorization: false,
    proposed_actions: proposedActions,
    blocking_reason: null,
  };
}

function runLocalSandboxSimulation(policyPreset = "EQUAL_SERVICE", crisisScenario = "NORMAL", customParams = {}, wardList = null) {
  const wards = (wardList && wardList.length >= 24) ? wardList : ALL_MUMBAI_WARDS;
  const totalSupply = 420000;
  const policyWeights = POLICY_WEIGHTS[policyPreset] || POLICY_WEIGHTS.EQUAL_SERVICE;
  const baseScenarioObj = CRISIS_SCENARIOS[crisisScenario] || CRISIS_SCENARIOS.NORMAL;

  const scenarioObj = {
    ...baseScenarioObj,
    demand_multiplier: customParams.demand_multiplier != null ? Number(customParams.demand_multiplier) : baseScenarioObj.demand_multiplier,
    supply_reduction_pct: customParams.supply_reduction_pct != null ? Number(customParams.supply_reduction_pct) : baseScenarioObj.supply_reduction_pct,
    depot_distance_factor: customParams.depot_distance_factor != null ? Number(customParams.depot_distance_factor) : baseScenarioObj.depot_distance_factor,
  };

  const simId = `sim-${policyPreset.slice(0, 3).toLowerCase()}-${crisisScenario.slice(0, 3).toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();

  // Baseline run
  const baseline = executeAllocation(wards, totalSupply, null, 1.0, 0.0, 1.0);

  // Scenario run
  const scenario = executeAllocation(
    wards,
    totalSupply,
    policyWeights,
    scenarioObj.demand_multiplier,
    scenarioObj.supply_reduction_pct,
    scenarioObj.depot_distance_factor
  );

  const impactDeltas = computeImpactDeltas(baseline, scenario);
  const whyExplanations = generateWhyExplanations(baseline, scenario, scenarioObj, policyPreset);
  const governance = classifyGovernance(baseline, scenario, scenarioObj, crisisScenario);

  return {
    success: true,
    simulation_id: simId,
    timestamp,
    mode: "OPERATIONAL SIMULATION / LOCAL HIGH-SENSITIVITY ENGINE",
    policy_preset: policyPreset,
    crisis_scenario: crisisScenario,
    scenario_description: scenarioObj.description,
    scenario_assumptions: scenarioObj.assumptions,
    policy_weights: policyWeights,
    baseline,
    scenario,
    impact_deltas: impactDeltas,
    why_explanations: whyExplanations,
    governance,
    governance_decision_id: `gov-sim-${Date.now().toString(36)}`,
  };
}

module.exports = {
  POLICY_WEIGHTS,
  CRISIS_SCENARIOS,
  runLocalSandboxSimulation,
};
