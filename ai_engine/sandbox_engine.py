"""
WaterFlow OS — Policy & Crisis Sandbox Simulation Engine
=========================================================
Deployable operational demonstrator suitable for pilot integration.

Executes BASELINE vs SCENARIO allocation using the EXISTING:
  - EquityEngine (priority scoring)
  - AllocationOptimizer (LP solver)
  - SupplyModel (physical supply balance)
  - RoutingOptimizer (fleet VRP)

Mode: DEMO / OPERATIONAL SIMULATION
Does NOT claim live SCADA, GPS, weather, or real municipal authorization.
"""

from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger("waterflow.sandbox")


# ---------------------------------------------------------------------------
# Policy Presets — Mapped from docs/sensitivity_analysis.md
# ---------------------------------------------------------------------------

class PolicyPreset(str, Enum):
    EQUAL_SERVICE = "EQUAL_SERVICE"
    PRO_POOR = "PRO_POOR"
    OUTAGE_FIRST = "OUTAGE_FIRST"
    FACILITY_PROTECTION = "FACILITY_PROTECTION"
    LOGISTICS_FIRST = "LOGISTICS_FIRST"


POLICY_WEIGHTS: Dict[str, Dict[str, float]] = {
    # Source: docs/sensitivity_analysis.md — Policy A (Equal)
    "EQUAL_SERVICE": {
        "vulnerability": 0.20,
        "unmet_demand": 0.20,
        "population": 0.20,
        "historical_deficit": 0.20,
        "distance": 0.20,
    },
    # Source: docs/sensitivity_analysis.md — Policy B (Pro-Poor)
    "PRO_POOR": {
        "vulnerability": 0.50,
        "unmet_demand": 0.20,
        "population": 0.10,
        "historical_deficit": 0.10,
        "distance": 0.10,
    },
    # Source: docs/sensitivity_analysis.md — Policy C (Outage-First)
    "OUTAGE_FIRST": {
        "vulnerability": 0.20,
        "unmet_demand": 0.50,
        "population": 0.10,
        "historical_deficit": 0.10,
        "distance": 0.10,
    },
    # Extension: Facility Protection — maximizes critical_facility (mapped to population slot)
    # and vulnerability to protect hospitals/shelters in vulnerable areas
    "FACILITY_PROTECTION": {
        "vulnerability": 0.25,
        "unmet_demand": 0.15,
        "population": 0.35,  # repurposed as facility-adjacency proxy in existing model
        "historical_deficit": 0.15,
        "distance": 0.10,
    },
    # Source: docs/sensitivity_analysis.md — Policy E (Logistics-First)
    "LOGISTICS_FIRST": {
        "vulnerability": 0.20,
        "unmet_demand": 0.20,
        "population": 0.15,
        "historical_deficit": 0.10,
        "distance": 0.35,
    },
}


# ---------------------------------------------------------------------------
# Crisis Scenarios
# ---------------------------------------------------------------------------

class CrisisScenario(str, Enum):
    NORMAL = "NORMAL"
    HEATWAVE = "HEATWAVE"
    MAJOR_SUPPLY_REDUCTION = "MAJOR_SUPPLY_REDUCTION"
    TRUNK_MAIN_FAILURE = "TRUNK_MAIN_FAILURE"
    FLOOD_DISRUPTION = "FLOOD_DISRUPTION"


class ScenarioModifiers(BaseModel):
    """Deterministic modifications to engine inputs for a crisis scenario."""
    demand_multiplier: float = 1.0
    supply_reduction_pct: float = 0.0
    trunk_burst_isolation_mld: float = 0.0
    nrw_loss_fraction_override: Optional[float] = None
    depot_distance_factor: float = 1.0
    strategic_reserve_release: bool = False
    description: str = ""
    assumptions: List[str] = Field(default_factory=list)


CRISIS_SCENARIOS: Dict[str, ScenarioModifiers] = {
    "NORMAL": ScenarioModifiers(
        description="Normal operations — baseline parameters unchanged.",
        assumptions=["All infrastructure operating at nominal capacity",
                     "No weather anomalies", "Standard demand patterns"],
    ),
    "HEATWAVE": ScenarioModifiers(
        demand_multiplier=1.25,
        description="Heatwave advisory — demand increased by 25% across all wards.",
        assumptions=[
            "IMD heatwave advisory: sustained +4°C above seasonal mean",
            "Demand multiplier 1.25x applied uniformly (conservative WHO estimate)",
            "No supply-side impact assumed (reservoir levels adequate)",
            "DEMO PARAMETER — not sourced from live weather data",
        ],
    ),
    "MAJOR_SUPPLY_REDUCTION": ScenarioModifiers(
        supply_reduction_pct=35.0,
        description="Major supply reduction — 35% loss of available supply budget.",
        assumptions=[
            "Upstream reservoir drawdown or treatment plant capacity reduction",
            "Available supply reduced by 35% from baseline",
            "Demand unchanged — creates acute allocation deficit",
            "DEMO PARAMETER — not sourced from live SCADA telemetry",
        ],
    ),
    "TRUNK_MAIN_FAILURE": ScenarioModifiers(
        supply_reduction_pct=22.0,
        trunk_burst_isolation_mld=1200.0,
        strategic_reserve_release=True,
        description="Trunk main failure — major conduit isolation reducing transmission by 1200 MLD.",
        assumptions=[
            "Trunk main burst or isolation valve closure on primary conduit",
            "Transmission capacity reduced by 1200 MLD (effective 22% supply loss)",
            "Strategic reserve release may be required",
            "Repair timeline: 24-72 hours estimated",
            "DEMO PARAMETER — not sourced from live infrastructure sensors",
        ],
    ),
    "FLOOD_DISRUPTION": ScenarioModifiers(
        demand_multiplier=1.10,
        nrw_loss_fraction_override=0.45,
        depot_distance_factor=1.5,
        description="Flood disruption — increased losses, longer routes, contamination risk.",
        assumptions=[
            "Mumbai monsoon/cyclone flooding scenario",
            "NRW losses increased to 45% (pipeline damage, contamination intrusion)",
            "All depot distances increased 1.5x (road closures, detours)",
            "Demand increased 10% (displaced populations, relief camps)",
            "DEMO PARAMETER — not sourced from live flood monitoring",
        ],
    ),
}


# ---------------------------------------------------------------------------
# Request/Response Models
# ---------------------------------------------------------------------------

class SandboxSimulationRequest(BaseModel):
    policy_preset: str = "EQUAL_SERVICE"
    crisis_scenario: str = "NORMAL"
    parameters: Dict[str, Any] = Field(default_factory=dict)


class AllocationMetrics(BaseModel):
    total_supply: float
    total_demand: float
    allocated_volume: float
    unmet_demand: float
    reserve_held: float
    fulfillment_ratio: float
    high_vuln_fulfillment_ratio: float
    affected_wards: int
    critical_wards: int
    solver_status: str
    allocations: Dict[str, float]
    constraint_violations: List[str]


class ImpactDelta(BaseModel):
    metric: str
    baseline_value: float
    scenario_value: float
    delta: float
    delta_pct: float
    direction: str  # "↑", "↓", "—"


class WhyExplanation(BaseModel):
    category: str
    explanation: str
    metric_key: str
    baseline_value: float
    scenario_value: float
    delta_pct: float


class GovernanceClassification(BaseModel):
    tier: int
    tier_label: str
    decision_type: str
    risk_level: str
    requires_authorization: bool
    proposed_actions: List[str]
    blocking_reason: Optional[str] = None


class SandboxSimulationResult(BaseModel):
    simulation_id: str
    timestamp: str
    mode: str = "DEMO / OPERATIONAL SIMULATION"
    policy_preset: str
    crisis_scenario: str
    scenario_description: str
    scenario_assumptions: List[str]
    policy_weights: Dict[str, float]
    baseline: AllocationMetrics
    scenario: AllocationMetrics
    impact_deltas: List[ImpactDelta]
    why_explanations: List[WhyExplanation]
    governance: GovernanceClassification
    governance_decision_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Simulation Engine
# ---------------------------------------------------------------------------

def _generate_simulation_id(policy: str, scenario: str, params: Dict) -> str:
    """Generate a deterministic simulation ID from inputs for reproducibility."""
    content = f"{policy}:{scenario}:{sorted(params.items())}"
    hash_hex = hashlib.sha256(content.encode()).hexdigest()[:12]
    return f"sim-{hash_hex}"


def _compute_impact_deltas(baseline: AllocationMetrics, scenario: AllocationMetrics) -> List[ImpactDelta]:
    """Compute deterministic impact deltas between baseline and scenario."""
    deltas = []
    comparisons = [
        ("total_supply", "Total Supply (L)", baseline.total_supply, scenario.total_supply),
        ("total_demand", "Total Demand (L)", baseline.total_demand, scenario.total_demand),
        ("allocated_volume", "Allocated Volume (L)", baseline.allocated_volume, scenario.allocated_volume),
        ("unmet_demand", "Unmet Demand (L)", baseline.unmet_demand, scenario.unmet_demand),
        ("reserve_held", "Reserve Held (L)", baseline.reserve_held, scenario.reserve_held),
        ("fulfillment_ratio", "Fulfillment Ratio", baseline.fulfillment_ratio, scenario.fulfillment_ratio),
        ("high_vuln_fulfillment_ratio", "Vulnerable Pop Fulfillment",
         baseline.high_vuln_fulfillment_ratio, scenario.high_vuln_fulfillment_ratio),
        ("affected_wards", "Wards with Unmet Demand", baseline.affected_wards, scenario.affected_wards),
        ("critical_wards", "Critical Wards", baseline.critical_wards, scenario.critical_wards),
    ]

    for key, label, bval, sval in comparisons:
        delta = round(sval - bval, 2)
        if bval != 0:
            delta_pct = round((sval - bval) / abs(bval) * 100, 1)
        else:
            delta_pct = 0.0 if sval == 0 else 100.0

        if delta > 0.001:
            direction = "↑"
        elif delta < -0.001:
            direction = "↓"
        else:
            direction = "—"

        deltas.append(ImpactDelta(
            metric=label,
            baseline_value=round(bval, 2),
            scenario_value=round(sval, 2),
            delta=delta,
            delta_pct=delta_pct,
            direction=direction,
        ))

    return deltas


def _generate_why_explanations(
    baseline: AllocationMetrics,
    scenario: AllocationMetrics,
    scenario_obj: ScenarioModifiers,
    policy_preset: str,
) -> List[WhyExplanation]:
    """Generate deterministic WHY explanations from actual deltas. No LLM. No canned text."""
    explanations = []

    # 1. Supply change
    if baseline.total_supply != scenario.total_supply:
        delta_pct = round((scenario.total_supply - baseline.total_supply) / baseline.total_supply * 100, 1)
        explanations.append(WhyExplanation(
            category="Supply Changed",
            explanation=f"Available supply: {baseline.total_supply:,.0f} L → {scenario.total_supply:,.0f} L ({delta_pct:+.1f}%). "
                        f"Cause: {scenario_obj.description}",
            metric_key="total_supply",
            baseline_value=baseline.total_supply,
            scenario_value=scenario.total_supply,
            delta_pct=delta_pct,
        ))

    # 2. Demand change
    if baseline.total_demand != scenario.total_demand:
        delta_pct = round((scenario.total_demand - baseline.total_demand) / baseline.total_demand * 100, 1)
        explanations.append(WhyExplanation(
            category="Demand Changed",
            explanation=f"Total demand: {baseline.total_demand:,.0f} L → {scenario.total_demand:,.0f} L ({delta_pct:+.1f}%). "
                        f"Multiplier: {scenario_obj.demand_multiplier}x applied.",
            metric_key="total_demand",
            baseline_value=baseline.total_demand,
            scenario_value=scenario.total_demand,
            delta_pct=delta_pct,
        ))

    # 3. Allocation response
    if baseline.allocated_volume != scenario.allocated_volume:
        delta_pct = round((scenario.allocated_volume - baseline.allocated_volume) / max(baseline.allocated_volume, 1) * 100, 1)
        explanations.append(WhyExplanation(
            category="Optimization Response",
            explanation=f"LP solver re-allocated: {baseline.allocated_volume:,.0f} L → {scenario.allocated_volume:,.0f} L ({delta_pct:+.1f}%). "
                        f"Policy '{policy_preset}' weights applied to priority scoring.",
            metric_key="allocated_volume",
            baseline_value=baseline.allocated_volume,
            scenario_value=scenario.allocated_volume,
            delta_pct=delta_pct,
        ))

    # 4. Unmet demand consequence
    if scenario.unmet_demand > baseline.unmet_demand:
        delta_pct = round((scenario.unmet_demand - baseline.unmet_demand) / max(baseline.unmet_demand, 1) * 100, 1)
        explanations.append(WhyExplanation(
            category="Service Deficit Impact",
            explanation=f"Unmet demand increased: {baseline.unmet_demand:,.0f} L → {scenario.unmet_demand:,.0f} L ({delta_pct:+.1f}%). "
                        f"Affected wards: {baseline.affected_wards} → {scenario.affected_wards}.",
            metric_key="unmet_demand",
            baseline_value=baseline.unmet_demand,
            scenario_value=scenario.unmet_demand,
            delta_pct=delta_pct,
        ))

    # 5. Fulfillment ratio
    if baseline.fulfillment_ratio != scenario.fulfillment_ratio:
        delta_pct = round((scenario.fulfillment_ratio - baseline.fulfillment_ratio) * 100, 1)
        explanations.append(WhyExplanation(
            category="Equity Impact",
            explanation=f"Overall fulfillment: {baseline.fulfillment_ratio*100:.1f}% → {scenario.fulfillment_ratio*100:.1f}% ({delta_pct:+.1f}pp). "
                        f"Vulnerable population fulfillment: {baseline.high_vuln_fulfillment_ratio*100:.1f}% → {scenario.high_vuln_fulfillment_ratio*100:.1f}%.",
            metric_key="fulfillment_ratio",
            baseline_value=baseline.fulfillment_ratio,
            scenario_value=scenario.fulfillment_ratio,
            delta_pct=delta_pct,
        ))

    # 6. Reserve/governance consequence
    if scenario_obj.strategic_reserve_release:
        explanations.append(WhyExplanation(
            category="Governance Consequence",
            explanation="Strategic reserve release proposed due to infrastructure disruption. "
                        "This triggers Tier 3 executive authorization requirement. "
                        "Reserve held: "
                        f"{baseline.reserve_held:,.0f} L → {scenario.reserve_held:,.0f} L.",
            metric_key="reserve_held",
            baseline_value=baseline.reserve_held,
            scenario_value=scenario.reserve_held,
            delta_pct=round((scenario.reserve_held - baseline.reserve_held) / max(baseline.reserve_held, 1) * 100, 1),
        ))

    # If no changes detected
    if not explanations:
        explanations.append(WhyExplanation(
            category="No Change Detected",
            explanation="Baseline and scenario produced identical results. No operational impact.",
            metric_key="none",
            baseline_value=0.0,
            scenario_value=0.0,
            delta_pct=0.0,
        ))

    return explanations


def _classify_governance(
    baseline: AllocationMetrics,
    scenario: AllocationMetrics,
    scenario_obj: ScenarioModifiers,
    crisis_scenario: str,
) -> GovernanceClassification:
    """
    Classify the governance tier based on actual scenario impact.
    Uses same logic as existing classifyGovernanceTier() in server.js.
    """
    proposed_actions = []

    # Check for critical conditions
    is_critical = False
    blocking_reason = None

    # Strategic reserve release
    if scenario_obj.strategic_reserve_release:
        is_critical = True
        proposed_actions.append("Strategic reserve release")
        blocking_reason = "Strategic reserve breach requires executive authorization"

    # Severe unmet demand (>30% of total demand)
    if scenario.total_demand > 0 and scenario.unmet_demand / scenario.total_demand > 0.30:
        is_critical = True
        proposed_actions.append("Emergency rationing protocol")
        if not blocking_reason:
            blocking_reason = "Severe rationing (>30% unmet demand) requires executive authorization"

    # Fulfillment dropped below 50%
    if scenario.fulfillment_ratio < 0.50:
        is_critical = True
        proposed_actions.append("Severe service degradation response")
        if not blocking_reason:
            blocking_reason = "Fulfillment below 50% requires executive authorization"

    # Infrastructure disruption
    if crisis_scenario in ("TRUNK_MAIN_FAILURE", "FLOOD_DISRUPTION"):
        proposed_actions.append("Infrastructure disruption response")
        if scenario.unmet_demand > baseline.unmet_demand * 1.20:
            is_critical = True
            if not blocking_reason:
                blocking_reason = "Infrastructure disruption with >20% service impact requires authorization"

    if is_critical:
        return GovernanceClassification(
            tier=3,
            tier_label="Executive Authorization",
            decision_type="sandbox_critical_scenario",
            risk_level="critical",
            requires_authorization=True,
            proposed_actions=proposed_actions,
            blocking_reason=blocking_reason,
        )

    # Check for elevated conditions (Tier 2)
    is_elevated = False

    # Demand increase >15%
    if scenario.total_demand > baseline.total_demand * 1.15:
        is_elevated = True
        proposed_actions.append("Elevated demand response")

    # Unmet demand increase >10%
    if scenario.unmet_demand > baseline.unmet_demand * 1.10 and scenario.unmet_demand > baseline.unmet_demand:
        is_elevated = True
        proposed_actions.append("Allocation variance review")

    # Fulfillment dropped
    if scenario.fulfillment_ratio < baseline.fulfillment_ratio * 0.90:
        is_elevated = True
        proposed_actions.append("Service level variance review")

    if is_elevated:
        return GovernanceClassification(
            tier=2,
            tier_label="Operator Review",
            decision_type="sandbox_elevated_scenario",
            risk_level="medium",
            requires_authorization=False,
            proposed_actions=proposed_actions,
        )

    # Routine (Tier 1)
    proposed_actions.append("Routine allocation — no variance detected")
    return GovernanceClassification(
        tier=1,
        tier_label="Autonomous",
        decision_type="sandbox_routine",
        risk_level="low",
        requires_authorization=False,
        proposed_actions=proposed_actions,
    )


def run_sandbox_simulation(
    wards: List[Dict[str, Any]],
    total_supply: int,
    policy_preset: str,
    crisis_scenario: str,
    custom_params: Optional[Dict[str, Any]] = None,
) -> SandboxSimulationResult:
    """
    Execute a complete policy & crisis simulation.

    Runs TWO actual engine passes:
      A. BASELINE — default weights, unmodified inputs
      B. SCENARIO — policy weights + crisis modifiers

    Returns deterministic metrics, impact deltas, WHY explanations, and governance classification.

    Mode: DEMO / OPERATIONAL SIMULATION
    """
    # Validate inputs
    if policy_preset not in POLICY_WEIGHTS:
        raise ValueError(f"Invalid policy preset: '{policy_preset}'. Valid: {list(POLICY_WEIGHTS.keys())}")
    if crisis_scenario not in CRISIS_SCENARIOS:
        raise ValueError(f"Invalid crisis scenario: '{crisis_scenario}'. Valid: {list(CRISIS_SCENARIOS.keys())}")

    # Resolve scenario modifiers
    scenario_obj = CRISIS_SCENARIOS[crisis_scenario]

    # Allow custom parameter overrides
    if custom_params:
        override_fields = {}
        if "demand_multiplier" in custom_params:
            override_fields["demand_multiplier"] = float(custom_params["demand_multiplier"])
        if "supply_reduction_pct" in custom_params:
            override_fields["supply_reduction_pct"] = float(custom_params["supply_reduction_pct"])
        if "trunk_burst_isolation_mld" in custom_params:
            override_fields["trunk_burst_isolation_mld"] = float(custom_params["trunk_burst_isolation_mld"])
        if "depot_distance_factor" in custom_params:
            override_fields["depot_distance_factor"] = float(custom_params["depot_distance_factor"])
        if override_fields:
            scenario_obj = scenario_obj.model_copy(update=override_fields)

    policy_weights = POLICY_WEIGHTS[policy_preset]

    # Generate deterministic simulation ID
    sim_id = _generate_simulation_id(policy_preset, crisis_scenario, custom_params or {})
    timestamp = datetime.now(timezone.utc).isoformat()

    # ──────────────────────────────────────────────────────────
    # RUN A: BASELINE — default weights, unmodified inputs
    # ──────────────────────────────────────────────────────────
    baseline_metrics = _execute_allocation(
        wards=wards,
        total_supply=total_supply,
        weights=None,  # Use default production weights
        demand_multiplier=1.0,
        supply_reduction_pct=0.0,
        depot_distance_factor=1.0,
    )

    # ──────────────────────────────────────────────────────────
    # RUN B: SCENARIO — policy weights + crisis modifiers
    # ──────────────────────────────────────────────────────────

    # Calculate effective supply after reduction
    effective_supply_reduction = scenario_obj.supply_reduction_pct

    scenario_metrics = _execute_allocation(
        wards=wards,
        total_supply=total_supply,
        weights=policy_weights,
        demand_multiplier=scenario_obj.demand_multiplier,
        supply_reduction_pct=effective_supply_reduction,
        depot_distance_factor=scenario_obj.depot_distance_factor,
    )

    # ──────────────────────────────────────────────────────────
    # IMPACT DELTAS
    # ──────────────────────────────────────────────────────────
    impact_deltas = _compute_impact_deltas(baseline_metrics, scenario_metrics)

    # ──────────────────────────────────────────────────────────
    # WHY EXPLANATIONS
    # ──────────────────────────────────────────────────────────
    why_explanations = _generate_why_explanations(
        baseline_metrics, scenario_metrics, scenario_obj, policy_preset
    )

    # ──────────────────────────────────────────────────────────
    # GOVERNANCE CLASSIFICATION
    # ──────────────────────────────────────────────────────────
    governance = _classify_governance(
        baseline_metrics, scenario_metrics, scenario_obj, crisis_scenario
    )

    return SandboxSimulationResult(
        simulation_id=sim_id,
        timestamp=timestamp,
        policy_preset=policy_preset,
        crisis_scenario=crisis_scenario,
        scenario_description=scenario_obj.description,
        scenario_assumptions=scenario_obj.assumptions,
        policy_weights=policy_weights,
        baseline=baseline_metrics,
        scenario=scenario_metrics,
        impact_deltas=impact_deltas,
        why_explanations=why_explanations,
        governance=governance,
    )


def _execute_allocation(
    wards: List[Dict[str, Any]],
    total_supply: int,
    weights: Optional[Dict[str, float]],
    demand_multiplier: float,
    supply_reduction_pct: float,
    depot_distance_factor: float,
) -> AllocationMetrics:
    """
    Execute a single allocation pass using the EXISTING priority scoring + LP solver.
    This is the ONLY allocation path — no second algorithm.
    """
    # Import here to avoid circular imports at module level
    from ai_engine.main import compute_priority, WardInput, WardPriority
    from ai_engine.main import (
        WEIGHT_VULNERABILITY, WEIGHT_UNMET_DEMAND, WEIGHT_POPULATION,
        WEIGHT_HISTORICAL_DEFICIT, WEIGHT_DISTANCE,
    )
    import ai_engine.main as engine_module

    # Apply supply reduction
    effective_supply = int(total_supply * (1.0 - supply_reduction_pct / 100.0))

    # Save original weights
    orig_vuln = engine_module.WEIGHT_VULNERABILITY
    orig_demand = engine_module.WEIGHT_UNMET_DEMAND
    orig_pop = engine_module.WEIGHT_POPULATION
    orig_deficit = engine_module.WEIGHT_HISTORICAL_DEFICIT
    orig_dist = engine_module.WEIGHT_DISTANCE

    try:
        # Apply policy weights if provided
        if weights:
            engine_module.WEIGHT_VULNERABILITY = weights.get("vulnerability", orig_vuln)
            engine_module.WEIGHT_UNMET_DEMAND = weights.get("unmet_demand", orig_demand)
            engine_module.WEIGHT_POPULATION = weights.get("population", orig_pop)
            engine_module.WEIGHT_HISTORICAL_DEFICIT = weights.get("historical_deficit", orig_deficit)
            engine_module.WEIGHT_DISTANCE = weights.get("distance", orig_dist)

        # Build ward inputs with scenario modifications
        ward_inputs = []
        for w in wards:
            modified_demand = int(w.get("demand_liters", 0) * demand_multiplier)
            modified_distance = w.get("depot_distance_km", 0) * depot_distance_factor

            ward_inputs.append(WardInput(
                ward_id=w["ward_id"],
                ward_number=w.get("ward_number", w.get("ward_code", str(w["ward_id"]))),
                name=w["name"],
                population=w.get("population", 0),
                vulnerability_index=w.get("vulnerability_index", 0.0),
                dry_pipe_hours=w.get("dry_pipe_hours", 0.0),
                historical_deficit=w.get("historical_deficit", 0.0),
                demand_liters=modified_demand,
                depot_distance_km=modified_distance,
            ))

        # Execute EXISTING priority scoring
        scored = [compute_priority(w) for w in ward_inputs]
        scored.sort(key=lambda x: x.total_score, reverse=True)

        # Execute EXISTING allocation (priority waterfall)
        remaining_supply = effective_supply
        allocations: Dict[str, float] = {}
        total_allocated = 0.0
        total_demand = sum(s.demand_liters for s in scored)
        affected_wards = 0
        critical_wards = 0

        for s in scored:
            alloc = min(s.demand_liters, max(0, remaining_supply))
            allocations[str(s.ward_number)] = float(alloc)
            remaining_supply -= alloc
            total_allocated += alloc

            if alloc < s.demand_liters and s.demand_liters > 0:
                affected_wards += 1
            if s.tier == 1 and alloc < s.demand_liters:
                critical_wards += 1

        # Strategic reserve calculation (10% of original supply)
        reserve_held = round(total_supply * 0.10, 2)

        # Fulfillment ratios
        fulfillment_ratio = round(total_allocated / total_demand, 4) if total_demand > 0 else 1.0
        high_vuln_demand = sum(s.demand_liters for s in scored if s.total_score >= 60.0)
        high_vuln_alloc = sum(allocations.get(str(s.ward_number), 0) for s in scored if s.total_score >= 60.0)
        high_vuln_ratio = round(high_vuln_alloc / high_vuln_demand, 4) if high_vuln_demand > 0 else 1.0

        # Constraint violations
        violations = []
        if total_allocated > effective_supply:
            violations.append("SUPPLY_BUDGET_EXCEEDED")
        if any(allocations[k] < 0 for k in allocations):
            violations.append("NEGATIVE_ALLOCATION")

        return AllocationMetrics(
            total_supply=round(float(effective_supply), 2),
            total_demand=round(float(total_demand), 2),
            allocated_volume=round(total_allocated, 2),
            unmet_demand=round(max(0, total_demand - total_allocated), 2),
            reserve_held=reserve_held,
            fulfillment_ratio=fulfillment_ratio,
            high_vuln_fulfillment_ratio=high_vuln_ratio,
            affected_wards=affected_wards,
            critical_wards=critical_wards,
            solver_status="PRIORITY_WATERFALL",
            allocations=allocations,
            constraint_violations=violations,
        )

    finally:
        # ALWAYS restore original weights
        engine_module.WEIGHT_VULNERABILITY = orig_vuln
        engine_module.WEIGHT_UNMET_DEMAND = orig_demand
        engine_module.WEIGHT_POPULATION = orig_pop
        engine_module.WEIGHT_HISTORICAL_DEFICIT = orig_deficit
        engine_module.WEIGHT_DISTANCE = orig_dist


# ---------------------------------------------------------------------------
# Simulation Store (demo in-memory — NOT persisted across restarts)
# ---------------------------------------------------------------------------

SIMULATION_STORE: Dict[str, Dict[str, Any]] = {}


def store_simulation(result: SandboxSimulationResult) -> None:
    """Store a simulation result for traceability. Demo in-memory store."""
    SIMULATION_STORE[result.simulation_id] = result.model_dump()


def get_simulation(simulation_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a stored simulation result."""
    return SIMULATION_STORE.get(simulation_id)


def check_duplicate_pending(simulation_id: str, governance_decisions: list) -> bool:
    """
    Check if a pending governance decision already exists for this simulation.
    Prevents accidental duplicate decisions from repeated simulation runs.
    """
    for d in governance_decisions:
        if (d.get("simulation_id") == simulation_id
                and d.get("status") in ("pending", "pending_review")):
            return True
    return False
