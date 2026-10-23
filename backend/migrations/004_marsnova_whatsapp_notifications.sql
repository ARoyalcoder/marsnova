-- =============================================================================
-- MarsNova Database Migration 004: WhatsApp Business Notifications & Delivery Tracking
-- =============================================================================

-- Add lead and provider delivery tracking columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(32);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(120);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(128);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS fallback_url TEXT;

-- Drop old check constraint if exists to support fallback_click_to_chat
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_status_check 
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'fallback_click_to_chat'));

-- Performance & deduplication indexes
CREATE INDEX IF NOT EXISTS idx_notifications_lead_id ON notifications(lead_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency ON notifications(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_provider_msg_id ON notifications(provider_message_id) WHERE provider_message_id IS NOT NULL;

-- Track migration version
INSERT INTO schema_migrations (version, description)
VALUES ('004', 'WhatsApp Business provider integration, delivery tracking, and idempotency deduplication')
ON CONFLICT (version) DO NOTHING;
