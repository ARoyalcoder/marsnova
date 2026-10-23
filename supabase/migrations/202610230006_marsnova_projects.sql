-- =============================================================================
-- MarsNova Database Migration 006: Projects from Leads/Quotations, Deliverables,
--                                   Manual Staff Assignments & Activity Logs
-- =============================================================================

-- 1. Extend projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority VARCHAR(32) NOT NULL DEFAULT 'medium';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'kickoff';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deliverables JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Constraints
ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_project_priority;
ALTER TABLE projects ADD CONSTRAINT chk_project_priority 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_project_status;
ALTER TABLE projects ADD CONSTRAINT chk_project_status 
    CHECK (status IN ('kickoff', 'pre_production', 'production', 'post_editing', 'client_review', 'final_delivery', 'completed', 'on_hold', 'cancelled'));

ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_project_dates;
ALTER TABLE projects ADD CONSTRAINT chk_project_dates 
    CHECK (target_delivery IS NULL OR start_date IS NULL OR target_delivery >= start_date);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_quotation_id ON projects(quotation_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);

-- 2. Project Change and Audit Activity Log Table
CREATE TABLE IF NOT EXISTS project_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    activity_type VARCHAR(64) NOT NULL, -- status_change, staff_assigned, staff_removed, deliverable_updated, priority_changed
    summary TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_activities_project_id ON project_activities(project_id, created_at DESC);

-- 3. Record migration version
INSERT INTO schema_migrations (version, description)
VALUES ('006', 'Projects from leads/quotations with scope, priority, dates, deliverables, manual staff assignments and activity logs')
ON CONFLICT (version) DO NOTHING;
