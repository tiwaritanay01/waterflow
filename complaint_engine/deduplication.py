"""
WaterFlow OS — Complaint Deduplication Engine
Deterministic deduplication to prevent bot spam, panic re-submissions, and double counting.
Distinguishes true duplicates from genuine recurring failures after resolution.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field


class ComplaintRecord(BaseModel):
    complaint_id: str
    citizen_id: str
    ward_code: str
    lat: float
    lon: float
    issue_type: str  # e.g. "NO_WATER", "CONTAMINATION", "PIPE_BURST", "LOW_PRESSURE"
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None


class DeduplicationResult(BaseModel):
    total_received: int
    unique_incidents: int
    duplicates_filtered: int
    repeat_genuine_count: int
    cluster_corroborations: Dict[str, int]  # ward_code -> corroborated citizen count
    cleaned_complaints: List[ComplaintRecord]
    duplicate_reasons: Dict[str, str]  # complaint_id -> reason


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class ComplaintDeduplicator:
    def __init__(
        self,
        time_window_minutes: int = 120,
        spatial_radius_meters: float = 300.0,
        repeat_resolved_grace_hours: float = 6.0
    ):
        self.time_window = timedelta(minutes=time_window_minutes)
        self.spatial_radius = spatial_radius_meters
        self.resolved_grace = timedelta(hours=repeat_resolved_grace_hours)

    def process(self, complaints: List[ComplaintRecord]) -> DeduplicationResult:
        # Sort chronologically
        sorted_records = sorted(complaints, key=lambda c: c.timestamp)
        seen_ids: Set[str] = set()
        cleaned: List[ComplaintRecord] = []
        duplicate_reasons: Dict[str, str] = {}
        corroboration_map: Dict[str, int] = {}
        repeat_genuine = 0

        for current in sorted_records:
            cid = current.complaint_id

            # 1. Exact ID match check
            if cid in seen_ids:
                duplicate_reasons[cid] = "EXACT_ID_DUPLICATE"
                continue

            # Check against prior accepted records
            is_dup = False
            for accepted in cleaned:
                # Same citizen submitting repeatedly
                if current.citizen_id == accepted.citizen_id and current.issue_type == accepted.issue_type:
                    # If previously resolved and beyond grace period, it is a genuine new complaint
                    if accepted.resolved and accepted.resolved_at:
                        time_since_res = current.timestamp - accepted.resolved_at
                        if time_since_res > self.resolved_grace:
                            repeat_genuine += 1
                            break  # Treat as new valid complaint
                    # Otherwise within time window: duplicate spam
                    dt = abs(current.timestamp - accepted.timestamp)
                    if dt <= self.time_window:
                        is_dup = True
                        duplicate_reasons[cid] = f"SAME_CITIZEN_WITHIN_{int(dt.total_seconds()/60)}M"
                        break

                # Spatial-temporal cluster from different citizens (same issue nearby)
                if current.issue_type == accepted.issue_type and current.ward_code == accepted.ward_code:
                    dist = haversine_meters(current.lat, current.lon, accepted.lat, accepted.lon)
                    dt = abs(current.timestamp - accepted.timestamp)
                    if dist <= self.spatial_radius and dt <= self.time_window:
                        # Cluster corroboration: adds to ward corroboration signal, but mark as clustered
                        w = current.ward_code
                        corroboration_map[w] = corroboration_map.get(w, 0) + 1
                        is_dup = True
                        duplicate_reasons[cid] = f"SPATIAL_CLUSTER_CORROBORATION_{int(dist)}M"
                        break

            if not is_dup:
                seen_ids.add(cid)
                cleaned.append(current)
                w = current.ward_code
                corroboration_map[w] = corroboration_map.get(w, 0) + 1

        return DeduplicationResult(
            total_received=len(complaints),
            unique_incidents=len(cleaned),
            duplicates_filtered=len(complaints) - len(cleaned),
            repeat_genuine_count=repeat_genuine,
            cluster_corroborations=corroboration_map,
            cleaned_complaints=cleaned,
            duplicate_reasons=duplicate_reasons
        )
