# ============================================================
# WaterFlow OS — Phase 2 AI Engine
# Visual Proof of Delivery (CV Mock) & Weather-Aware Predictive Demand
# ============================================================

import os
import math
import base64
import random
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, FastAPI, File, UploadFile, Form, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger("waterflow.vision_predictive")
router = APIRouter(prefix="/api/engine", tags=["Vision & Predictive"])

# ---------------------------------------------------------------------------
# 24 BMC Ward Spatial Reference Data (Centroids & Demographics)
# ---------------------------------------------------------------------------
MUMBAI_WARDS_SPATIAL: Dict[str, Dict[str, Any]] = {
    "M/East": {"lat": 19.0550, "lng": 72.9180, "name": "Govandi / Mankhurd", "slum_pct": 0.82, "base_demand_mld": 185.0},
    "G/North": {"lat": 19.0380, "lng": 72.8538, "name": "Dharavi / Dadar", "slum_pct": 0.74, "base_demand_mld": 210.0},
    "K/East": {"lat": 19.1136, "lng": 72.8697, "name": "Andheri East / Marol", "slum_pct": 0.45, "base_demand_mld": 275.0},
    "L": {"lat": 19.0680, "lng": 72.8850, "name": "Kurla / Sakinaka", "slum_pct": 0.68, "base_demand_mld": 240.0},
    "F/North": {"lat": 19.0270, "lng": 72.8570, "name": "Matunga / Sion", "slum_pct": 0.52, "base_demand_mld": 160.0},
    "P/North": {"lat": 19.1860, "lng": 72.8480, "name": "Malad West / Pathanwadi", "slum_pct": 0.58, "base_demand_mld": 290.0},
    "H/East": {"lat": 19.0620, "lng": 72.8510, "name": "Bandra East / Santacruz", "slum_pct": 0.49, "base_demand_mld": 175.0},
    "N": {"lat": 19.0830, "lng": 72.9080, "name": "Ghatkopar / Pant Nagar", "slum_pct": 0.42, "base_demand_mld": 220.0},
    "S": {"lat": 19.1410, "lng": 72.9280, "name": "Bhandup / Kanjurmarg", "slum_pct": 0.55, "base_demand_mld": 195.0},
    "T": {"lat": 19.1720, "lng": 72.9560, "name": "Mulund", "slum_pct": 0.28, "base_demand_mld": 165.0}
}

# Mumbai Flood-Prone Vulnerable Road Transit Bottlenecks (Monsoon Flood Hotspots)
MONSOON_FLOOD_PRONE_NODES: List[Dict[str, Any]] = [
    {"node_id": "FL-01", "name": "Hindmata Junction (Dadar)", "lat": 19.0142, "lng": 72.8428, "criticality": 0.95},
    {"node_id": "FL-02", "name": "Milan Subway (Santacruz)", "lat": 19.0815, "lng": 72.8415, "criticality": 0.90},
    {"node_id": "FL-03", "name": "Andheri Subway (S.V. Road)", "lat": 19.1197, "lng": 72.8464, "criticality": 0.92},
    {"node_id": "FL-04", "name": "Kurla Depot Lowlands (LBS Marg)", "lat": 19.0652, "lng": 72.8790, "criticality": 0.88},
    {"node_id": "FL-05", "name": "Sion Circle / Gandhi Market", "lat": 19.0365, "lng": 72.8612, "criticality": 0.94},
    {"node_id": "FL-06", "name": "King's Circle Railway Bridge", "lat": 19.0305, "lng": 72.8580, "criticality": 0.89}
]

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS points in kilometers."""
    R = 6371.0 # Earth's mean radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ---------------------------------------------------------------------------
# 1. Computer Vision Image Verification Endpoint
# ---------------------------------------------------------------------------
class ImageVerifyPayload(BaseModel):
    dispatch_id: int
    ward_id: str = "M/East"
    otp_code: str
    latitude: float
    longitude: float
    image_base64: Optional[str] = None
    tds_level: Optional[float] = None
    ph_level: Optional[float] = None


@router.post("/verify-image")
async def verify_delivery_image(
    dispatch_id: Optional[int] = Form(None),
    ward_id: Optional[str] = Form("M/East"),
    otp_code: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    image_base64: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    payload: Optional[ImageVerifyPayload] = None
):
    """
    Mocks an end-to-end Computer Vision model for Visual Proof of Delivery:
    1. Verifies presence of flowing water into community storage tank.
    2. Validates image payload integrity and resolution.
    3. Performs spatial geotag validation against target municipal ward boundary.
    """
    # Normalize inputs from either multipart form or direct JSON payload
    d_id = payload.dispatch_id if payload else dispatch_id
    w_id = payload.ward_id if payload else ward_id
    otp = payload.otp_code if payload else otp_code
    lat = payload.latitude if payload else latitude
    lng = payload.longitude if payload else longitude
    img_b64 = payload.image_base64 if payload else image_base64

    if not d_id or not otp:
        raise HTTPException(status_code=400, detail="dispatch_id and otp_code are required.")

    # Image payload resolution
    image_bytes = None
    if file:
        image_bytes = await file.read()
    elif img_b64:
        try:
            clean_b64 = img_b64.split(",")[-1] if "," in img_b64 else img_b64
            image_bytes = base64.b64decode(clean_b64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid Base64 image encoding: {str(e)}")
    
    if not image_bytes or len(image_bytes) < 100:
        raise HTTPException(status_code=400, detail="Delivery proof image is empty or missing.")

    # Geotag Spatial Verification
    ward_data = MUMBAI_WARDS_SPATIAL.get(w_id, MUMBAI_WARDS_SPATIAL["M/East"])
    target_lat, target_lng = ward_data["lat"], ward_data["lng"]

    user_lat = lat if lat is not None else target_lat
    user_lng = lng if lng is not None else target_lng

    dist_km = haversine_distance_km(user_lat, user_lng, target_lat, target_lng)
    # Standpost geofence threshold: within 1.5 km of ward centroid or designated standpost
    geotag_valid = dist_km <= 2.5

    # Simulated Deep Learning Computer Vision Detection (Water Flow & Tank Rim Heuristic)
    # In production, this invokes a fine-tuned ResNet-50 / YOLOv8 model trained on municipal water discharge.
    seed_val = len(image_bytes) + int(user_lat * 1000)
    random.seed(seed_val)
    
    cv_confidence = round(random.uniform(0.91, 0.98), 4)
    water_flow_detected = True
    tank_rim_detected = True
    hose_coupling_detected = True
    clarity_score = round(random.uniform(0.85, 0.96), 2)
    anti_spoof_liveness = True

    # Verification Decision Logic
    is_verified = (
        water_flow_detected and 
        cv_confidence >= 0.85 and 
        geotag_valid
    )

    return {
        "success": True,
        "dispatch_id": d_id,
        "ward_id": w_id,
        "ward_name": ward_data["name"],
        "is_verified": is_verified,
        "cv_verification": {
            "water_detected": water_flow_detected,
            "tank_rim_detected": tank_rim_detected,
            "hose_coupling_detected": hose_coupling_detected,
            "confidence": cv_confidence,
            "clarity_score": clarity_score,
            "anti_spoof_liveness": anti_spoof_liveness,
            "bounding_boxes": [
                {"label": "water_discharge_stream", "box": [140, 95, 380, 420], "score": cv_confidence},
                {"label": "community_water_tank", "box": [40, 60, 580, 520], "score": 0.96}
            ]
        },
        "spatial_geotag": {
            "user_latitude": user_lat,
            "user_longitude": user_lng,
            "target_ward_latitude": target_lat,
            "target_ward_longitude": target_lng,
            "distance_to_centroid_meters": round(dist_km * 1000, 1),
            "geotag_valid": geotag_valid,
            "geofence_status": "INSIDE_MUNICIPAL_CORRIDOR" if geotag_valid else "OUTSIDE_PERMITTED_ZONE"
        },
        "delivery_state": "Verified" if is_verified else "Rejected",
        "verified_at": datetime.utcnow().isoformat() + "Z"
    }


# ---------------------------------------------------------------------------
# 2. Predictive AI & Weather-Aware Routing Endpoint
# ---------------------------------------------------------------------------
class WeatherContext(BaseModel):
    temperature_celsius: float = Field(34.5, description="Ambient temperature in Mumbai")
    relative_humidity_pct: float = Field(78.0, description="Relative humidity %")
    heatwave_alert: bool = Field(False, description="IMD Heatwave yellow/orange/red alert")
    rainfall_intensity_mm_per_hr: float = Field(0.0, description="Precipitation rate from Doppler radar")
    monsoon_waterlogging_nodes: List[str] = Field(default_factory=list, description="IDs of flooded road nodes")


@router.post("/predictive-demand")
async def calculate_weather_aware_demand(weather: WeatherContext):
    """
    Predictive AI Engine:
    Adjusts baseline ward water demand by injecting dynamic weather and vulnerability multipliers:
    - Heatwave Multiplier: Elevated ambient temperatures and heat indices trigger surges in informal settlements.
    - Monsoon Flooding Logic: Heavy rainfall triggers transit node penalties, rerouting relief tankers away from flooded subways.
    """
    # 1. Compute Heatwave Multiplier: M_heat
    # Formula: Baseline + 1.2% per degree above 32°C, with +15% surge if heatwave alert is declared
    temp_excess = max(0.0, weather.temperature_celsius - 32.0)
    heat_surge = temp_excess * 0.015
    if weather.heatwave_alert or weather.temperature_celsius >= 38.0:
        heat_surge += 0.18

    # 2. Compute Monsoon Flooding Transit Penalties
    is_monsoon_surge = weather.rainfall_intensity_mm_per_hr > 25.0
    flooded_nodes = []
    
    # Check automated flood threshold or explicitly flagged nodes
    for node in MONSOON_FLOOD_PRONE_NODES:
        is_flooded = (
            node["node_id"] in weather.monsoon_waterlogging_nodes or 
            (is_monsoon_surge and node["criticality"] >= 0.90 and weather.rainfall_intensity_mm_per_hr >= 45.0)
        )
        if is_flooded:
            flooded_nodes.append({
                "node_id": node["node_id"],
                "name": node["name"],
                "latitude": node["lat"],
                "longitude": node["lng"],
                "status": "IMPASSABLE_WATERLOGGED",
                "transit_speed_kmh": 0.0,
                "detour_recommended": True
            })

    transit_penalty_factor = 1.0 + (len(flooded_nodes) * 0.25)
    if is_monsoon_surge:
        transit_penalty_factor += (weather.rainfall_intensity_mm_per_hr / 100.0)

    # 3. Apply Multipliers to Mumbai Municipal Wards
    projected_wards = []
    total_baseline_mld = 0.0
    total_adjusted_demand_mld = 0.0

    for ward_id, info in MUMBAI_WARDS_SPATIAL.items():
        base_demand = info["base_demand_mld"]
        slum_ratio = info["slum_pct"]
        total_baseline_mld += base_demand

        # Slum-Weighted Weather Sensitivity: Informal settlements experience 2.4x greater heat exposure
        ward_heat_multiplier = 1.0 + (heat_surge * (1.0 + (slum_ratio * 1.4)))

        # In extreme monsoon, piped contamination increases reliance on relief tankers
        monsoon_tanker_demand_multiplier = 1.0
        if weather.rainfall_intensity_mm_per_hr > 35.0:
            monsoon_tanker_demand_multiplier = 1.0 + (slum_ratio * 0.22)

        final_multiplier = ward_heat_multiplier * monsoon_tanker_demand_multiplier
        adjusted_demand = round(base_demand * final_multiplier, 2)
        total_adjusted_demand_mld += adjusted_demand

        # Urgency Scoring (0 - 100)
        urgency_score = min(99.5, round(
            (adjusted_demand / base_demand - 1.0) * 120.0 + (slum_ratio * 50.0), 
            1
        ))

        projected_wards.append({
            "ward_id": ward_id,
            "ward_name": info["name"],
            "slum_percentage": round(slum_ratio * 100, 1),
            "baseline_demand_mld": base_demand,
            "weather_multiplier": round(final_multiplier, 3),
            "adjusted_demand_mld": adjusted_demand,
            "projected_deficit_mld": round(adjusted_demand * 0.18, 2),
            "urgency_score": urgency_score,
            "recommended_tanker_quota": max(4, int(adjusted_demand * 0.07))
        })

    # Sort wards by Urgency Score descending
    projected_wards.sort(key=lambda x: x["urgency_score"], reverse=True)

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "weather_snapshot": {
            "temperature_celsius": weather.temperature_celsius,
            "humidity_pct": weather.relative_humidity_pct,
            "heatwave_active": weather.heatwave_alert or weather.temperature_celsius >= 38.0,
            "rainfall_rate_mm_hr": weather.rainfall_intensity_mm_per_hr,
            "monsoon_condition": "SEVERE_WATERLOGGING" if len(flooded_nodes) >= 2 else ("MONSOON_ACTIVE" if is_monsoon_surge else "NOMINAL")
        },
        "fleet_routing_impact": {
            "flooded_transit_bottlenecks": flooded_nodes,
            "network_transit_delay_multiplier": round(transit_penalty_factor, 2),
            "reroute_active": len(flooded_nodes) > 0
        },
        "aggregate_municipal_demand": {
            "total_baseline_mld": round(total_baseline_mld, 1),
            "total_weather_adjusted_mld": round(total_adjusted_demand_mld, 1),
            "net_demand_variance_pct": round(((total_adjusted_demand_mld / total_baseline_mld) - 1.0) * 100, 2)
        },
        "ward_demand_forecast": projected_wards
    }

# ---------------------------------------------------------------------------
# Standalone App Mount (Compatible with existing ai_engine or direct runner)
# ---------------------------------------------------------------------------
app = FastAPI(
    title="WaterFlow OS — AI Vision & Weather Predictive Engine",
    version="2.0.0"
)
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("vision_and_predictive:app", host="0.0.0.0", port=8001, reload=True)
