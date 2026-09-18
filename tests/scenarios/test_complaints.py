#!/usr/bin/env python3
"""
Test Scenarios for Complaint Deduplication, Feature Extraction, and Severity
Phase 10 Validation
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from complaint_engine.deduplication import ComplaintRecord, ComplaintDeduplicator
from complaint_engine.features import ComplaintFeatureExtractor
from complaint_engine.severity import evaluate_severity


def test_complaint_deduplication_scenarios():
    t0 = datetime(2026, 9, 18, 10, 0, 0)
    dedup = ComplaintDeduplicator(time_window_minutes=120, spatial_radius_meters=300.0)

    # 1. Identical complaint IDs
    # 2. Same citizen + same issue + short time window (15 mins later)
    # 3. Nearby spatial cluster (different citizens, 100 meters apart, within 30 mins)
    # 4. Unrelated complaints (different wards/issues)
    # 5. Repeated genuine complaints after resolution (resolved 8 hours ago)

    raw_complaints = [
        # Base complaint A
        ComplaintRecord(
            complaint_id="CMP-001", citizen_id="CITIZEN-99", ward_code="M/E",
            lat=19.0596, lon=72.9260, issue_type="NO_WATER",
            timestamp=t0, resolved=False
        ),
        # 1. Identical complaint ID
        ComplaintRecord(
            complaint_id="CMP-001", citizen_id="CITIZEN-99", ward_code="M/E",
            lat=19.0596, lon=72.9260, issue_type="NO_WATER",
            timestamp=t0 + timedelta(minutes=5), resolved=False
        ),
        # 2. Same citizen submitting repeatedly after 15 mins
        ComplaintRecord(
            complaint_id="CMP-002", citizen_id="CITIZEN-99", ward_code="M/E",
            lat=19.0596, lon=72.9260, issue_type="NO_WATER",
            timestamp=t0 + timedelta(minutes=15), resolved=False
        ),
        # 3. Spatial cluster: neighbor 120 meters away, same issue, 25 mins later
        ComplaintRecord(
            complaint_id="CMP-003", citizen_id="CITIZEN-101", ward_code="M/E",
            lat=19.0605, lon=72.9265, issue_type="NO_WATER",
            timestamp=t0 + timedelta(minutes=25), resolved=False
        ),
        # 4. Unrelated complaint in different ward (K/W)
        ComplaintRecord(
            complaint_id="CMP-004", citizen_id="CITIZEN-202", ward_code="K/W",
            lat=19.1197, lon=72.8464, issue_type="LOW_PRESSURE",
            timestamp=t0 + timedelta(minutes=30), resolved=False
        ),
        # 5. Resolved earlier today, genuine recurring failure 8 hours later
        ComplaintRecord(
            complaint_id="CMP-000-HIST", citizen_id="CITIZEN-303", ward_code="G/N",
            lat=19.0300, lon=72.8400, issue_type="CONTAMINATION",
            timestamp=t0 - timedelta(hours=10), resolved=True,
            resolved_at=t0 - timedelta(hours=8)
        ),
        ComplaintRecord(
            complaint_id="CMP-005-REPEAT", citizen_id="CITIZEN-303", ward_code="G/N",
            lat=19.0300, lon=72.8400, issue_type="CONTAMINATION",
            timestamp=t0 + timedelta(minutes=45), resolved=False
        )
    ]

    res = dedup.process(raw_complaints)

    assert res.total_received == 7
    # CMP-001 (duplicate ID), CMP-002 (same citizen), CMP-003 (spatial cluster) filtered as duplicate/corroboration
    assert res.duplicates_filtered == 3, f"Expected 3 filtered duplicates, got {res.duplicates_filtered}"
    assert res.unique_incidents == 4, f"Expected 4 unique incidents, got {res.unique_incidents}"

    # Verify repeat genuine was recognized
    assert res.repeat_genuine_count >= 1, "Resolved recurring complaint must be classified as genuine repeat"

    print("PASS: Scenario 1 — Complaint deduplication correctly filters identical IDs, spam, and spatial clusters while honoring genuine repeats.")


def test_complaint_features_and_velocity():
    t_now = datetime(2026, 9, 18, 12, 0, 0)
    extractor = ComplaintFeatureExtractor(ward_areas_km2={"M/E": 32.5})

    complaints = [
        ComplaintRecord(complaint_id=f"C-{i}", citizen_id=f"CIT-{i}", ward_code="M/E",
                        lat=19.06, lon=72.92, issue_type="NO_WATER",
                        timestamp=t_now - timedelta(minutes=i * 20), resolved=False)
        for i in range(6)
    ]

    feats = extractor.extract_features("M/E", complaints, current_time=t_now, window_hours=4.0)
    assert feats.active_count == 6
    assert feats.velocity_per_hour == 1.5  # 6 / 4 hours
    assert feats.corroboration_score > 0.0
    print(f"PASS: Scenario 2 — Complaint features extracted (Velocity: {feats.velocity_per_hour}/hr, Corroboration: {feats.corroboration_score})")


def test_complaint_severity_assignment():
    sev_contam = evaluate_severity("CONTAMINATION")
    assert sev_contam.severity_level == "CRITICAL"
    assert sev_contam.health_hazard is True
    assert sev_contam.severity_score == 1.0

    sev_bill = evaluate_severity("BILLING_OR_ADMINISTRATIVE")
    assert sev_bill.severity_level == "LOW"
    assert sev_bill.health_hazard is False
    assert sev_bill.severity_score == 0.1
    print("PASS: Scenario 3 — Severity correctly mapped by public health hazard level")


if __name__ == "__main__":
    print("======================================================================")
    print("WATERFLOW OS — COMPLAINT INTELLIGENCE SCENARIO TESTS")
    print("======================================================================")
    test_complaint_deduplication_scenarios()
    test_complaint_features_and_velocity()
    test_complaint_severity_assignment()
    print("ALL COMPLAINT SCENARIOS PASSED.")
