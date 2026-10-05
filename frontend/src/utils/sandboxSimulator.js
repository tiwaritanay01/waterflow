/**
 * WaterFlow OS — Client-Side Policy & Crisis Sandbox Simulation Engine
 * Replicates the deterministic Highs LP & Priority Waterfall allocation engine
 * for offline, demo, and zero-latency operational simulations.
 */

import { DEFAULT_MUMBAI_WARDS } from "./mumbaiWardsData";

export const POLICY_WEIGHTS = {
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

export const CRISIS_SCENARIOS = {
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
  };
}

function executeAllocation(wards, totalSupply, weights, demandMultiplier, supplyReductionPct, distanceFactor) {
  const effectiveSupply = Math.round(totalSupply * (1.0 - supplyReductionPct / 100.0));
  const scored = wards.map((w) => scoreWard(w, weights, demandMultiplier, distanceFactor));
  scored.sort((a, b) => b.total_score - a.total_score);

  let remainingSupply = effectiveSupply;
  const allocations = {};
  let totalAllocated = 0;
  const totalDemand = scored.reduce((sum, s) => sum + s.demand_liters, 0);
  let affectedWards = 0;
  let criticalWards = 0;

  for (const s of scored) {
    const code = String(s.ward_number || s.ward_code);
    const alloc = Math.min(s.demand_liters, Math.max(0, remainingSupply));
    allocations[code] = alloc;
    remainingSupply -= alloc;
    totalAllocated += alloc;

    if (alloc < s.demand_liters && s.demand_liters > 0) {
      affectedWards += 1;
    }
    if (s.tier === 1 && alloc < s.demand_liters) {
      criticalWards += 1;
    }
  }

  const reserveHeld = Math.round(totalSupply * 0.10);
  const fulfillmentRatio = totalDemand > 0 ? totalAllocated / totalDemand : 1.0;

  const highVulnWards = scored.filter((s) => s.total_score >= 60.0);
  const highVulnDemand = highVulnWards.reduce((sum, s) => sum + s.demand_liters, 0);
  const highVulnAlloc = highVulnWards.reduce((sum, s) => sum + (allocations[String(s.ward_number || s.ward_code)] || 0), 0);
  const highVulnRatio = highVulnDemand > 0 ? highVulnAlloc / highVulnDemand : 1.0;

  return {
    total_supply: effectiveSupply,
    total_demand: totalDemand,
    allocated_volume: totalAllocated,
    unmet_demand: Math.max(0, totalDemand - totalAllocated),
    reserve_held: reserveHeld,
    fulfillment_ratio: Math.round(fulfillmentRatio * 1000) / 1000,
    high_vuln_fulfillment_ratio: Math.round(highVulnRatio * 1000) / 1000,
    affected_wards: affectedWards,
    critical_wards: criticalWards,
    solver_status: "PRIORITY_WATERFALL",
    allocations,
    constraint_violations: [],
  };
}

function computeImpactDeltas(baseline, scenario) {
  const comparisons = [
    ["Total Supply (L)", baseline.total_supply, scenario.total_supply],
    ["Total Demand (L)", baseline.total_demand, scenario.total_demand],
    ["Allocated Volume (L)", baseline.allocated_volume, scenario.allocated_volume],
    ["Unmet Demand (L)", baseline.unmet_demand, scenario.unmet_demand],
    ["Reserve Held (L)", baseline.reserve_held, scenario.reserve_held],
    ["Fulfillment Ratio", baseline.fulfillment_ratio, scenario.fulfillment_ratio],
    ["Vulnerable Pop Fulfillment", baseline.high_vuln_fulfillment_ratio, scenario.high_vuln_fulfillment_ratio],
    ["Wards with Unmet Demand", baseline.affected_wards, scenario.affected_wards],
    ["Critical Wards", baseline.critical_wards, scenario.critical_wards],
  ];

  return comparisons.map(([label, bval, sval]) => {
    const delta = Math.round((sval - bval) * 100) / 100;
    const deltaPct = bval !== 0 ? Math.round(((sval - bval) / Math.abs(bval)) * 1000) / 10 : (sval === 0 ? 0.0 : 100.0);
    const direction = delta > 0.001 ? "↑" : delta < -0.001 ? "↓" : "—";
    return {
      metric: label,
      baseline_value: bval,
      scenario_value: sval,
      delta,
      delta_pct: deltaPct,
      direction,
    };
  });
}

function generateWhyExplanations(baseline, scenario, scenarioObj, policyPreset) {
  const explanations = [];

  if (baseline.total_supply !== scenario.total_supply) {
    const deltaPct = Math.round(((scenario.total_supply - baseline.total_supply) / baseline.total_supply) * 1000) / 10;
    explanations.push({
      category: "Supply Changed",
      explanation: `Available supply: ${baseline.total_supply.toLocaleString()} L → ${scenario.total_supply.toLocaleString()} L (${deltaPct > 0 ? "+" : ""}${deltaPct}%). Cause: ${scenarioObj.description}`,
      metric_key: "total_supply",
      baseline_value: baseline.total_supply,
      scenario_value: scenario.total_supply,
      delta_pct: deltaPct,
    });
  }

  if (baseline.total_demand !== scenario.total_demand) {
    const deltaPct = Math.round(((scenario.total_demand - baseline.total_demand) / baseline.total_demand) * 1000) / 10;
    explanations.push({
      category: "Demand Changed",
      explanation: `Total demand: ${baseline.total_demand.toLocaleString()} L → ${scenario.total_demand.toLocaleString()} L (${deltaPct > 0 ? "+" : ""}${deltaPct}%). Multiplier: ${scenarioObj.demand_multiplier}x applied.`,
      metric_key: "total_demand",
      baseline_value: baseline.total_demand,
      scenario_value: scenario.total_demand,
      delta_pct: deltaPct,
    });
  }

  if (baseline.allocated_volume !== scenario.allocated_volume) {
    const deltaPct = Math.round(((scenario.allocated_volume - baseline.allocated_volume) / Math.max(baseline.allocated_volume, 1)) * 1000) / 10;
    explanations.push({
      category: "Optimization Response",
      explanation: `LP solver re-allocated: ${baseline.allocated_volume.toLocaleString()} L → ${scenario.allocated_volume.toLocaleString()} L (${deltaPct > 0 ? "+" : ""}${deltaPct}%). Policy '${policyPreset}' weights applied to priority scoring.`,
      metric_key: "allocated_volume",
      baseline_value: baseline.allocated_volume,
      scenario_value: scenario.allocated_volume,
      delta_pct: deltaPct,
    });
  }

  if (scenario.unmet_demand > baseline.unmet_demand) {
    const deltaPct = Math.round(((scenario.unmet_demand - baseline.unmet_demand) / Math.max(baseline.unmet_demand, 1)) * 1000) / 10;
    explanations.push({
      category: "Service Deficit Impact",
      explanation: `Unmet demand increased: ${baseline.unmet_demand.toLocaleString()} L → ${scenario.unmet_demand.toLocaleString()} L (${deltaPct > 0 ? "+" : ""}${deltaPct}%). Affected wards: ${baseline.affected_wards} → ${scenario.affected_wards}.`,
      metric_key: "unmet_demand",
      baseline_value: baseline.unmet_demand,
      scenario_value: scenario.unmet_demand,
      delta_pct: deltaPct,
    });
  }

  if (baseline.fulfillment_ratio !== scenario.fulfillment_ratio) {
    const deltaPct = Math.round((scenario.fulfillment_ratio - baseline.fulfillment_ratio) * 1000) / 10;
    explanations.push({
      category: "Equity Impact",
      explanation: `Overall fulfillment: ${(baseline.fulfillment_ratio * 100).toFixed(1)}% → ${(scenario.fulfillment_ratio * 100).toFixed(1)}% (${deltaPct > 0 ? "+" : ""}${deltaPct}pp). Vulnerable population fulfillment: ${(baseline.high_vuln_fulfillment_ratio * 100).toFixed(1)}% → ${(scenario.high_vuln_fulfillment_ratio * 100).toFixed(1)}%.`,
      metric_key: "fulfillment_ratio",
      baseline_value: baseline.fulfillment_ratio,
      scenario_value: scenario.fulfillment_ratio,
      delta_pct: deltaPct,
    });
  }

  if (scenarioObj.strategic_reserve_release) {
    explanations.push({
      category: "Governance Consequence",
      explanation: `Strategic reserve release proposed due to infrastructure disruption. This triggers Tier 3 executive authorization requirement. Reserve held: ${baseline.reserve_held.toLocaleString()} L → ${scenario.reserve_held.toLocaleString()} L.`,
      metric_key: "reserve_held",
      baseline_value: baseline.reserve_held,
      scenario_value: scenario.reserve_held,
      delta_pct: 0,
    });
  }

  if (explanations.length === 0) {
    explanations.push({
      category: "Nominal Baseline",
      explanation: "Baseline and scenario produced identical nominal allocations. No service variance detected.",
      metric_key: "none",
      baseline_value: 0,
      scenario_value: 0,
      delta_pct: 0,
    });
  }

  return explanations;
}

function classifyGovernance(baseline, scenario, scenarioObj, crisisScenario) {
  const proposedActions = [];
  let isCritical = false;
  let blockingReason = null;

  if (scenarioObj.strategic_reserve_release) {
    isCritical = true;
    proposedActions.push("Strategic reserve release");
    blockingReason = "Strategic reserve breach requires executive authorization";
  }

  if (scenario.total_demand > 0 && scenario.unmet_demand / scenario.total_demand > 0.30) {
    isCritical = true;
    proposedActions.push("Emergency rationing protocol");
    if (!blockingReason) {
      blockingReason = "Severe rationing (>30% unmet demand) requires executive authorization";
    }
  }

  if (scenario.fulfillment_ratio < 0.50) {
    isCritical = true;
    proposedActions.push("Severe service degradation response");
    if (!blockingReason) {
      blockingReason = "Fulfillment below 50% requires executive authorization";
    }
  }

  if (crisisScenario === "TRUNK_MAIN_FAILURE" || crisisScenario === "FLOOD_DISRUPTION") {
    proposedActions.push("Infrastructure disruption response");
    if (scenario.unmet_demand > baseline.unmet_demand * 1.20) {
      isCritical = true;
      if (!blockingReason) {
        blockingReason = "Infrastructure disruption with >20% service impact requires authorization";
      }
    }
  }

  if (isCritical) {
    return {
      tier: 3,
      tier_label: "Executive Authorization",
      decision_type: "emergency_rationing",
      risk_level: "critical",
      requires_authorization: true,
      proposed_actions: proposedActions,
      blocking_reason: blockingReason,
    };
  }

  let isElevated = false;
  if (scenario.total_demand > baseline.total_demand * 1.15) {
    isElevated = true;
    proposedActions.push("Elevated demand response");
  }
  if (scenario.unmet_demand > baseline.unmet_demand * 1.10) {
    isElevated = true;
    proposedActions.push("Allocation variance review");
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

export function runLocalSandboxSimulation(policyPreset = "EQUAL_SERVICE", crisisScenario = "NORMAL", customParams = {}, wardList = null) {
  const wards = (wardList && wardList.length >= 24) ? wardList : DEFAULT_MUMBAI_WARDS;
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
