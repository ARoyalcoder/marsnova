-- =============================================================================
-- MarsNova Database Migration 008: Pen-Drive Data Recovery Case Tracking,
--                                   Device Custody, Protected Diagnostics,
--                                   Manual Quotation Gates & Event Ledger
-- =============================================================================

-- 1. Extend or align data_recovery_cases table
ALTER TABLE data_recovery_cases 
    ADD COLUMN IF NOT EXISTS case_reference VARCHAR(32),
    ADD COLUMN IF NOT EXISTS device_brand VARCHAR(80),
    ADD COLUMN IF NOT EXISTS device_model VARCHAR(80),
    ADD COLUMN IF NOT EXISTS device_serial VARCHAR(80),
    ADD COLUMN IF NOT EXISTS damage_type VARCHAR(64) DEFAULT 'logical_format',
    ADD COLUMN IF NOT EXISTS symptoms TEXT,
    ADD COLUMN IF NOT EXISTS critical_files_description TEXT,
    ADD COLUMN IF NOT EXISTS consent_diagnostic BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS consent_nand_risk BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(32) NOT NULL DEFAULT 'counter_dropoff',
    ADD COLUMN IF NOT EXISTS physical_receipt_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS received_by VARCHAR(160),
    ADD COLUMN IF NOT EXISTS received_condition_notes TEXT,
    ADD COLUMN IF NOT EXISTS current_custody_location VARCHAR(120) NOT NULL DEFAULT 'Customer Custody / Pending Shipment',
    ADD COLUMN IF NOT EXISTS diagnosis_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS diagnostic_complexity VARCHAR(32) NOT NULL DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS internal_diagnostic_notes TEXT, -- PROTECTED: Staff diagnostic notes, redacted from public API
    ADD COLUMN IF NOT EXISTS public_diagnostic_summary TEXT, -- Safe sanitized public overview
    ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS quotation_amount NUMERIC(12, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS quotation_status VARCHAR(32) NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS quotation_approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS quotation_approved_by VARCHAR(160),
    ADD COLUMN IF NOT EXISTS recovery_status VARCHAR(64) NOT NULL DEFAULT 'intake_submitted',
    ADD COLUMN IF NOT EXISTS return_dispatched_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS return_tracking_number VARCHAR(120),
    ADD COLUMN IF NOT EXISTS return_carrier VARCHAR(80),
    ADD COLUMN IF NOT EXISTS return_recipient_name VARCHAR(160);

-- Populate case_reference from case_id where empty
UPDATE data_recovery_cases 
SET case_reference = case_id 
WHERE case_reference IS NULL AND case_id IS NOT NULL;

-- Make case_reference unique
CREATE UNIQUE INDEX IF NOT EXISTS uq_recovery_case_reference ON data_recovery_cases(case_reference);

-- Add check constraints for recovery status, diagnosis status, and quotation status
ALTER TABLE data_recovery_cases DROP CONSTRAINT IF EXISTS chk_recovery_status;
ALTER TABLE data_recovery_cases ADD CONSTRAINT chk_recovery_status
    CHECK (recovery_status IN (
        'intake_submitted',
        'device_received',
        'diagnosing',
        'quote_pending',
        'quote_approved',
        'quote_rejected',
        'in_recovery',
        'recovery_completed',
        'recovery_unrecoverable',
        'device_returned'
    ));

ALTER TABLE data_recovery_cases DROP CONSTRAINT IF EXISTS chk_diagnosis_status;
ALTER TABLE data_recovery_cases ADD CONSTRAINT chk_diagnosis_status
    CHECK (diagnosis_status IN ('pending', 'in_progress', 'completed', 'unrecoverable'));

ALTER TABLE data_recovery_cases DROP CONSTRAINT IF EXISTS chk_recovery_quotation_status;
ALTER TABLE data_recovery_cases ADD CONSTRAINT chk_recovery_quotation_status
    CHECK (quotation_status IN ('none', 'issued', 'approved', 'rejected'));

ALTER TABLE data_recovery_cases DROP CONSTRAINT IF EXISTS chk_delivery_method;
ALTER TABLE data_recovery_cases ADD CONSTRAINT chk_delivery_method
    CHECK (delivery_method IN ('counter_dropoff', 'insured_courier'));

-- Create performance indexes for search, status filtering, and custody
CREATE INDEX IF NOT EXISTS idx_recovery_cases_status ON data_recovery_cases(recovery_status);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_custody ON data_recovery_cases(current_custody_location);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_created ON data_recovery_cases(created_at DESC);

-- 2. Versioned Recovery Case Events & Custody Ledger
CREATE TABLE IF NOT EXISTS recovery_case_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_reference VARCHAR(32) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    from_status VARCHAR(64),
    to_status VARCHAR(64),
    actor_type VARCHAR(32) NOT NULL DEFAULT 'staff', -- 'customer', 'staff', 'system'
    actor_name VARCHAR(160) NOT NULL,
    custody_location VARCHAR(120),
    public_notes TEXT,
    internal_diagnostic_notes TEXT, -- PROTECTED: Only visible to authenticated staff
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_case_events_ref ON recovery_case_events(case_reference, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_case_events_type ON recovery_case_events(event_type);

-- 3. Register Migration 008
INSERT INTO schema_migrations (version, description)
VALUES ('008', 'Pen-drive data recovery case intake, custody tracking, protected diagnostics, quotation gates and event ledger')
ON CONFLICT (version) DO NOTHING;
