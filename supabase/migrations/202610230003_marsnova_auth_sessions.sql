-- =============================================================================
-- Migration 0003: Staff Authentication Sessions & Security Audit Logs
-- Applied to PostgreSQL / Supabase for MarsNova Operations Platform
-- =============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token VARCHAR(128) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Record migration in schema_migrations
INSERT INTO schema_migrations (version, name, executed_by)
VALUES ('003', '003_marsnova_auth_sessions.sql', 'admin')
ON CONFLICT (version) DO NOTHING;
