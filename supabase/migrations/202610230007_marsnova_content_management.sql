-- =============================================================================
-- MarsNova Database Migration 007: Protected Content Management (Services,
--                                   Portfolio, Courses, Lessons) & Media Storage
-- =============================================================================

-- 1. Extend services with draft/published/archived status and unique slug constraint
ALTER TABLE services ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'published';
ALTER TABLE services DROP CONSTRAINT IF EXISTS chk_services_status;
ALTER TABLE services ADD CONSTRAINT chk_services_status 
    CHECK (status IN ('draft', 'published', 'archived'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

-- 2. Extend portfolio with draft/published/archived status and unique slug constraint
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'published';
ALTER TABLE portfolio DROP CONSTRAINT IF EXISTS chk_portfolio_status;
ALTER TABLE portfolio ADD CONSTRAINT chk_portfolio_status 
    CHECK (status IN ('draft', 'published', 'archived'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_portfolio_slug ON portfolio(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_status ON portfolio(status);

-- 3. Extend courses with draft/published/archived status and unique slug constraint
ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'published';
ALTER TABLE courses DROP CONSTRAINT IF EXISTS chk_courses_status;
ALTER TABLE courses ADD CONSTRAINT chk_courses_status 
    CHECK (status IN ('draft', 'published', 'archived'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- 4. Extend lessons with slug, draft/published/archived status, and private content flags
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS slug VARCHAR(120);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'published';
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS resources JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE lessons DROP CONSTRAINT IF EXISTS chk_lessons_status;
ALTER TABLE lessons ADD CONSTRAINT chk_lessons_status 
    CHECK (status IN ('draft', 'published', 'archived'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_lesson_slug ON lessons(course_id, slug);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_private ON lessons(is_private);

-- 5. Media Uploads & Storage Tracking
CREATE TABLE IF NOT EXISTS media_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'local',
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by VARCHAR(160) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_uploads_provider ON media_uploads(storage_provider);
CREATE INDEX IF NOT EXISTS idx_media_uploads_private ON media_uploads(is_private);
CREATE INDEX IF NOT EXISTS idx_media_uploads_created ON media_uploads(created_at DESC);

-- 6. Record migration version
INSERT INTO schema_migrations (version, description)
VALUES ('007', 'Protected management for services, portfolio, courses and lessons with draft/published/archived states, unique slugs, private content protection and media storage')
ON CONFLICT (version) DO NOTHING;
