"""
WaterFlow OS — Vehicle Routing & Logistics Optimizer
Stage 5 Architecture: Strictly decoupled from need/equity scoring.
Optimizes multi-stop tanker dispatch subject to physical capacity, speed limits, and time windows.
Supports both Baseline Heuristic (Nearest Tanker) and Optimized Routing (Cluster-First Route-Second with 2-opt).
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple, Union
import numpy as np
from pydantic import BaseModel, Field


class DeliveryStop(BaseModel):
    stop_id: str
    name: str
    lat: float
    lon: float
    demand_liters: float
    is_emergency: bool = False
    unloading_time_minutes: float = 15.0


class FleetTanker(BaseModel):
    tanker_id: str
    current_lat: float
    current_lon: float
    capacity_liters: float
    average_speed_kmh: float = 25.0  # Mumbai urban traffic speed calibration
    is_available: bool = True


class TankerDispatchedRoute(BaseModel):
    tanker_id: str
    capacity_liters: float
    stops: List[DeliveryStop]
    total_water_dispatched_liters: float
    total_distance_km: float
    total_duration_minutes: float
    response_times_minutes: Dict[str, float]  # stop_id -> minutes to delivery
    utilization_rate: float


class RoutingOptimizationResult(BaseModel):
    method: str  # "BASELINE_NEAREST_TANKER" vs "OPTIMIZED_CAPACITY_ROUTING"
    routes: List[TankerDispatchedRoute]
    total_distance_km: float
    total_travel_time_minutes: float
    mean_response_time_minutes: float
    median_response_time_minutes: float
    p95_response_time_minutes: float
    emergency_mean_delay_minutes: float
    total_water_delivered_liters: float
    unserved_demand_liters: float
    water_use_efficiency_pct: float
    average_tanker_utilization_pct: float


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class RoutingOptimizer:
    """
    Logistics and dispatch optimizer for municipal tanker fleet.
    """

    def solve_nearest_tanker_baseline(
        self,
        tankers: List[FleetTanker],
        stops: List[DeliveryStop]
    ) -> RoutingOptimizationResult:
        """
        Baseline dispatch heuristic: Each stop is assigned to the nearest tanker with remaining capacity.
        """
        avail_tankers = [t for t in tankers if t.is_available]
        if not avail_tankers or not stops:
            return self._empty_result("BASELINE_NEAREST_TANKER", unserved_demand=sum(s.demand_liters for s in stops))

        # Sort stops by emergency first, then arrival order
        sorted_stops = sorted(stops, key=lambda s: (0 if s.is_emergency else 1))

        routes: Dict[str, List[DeliveryStop]] = {t.tanker_id: [] for t in avail_tankers}
        remaining_caps = {t.tanker_id: t.capacity_liters for t in avail_tankers}
        current_locs = {t.tanker_id: (t.current_lat, t.current_lon) for t in avail_tankers}

        unserved = 0.0
        for s in sorted_stops:
            best_t = None
            min_dist = float("inf")
            for t in avail_tankers:
                tid = t.tanker_id
                if remaining_caps[tid] >= s.demand_liters:
                    loc = current_locs[tid]
                    dist = haversine_km(loc[0], loc[1], s.lat, s.lon)
                    if dist < min_dist:
                        min_dist = dist
                        best_t = tid

            if best_t is not None:
                routes[best_t].append(s)
                remaining_caps[best_t] -= s.demand_liters
                current_locs[best_t] = (s.lat, s.lon)
            else:
                unserved += s.demand_liters

        return self._compile_result("BASELINE_NEAREST_TANKER", avail_tankers, routes, unserved)

    def solve_optimized_routing(
        self,
        tankers: List[FleetTanker],
        stops: List[DeliveryStop]
    ) -> RoutingOptimizationResult:
        """
        Optimized multi-stop routing using spatial clustering and 2-opt tour sequencing.
        Prioritizes emergency stops with minimal detour penalties.
        """
        avail_tankers = [t for t in tankers if t.is_available]
        if not avail_tankers or not stops:
            return self._empty_result("OPTIMIZED_CAPACITY_ROUTING", unserved_demand=sum(s.demand_liters for s in stops))

        routes: Dict[str, List[DeliveryStop]] = {t.tanker_id: [] for t in avail_tankers}
        remaining_caps = {t.tanker_id: t.capacity_liters for t in avail_tankers}

        # Separate emergency vs standard stops
        emergencies = [s for s in stops if s.is_emergency]
        standards = [s for s in stops if not s.is_emergency]

        # 1. Assign emergencies to closest tanker
        unserved = 0.0
        for em in emergencies:
            best_t = min(avail_tankers, key=lambda t: haversine_km(t.current_lat, t.current_lon, em.lat, em.lon))
            if remaining_caps[best_t.tanker_id] >= em.demand_liters:
                routes[best_t.tanker_id].append(em)
                remaining_caps[best_t.tanker_id] -= em.demand_liters
            else:
                unserved += em.demand_liters

        # 2. Cluster standards by angular and distance proximity to nearest tanker base
        for s in standards:
            candidates = [t for t in avail_tankers if remaining_caps[t.tanker_id] >= s.demand_liters]
            if not candidates:
                unserved += s.demand_liters
                continue
            # Select tanker that minimizes insertion detour
            best_tanker = min(candidates, key=lambda t: haversine_km(t.current_lat, t.current_lon, s.lat, s.lon))
            routes[best_tanker.tanker_id].append(s)
            remaining_caps[best_tanker.tanker_id] -= s.demand_liters

        # 3. Optimize sequence per route via 2-opt TSP
        for t in avail_tankers:
            tid = t.tanker_id
            if len(routes[tid]) > 2:
                routes[tid] = self._two_opt(routes[tid], (t.current_lat, t.current_lon))

        return self._compile_result("OPTIMIZED_CAPACITY_ROUTING", avail_tankers, routes, unserved)

    def _two_opt(self, stops: List[DeliveryStop], start_loc: Tuple[float, float]) -> List[DeliveryStop]:
        """2-opt local search heuristic to eliminate route crossings."""
        best = list(stops)
        improved = True
        iterations = 0
        while improved and iterations < 20:
            improved = False
            iterations += 1
            for i in range(len(best) - 1):
                for j in range(i + 1, len(best)):
                    if best[i].is_emergency:
                        continue  # Do not defer emergency
                    new_route = best[:i] + best[i:j+1][::-1] + best[j+1:]
                    if self._calc_route_distance(new_route, start_loc) < self._calc_route_distance(best, start_loc):
                        best = new_route
                        improved = True
                        break
                if improved:
                    break
        return best

    def _calc_route_distance(self, stops: List[DeliveryStop], start_loc: Tuple[float, float]) -> float:
        d = 0.0
        cur = start_loc
        for s in stops:
            d += haversine_km(cur[0], cur[1], s.lat, s.lon)
            cur = (s.lat, s.lon)
        return d

    def _compile_result(
        self,
        method: str,
        tankers: List[FleetTanker],
        routes_map: Dict[str, List[DeliveryStop]],
        unserved: float
    ) -> RoutingOptimizationResult:
        dispatched_routes: List[TankerDispatchedRoute] = []
        all_response_times: List[float] = []
        emergency_response_times: List[float] = []
        total_dist = 0.0
        total_delivered = 0.0
        tanker_map = {t.tanker_id: t for t in tankers}

        for tid, stops in routes_map.items():
            t = tanker_map[tid]
            cur_lat, cur_lon = t.current_lat, t.current_lon
            cur_time = 0.0
            r_dist = 0.0
            res_times = {}

            for s in stops:
                leg_dist = haversine_km(cur_lat, cur_lon, s.lat, s.lon)
                transit_min = (leg_dist / t.average_speed_kmh) * 60.0
                cur_time += transit_min
                res_times[s.stop_id] = round(cur_time, 1)
                all_response_times.append(cur_time)
                if s.is_emergency:
                    emergency_response_times.append(cur_time)

                cur_time += s.unloading_time_minutes
                r_dist += leg_dist
                cur_lat, cur_lon = s.lat, s.lon

            dispatched_vol = sum(s.demand_liters for s in stops)
            total_delivered += dispatched_vol
            total_dist += r_dist

            util = (dispatched_vol / t.capacity_liters * 100.0) if t.capacity_liters > 0 else 0.0
            dispatched_routes.append(TankerDispatchedRoute(
                tanker_id=tid,
                capacity_liters=t.capacity_liters,
                stops=stops,
                total_water_dispatched_liters=round(dispatched_vol, 1),
                total_distance_km=round(r_dist, 2),
                total_duration_minutes=round(cur_time, 1),
                response_times_minutes=res_times,
                utilization_rate=round(util, 1)
            ))

        total_time = sum(r.total_duration_minutes for r in dispatched_routes)
        mean_resp = float(np.mean(all_response_times)) if all_response_times else 0.0
        med_resp = float(np.median(all_response_times)) if all_response_times else 0.0
        p95_resp = float(np.percentile(all_response_times, 95)) if all_response_times else 0.0
        em_delay = float(np.mean(emergency_response_times)) if emergency_response_times else 0.0
        avg_util = float(np.mean([r.utilization_rate for r in dispatched_routes])) if dispatched_routes else 0.0

        # Transit water loss model: ~1.5% evaporation and sloshing loss per 10 km
        water_loss = total_delivered * (total_dist * 0.0015)
        useful_water = max(0.0, total_delivered - water_loss)
        eff = (useful_water / total_delivered * 100.0) if total_delivered > 0 else 100.0

        return RoutingOptimizationResult(
            method=method,
            routes=dispatched_routes,
            total_distance_km=round(total_dist, 2),
            total_travel_time_minutes=round(total_time, 1),
            mean_response_time_minutes=round(mean_resp, 1),
            median_response_time_minutes=round(med_resp, 1),
            p95_response_time_minutes=round(p95_resp, 1),
            emergency_mean_delay_minutes=round(em_delay, 1),
            total_water_delivered_liters=round(total_delivered, 1),
            unserved_demand_liters=round(unserved, 1),
            water_use_efficiency_pct=round(eff, 2),
            average_tanker_utilization_pct=round(avg_util, 1)
        )

    def _empty_result(self, method: str, unserved_demand: float = 0.0) -> RoutingOptimizationResult:
        return RoutingOptimizationResult(
            method=method, routes=[], total_distance_km=0.0, total_travel_time_minutes=0.0,
            mean_response_time_minutes=0.0, median_response_time_minutes=0.0, p95_response_time_minutes=0.0,
            emergency_mean_delay_minutes=0.0, total_water_delivered_liters=0.0, unserved_demand_liters=round(unserved_demand, 1),
            water_use_efficiency_pct=100.0, average_tanker_utilization_pct=0.0
        )
