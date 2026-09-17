-- ============================================================
-- WaterFlow OS — Database Schema Additions
-- Worker & Citizen Mobile Portals
-- ============================================================

-- 1. Add otp_code and delivery_status columns to dispatch_logs table
ALTER TABLE dispatch_logs 
    ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
    ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'assigned';

-- 2. Create citizen_reports table with PostGIS Point geometry
CREATE TABLE IF NOT EXISTS citizen_reports (
    report_id           SERIAL PRIMARY KEY,
    phone_number        VARCHAR(20) NOT NULL,
    issue_type          VARCHAR(100) NOT NULL DEFAULT 'water_shortage',
    status              VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, dispatched, resolved, rejected
    gps_location        GEOMETRY(Point, 4326),
    ward_id             INTEGER REFERENCES wards(id),
    assigned_tanker_id  INTEGER REFERENCES tankers(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial and relational indexing
CREATE INDEX IF NOT EXISTS idx_citizen_reports_location ON citizen_reports USING GIST (gps_location);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_phone ON citizen_reports (phone_number);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_status ON citizen_reports (status);
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_otp ON dispatch_logs (otp_code);

-- Sample initial dispatches with OTP codes for testing
INSERT INTO dispatch_logs (
    ward_id, tanker_id, depot_id, volume_liters, priority_score, 
    status, delivery_status, otp_code, dispatched_at, route_distance, notes
) 
SELECT 
    1, 8, 4, 10000, 79.2, 
    'in_transit', 'en_route', '7419', NOW(), 4.8, 'Priority dispatch to Ward M/East Shivaji Nagar'
WHERE NOT EXISTS (
    SELECT 1 FROM dispatch_logs WHERE otp_code = '7419'
);

INSERT INTO citizen_reports (
    phone_number, issue_type, status, gps_location, ward_id, assigned_tanker_id, notes
)
SELECT 
    '+91-9820012345', 'severe_dry_pipe', 'dispatched',
    ST_SetSRID(ST_MakePoint(72.9180, 19.0550), 4326), 1, 8,
    'Citizen reported 58h dry pipeline in Shivaji Nagar'
WHERE NOT EXISTS (
    SELECT 1 FROM citizen_reports WHERE phone_number = '+91-9820012345'
);
