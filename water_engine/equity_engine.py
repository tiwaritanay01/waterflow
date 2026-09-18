"""
WaterFlow OS — Decoupled Equity & Allocation Engine
Version: 3.0.0-research
Framework: Multi-Criteria Service Deficit & Lifeline Needs Model

Decouples physical human need and service deficit from logistical route distance.
Route distance is strictly relegated to logistics and routing optimization (CVRP).
Zero demographic identity bias is allowed; priorities are driven by empirical service access deficits.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import yaml
from pydantic import BaseModel, Field


DEFAULT_POLICY_PATH = Path(__file__).resolve().parent.parent / "config" / "allocation_policy.yaml"


class NeedFactorBreakdown(BaseModel):
    factor_key: str
    factor_name: str
    symbol: str
    weight: float
    raw_value: float
    normalized_value: float
    weighted_contribution: float
    description: str


class NeedAssessment(BaseModel):
    location_id: Union[int, str]
    location_name: str
    unmet_demand_liters: float
    priority_score: float = Field(..., ge=0.0, le=100.0)
    tier: int
    breakdown: List[NeedFactorBreakdown]
    is_emergency: bool = False
    emergency_reason: Optional[str] = None
    policy_version: str


class AllocationResult(BaseModel):
    decision_id: str
    policy_version: str
    total_supply_available: float
    total_unmet_demand: float
    total_allocated: float
    unserved_demand: float
    allocations: Dict[str, float]  # location_id -> liters allocated
    assessments: List[NeedAssessment]
    constraints_enforced: List[str]


class EquityEngine:
    """
    Authoritative, configuration-driven equity allocation engine.
    """

    def __init__(self, policy_path: Optional[Union[str, Path]] = None):
        self.policy_path = Path(policy_path) if policy_path else DEFAULT_POLICY_PATH
        self.policy = self._load_policy(self.policy_path)
        self.version = self.policy.get("policy_version", "3.0.0-research")
        self.weights = self.policy.get("weights", {})
        self.factors = self.policy.get("factors", {})
        self.normalization = self.policy.get("normalization", {})
        self.missing_policy = self.policy.get("missing_data_policy", {})
        self.constraints = self.policy.get("constraints", {})
        self._validate_weights()

    def _load_policy(self, path: Path) -> Dict[str, Any]:
        if not path.exists():
            raise FileNotFoundError(f"Allocation policy configuration not found at {path}")
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def _validate_weights(self) -> None:
        total_w = sum(self.weights.values())
        if not (0.999 <= total_w <= 1.001):
            raise ValueError(f"Allocation policy weights must sum to 1.0, got {total_w}")

    def evaluate_priority(
        self,
        location_id: Union[int, str],
        location_name: str,
        unmet_demand_liters: float,
        vulnerability_index: Optional[float] = None,
        historical_deficit: Optional[float] = None,
        reliability_deficit: Optional[float] = None,
        complaint_evidence: Optional[float] = None,
        critical_facility: Optional[float] = None,
        is_emergency: bool = False,
        emergency_reason: Optional[str] = None
    ) -> NeedAssessment:
        """
        Calculates normalized, explainable priority score for a location:
        P_i = 100 * (w_V * V_i + w_U * U_i + w_H * H_i + w_R * R_i + w_C * C_i + w_F * F_i)
        """
        # Missing data imputation per documented policy
        v_raw = vulnerability_index if vulnerability_index is not None else 0.5
        u_raw = max(0.0, float(unmet_demand_liters))
        h_raw = historical_deficit if historical_deficit is not None else 0.5
        r_raw = reliability_deficit if reliability_deficit is not None else 0.5
        c_raw = complaint_evidence if complaint_evidence is not None else 0.0
        f_raw = critical_facility if critical_facility is not None else 0.0

        # Normalizations
        max_demand = float(self.normalization.get("unmet_demand_max_liters", 25000.0))
        max_complaint = float(self.normalization.get("complaint_evidence_max_score", 10.0))

        v_norm = min(max(float(v_raw), 0.0), 1.0)
        u_norm = min(u_raw / max_demand, 1.0) if max_demand > 0 else 0.0
        h_norm = min(max(float(h_raw), 0.0), 1.0)
        r_norm = min(max(float(r_raw), 0.0), 1.0)
        c_norm = min(max(float(c_raw), 0.0) / max_complaint, 1.0) if max_complaint > 0 else 0.0
        f_norm = min(max(float(f_raw), 0.0), 1.0)

        # Factor contributions
        w_v = self.weights.get("vulnerability", 0.25)
        w_u = self.weights.get("unmet_demand", 0.25)
        w_h = self.weights.get("historical_deficit", 0.20)
        w_r = self.weights.get("reliability_deficit", 0.10)
        w_c = self.weights.get("complaint_evidence", 0.10)
        w_f = self.weights.get("critical_facility", 0.10)

        c_v = v_norm * w_v * 100.0
        c_u = u_norm * w_u * 100.0
        c_h = h_norm * w_h * 100.0
        c_r = r_norm * w_r * 100.0
        c_c = c_norm * w_c * 100.0
        c_f = f_norm * w_f * 100.0

        total_score = c_v + c_u + c_h + c_r + c_c + c_f
        total_score = round(min(max(total_score, 0.0), 100.0), 2)

        # Emergency override: if active, priority elevated to 100.0 with audit trail
        if is_emergency:
            total_score = 100.0
            tier = 1
        elif total_score >= 75.0:
            tier = 1
        elif total_score >= 55.0:
            tier = 2
        elif total_score >= 35.0:
            tier = 3
        else:
            tier = 4

        breakdown = [
            NeedFactorBreakdown(
                factor_key="vulnerability",
                factor_name="Socio-Spatial Vulnerability",
                symbol="V",
                weight=w_v,
                raw_value=round(v_raw, 3),
                normalized_value=round(v_norm, 4),
                weighted_contribution=round(c_v, 2),
                description=f"Vulnerability Index {v_raw:.2f}"
            ),
            NeedFactorBreakdown(
                factor_key="unmet_demand",
                factor_name="Normalized Unmet Demand",
                symbol="U",
                weight=w_u,
                raw_value=round(u_raw, 1),
                normalized_value=round(u_norm, 4),
                weighted_contribution=round(c_u, 2),
                description=f"{u_raw:,.0f} L unserved"
            ),
            NeedFactorBreakdown(
                factor_key="historical_deficit",
                factor_name="Historical Service Deficit",
                symbol="H",
                weight=w_h,
                raw_value=round(h_raw, 3),
                normalized_value=round(h_norm, 4),
                weighted_contribution=round(c_h, 2),
                description=f"{h_raw*100:.1f}% chronic deficit"
            ),
            NeedFactorBreakdown(
                factor_key="reliability_deficit",
                factor_name="Service Reliability Deficit",
                symbol="R",
                weight=w_r,
                raw_value=round(r_raw, 3),
                normalized_value=round(r_norm, 4),
                weighted_contribution=round(c_r, 2),
                description=f"{r_raw*100:.1f}% failure rate"
            ),
            NeedFactorBreakdown(
                factor_key="complaint_evidence",
                factor_name="Corroborated Complaints",
                symbol="C",
                weight=w_c,
                raw_value=round(c_raw, 2),
                normalized_value=round(c_norm, 4),
                weighted_contribution=round(c_c, 2),
                description=f"{c_raw:.1f} complaint score"
            ),
            NeedFactorBreakdown(
                factor_key="critical_facility",
                factor_name="Critical Facility Lifeline",
                symbol="F",
                weight=w_f,
                raw_value=round(f_raw, 3),
                normalized_value=round(f_norm, 4),
                weighted_contribution=round(c_f, 2),
                description=f"{f_raw*100:.1f}% facility criticality"
            ),
        ]

        return NeedAssessment(
            location_id=str(location_id),
            location_name=location_name,
            unmet_demand_liters=round(u_raw, 1),
            priority_score=total_score,
            tier=tier,
            breakdown=breakdown,
            is_emergency=is_emergency,
            emergency_reason=emergency_reason,
            policy_version=self.version
        )

    def allocate(
        self,
        assessments: List[NeedAssessment],
        available_supply_liters: float,
        decision_id: Optional[str] = None
    ) -> AllocationResult:
        """
        Constrained equitable water allocation.
        Enforces:
        1. Alloc_i >= 0
        2. Alloc_i <= UnmetDemand_i
        3. If UnmetDemand_i == 0, Alloc_i == 0
        4. sum(Alloc_i) <= available_supply_liters
        5. Prioritizes highest priority_score downwards
        """
        import uuid
        d_id = decision_id or f"dec-{uuid.uuid4().hex[:12]}"
        supply_remaining = max(0.0, float(available_supply_liters))
        total_demand = sum(a.unmet_demand_liters for a in assessments)

        # Sort descending by priority_score, breaking ties by unmet demand descending
        sorted_assessments = sorted(
            assessments,
            key=lambda a: (1 if a.is_emergency else 0, a.priority_score, a.unmet_demand_liters),
            reverse=True
        )

        allocations: Dict[str, float] = {}
        total_allocated = 0.0

        for a in sorted_assessments:
            loc_id = str(a.location_id)
            demand = a.unmet_demand_liters

            # Constraint: zero unmet demand gets zero allocation
            if demand <= 0.0 or supply_remaining <= 0.0:
                allocations[loc_id] = 0.0
                continue

            # Feasible allocation is min(demand, supply_remaining)
            alloc = min(demand, supply_remaining)
            allocations[loc_id] = round(alloc, 2)
            supply_remaining -= alloc
            total_allocated += alloc

        # Ensure all original assessment IDs are present in allocations dict
        for a in assessments:
            if str(a.location_id) not in allocations:
                allocations[str(a.location_id)] = 0.0

        constraints_enforced = [
            "allocation_non_negative",
            "allocation_not_above_unmet_demand",
            "zero_unmet_demand_prevents_allocation",
            "total_allocation_not_above_available_water"
        ]

        return AllocationResult(
            decision_id=d_id,
            policy_version=self.version,
            total_supply_available=round(float(available_supply_liters), 2),
            total_unmet_demand=round(total_demand, 2),
            total_allocated=round(total_allocated, 2),
            unserved_demand=round(max(0.0, total_demand - total_allocated), 2),
            allocations=allocations,
            assessments=assessments,
            constraints_enforced=constraints_enforced
        )
