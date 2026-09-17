"""
WaterFlow OS — AI & Algorithmic Engine
FastAPI server implementing Priority Allocation, Equity Simulation, and Fleet VRP.
"""

from __future__ import annotations

import math
from typing import Optional

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="WaterFlow OS AI Engine",
    version="2.8.4",
    description="Priority allocation, equity simulation & fleet route optimization",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class WardInput(BaseModel):
    """Input data for a single ward."""
    ward_id: int
    ward_number: int
    name: str
    population: int = 0
    vulnerability_index: float = Field(0.0, ge=0.0, le=1.0)
    dry_pipe_hours: float = 0.0
    historical_deficit: float = Field(0.0, ge=0.0, le=1.0)
    demand_liters: int = 0
    depot_distance_km: float = 0.0
    description: Optional[str] = None


class PrioritizeRequest(BaseModel):
    wards: list[WardInput]
    total_supply: int = 420000  # total daily supply in liters


class ScoreBreakdown(BaseModel):
    factor: str
    weight: float
    raw_value: float
    normalized: float
    weighted_score: float
    description: str


class WardPriority(BaseModel):
    ward_id: int
    ward_number: int
    name: str
    demand_liters: int
    total_score: float
    tier: int
    breakdown: list[ScoreBreakdown]
    recommended_volume: int
    description: Optional[str] = None


class PrioritizeResponse(BaseModel):
    queue: list[WardPriority]
    total_wards: int
    critical_count: int


class SimulateEquityRequest(BaseModel):
    wards: list[WardInput]
    total_supply: int = 420000


class SimulationResult(BaseModel):
    method: str
    allocations: dict[int, int]  # ward_number -> liters allocated
    equity_index: float  # 0-100 percentage (higher = more equitable)
    vulnerable_coverage: float  # percentage of supply to vuln > 0.7
    total_allocated: int
    stddev: float


class SimulateEquityResponse(BaseModel):
    waterflow_ai: SimulationResult
    fcfs: SimulationResult
    improvement_equity: float
    improvement_coverage: float


class TankerInput(BaseModel):
    tanker_id: int
    transponder_id: str
    capacity: int


class RouteWardInput(BaseModel):
    ward_id: int
    ward_number: int
    name: str
    demand_liters: int


class OptimizeRoutesRequest(BaseModel):
    tankers: list[TankerInput]
    wards: list[RouteWardInput]
    distance_matrix: list[list[float]]  # (n_nodes x n_nodes), node 0 = depot


class RouteStop(BaseModel):
    ward_number: int
    name: str
    demand: int
    cumulative_load: int


class VehicleRoute(BaseModel):
    transponder_id: str
    capacity: int
    route: list[RouteStop]
    total_distance: float
    total_delivered: int


class OptimizeRoutesResponse(BaseModel):
    routes: list[VehicleRoute]
    total_distance: float
    total_demand_served: int
    unserved_wards: list[int]


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

WEIGHT_VULNERABILITY = 0.30
WEIGHT_UNMET_DEMAND = 0.25
WEIGHT_POPULATION = 0.20
WEIGHT_HISTORICAL_DEFICIT = 0.15
WEIGHT_DISTANCE = 0.10

MAX_DRY_PIPE_HOURS = 72.0
MAX_POPULATION = 50000.0
MAX_DISTANCE_KM = 15.0  # normalize distance against this cap


# ---------------------------------------------------------------------------
# Helper: Haversine distance (km)
# ---------------------------------------------------------------------------

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Core: Priority Scoring Engine
# ---------------------------------------------------------------------------

def compute_priority(ward: WardInput) -> WardPriority:
    """
    Compute an explainable priority score (0-100) for a ward.

    Formula:
        Score = Vulnerability(30%) + UnmetDemand(25%) + Population(20%)
              + HistoricalDeficit(15%) + Distance(10%)
    """

    # --- 1. Vulnerability (30%) ---
    # Already normalized 0-1
    vuln_raw = ward.vulnerability_index
    vuln_norm = min(max(vuln_raw, 0.0), 1.0)
    vuln_weighted = vuln_norm * WEIGHT_VULNERABILITY * 100

    # Descriptive label
    if vuln_norm >= 0.8:
        vuln_desc = "High informal pop"
    elif vuln_norm >= 0.5:
        vuln_desc = "Moderate vulnerability"
    else:
        vuln_desc = "Low vulnerability"

    # --- 2. Unmet Demand (25%) ---
    # Dry pipe hours capped at 72h, normalized to 0-1
    demand_raw = ward.dry_pipe_hours
    demand_norm = min(demand_raw / MAX_DRY_PIPE_HOURS, 1.0)
    demand_weighted = demand_norm * WEIGHT_UNMET_DEMAND * 100
    demand_desc = f"{int(demand_raw)}h pipe dry"

    # --- 3. Population (20%) ---
    # Normalized against max ward population of 50,000
    pop_raw = ward.population
    pop_norm = min(pop_raw / MAX_POPULATION, 1.0)
    pop_weighted = pop_norm * WEIGHT_POPULATION * 100
    pop_desc = f"{pop_raw:,} residents"

    # --- 4. Historical Deficit (15%) ---
    # Percentage of unmet quota in last 7 days (already 0-1)
    deficit_raw = ward.historical_deficit
    deficit_norm = min(max(deficit_raw, 0.0), 1.0)
    deficit_weighted = deficit_norm * WEIGHT_HISTORICAL_DEFICIT * 100
    deficit_desc = f"{int(deficit_raw * 100)}% last ration"

    # --- 5. Distance (10%) ---
    # Inverted: closer to depot = lower need, farther = higher need
    # Normalized against MAX_DISTANCE_KM
    dist_raw = ward.depot_distance_km
    dist_norm = min(dist_raw / MAX_DISTANCE_KM, 1.0)
    dist_weighted = dist_norm * WEIGHT_DISTANCE * 100
    dist_desc = f"{dist_raw:.1f}km from depot"

    # --- Total score ---
    total = vuln_weighted + demand_weighted + pop_weighted + deficit_weighted + dist_weighted
    total = round(min(total, 100.0), 1)

    # Tier assignment
    if total >= 80:
        tier = 1
    elif total >= 60:
        tier = 2
    elif total >= 40:
        tier = 3
    else:
        tier = 4

    breakdown = [
        ScoreBreakdown(
            factor="Vulnerability",
            weight=WEIGHT_VULNERABILITY,
            raw_value=vuln_raw,
            normalized=round(vuln_norm, 3),
            weighted_score=round(vuln_weighted, 1),
            description=vuln_desc,
        ),
        ScoreBreakdown(
            factor="Unmet Demand",
            weight=WEIGHT_UNMET_DEMAND,
            raw_value=demand_raw,
            normalized=round(demand_norm, 3),
            weighted_score=round(demand_weighted, 1),
            description=demand_desc,
        ),
        ScoreBreakdown(
            factor="Historical Deficit",
            weight=WEIGHT_HISTORICAL_DEFICIT,
            raw_value=deficit_raw,
            normalized=round(deficit_norm, 3),
            weighted_score=round(deficit_weighted, 1),
            description=deficit_desc,
        ),
        ScoreBreakdown(
            factor="Population",
            weight=WEIGHT_POPULATION,
            raw_value=float(pop_raw),
            normalized=round(pop_norm, 3),
            weighted_score=round(pop_weighted, 1),
            description=pop_desc,
        ),
        ScoreBreakdown(
            factor="Distance",
            weight=WEIGHT_DISTANCE,
            raw_value=dist_raw,
            normalized=round(dist_norm, 3),
            weighted_score=round(dist_weighted, 1),
            description=dist_desc,
        ),
    ]

    return WardPriority(
        ward_id=ward.ward_id,
        ward_number=ward.ward_number,
        name=ward.name,
        demand_liters=ward.demand_liters,
        total_score=total,
        tier=tier,
        breakdown=breakdown,
        recommended_volume=ward.demand_liters,
        description=ward.description,
    )


# ---------------------------------------------------------------------------
# Endpoint: POST /api/prioritize
# ---------------------------------------------------------------------------

@app.post("/api/prioritize", response_model=PrioritizeResponse)
async def prioritize(req: PrioritizeRequest):
    """Compute explainable priority scores and return a ranked queue."""
    scored = [compute_priority(w) for w in req.wards]
    scored.sort(key=lambda x: x.total_score, reverse=True)
    critical = sum(1 for s in scored if s.tier == 1)
    return PrioritizeResponse(
        queue=scored,
        total_wards=len(scored),
        critical_count=critical,
    )


# ---------------------------------------------------------------------------
# Endpoint: POST /api/simulate-equity
# ---------------------------------------------------------------------------

def _allocate_fcfs(wards: list[WardInput], total_supply: int) -> dict[int, int]:
    """First-Come-First-Served: allocate in arbitrary (by ward_id) order."""
    allocations: dict[int, int] = {}
    remaining = total_supply
    # Simulate FCFS by sorting by ward_id (arbitrary arrival order)
    sorted_wards = sorted(wards, key=lambda w: w.ward_id)
    for w in sorted_wards:
        alloc = min(w.demand_liters, remaining)
        allocations[w.ward_number] = alloc
        remaining -= alloc
        if remaining <= 0:
            break
    # Ensure all wards present
    for w in wards:
        if w.ward_number not in allocations:
            allocations[w.ward_number] = 0
    return allocations


def _allocate_ai(wards: list[WardInput], total_supply: int) -> dict[int, int]:
    """AI-based: allocate by priority score order."""
    scored = [compute_priority(w) for w in wards]
    scored.sort(key=lambda x: x.total_score, reverse=True)
    allocations: dict[int, int] = {}
    remaining = total_supply
    for s in scored:
        alloc = min(s.demand_liters, remaining)
        allocations[s.ward_number] = alloc
        remaining -= alloc
        if remaining <= 0:
            break
    for w in wards:
        if w.ward_number not in allocations:
            allocations[w.ward_number] = 0
    return allocations


def _compute_equity_metrics(
    wards: list[WardInput],
    allocations: dict[int, int],
) -> tuple[float, float, float]:
    """
    Returns (equity_index, vulnerable_coverage, stddev).
    
    Service Equity Index = (1 - normalized_stddev) * 100
        where normalized_stddev = stddev(fulfillment_ratios) 
        Lower stddev = higher equity.
    
    Vulnerable Area Coverage = % of total allocated going to vuln > 0.7
    """
    fulfillment_ratios = []
    for w in wards:
        alloc = allocations.get(w.ward_number, 0)
        ratio = alloc / w.demand_liters if w.demand_liters > 0 else 1.0
        fulfillment_ratios.append(ratio)

    arr = np.array(fulfillment_ratios)
    stddev = float(np.std(arr))
    # Normalize: max possible stddev for ratios 0-1 is 0.5
    equity_index = max(0.0, (1.0 - stddev / 0.5)) * 100.0

    total_alloc = sum(allocations.values())
    vuln_alloc = sum(
        allocations.get(w.ward_number, 0)
        for w in wards
        if w.vulnerability_index > 0.7
    )
    vuln_coverage = (vuln_alloc / total_alloc * 100.0) if total_alloc > 0 else 0.0

    return round(equity_index, 1), round(vuln_coverage, 1), round(stddev, 4)


@app.post("/api/simulate-equity", response_model=SimulateEquityResponse)
async def simulate_equity(req: SimulateEquityRequest):
    """Compare WaterFlow AI allocation vs FCFS for equity metrics."""
    wards = req.wards
    supply = req.total_supply

    # FCFS allocation
    fcfs_alloc = _allocate_fcfs(wards, supply)
    fcfs_eq, fcfs_vc, fcfs_sd = _compute_equity_metrics(wards, fcfs_alloc)

    # AI allocation
    ai_alloc = _allocate_ai(wards, supply)
    ai_eq, ai_vc, ai_sd = _compute_equity_metrics(wards, ai_alloc)

    return SimulateEquityResponse(
        waterflow_ai=SimulationResult(
            method="WaterFlow AI",
            allocations=ai_alloc,
            equity_index=ai_eq,
            vulnerable_coverage=ai_vc,
            total_allocated=sum(ai_alloc.values()),
            stddev=ai_sd,
        ),
        fcfs=SimulationResult(
            method="First-Come-First-Served",
            allocations=fcfs_alloc,
            equity_index=fcfs_eq,
            vulnerable_coverage=fcfs_vc,
            total_allocated=sum(fcfs_alloc.values()),
            stddev=fcfs_sd,
        ),
        improvement_equity=round(ai_eq - fcfs_eq, 1),
        improvement_coverage=round(ai_vc - fcfs_vc, 1),
    )


# ---------------------------------------------------------------------------
# Endpoint: POST /api/optimize-routes  (VRP via OR-Tools)
# ---------------------------------------------------------------------------

@app.post("/api/optimize-routes", response_model=OptimizeRoutesResponse)
async def optimize_routes(req: OptimizeRoutesRequest):
    """
    Vehicle Routing Problem solver using Google OR-Tools.
    Node 0 = depot. Nodes 1..N = wards.
    """
    try:
        from ortools.constraint_solver import pywrapcp, routing_enums_pb2
    except ImportError:
        # Fallback: simple greedy assignment if ortools not installed
        return _greedy_route_fallback(req)

    n_wards = len(req.wards)
    n_vehicles = len(req.tankers)

    if n_wards == 0 or n_vehicles == 0:
        return OptimizeRoutesResponse(
            routes=[], total_distance=0, total_demand_served=0, unserved_wards=[]
        )

    n_nodes = 1 + n_wards  # node 0 = depot

    # Build distance matrix (ensure it's square n_nodes x n_nodes)
    dist_matrix = []
    for i in range(n_nodes):
        row = []
        for j in range(n_nodes):
            if i < len(req.distance_matrix) and j < len(req.distance_matrix[i]):
                row.append(int(req.distance_matrix[i][j] * 1000))  # convert to meters
            else:
                row.append(0)
        dist_matrix.append(row)

    demands = [0]  # depot demand = 0
    for w in req.wards:
        demands.append(w.demand_liters)

    capacities = [t.capacity for t in req.tankers]

    # Create routing model
    manager = pywrapcp.RoutingIndexManager(n_nodes, n_vehicles, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return dist_matrix[from_node][to_node]

    transit_cb_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_cb_index)

    # Capacity constraint
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]

    demand_cb_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_cb_index, 0, capacities, True, "Capacity"
    )

    # Allow dropping nodes with a penalty
    penalty = 100000
    for node in range(1, n_nodes):
        routing.AddDisjunction([manager.NodeToIndex(node)], penalty)

    # Search parameters
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = 5

    solution = routing.SolveWithParameters(search_params)

    if not solution:
        return _greedy_route_fallback(req)

    # Extract routes
    routes: list[VehicleRoute] = []
    total_dist = 0.0
    total_served = 0
    served_wards: set[int] = set()

    for v in range(n_vehicles):
        index = routing.Start(v)
        stops: list[RouteStop] = []
        route_dist = 0.0
        cumulative = 0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            if node > 0:  # skip depot
                ward = req.wards[node - 1]
                cumulative += ward.demand_liters
                stops.append(RouteStop(
                    ward_number=ward.ward_number,
                    name=ward.name,
                    demand=ward.demand_liters,
                    cumulative_load=cumulative,
                ))
                served_wards.add(ward.ward_number)
            next_index = solution.Value(routing.NextVar(index))
            route_dist += routing.GetArcCostForVehicle(index, next_index, v) / 1000.0
            index = next_index

        if stops:
            delivered = sum(s.demand for s in stops)
            total_served += delivered
            routes.append(VehicleRoute(
                transponder_id=req.tankers[v].transponder_id,
                capacity=req.tankers[v].capacity,
                route=stops,
                total_distance=round(route_dist, 2),
                total_delivered=delivered,
            ))
            total_dist += route_dist

    unserved = [
        w.ward_number for w in req.wards if w.ward_number not in served_wards
    ]

    return OptimizeRoutesResponse(
        routes=routes,
        total_distance=round(total_dist, 2),
        total_demand_served=total_served,
        unserved_wards=unserved,
    )


def _greedy_route_fallback(req: OptimizeRoutesRequest) -> OptimizeRoutesResponse:
    """Simple greedy fallback when OR-Tools is unavailable."""
    routes: list[VehicleRoute] = []
    remaining_wards = list(req.wards)
    total_dist = 0.0
    total_served = 0
    served_wards: set[int] = set()

    for tanker in req.tankers:
        if not remaining_wards:
            break
        stops: list[RouteStop] = []
        capacity_left = tanker.capacity
        cumulative = 0

        wards_to_remove = []
        for ward in remaining_wards:
            if ward.demand_liters <= capacity_left:
                cumulative += ward.demand_liters
                stops.append(RouteStop(
                    ward_number=ward.ward_number,
                    name=ward.name,
                    demand=ward.demand_liters,
                    cumulative_load=cumulative,
                ))
                capacity_left -= ward.demand_liters
                served_wards.add(ward.ward_number)
                wards_to_remove.append(ward)

        for w in wards_to_remove:
            remaining_wards.remove(w)

        if stops:
            delivered = sum(s.demand for s in stops)
            total_served += delivered
            est_dist = len(stops) * 5.0  # rough estimate
            total_dist += est_dist
            routes.append(VehicleRoute(
                transponder_id=tanker.transponder_id,
                capacity=tanker.capacity,
                route=stops,
                total_distance=round(est_dist, 2),
                total_delivered=delivered,
            ))

    unserved = [w.ward_number for w in remaining_wards]

    return OptimizeRoutesResponse(
        routes=routes,
        total_distance=round(total_dist, 2),
        total_demand_served=total_served,
        unserved_wards=unserved,
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "WaterFlow AI Engine", "version": "2.8.4"}


# ---------------------------------------------------------------------------
# Run with: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
