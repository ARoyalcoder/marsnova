-- =============================================================================
-- Migration 009: MarsNova Lab Learning Functionality
-- Tables: students, student_sessions, course_enrolments, lesson_progress
-- Idempotent & Versioned with schema_migrations tracking
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Students (Dedicated Student Account Storage)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'pending_verification')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- -----------------------------------------------------------------------------
-- 2. Student Authentication Sessions (Isolated from Staff Sessions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_token VARCHAR(128) UNIQUE NOT NULL,
    csrf_token VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_sessions_token ON student_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_student_sessions_student_id ON student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_expires_at ON student_sessions(expires_at);

-- -----------------------------------------------------------------------------
-- 3. Course Enrolments (Enrolment Rules & Lifecycle)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_enrolments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'dropped', 'suspended')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrolments_student ON course_enrolments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrolments_course ON course_enrolments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrolments_status ON course_enrolments(status);

-- -----------------------------------------------------------------------------
-- 4. Lesson Progress Tracking (Enforced Ownership)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    last_position_seconds INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);

-- -----------------------------------------------------------------------------
-- 5. Record Migration in schema_migrations
-- -----------------------------------------------------------------------------
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('009', '009_marsnova_lab_learning.sql', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;
