"""
WaterFlow OS — Complaint Feature Extraction Engine
Extracts temporal velocity, acceleration, and spatial concentration signals from deduplicated complaints.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List, Optional
import numpy as np
from pydantic import BaseModel
from .deduplication import ComplaintRecord


class WardComplaintFeatures(BaseModel):
    ward_code: str
    active_count: int
    velocity_per_hour: float  # complaints per hour in trailing window
    acceleration: float        # rate of change of velocity between two consecutive intervals
    spatial_density_per_km2: float
    corroboration_score: float  # scaled [0, 10]
    surge_detected: bool


class ComplaintFeatureExtractor:
    def __init__(self, ward_areas_km2: Optional[Dict[str, float]] = None):
        # Default approximate ward areas if not provided (MCGM wards ~ 5 to 55 km2)
        self.ward_areas = ward_areas_km2 or {}

    def extract_features(
        self,
        ward_code: str,
        complaints: List[ComplaintRecord],
        current_time: datetime,
        window_hours: float = 4.0
    ) -> WardComplaintFeatures:
        ward_complaints = [c for c in complaints if c.ward_code == ward_code and not c.resolved]
        window_start = current_time - timedelta(hours=window_hours)
        recent = [c for c in ward_complaints if c.timestamp >= window_start]

        # Velocity: complaints per hour over window
        velocity = len(recent) / max(0.5, window_hours)

        # Acceleration: compare second half of window to first half
        midpoint = current_time - timedelta(hours=window_hours / 2.0)
        first_half = [c for c in recent if c.timestamp < midpoint]
        second_half = [c for c in recent if c.timestamp >= midpoint]
        v1 = len(first_half) / (window_hours / 2.0)
        v2 = len(second_half) / (window_hours / 2.0)
        accel = round(v2 - v1, 2)

        # Spatial density
        area = self.ward_areas.get(ward_code, 15.0)  # default 15 km2
        spatial_density = round(len(recent) / area, 3)

        # Corroboration score [0, 10]
        # Driven by number of unique citizens lodging complaints
        unique_citizens = len(set(c.citizen_id for c in recent))
        corroboration_score = min(10.0, round(unique_citizens * 1.5 + max(0.0, accel) * 2.0, 2))

        # Surge flag if acceleration is positive and velocity exceeds 3/hour
        surge_detected = (accel > 1.0 and velocity >= 3.0) or len(recent) >= 12

        return WardComplaintFeatures(
            ward_code=ward_code,
            active_count=len(recent),
            velocity_per_hour=round(velocity, 2),
            acceleration=accel,
            spatial_density_per_km2=spatial_density,
            corroboration_score=corroboration_score,
            surge_detected=surge_detected
        )
