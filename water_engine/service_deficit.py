"""
WaterFlow OS — Service Deficit Modeling Engine
Computes mathematically normalized service deficit and reliability metrics across temporal windows.
Strictly separates rate-based, cumulative, and reliability measures to prevent double counting.
"""

from __future__ import annotations

from typing import Dict, List, Optional
import numpy as np
from pydantic import BaseModel, Field


class ServiceDeficitMetrics(BaseModel):
    ward_code: str
    historical_fulfillment_ratio: float = Field(..., ge=0.0, le=1.0)
    consecutive_supply_failures: int = Field(..., ge=0)
    days_since_last_supply: int = Field(..., ge=0)
    cumulative_unmet_liters: float = Field(..., ge=0.0)
    service_reliability_deficit: float = Field(..., ge=0.0, le=1.0)
    composite_deficit_score: float = Field(..., ge=0.0, le=1.0)
    notes: List[str] = []


class ServiceDeficitModel:
    """
    Evaluates rolling historical service deficits without multicollinear duplication.
    """

    def __init__(
        self,
        max_failure_streak_cap: int = 7,
        max_days_without_supply_cap: int = 14,
        max_cumulative_liters_cap: float = 100000.0
    ):
        self.max_failure_streak_cap = max_failure_streak_cap
        self.max_days_without_supply_cap = max_days_without_supply_cap
        self.max_cumulative_liters_cap = max_cumulative_liters_cap

    def calculate_deficit(
        self,
        ward_code: str,
        daily_demands: List[float],
        daily_supplies: List[float],
        unplanned_outage_days: int = 0
    ) -> ServiceDeficitMetrics:
        """
        Calculates service deficit metrics from historical daily time-series vectors.
        """
        if len(daily_demands) != len(daily_supplies):
            raise ValueError("Demands and supplies vectors must have identical lengths")

        n = len(daily_demands)
        if n == 0:
            return ServiceDeficitMetrics(
                ward_code=ward_code,
                historical_fulfillment_ratio=1.0,
                consecutive_supply_failures=0,
                days_since_last_supply=0,
                cumulative_unmet_liters=0.0,
                service_reliability_deficit=0.0,
                composite_deficit_score=0.0,
                notes=["No historical observations; neutral baseline assigned"]
            )

        total_demand = sum(daily_demands)
        total_supply = sum(daily_supplies)
        cumulative_unmet = max(0.0, total_demand - total_supply)

        # 1. Fulfillment ratio [0, 1]
        fulfillment_ratio = total_supply / total_demand if total_demand > 0 else 1.0
        fulfillment_ratio = min(max(fulfillment_ratio, 0.0), 1.0)

        # 2. Consecutive failure streak and days since last supply (evaluated from most recent day backwards)
        consecutive_failures = 0
        days_since_supply = 0
        saw_supply = False

        for demand, supply in zip(reversed(daily_demands), reversed(daily_supplies)):
            if supply < (0.5 * demand) and not saw_supply:
                consecutive_failures += 1
            if supply > 0:
                saw_supply = True
            elif not saw_supply:
                days_since_supply += 1

        # 3. Reliability Deficit: Outage rate + failure rate
        failed_days = sum(1 for d, s in zip(daily_demands, daily_supplies) if s < 0.7 * d)
        reliability_deficit = min(1.0, (failed_days + unplanned_outage_days) / max(1, n + unplanned_outage_days))

        # 4. Normalized Composite Score (avoiding double-counting)
        # 50% from unfulfilled ratio, 30% from acute streak/recency, 20% from general reliability
        norm_fulfillment_gap = 1.0 - fulfillment_ratio
        norm_streak = min(consecutive_failures / self.max_failure_streak_cap, 1.0)
        composite = (0.50 * norm_fulfillment_gap) + (0.30 * norm_streak) + (0.20 * reliability_deficit)
        composite = round(min(max(composite, 0.0), 1.0), 3)

        return ServiceDeficitMetrics(
            ward_code=ward_code,
            historical_fulfillment_ratio=round(fulfillment_ratio, 3),
            consecutive_supply_failures=consecutive_failures,
            days_since_last_supply=days_since_supply,
            cumulative_unmet_liters=round(cumulative_unmet, 1),
            service_reliability_deficit=round(reliability_deficit, 3),
            composite_deficit_score=composite,
            notes=[
                f"Historical fulfillment: {fulfillment_ratio*100:.1f}%",
                f"Consecutive sub-quota days: {consecutive_failures}",
                f"Cumulative deficit: {cumulative_unmet:,.0f} L"
            ]
        )
