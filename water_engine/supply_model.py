"""
WaterFlow OS — Physical Water Availability & Supply Mass Balance Model (Phase 5)
================================================================================
Calculates realistic, physically constrained usable potable water supplies across
Mumbai's bulk infrastructure chain:
Raw Inflow/Lakes -> Treatment -> Transmission -> Storage -> Losses -> Usable Potable Supply.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class SupplyParameters(BaseModel):
    """Bulk municipal infrastructure capacity parameters."""
    # Lake impoundment & hydrology
    total_lake_storage_ml: float = Field(1447363.0, ge=0.0, description="Current lake storage in Million Liters")
    daily_draw_rate_mld: float = Field(3950.0, ge=0.0, description="Nominal daily bulk draw rate from lakes in MLD")
    catchment_inflow_mld: float = Field(0.0, ge=0.0, description="Daily catchment inflow into lakes in MLD")
    environmental_release_mld: float = Field(150.0, ge=0.0, description="Statutory downstream river environmental flow in MLD")

    # Treatment works
    bhandup_treatment_capacity_mld: float = Field(2810.0, ge=0.0, description="Bhandup treatment plant capacity in MLD")
    panjrapur_treatment_capacity_mld: float = Field(1365.0, ge=0.0, description="Panjrapur treatment plant capacity in MLD")
    treatment_backwash_loss_pct: float = Field(2.5, ge=0.0, le=10.0, description="Plant backwash & process loss percentage")

    # Transmission & conduits
    transmission_conduit_capacity_mld: float = Field(4200.0, ge=0.0, description="Trunk main transmission hydraulic capacity in MLD")
    trunk_burst_isolation_mld: float = Field(0.0, ge=0.0, description="Capacity lost to active trunk bursts or isolation in MLD")

    # Terminal balancing reservoirs & pumping
    mbr_storage_capacity_mld: float = Field(4500.0, ge=0.0, description="Master balancing reservoir storage capacity in MLD")
    booster_pumping_capacity_mld: float = Field(4300.0, ge=0.0, description="Booster pumping station operational throughput in MLD")
    pumping_power_available: bool = Field(True, description="True if primary grid power is active at booster stations")

    # Network distribution losses & reserve
    nrw_loss_fraction: float = Field(0.28, ge=0.0, le=0.60, description="Non-revenue water physical loss rate (28% default)")
    emergency_reserve_fraction: float = Field(0.05, ge=0.0, le=0.25, description="Dedicated disaster/firefighting reserve held back")
    relief_tanker_share_fraction: float = Field(0.0015, ge=0.0, le=0.05, description="Fraction of potable supply earmarked for emergency relief tankers")


class SupplyBalanceResult(BaseModel):
    """Detailed mass-balance audit across infrastructure stages."""
    raw_source_water_mld: float
    treatable_water_mld: float
    treated_water_mld: float
    transmission_water_mld: float
    distribution_water_mld: float
    losses_nrw_mld: float
    net_potable_water_mld: float
    emergency_reserve_mld: float
    usable_potable_water_mld: float
    daily_relief_water_budget_liters: int
    bottleneck_stage: str
    active_constraints: list[str]


def compute_water_supply_balance(params: Optional[SupplyParameters] = None) -> SupplyBalanceResult:
    """
    Computes strict physical water balance across all 6 stages:
    Stage 1: Raw Water Availability
    Stage 2: Filtration / Treatment Works
    Stage 3: Bulk Transmission
    Stage 4: Terminal Balancing Storage & Pumping
    Stage 5: Distribution Deductions (NRW Losses)
    Stage 6: Usable Relief Potable Budget
    """
    if params is None:
        params = SupplyParameters()

    active_constraints = []

    # 1. Raw Source Availability (MLD)
    # Available draw is bounded by active storage and daily permit, minus environmental river release
    net_inflow_contribution = max(0.0, params.catchment_inflow_mld - params.environmental_release_mld)
    raw_source = min(params.daily_draw_rate_mld, params.total_lake_storage_ml / 10.0) + net_inflow_contribution

    # 2. Treatment Capacity (MLD)
    total_treatment_capacity = params.bhandup_treatment_capacity_mld + params.panjrapur_treatment_capacity_mld
    treatable_water = min(raw_source, total_treatment_capacity)
    if treatable_water < raw_source:
        active_constraints.append("TREATMENT_CAPACITY_LIMIT")

    # Deduct treatment plant filter backwash and sludge losses
    treated_water = treatable_water * (1.0 - (params.treatment_backwash_loss_pct / 100.0))

    # 3. Transmission Conduits (MLD)
    effective_transmission_cap = max(0.0, params.transmission_conduit_capacity_mld - params.trunk_burst_isolation_mld)
    transmission_water = min(treated_water, effective_transmission_cap)
    if transmission_water < treated_water:
        active_constraints.append("TRANSMISSION_CONDUIT_LIMIT")

    # 4. Terminal Storage & Pumping (MLD)
    effective_pumping = params.booster_pumping_capacity_mld
    if not params.pumping_power_available:
        effective_pumping *= 0.30  # 70% throughput drop on emergency generator mode
        active_constraints.append("PUMPING_STATION_POWER_OUTAGE")

    distribution_water = min(transmission_water, params.mbr_storage_capacity_mld, effective_pumping)
    if distribution_water < transmission_water:
        if distribution_water == effective_pumping:
            active_constraints.append("PUMPING_THROUGHPUT_LIMIT")
        else:
            active_constraints.append("TERMINAL_STORAGE_LIMIT")

    # 5. Non-Revenue Water (NRW) Losses (MLD)
    losses_nrw = distribution_water * params.nrw_loss_fraction
    net_potable = max(0.0, distribution_water - losses_nrw)

    # 6. Usable Potable Water & Dedicated Relief Budget (Liters)
    emergency_reserve = net_potable * params.emergency_reserve_fraction
    usable_potable = max(0.0, net_potable - emergency_reserve)

    # Emergency tanker relief allocation (earmarked fraction converted to Liters)
    # Default 0.0015 of usable potable supply corresponds to ~420,000 Liters daily tanker relief
    relief_budget_liters = int(usable_potable * params.relief_tanker_share_fraction * 1_000_000)

    # Determine primary bottleneck stage
    candidates = {
        "RAW_SOURCE": raw_source,
        "TREATMENT": total_treatment_capacity,
        "TRANSMISSION": effective_transmission_cap,
        "STORAGE_PUMPING": min(params.mbr_storage_capacity_mld, effective_pumping)
    }
    primary_bottleneck = min(candidates, key=candidates.get)

    return SupplyBalanceResult(
        raw_source_water_mld=round(raw_source, 2),
        treatable_water_mld=round(treatable_water, 2),
        treated_water_mld=round(treated_water, 2),
        transmission_water_mld=round(transmission_water, 2),
        distribution_water_mld=round(distribution_water, 2),
        losses_nrw_mld=round(losses_nrw, 2),
        net_potable_water_mld=round(net_potable, 2),
        emergency_reserve_mld=round(emergency_reserve, 2),
        usable_potable_water_mld=round(usable_potable, 2),
        daily_relief_water_budget_liters=relief_budget_liters,
        bottleneck_stage=primary_bottleneck,
        active_constraints=active_constraints
    )


if __name__ == "__main__":
    res = compute_water_supply_balance()
    print("Normal Baseline Supply Balance:")
    print(res.model_dump_json(indent=2))
