-- WaterFlow OS Deployment Schema (Supabase)

CREATE TABLE wards (
    ward_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    zone VARCHAR(100),
    population INTEGER,
    vulnerability_index FLOAT,
    dry_pipe_hours FLOAT,
    historical_deficit FLOAT,
    demand_liters INTEGER,
    coverage_pct FLOAT,
    depot_distance_km FLOAT,
    lat FLOAT,
    lng FLOAT,
    status VARCHAR(50),
    water_deficit_pct FLOAT,
    description TEXT
);

CREATE TABLE tankers (
    tanker_id VARCHAR(50) PRIMARY KEY,
    capacity_liters INTEGER,
    current_load INTEGER,
    status VARCHAR(50),
    location_lat FLOAT,
    location_lng FLOAT,
    assigned_ward VARCHAR(50) REFERENCES wards(ward_id),
    driver_name VARCHAR(100),
    contact VARCHAR(50),
    eta_minutes INTEGER
);

CREATE TABLE depots (
    depot_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150),
    total_capacity INTEGER,
    current_stock INTEGER,
    lat FLOAT,
    lng FLOAT
);

CREATE TABLE missions (
    mission_id VARCHAR(50) PRIMARY KEY,
    ward_id VARCHAR(50) REFERENCES wards(ward_id),
    tanker_id VARCHAR(50) REFERENCES tankers(tanker_id),
    volume_liters INTEGER,
    status VARCHAR(50),
    priority_tier INTEGER,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE field_operations (
    operation_id VARCHAR(100) PRIMARY KEY,
    mission_id VARCHAR(50) REFERENCES missions(mission_id),
    action VARCHAR(50),
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(operation_id)
);

CREATE TABLE operational_decisions (
    decision_id VARCHAR(100) PRIMARY KEY,
    ward_id VARCHAR(50) REFERENCES wards(ward_id),
    tanker_id VARCHAR(50) REFERENCES tankers(tanker_id),
    priority_score FLOAT,
    tier INTEGER,
    status VARCHAR(50),
    decision_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE governance_decisions (
    decision_id VARCHAR(100) PRIMARY KEY,
    status VARCHAR(50),
    action VARCHAR(50),
    ward_id VARCHAR(50),
    reason TEXT,
    tier INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE governance_audit_log (
    id SERIAL PRIMARY KEY,
    event VARCHAR(100),
    decision_id VARCHAR(100),
    ward_id VARCHAR(50),
    action VARCHAR(50),
    actor VARCHAR(100),
    auth_mode VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    details JSONB
);

CREATE TABLE resilience_traces (
    id SERIAL PRIMARY KEY,
    scenario_type VARCHAR(100),
    impact_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE autonomy_records (
    execution_id VARCHAR(100) PRIMARY KEY,
    decision_id VARCHAR(100),
    tier INTEGER,
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    audit_data JSONB
);
