"""
WaterFlow OS — Storage-Aware Delivery Optimization
Calculates exact replenishment requirements bounded by storage capacity and unmet demand to prevent over-delivery.
"""

from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class StorageNode(BaseModel):
    node_id: str
    name: str
    tank_capacity_liters: float = Field(..., ge=0.0)
    current_storage_liters: float = Field(..., ge=0.0)
    target_storage_liters: Optional[float] = None
    unmet_demand_liters: float = Field(..., ge=0.0)


class StorageDeliveryRecommendation(BaseModel):
    node_id: str
    tank_capacity_liters: float
    current_storage_liters: float
    storage_headroom_liters: float
    effective_unmet_demand_liters: float
    recommended_delivery_liters: float
    over_delivery_prevented_liters: float
    condition: str  # e.g. "FULL_TANK", "PARTIAL_REPLENISHMENT", "EMPTY_TANK", "ZERO_DEMAND"


class StorageAwareDeliveryOptimizer:
    """
    Computes required delivery volume strictly bounded by tank headroom and unmet requirement:
    required_delivery = min(max(0, target_storage - current_storage), unmet_requirement)
    """

    def compute_delivery(
        self,
        node: StorageNode,
        available_supply_budget: Optional[float] = None
    ) -> StorageDeliveryRecommendation:
        target = node.target_storage_liters if node.target_storage_liters is not None else node.tank_capacity_liters
        target = min(target, node.tank_capacity_liters)

        # Storage headroom (physical capacity to accept water)
        headroom = max(0.0, target - node.current_storage_liters)

        # Demand constraint
        unmet = max(0.0, node.unmet_demand_liters)

        # 1. Zero demand check
        if unmet <= 0.0:
            return StorageDeliveryRecommendation(
                node_id=node.node_id,
                tank_capacity_liters=node.tank_capacity_liters,
                current_storage_liters=node.current_storage_liters,
                storage_headroom_liters=headroom,
                effective_unmet_demand_liters=0.0,
                recommended_delivery_liters=0.0,
                over_delivery_prevented_liters=headroom,
                condition="ZERO_DEMAND"
            )

        # 2. Full or over-capacity tank check
        if node.current_storage_liters >= target:
            return StorageDeliveryRecommendation(
                node_id=node.node_id,
                tank_capacity_liters=node.tank_capacity_liters,
                current_storage_liters=node.current_storage_liters,
                storage_headroom_liters=0.0,
                effective_unmet_demand_liters=unmet,
                recommended_delivery_liters=0.0,
                over_delivery_prevented_liters=unmet,
                condition="FULL_TANK_OR_EXCEEDED"
            )

        # 3. Standard storage-bounded replenishment
        preliminary_delivery = min(headroom, unmet)

        # 4. Supply budget constraint if applicable
        if available_supply_budget is not None:
            preliminary_delivery = min(preliminary_delivery, max(0.0, available_supply_budget))

        over_delivery_prevented = max(0.0, unmet - preliminary_delivery) if unmet > headroom else 0.0

        condition = "EMPTY_TANK_REPLENISHMENT" if node.current_storage_liters == 0.0 else "PARTIAL_REPLENISHMENT"

        return StorageDeliveryRecommendation(
            node_id=node.node_id,
            tank_capacity_liters=node.tank_capacity_liters,
            current_storage_liters=node.current_storage_liters,
            storage_headroom_liters=headroom,
            effective_unmet_demand_liters=unmet,
            recommended_delivery_liters=round(preliminary_delivery, 2),
            over_delivery_prevented_liters=round(over_delivery_prevented, 2),
            condition=condition
        )
