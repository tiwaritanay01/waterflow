"""
WaterFlow OS — Complaint Severity Engine
Categorizes reports by physical criticality, contamination risk, and public health impact.
"""

from __future__ import annotations

from typing import Dict, Optional
from pydantic import BaseModel, Field


SEVERITY_MAPPING: Dict[str, Dict[str, any]] = {
    "CONTAMINATION": {
        "level": "CRITICAL",
        "score": 1.0,
        "action": "Immediate water quality testing and isolation; emergency tanker dispatch",
        "health_hazard": True
    },
    "HOSPITAL_OUTAGE": {
        "level": "CRITICAL",
        "score": 1.0,
        "action": "Lifeline facility reserve replenishment within 2 hours",
        "health_hazard": True
    },
    "PIPE_BURST_MAJOR": {
        "level": "HIGH",
        "score": 0.8,
        "action": "Valving isolation to arrest water loss; redirect flow",
        "health_hazard": False
    },
    "ZERO_PRESSURE_COMMUNITY": {
        "level": "HIGH",
        "score": 0.7,
        "action": "Check upstream booster pumps; dispatch auxiliary tanker",
        "health_hazard": False
    },
    "LOW_PRESSURE": {
        "level": "MEDIUM",
        "score": 0.4,
        "action": "Inspect distribution valves on next operational shift",
        "health_hazard": False
    },
    "BILLING_OR_ADMINISTRATIVE": {
        "level": "LOW",
        "score": 0.1,
        "action": "Route to citizen services CRM",
        "health_hazard": False
    }
}


class ComplaintSeverityAssessment(BaseModel):
    issue_type: str
    severity_level: str
    severity_score: float = Field(..., ge=0.0, le=1.0)
    health_hazard: bool
    recommended_action: str


def evaluate_severity(issue_type: str, custom_multiplier: float = 1.0) -> ComplaintSeverityAssessment:
    norm_key = issue_type.upper().strip().replace(" ", "_")
    meta = SEVERITY_MAPPING.get(norm_key, {
        "level": "MEDIUM",
        "score": 0.5,
        "action": "Inspect incident details on standard queue",
        "health_hazard": False
    })

    score = min(1.0, max(0.0, meta["score"] * custom_multiplier))
    return ComplaintSeverityAssessment(
        issue_type=norm_key,
        severity_level=meta["level"],
        severity_score=round(score, 2),
        health_hazard=meta["health_hazard"],
        recommended_action=meta["action"]
    )
