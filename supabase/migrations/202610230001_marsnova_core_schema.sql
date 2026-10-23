-- MarsNova Core Database Schema (PostgreSQL)
-- Version: 001
-- Scope: Creative services, portfolio, MarsNova Lab, customer enquiries,
--        admin dashboard, WhatsApp notifications, manual quotations,
--        project management, and pen-drive data-recovery case tracking.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schema migration log
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL
);

-- 1. Enquiries Table (Save enquiries before sending external notifications)
CREATE TABLE IF NOT EXISTS enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL,
    phone VARCHAR(32),
    service_interest VARCHAR(80) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'new', -- new, contacted, quoted, in_progress, closed
    whatsapp_notified BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_dispatch_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_email ON enquiries(email);

-- 2. Pen-Drive Data Recovery Case Tracking
CREATE TABLE IF NOT EXISTS data_recovery_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id VARCHAR(32) UNIQUE NOT NULL, -- e.g. 'MN-REC-8291'
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(160),
    device_type VARCHAR(64) NOT NULL, -- Pen Drive, SD Card, External HDD, Flash Card
    capacity_gb NUMERIC(6, 1),
    file_system VARCHAR(32), -- FAT32, exFAT, NTFS, unknown
    issue_type VARCHAR(64) NOT NULL, -- Accidental Deletion, Formatted, Corrupted Partition, Hardware Not Detected
    current_stage VARCHAR(64) NOT NULL DEFAULT 'received',
    -- Stages: 'received', 'diagnostic_inspection', 'nand_extraction', 'file_recovery', 'verification', 'ready_for_dispatch', 'completed', 'unrecoverable'
    progress_percentage INT NOT NULL DEFAULT 10,
    files_recovered_count INT DEFAULT 0,
    data_size_recovered_mb NUMERIC(10, 2) DEFAULT 0,
    diagnostic_notes TEXT,
    estimated_completion DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recovery_cases_case_id ON data_recovery_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_stage ON data_recovery_cases(current_stage);

-- 3. Case Tracking History / Timeline
CREATE TABLE IF NOT EXISTS recovery_case_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id VARCHAR(32) NOT NULL REFERENCES data_recovery_cases(case_id) ON DELETE CASCADE,
    stage VARCHAR(64) NOT NULL,
    status_title VARCHAR(120) NOT NULL,
    status_description TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_case_timeline_case_id ON recovery_case_timeline(case_id, recorded_at);

-- 4. Manual Quotations
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number VARCHAR(32) UNIQUE NOT NULL, -- e.g. 'MN-QT-2026-001'
    enquiry_id UUID REFERENCES enquiries(id) ON DELETE SET NULL,
    client_name VARCHAR(120) NOT NULL,
    client_email VARCHAR(160) NOT NULL,
    service_type VARCHAR(80) NOT NULL,
    scope_details JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal_inr NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_inr NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0,
    valid_until DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
    terms_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quotations_quote_number ON quotations(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- 5. Project Management
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code VARCHAR(32) UNIQUE NOT NULL, -- e.g. 'MN-PRJ-101'
    title VARCHAR(160) NOT NULL,
    client_name VARCHAR(120) NOT NULL,
    client_email VARCHAR(160) NOT NULL,
    vertical VARCHAR(64) NOT NULL, -- video_production, social_media, branding, tech_services
    current_stage VARCHAR(64) NOT NULL DEFAULT 'kickoff',
    -- Stages: 'kickoff', 'pre_production', 'production', 'post_editing', 'client_review', 'final_delivery', 'completed'
    progress_percentage INT NOT NULL DEFAULT 0,
    target_delivery DATE,
    drive_assets_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_client_email ON projects(client_email);

-- 6. Audit Records
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(64) NOT NULL, -- e.g. ENQUIRY_CREATED, WHATSAPP_DISPATCH, CASE_UPDATED
    entity_table VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    actor VARCHAR(120) NOT NULL DEFAULT 'system',
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('001', 'Initial core MarsNova schema for enquiries, data recovery cases, quotations, projects, and audit logs')
ON CONFLICT (version) DO NOTHING;
