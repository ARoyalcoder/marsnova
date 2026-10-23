-- MarsNova Domain Models & CRM Schema (PostgreSQL)
-- Version: 002
-- Scope: Users, roles, services, portfolio, leads, activities, quotations,
--        projects, assignments, media, courses, lessons, notifications, and audit logs.
-- Rules: Never edit already-applied migrations. Use constraints, indexes,
--        and consistent TIMESTAMPTZ timestamps.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(40) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_role_name ON roles(role_name);

-- Seed default MarsNova roles
INSERT INTO roles (role_name, description, permissions)
VALUES
    ('super_admin', 'Full system access and financial controls', '{"all": true}'::jsonb),
    ('agency_manager', 'Project assignment, quotes, client communication', '{"projects": true, "leads": true, "quotes": true}'::jsonb),
    ('editor', 'Post-production asset editing and task updates', '{"media": true, "tasks": true}'::jsonb),
    ('client', 'Client portal review, media approval and comments', '{"reviews": true, "billing_view": true}'::jsonb),
    ('learner', 'MarsNova Lab student with course progress', '{"courses_view": true, "submissions": true}'::jsonb)
ON CONFLICT (role_name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(32),
    avatar_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended', 'pending_verification')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Services Directory (Creative & Technical Offerings)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(80) UNIQUE NOT NULL,
    title VARCHAR(120) NOT NULL,
    category VARCHAR(64) NOT NULL
        CHECK (category IN ('Video', 'Social Media', 'Promotion', 'Tech')),
    description TEXT NOT NULL,
    long_description TEXT,
    icon VARCHAR(64) NOT NULL,
    badge VARCHAR(40),
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
    ideal_for TEXT,
    turnaround_time VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active, display_order);

-- -----------------------------------------------------------------------------
-- 4. Portfolio Case Studies & Work Archive
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(80) UNIQUE NOT NULL,
    title VARCHAR(140) NOT NULL,
    category VARCHAR(64) NOT NULL
        CHECK (category IN ('YouTube Videos', 'Shorts', 'Business Promotion', 'Social Media')),
    thumbnail_url TEXT NOT NULL,
    video_url TEXT,
    tag VARCHAR(40) NOT NULL DEFAULT 'Video',
    client_name VARCHAR(120),
    summary TEXT,
    challenge TEXT,
    approach TEXT,
    outcome TEXT,
    metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
    deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
    tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolio_slug ON portfolio(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_category ON portfolio(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_published ON portfolio(is_published, featured);

-- -----------------------------------------------------------------------------
-- 5. CRM Leads & Opportunities
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enquiry_id UUID REFERENCES enquiries(id) ON DELETE SET NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL,
    phone VARCHAR(32),
    service_requested VARCHAR(80) NOT NULL,
    source VARCHAR(64) NOT NULL DEFAULT 'website_contact',
    status VARCHAR(32) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'discovery', 'proposal_sent', 'won', 'lost')),
    lead_score INT NOT NULL DEFAULT 50
        CHECK (lead_score >= 0 AND lead_score <= 100),
    estimated_value_inr NUMERIC(12, 2) DEFAULT 0,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- -----------------------------------------------------------------------------
-- 6. Activities & Timeline Log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(40) NOT NULL
        CHECK (activity_type IN ('call', 'meeting', 'whatsapp_message', 'email', 'note', 'stage_change', 'quote_created')),
    title VARCHAR(160) NOT NULL,
    summary TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_performed_by ON activities(performed_by);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type, performed_at DESC);

-- -----------------------------------------------------------------------------
-- 7. Foreign Key Enhancements on Quotations & Projects
-- -----------------------------------------------------------------------------
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_lead_id ON quotations(lead_id);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_user_id ON projects(client_user_id);

-- -----------------------------------------------------------------------------
-- 8. Project Team Assignments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assigned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_project VARCHAR(64) NOT NULL DEFAULT 'editor',
    status VARCHAR(32) NOT NULL DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'in_progress', 'review_ready', 'completed')),
    due_date DATE,
    notes TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignments_project ON assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- -----------------------------------------------------------------------------
-- 9. Project Media Assets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(160) NOT NULL,
    media_type VARCHAR(40) NOT NULL
        CHECK (media_type IN ('video', 'audio', 'image', 'document', 'archive')),
    aspect_ratio VARCHAR(16) DEFAULT '16:9',
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(80),
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'ready'
        CHECK (status IN ('uploading', 'processing', 'ready', 'rejected', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_project ON media(project_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);

-- -----------------------------------------------------------------------------
-- 10. Courses (MarsNova Lab Offerings)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(80) UNIQUE NOT NULL,
    title VARCHAR(140) NOT NULL,
    category VARCHAR(64) NOT NULL
        CHECK (category IN ('Foundations', 'AI & Tech', 'Creative Production', 'Design & Branding', 'Marketing & Growth')),
    description TEXT NOT NULL,
    overview TEXT,
    icon VARCHAR(64) NOT NULL,
    level VARCHAR(40) NOT NULL DEFAULT 'Beginner',
    duration VARCHAR(64),
    learning_format VARCHAR(64),
    prerequisites TEXT,
    target_audience TEXT,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published, display_order);

-- -----------------------------------------------------------------------------
-- 11. Course Lessons & Curriculum
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_title VARCHAR(160) NOT NULL,
    title VARCHAR(160) NOT NULL,
    lesson_order INT NOT NULL DEFAULT 1,
    content_markdown TEXT,
    video_url TEXT,
    duration_minutes INT DEFAULT 0,
    is_free_preview BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id, lesson_order);

-- -----------------------------------------------------------------------------
-- 12. Notifications (In-App, WhatsApp, Email)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(32) NOT NULL DEFAULT 'in_app'
        CHECK (channel IN ('in_app', 'whatsapp', 'email', 'sms')),
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    read_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- -----------------------------------------------------------------------------
-- 13. Audit Log Enhancements
-- -----------------------------------------------------------------------------
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- -----------------------------------------------------------------------------
-- Record Migration Version 002
-- -----------------------------------------------------------------------------
INSERT INTO schema_migrations (version, description)
VALUES ('002', 'Domain models for users, roles, services, portfolio, leads, activities, quotations, projects, assignments, media, courses, lessons, notifications, and audit logs')
ON CONFLICT (version) DO NOTHING;
