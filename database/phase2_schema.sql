-- ============================================================
-- WaterFlow OS — Phase 2 Database Schema
-- Smart Invoicing, Water Quality, & Visual Delivery Verification
-- ============================================================

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Alter dispatch_logs to include visual proof, water quality, and verification metrics
ALTER TABLE dispatch_logs 
    ADD COLUMN IF NOT EXISTS visual_proof_url TEXT,
    ADD COLUMN IF NOT EXISTS tds_level NUMERIC(6, 2),        -- Total Dissolved Solids in mg/L (ppm)
    ADD COLUMN IF NOT EXISTS ph_level NUMERIC(4, 2),         -- Water pH scale (0.00 - 14.00)
    ADD COLUMN IF NOT EXISTS cv_confidence NUMERIC(5, 4),    -- Computer Vision model confidence (0.0000 - 1.0000)
    ADD COLUMN IF NOT EXISTS cv_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS otp_matched BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS offline_synced BOOLEAN DEFAULT FALSE;

-- 2. Create contractor_invoices table for automated, bureaucracy-free vendor disbursements
CREATE TABLE IF NOT EXISTS contractor_invoices (
    invoice_id                  SERIAL PRIMARY KEY,
    invoice_number              VARCHAR(64) UNIQUE NOT NULL,
    dispatch_id                 INTEGER NOT NULL REFERENCES dispatch_logs(id) ON DELETE CASCADE,
    ward_id                     INTEGER REFERENCES wards(id),
    tanker_id                   INTEGER REFERENCES tankers(id),
    volume_delivered_liters     INTEGER NOT NULL CHECK (volume_delivered_liters > 0),
    base_rate_per_kl            NUMERIC(10, 2) NOT NULL DEFAULT 450.00, -- Standard BMC contractor rate ₹450 / 1,000 Litres
    quality_deduction_inr       NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    gross_amount_inr            NUMERIC(12, 2) NOT NULL,
    net_payout_inr              NUMERIC(12, 2) NOT NULL,
    tds_reading                 NUMERIC(6, 2),
    ph_reading                  NUMERIC(4, 2),
    quality_grade               VARCHAR(20) NOT NULL DEFAULT 'Grade-A Potable',
    visual_proof_url            TEXT,
    cv_confidence_score         NUMERIC(5, 4),
    payment_status              VARCHAR(50) NOT NULL DEFAULT 'auto_approved', -- auto_approved, escrow_held, disbursed, flagged_audit
    disbursement_ref            VARCHAR(64),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for rapid audit and ledger lookups
CREATE INDEX IF NOT EXISTS idx_contractor_invoices_dispatch ON contractor_invoices(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_contractor_invoices_status ON contractor_invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_contractor_invoices_created ON contractor_invoices(created_at);

-- 3. Trigger Function: Automatically generate contractor invoice on 'Verified' status
CREATE OR REPLACE FUNCTION trg_auto_generate_contractor_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_num VARCHAR(64);
    v_volume INT;
    v_base_rate NUMERIC(10, 2) := 450.00;
    v_gross NUMERIC(12, 2);
    v_deduction NUMERIC(10, 2) := 0.00;
    v_net NUMERIC(12, 2);
    v_grade VARCHAR(20) := 'Grade-A Potable';
    v_status VARCHAR(50) := 'auto_approved';
BEGIN
    -- Fire only when delivery_status transitions to 'Verified' and hasn't already invoiced
    IF (NEW.delivery_status = 'Verified' OR NEW.delivery_status = 'verified') 
       AND (OLD.delivery_status IS DISTINCT FROM NEW.delivery_status) THEN
        
        -- Prevent duplicate invoice generation for the same dispatch
        IF EXISTS (SELECT 1 FROM contractor_invoices WHERE dispatch_id = NEW.id) THEN
            RETURN NEW;
        END IF;

        -- Resolve volume (default to 10,000L if unspecified)
        v_volume := COALESCE(NEW.volume_liters, 10000);
        v_gross := (v_volume::NUMERIC / 1000.0) * v_base_rate;

        -- Water Quality Assessment & Penalty Logic
        -- Acceptable Potable Water Range (IS 10500:2012): pH 6.5 - 8.5, TDS < 500 mg/L
        IF NEW.ph_level IS NOT NULL AND (NEW.ph_level < 6.5 OR NEW.ph_level > 8.5) THEN
            v_deduction := v_deduction + (v_gross * 0.15); -- 15% penalty for abnormal pH
            v_grade := 'Sub-Standard pH';
            v_status := 'flagged_audit';
        END IF;

        IF NEW.tds_level IS NOT NULL AND NEW.tds_level > 500.0 THEN
            v_deduction := v_deduction + (v_gross * 0.10); -- 10% penalty for elevated TDS
            v_grade := 'Elevated TDS';
            v_status := 'flagged_audit';
        END IF;

        v_net := GREATEST(0.00, v_gross - v_deduction);

        -- Generate unique invoice number: INV-BMC-YYYYMMDD-[DISPATCH_ID]
        v_invoice_num := 'INV-BMC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 5, '0');

        -- Auto-insert into contractor_invoices
        INSERT INTO contractor_invoices (
            invoice_number,
            dispatch_id,
            ward_id,
            tanker_id,
            volume_delivered_liters,
            base_rate_per_kl,
            quality_deduction_inr,
            gross_amount_inr,
            net_payout_inr,
            tds_reading,
            ph_reading,
            quality_grade,
            visual_proof_url,
            cv_confidence_score,
            payment_status,
            disbursement_ref,
            created_at,
            approved_at
        ) VALUES (
            v_invoice_num,
            NEW.id,
            NEW.ward_id,
            NEW.tanker_id,
            v_volume,
            v_base_rate,
            v_deduction,
            v_gross,
            v_net,
            NEW.tds_level,
            NEW.ph_level,
            v_grade,
            NEW.visual_proof_url,
            NEW.cv_confidence,
            v_status,
            'DBT-NEFT-MCGM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
            NOW(),
            NOW()
        );

        -- Update verified_at timestamp on dispatch_logs
        NEW.verified_at := COALESCE(NEW.verified_at, NOW());
        NEW.otp_matched := TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Bind Trigger to dispatch_logs table
DROP TRIGGER IF EXISTS trg_dispatch_verified_generate_invoice ON dispatch_logs;
CREATE TRIGGER trg_dispatch_verified_generate_invoice
    BEFORE UPDATE OF delivery_status ON dispatch_logs
    FOR EACH ROW
    EXECUTE FUNCTION trg_auto_generate_contractor_invoice();
