"""
WaterFlow OS — Critical Facility Lifeline Assessment Engine
Evaluates hospitals, dialysis centers, clinics, schools, and shelter facilities based on measurable physical service risk.
Replaces arbitrary bonus scores with storage depletion horizon and clinical criticality metrics.
"""

from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# Standard clinical and public service criticality baselines
FACILITY_CRITICALITY_PROFILES: Dict[str, Dict[str, float]] = {
    "HOSPITAL_TERTIARY": {
        "criticality_weight": 1.0,
        "critical_reserve_hours": 8.0,
        "daily_per_bed_liters": 450.0  # IPHS standards for tertiary hospitals
    },
    "DIALYSIS_CENTRE": {
        "criticality_weight": 1.0,
        "critical_reserve_hours": 6.0,
        "daily_per_bed_liters": 500.0  # High water requirements for hemodialysis
    },
    "MATERNITY_CLINIC": {
        "criticality_weight": 0.90,
        "critical_reserve_hours": 12.0,
        "daily_per_bed_liters": 300.0
    },
    "PRIMARY_HEALTH_CENTER": {
        "criticality_weight": 0.75,
        "critical_reserve_hours": 18.0,
        "daily_per_bed_liters": 150.0
    },
    "SHELTER_HOME": {
        "criticality_weight": 0.65,
        "critical_reserve_hours": 24.0,
        "daily_per_bed_liters": 100.0
    },
    "COMMUNITY_SCHOOL": {
        "criticality_weight": 0.50,
        "critical_reserve_hours": 24.0,
        "daily_per_bed_liters": 45.0  # Non-residential day school
    }
}


class CriticalFacility(BaseModel):
    facility_id: str
    name: str
    ward_code: str
    facility_type: str
    bed_or_beneficiary_count: int
    storage_capacity_liters: float
    current_storage_liters: float
    daily_consumption_liters: float
    minimum_reserve_threshold_pct: float = 0.25


class FacilityRiskAssessment(BaseModel):
    facility_id: str
    name: str
    ward_code: str
    hours_of_reserve_remaining: float
    is_acute_lifeline_crisis: bool
    unmet_replenishment_needed_liters: float
    risk_score: float = Field(..., ge=0.0, le=1.0)
    urgency_tier: str


class CriticalFacilityEngine:
    """
    Evaluates physical service depletion risk for public and healthcare infrastructure.
    """

    def evaluate_facility(self, facility: CriticalFacility) -> FacilityRiskAssessment:
        profile = FACILITY_CRITICALITY_PROFILES.get(
            facility.facility_type.upper(),
            {"criticality_weight": 0.5, "critical_reserve_hours": 12.0, "daily_per_bed_liters": 100.0}
        )

        hourly_burn_rate = max(1.0, facility.daily_consumption_liters / 24.0)
        current_liters = max(0.0, facility.current_storage_liters)
        hours_remaining = round(current_liters / hourly_burn_rate, 1)

        # Replenishment volume to reach full capacity
        needed = max(0.0, facility.storage_capacity_liters - current_liters)

        # Measurable service risk:
        # Inverse function of hours of reserve remaining relative to critical threshold
        crit_hours = profile["critical_reserve_hours"]
        crit_weight = profile["criticality_weight"]

        if hours_remaining <= 4.0:
            is_crisis = True
            risk_score = 1.0
            urgency_tier = "CRITICAL_LIFELINE"
        elif hours_remaining <= crit_hours:
            is_crisis = False
            risk_score = round(min(1.0, crit_weight * (1.0 - (hours_remaining / (crit_hours * 2.0)))), 3)
            urgency_tier = "HIGH"
        elif hours_remaining <= 36.0:
            is_crisis = False
            risk_score = round(crit_weight * 0.4, 3)
            urgency_tier = "MODERATE"
        else:
            is_crisis = False
            risk_score = 0.1
            urgency_tier = "ADEQUATE"

        return FacilityRiskAssessment(
            facility_id=facility.facility_id,
            name=facility.name,
            ward_code=facility.ward_code,
            hours_of_reserve_remaining=hours_remaining,
            is_acute_lifeline_crisis=is_crisis,
            unmet_replenishment_needed_liters=needed,
            risk_score=risk_score,
            urgency_tier=urgency_tier
        )
