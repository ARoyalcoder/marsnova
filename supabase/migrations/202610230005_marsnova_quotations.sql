-- =============================================================================
-- MarsNova Database Migration 005: Manual Quotations & Revisions
-- =============================================================================
-- Scope: Manual quotations with reference, lead, scope, decimal amount, currency,
--        terms, validity, revisions, status workflow, and audit history.
-- Rule: Records only — no payment gateway, checkout, webhooks, or commissions.
-- =============================================================================

-- 1. Extend quotations table with manual quote fields and decimal precision
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS reference VARCHAR(64);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'INR';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS revision_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

-- Backfill reference from quote_number if previously empty
UPDATE quotations SET reference = quote_number WHERE reference IS NULL;

-- 2. Constraints for monetary precision, allowed currencies, and valid statuses
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS chk_quotations_amount_positive;
ALTER TABLE quotations ADD CONSTRAINT chk_quotations_amount_positive CHECK (amount >= 0.00);

ALTER TABLE quotations DROP CONSTRAINT IF EXISTS chk_quotations_currency;
ALTER TABLE quotations ADD CONSTRAINT chk_quotations_currency CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP', 'AED'));

-- Drop older status constraint if exists to support unified workflow
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS chk_quotations_status;
ALTER TABLE quotations ADD CONSTRAINT chk_quotations_status 
    CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'cancelled'));

-- 3. Unique indexes for references and idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_reference ON quotations(reference) WHERE reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_idempotency ON quotations(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_status_validity ON quotations(status, valid_until);

-- 4. Quotation Revisions History Table
CREATE TABLE IF NOT EXISTS quotation_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    scope TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0.00),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP', 'AED')),
    terms TEXT,
    valid_until DATE NOT NULL,
    change_summary TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_quotation_revision UNIQUE (quotation_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_quotation_revisions_quotation_id ON quotation_revisions(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_revisions_created_at ON quotation_revisions(created_at);

-- 5. Record schema migration version
INSERT INTO schema_migrations (version, description)
VALUES ('005', 'Manual quotations with reference, lead, scope, decimal amount, currency, terms, validity, revisions, and status workflow')
ON CONFLICT (version) DO NOTHING;
