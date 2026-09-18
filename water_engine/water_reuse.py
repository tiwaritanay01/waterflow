"""
WaterFlow OS — Water Reuse & Multi-Quality Allocation Module
Classification: SCENARIO_PARAMETER / OPTIONAL_OPTIMIZATION
Categorizes demand into POTABLE, NON_POTABLE, and RECLAIMED water streams.
Prevents the misallocation of scarce potable water for non-potable municipal purposes (e.g. road washing, construction, park irrigation).
"""

from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class WaterQualityDemand(BaseModel):
    location_id: str
    potable_drinking_domestic_liters: float = Field(..., ge=0.0)
    non_potable_sanitation_industrial_liters: float = Field(..., ge=0.0)


class QualitySegregatedSupply(BaseModel):
    potable_available_liters: float = Field(..., ge=0.0)
    reclaimed_available_liters: float = Field(..., ge=0.0)


class MultiQualityAllocationResult(BaseModel):
    potable_allocated_to_drinking: float
    reclaimed_allocated_to_non_potable: float
    potable_diverted_to_non_potable_shortage: float
    unserved_potable_liters: float
    unserved_non_potable_liters: float
    potable_water_saved_by_reuse_liters: float
    reuse_efficiency_pct: float


class WaterReuseOptimizer:
    """
    Optimizes water allocation across dual-quality demand profiles without fabricating empirical reclaimed data.
    """

    def allocate_dual_quality(
        self,
        demands: List[WaterQualityDemand],
        supplies: QualitySegregatedSupply
    ) -> MultiQualityAllocationResult:
        total_potable_demand = sum(d.potable_drinking_domestic_liters for d in demands)
        total_non_potable_demand = sum(d.non_potable_sanitation_industrial_liters for d in demands)

        rem_potable_supply = supplies.potable_available_liters
        rem_reclaimed_supply = supplies.reclaimed_available_liters

        # 1. First satisfy potable domestic demand with potable supply
        potable_to_drinking = min(rem_potable_supply, total_potable_demand)
        rem_potable_supply -= potable_to_drinking
        unserved_potable = max(0.0, total_potable_demand - potable_to_drinking)

        # 2. Satisfy non-potable demand with reclaimed supply first
        reclaimed_to_non_potable = min(rem_reclaimed_supply, total_non_potable_demand)
        rem_reclaimed_supply -= reclaimed_to_non_potable
        unmet_non_potable = max(0.0, total_non_potable_demand - reclaimed_to_non_potable)

        # 3. Only if potable surplus exists AND unmet non-potable demand is critical, divert potable
        potable_diverted = min(rem_potable_supply, unmet_non_potable)
        rem_potable_supply -= potable_diverted
        unserved_non_potable = max(0.0, unmet_non_potable - potable_diverted)

        # Potable water saved is exactly the volume of reclaimed water successfully utilized
        potable_saved = reclaimed_to_non_potable
        reuse_eff = (reclaimed_to_non_potable / supplies.reclaimed_available_liters * 100.0) if supplies.reclaimed_available_liters > 0 else 0.0

        return MultiQualityAllocationResult(
            potable_allocated_to_drinking=round(potable_to_drinking, 2),
            reclaimed_allocated_to_non_potable=round(reclaimed_to_non_potable, 2),
            potable_diverted_to_non_potable_shortage=round(potable_diverted, 2),
            unserved_potable_liters=round(unserved_potable, 2),
            unserved_non_potable_liters=round(unserved_non_potable, 2),
            potable_water_saved_by_reuse_liters=round(potable_saved, 2),
            reuse_efficiency_pct=round(reuse_eff, 2)
        )
