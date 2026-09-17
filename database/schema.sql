-- ============================================================
-- WaterFlow OS — PostgreSQL + PostGIS Schema
-- Municipal Water Allocation & Complaint Intelligence Platform
-- ============================================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE tanker_status AS ENUM (
    'available',
    'loading',
    'en_route',
    'dispensing',
    'returning',
    'maintenance'
);

CREATE TYPE dispatch_status AS ENUM (
    'pending',
    'assigned',
    'in_transit',
    'delivered',
    'cancelled'
);

CREATE TYPE alert_severity AS ENUM (
    'info',
    'warning',
    'critical'
);

-- ============================================================
-- TABLE: depots
-- Water supply depots / booster stations
-- ============================================================

CREATE TABLE depots (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    location        GEOMETRY(Point, 4326) NOT NULL,
    total_capacity  INTEGER NOT NULL DEFAULT 100000, -- liters
    current_stock   INTEGER NOT NULL DEFAULT 80000,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_depots_location ON depots USING GIST (location);

-- ============================================================
-- TABLE: wards
-- Municipal administrative zones with polygon boundaries
-- ============================================================

CREATE TABLE wards (
    id                  SERIAL PRIMARY KEY,
    ward_number         INTEGER NOT NULL UNIQUE,
    name                VARCHAR(150) NOT NULL,
    boundary            GEOMETRY(Polygon, 4326),
    centroid            GEOMETRY(Point, 4326),
    population          INTEGER NOT NULL DEFAULT 0,
    vulnerability_index FLOAT NOT NULL DEFAULT 0.0 CHECK (vulnerability_index >= 0 AND vulnerability_index <= 1),
    dry_pipe_hours      FLOAT NOT NULL DEFAULT 0.0,
    historical_deficit  FLOAT NOT NULL DEFAULT 0.0 CHECK (historical_deficit >= 0 AND historical_deficit <= 1),
    demand_liters       INTEGER NOT NULL DEFAULT 0,
    coverage_pct        FLOAT NOT NULL DEFAULT 100.0,
    nearest_depot_id    INTEGER REFERENCES depots(id),
    depot_distance_km   FLOAT NOT NULL DEFAULT 0.0,
    status              VARCHAR(20) NOT NULL DEFAULT 'normal', -- normal, warning, critical
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wards_boundary ON wards USING GIST (boundary);
CREATE INDEX idx_wards_centroid ON wards USING GIST (centroid);
CREATE INDEX idx_wards_vulnerability ON wards (vulnerability_index DESC);

-- ============================================================
-- TABLE: tankers
-- Municipal water tanker fleet
-- ============================================================

CREATE TABLE tankers (
    id              SERIAL PRIMARY KEY,
    transponder_id  VARCHAR(20) NOT NULL UNIQUE, -- e.g. T-08
    capacity        INTEGER NOT NULL DEFAULT 10000, -- liters
    current_load    INTEGER NOT NULL DEFAULT 0,
    status          tanker_status NOT NULL DEFAULT 'available',
    location        GEOMETRY(Point, 4326),
    assigned_ward   INTEGER REFERENCES wards(id),
    assigned_depot  INTEGER REFERENCES depots(id),
    speed_kmh       FLOAT NOT NULL DEFAULT 30.0,
    eta_minutes     INTEGER,
    driver_name     VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tankers_location ON tankers USING GIST (location);
CREATE INDEX idx_tankers_status ON tankers (status);

-- ============================================================
-- TABLE: dispatch_logs
-- Historical dispatch audit trail
-- ============================================================

CREATE TABLE dispatch_logs (
    id              SERIAL PRIMARY KEY,
    ward_id         INTEGER NOT NULL REFERENCES wards(id),
    tanker_id       INTEGER NOT NULL REFERENCES tankers(id),
    depot_id        INTEGER REFERENCES depots(id),
    volume_liters   INTEGER NOT NULL,
    priority_score  FLOAT,
    status          dispatch_status NOT NULL DEFAULT 'pending',
    dispatched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    arrived_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    route_distance  FLOAT, -- km
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispatch_ward ON dispatch_logs (ward_id);
CREATE INDEX idx_dispatch_tanker ON dispatch_logs (tanker_id);
CREATE INDEX idx_dispatch_status ON dispatch_logs (status);
CREATE INDEX idx_dispatch_time ON dispatch_logs (dispatched_at DESC);

-- ============================================================
-- TABLE: alerts
-- Active municipal alerts and incidents
-- ============================================================

CREATE TABLE alerts (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    severity    alert_severity NOT NULL DEFAULT 'info',
    ward_id     INTEGER REFERENCES wards(id),
    tanker_id   INTEGER REFERENCES tankers(id),
    badge_text  VARCHAR(20),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_active ON alerts (is_active, severity);

-- ============================================================
-- SEED DATA: Depots
-- ============================================================

INSERT INTO depots (name, location, total_capacity, current_stock) VALUES
('Central Depot #1', ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326), 250000, 180000),
('East Booster #4',  ST_SetSRID(ST_MakePoint(77.6500, 12.9600), 4326), 150000, 95000);

-- ============================================================
-- SEED DATA: Wards (matching the dashboard UI)
-- ============================================================

INSERT INTO wards (ward_number, name, population, vulnerability_index, dry_pipe_hours, historical_deficit, demand_liters, coverage_pct, nearest_depot_id, depot_distance_km, status, description) VALUES
(17, 'Old City Ridge',       28400, 0.95, 52, 0.38, 10000, 42, 1, 4.2,  'critical', 'High informal population settlement with aging infrastructure'),
(23, 'North Settlement',     22000, 0.82, 46, 0.45, 8000,  48, 2, 6.8,  'critical', 'Informal settlement near industrial corridor'),
(8,  'Industrial Colony',    18500, 0.55, 38, 0.28, 6000,  58, 1, 3.1,  'warning',  'Motor failure in tube well, intermittent supply'),
(12, 'Green Valley',         31000, 0.25, 4,  0.05, 2000,  91, 1, 2.0,  'normal',   'Stable residential zone with dual pipeline'),
(5,  'Central Business Hub', 25000, 0.35, 12, 0.10, 3500,  74, 1, 1.8,  'normal',   'Commercial district with moderate demand'),
(31, 'East Periphery',       15000, 0.72, 29, 0.32, 7500,  55, 2, 8.5,  'warning',  'Pressure drop in feeder line, limited access'),
(14, 'South Rail Yard',      19500, 0.48, 32, 0.22, 5000,  65, 1, 5.3,  'warning',  'Scheduled ration cycle area near rail corridor'),
(2,  'Lake Garden East',     35000, 0.20, 2,  0.03, 1500,  95, 1, 1.2,  'normal',   'Premium residential with consistent supply'),
(19, 'West Canal Road',      27000, 0.60, 18, 0.15, 4000,  70, 2, 7.1,  'normal',   'Mixed residential near canal infrastructure'),
(26, 'North Ring Bypass',    16000, 0.45, 22, 0.18, 3000,  68, 2, 9.2,  'normal',   'Suburban expansion zone');

-- ============================================================
-- SEED DATA: Tankers (25 municipal fleet)
-- ============================================================

INSERT INTO tankers (transponder_id, capacity, current_load, status, location, assigned_ward, assigned_depot, eta_minutes, driver_name) VALUES
('T-01', 10000, 10000, 'available',   ST_SetSRID(ST_MakePoint(77.5950, 12.9720), 4326), NULL, 1, NULL,  'R. Kumar'),
('T-02', 12000, 4200,  'dispensing',  ST_SetSRID(ST_MakePoint(77.6400, 12.9500), 4326), 3,   1, NULL,  'S. Patel'),
('T-03', 8000,  8000,  'available',   ST_SetSRID(ST_MakePoint(77.5940, 12.9710), 4326), NULL, 1, NULL,  'M. Singh'),
('T-04', 10000, 10000, 'loading',     ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326), NULL, 1, NULL,  'A. Reddy'),
('T-05', 8000,  8000,  'available',   ST_SetSRID(ST_MakePoint(77.5955, 12.9725), 4326), NULL, 1, NULL,  'V. Sharma'),
('T-06', 12000, 12000, 'loading',     ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326), NULL, 1, NULL,  'K. Rao'),
('T-07', 10000, 10000, 'available',   ST_SetSRID(ST_MakePoint(77.6510, 12.9610), 4326), NULL, 2, NULL,  'P. Joshi'),
('T-08', 10000, 10000, 'en_route',    ST_SetSRID(ST_MakePoint(77.6100, 12.9550), 4326), 1,   1, 12,    'D. Gupta'),
('T-09', 8000,  8000,  'available',   ST_SetSRID(ST_MakePoint(77.5960, 12.9730), 4326), NULL, 1, NULL,  'N. Verma'),
('T-10', 10000, 10000, 'available',   ST_SetSRID(ST_MakePoint(77.6520, 12.9605), 4326), NULL, 2, NULL,  'B. Prasad'),
('T-11', 12000, 12000, 'available',   ST_SetSRID(ST_MakePoint(77.5935, 12.9705), 4326), NULL, 1, NULL,  'H. Desai'),
('T-12', 8000,  8000,  'loading',     ST_SetSRID(ST_MakePoint(77.6500, 12.9600), 4326), NULL, 2, NULL,  'G. Nair'),
('T-13', 10000, 10000, 'available',   ST_SetSRID(ST_MakePoint(77.5942, 12.9712), 4326), NULL, 1, NULL,  'L. Iyer'),
('T-14', 8000,  8000,  'en_route',    ST_SetSRID(ST_MakePoint(77.6350, 12.9650), 4326), 2,   2, 30,    'T. Menon'),
('T-15', 10000, 10000, 'available',   ST_SetSRID(ST_MakePoint(77.5948, 12.9718), 4326), NULL, 1, NULL,  'C. Das'),
('T-16', 12000, 12000, 'en_route',    ST_SetSRID(ST_MakePoint(77.6200, 12.9480), 4326), 6,   2, 22,    'F. Khan'),
('T-17', 8000,  8000,  'available',   ST_SetSRID(ST_MakePoint(77.6505, 12.9595), 4326), NULL, 2, NULL,  'J. Bhat'),
('T-18', 10000, 10000, 'available',   ST_SetSRID(ST_MakePoint(77.5952, 12.9722), 4326), NULL, 1, NULL,  'W. Hegde'),
('T-19', 8000,  0,     'returning',   ST_SetSRID(ST_MakePoint(77.6150, 12.9580), 4326), NULL, 1, NULL,  'E. Shetty'),
('T-20', 10000, 10000, 'loading',     ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326), NULL, 1, NULL,  'O. Pillai'),
('T-21', 12000, 12000, 'available',   ST_SetSRID(ST_MakePoint(77.5938, 12.9708), 4326), NULL, 1, NULL,  'U. Rajan'),
('T-22', 8000,  8000,  'available',   ST_SetSRID(ST_MakePoint(77.6515, 12.9608), 4326), NULL, 2, NULL,  'I. Mohan'),
('T-23', 10000, 10000, 'available',   ST_SetSRID(ST_MakePoint(77.5944, 12.9714), 4326), NULL, 1, NULL,  'Q. Swamy'),
('T-24', 8000,  8000,  'maintenance', ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326), NULL, 1, NULL,  'X. Gowda'),
('T-25', 10000, 10000, 'available',   ST_SetSRID(ST_MakePoint(77.6508, 12.9602), 4326), NULL, 2, NULL,  'Z. Achar');

-- ============================================================
-- SEED DATA: Active Alerts
-- ============================================================

INSERT INTO alerts (title, description, severity, ward_id, tanker_id, badge_text, is_active) VALUES
('Ward 23 · Deficit Surge',       'Booster pump tripped; auxiliary load reroute initiated.', 'critical', 2, NULL, '52h',   TRUE),
('Ward 17 · IVR Grievance Spike', '42 community calls in Sub-sector 4; Tanker T-08 queued.', 'warning',  1, NULL, '+31%',  TRUE),
('Tanker T-14 · Delayed',         'Ring Road North bottleneck; recalculating transit route.', 'warning',  NULL, 14, '+18m', TRUE);

-- ============================================================
-- VIEWS: Dashboard summaries
-- ============================================================

CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
    (SELECT COUNT(*) FROM wards WHERE demand_liters > 0)          AS active_requests,
    (SELECT COUNT(*) FROM tankers WHERE status = 'available')     AS fleet_available,
    (SELECT COUNT(*) FROM tankers)                                AS fleet_total,
    (SELECT COALESCE(SUM(current_stock), 0) FROM depots WHERE is_active) AS water_available_liters,
    (SELECT COALESCE(SUM(demand_liters), 0) FROM wards)          AS total_demand_liters,
    (SELECT COUNT(*) FROM wards WHERE dry_pipe_hours > 48)        AS critical_wards,
    (SELECT COUNT(*) FROM alerts WHERE is_active AND severity = 'critical') AS critical_alerts;

-- ============================================================
-- MOBILE CITIZEN & WORKER SCHEMA ADDITIONS
-- ============================================================

ALTER TABLE dispatch_logs 
    ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
    ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'assigned';

CREATE TABLE IF NOT EXISTS citizen_reports (
    report_id           SERIAL PRIMARY KEY,
    phone_number        VARCHAR(20) NOT NULL,
    issue_type          VARCHAR(100) NOT NULL DEFAULT 'water_shortage',
    status              VARCHAR(50) NOT NULL DEFAULT 'pending',
    gps_location        GEOMETRY(Point, 4326),
    ward_id             INTEGER REFERENCES wards(id),
    assigned_tanker_id  INTEGER REFERENCES tankers(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citizen_reports_location ON citizen_reports USING GIST (gps_location);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_phone ON citizen_reports (phone_number);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_status ON citizen_reports (status);
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_otp ON dispatch_logs (otp_code);
