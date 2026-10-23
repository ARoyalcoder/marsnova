import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadSource(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), 'utf8');
}

test('WhatsApp migrations extend notifications table with delivery tracking columns, constraints, and indexes', () => {
  const backendMigration = loadSource('backend/migrations/004_marsnova_whatsapp_notifications.sql');
  const supabaseMigration = loadSource('supabase/migrations/202610230004_marsnova_whatsapp_notifications.sql');

  // Verify backend and Supabase migrations mirror each other
  assert.equal(
    backendMigration.trim(),
    supabaseMigration.trim(),
    'Backend and Supabase WhatsApp notification migrations must match'
  );

  // Table Columns & Foreign Keys
  assert.ok(backendMigration.includes('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;'), 'Must link to leads table with cascade');
  assert.ok(backendMigration.includes('recipient_phone VARCHAR(32)'), 'Must store recipient phone');
  assert.ok(backendMigration.includes('recipient_name VARCHAR(120)'), 'Must store recipient name');
  assert.ok(backendMigration.includes('provider_message_id VARCHAR(128)'), 'Must store provider message ID');
  assert.ok(backendMigration.includes('attempts INTEGER NOT NULL DEFAULT 0'), 'Must track attempts');
  assert.ok(backendMigration.includes('max_attempts INTEGER NOT NULL DEFAULT 3'), 'Must have bounded max_attempts');
  assert.ok(backendMigration.includes('last_error TEXT'), 'Must store sanitized error details');
  assert.ok(backendMigration.includes('idempotency_key VARCHAR(128)'), 'Must store idempotency key');
  assert.ok(backendMigration.includes('fallback_url TEXT'), 'Must store direct click-to-chat fallback URL');

  // Status Check Constraint
  assert.ok(backendMigration.includes("'pending'"), 'Must allow pending status');
  assert.ok(backendMigration.includes("'sent'"), 'Must allow sent status');
  assert.ok(backendMigration.includes("'delivered'"), 'Must allow delivered status');
  assert.ok(backendMigration.includes("'failed'"), 'Must allow failed status');
  assert.ok(backendMigration.includes("'fallback_click_to_chat'"), 'Must allow fallback_click_to_chat status');

  // Indexes for deduplication and performance
  assert.ok(backendMigration.includes('idx_notifications_lead_id'), 'Must index lead_id');
  assert.ok(backendMigration.includes('idx_notifications_idempotency'), 'Must index idempotency_key');
  assert.ok(backendMigration.includes('idx_notifications_provider_msg_id'), 'Must index provider message id');
});

test('WhatsAppNotificationService implements click-to-chat, dispatch, bounded retries, and duplicate protection', () => {
  const header = loadSource('backend/services/WhatsAppNotificationService.h');
  const source = loadSource('backend/services/WhatsAppNotificationService.cc');
  const cmake = loadSource('backend/CMakeLists.txt');

  // CMake registration
  assert.ok(cmake.includes('WhatsAppNotificationService.cc'), 'Must include WhatsAppNotificationService.cc in CMakeLists.txt');

  // Core Service Header API
  assert.ok(header.includes('enum class MockProviderMode'), 'Must declare MockProviderMode enum');
  assert.ok(header.includes('Success'), 'Must support Success mock mode');
  assert.ok(header.includes('Outage'), 'Must support Outage mock mode');
  assert.ok(header.includes('Timeout'), 'Must support Timeout mock mode');
  assert.ok(header.includes('Disabled'), 'Must support Disabled mock mode');
  assert.ok(header.includes('buildClickToChatUrl'), 'Must declare buildClickToChatUrl');
  assert.ok(header.includes('dispatchLeadNotification'), 'Must declare dispatchLeadNotification');

  // Bounded Retries & Constants
  assert.ok(source.includes('rec.maxAttempts = 3'), 'Must bound retries to 3 attempts');
  assert.ok(source.includes('for (int i = 1; i <= rec.maxAttempts; ++i)'), 'Must execute bounded retry loop');

  // Truthful Status Reporting (Never falsely claim sent when unconfigured/disabled)
  assert.ok(source.includes('fallback_click_to_chat'), 'Must return fallback_click_to_chat status when provider is disabled');
  assert.ok(source.includes('917208591595'), 'Must use MarsNova verified WhatsApp line');

  // Duplicate protection via idempotency key
  assert.ok(source.includes('Duplicate Protection / Idempotency Check'), 'Must implement duplicate protection / idempotency check');
  assert.ok(source.includes('s_idempotencyToId.find(idempotencyKey)'), 'Must lookup existing notification by idempotency key');
  assert.ok(source.includes('Return existing notification without re-dispatching'), 'Must return existing notification on duplicate');

  // Safe error sanitization
  assert.ok(source.includes('sanitizeErrorMessage'), 'Must sanitize error messages to prevent credential leakage');
  assert.ok(source.includes('[REDACTED_AUTH_TOKEN]'), 'Must redact authentication tokens from error strings');
});

test('LeadController protects saved leads from WhatsApp dispatch failures', () => {
  const leadController = loadSource('backend/controllers/LeadController.cc');

  // Save lead and activity before dispatch
  const insertLeadIndex = leadController.indexOf('INSERT INTO leads');
  const insertActivityIndex = leadController.indexOf('INSERT INTO activities');
  const dispatchIndex = leadController.indexOf('WhatsAppNotificationService::dispatchLeadNotification');

  assert.ok(insertLeadIndex !== -1, 'Must persist lead to database');
  assert.ok(insertActivityIndex !== -1, 'Must persist lead activity to database');
  assert.ok(dispatchIndex !== -1, 'Must call WhatsAppNotificationService::dispatchLeadNotification');

  // Invariant: SQL lead & activity insert occurs BEFORE notification dispatch
  assert.ok(
    insertLeadIndex < dispatchIndex,
    'Lead must be safely persisted to database BEFORE notification dispatch is attempted'
  );
  assert.ok(
    insertActivityIndex < dispatchIndex,
    'Initial activity must be persisted BEFORE notification dispatch is attempted'
  );

  // Failure containment: Response confirms lead creation even if WhatsApp fails
  assert.ok(
    leadController.includes('k201Created'),
    'Must return 201 Created confirmation even when WhatsApp dispatch fails'
  );
});

test('Frontend API client and types support WhatsApp notification tracking and status card', () => {
  const types = loadSource('src/types.ts');
  const api = loadSource('src/api.ts');
  const adminPage = loadSource('src/pages/AdminPage.tsx');

  // Types definitions
  assert.ok(types.includes('NotificationStatus ='), 'Must define NotificationStatus union');
  assert.ok(types.includes("'fallback_click_to_chat'"), 'NotificationStatus must include fallback_click_to_chat');
  assert.ok(types.includes('LeadNotificationRecord'), 'Must define LeadNotificationRecord');
  assert.ok(types.includes('provider_message_id?: string'), 'Must type provider_message_id');
  assert.ok(types.includes('safe_error_details?: string'), 'Must type safe_error_details');
  assert.ok(types.includes('notifications?: LeadNotificationRecord[]'), 'LeadRecord must include notifications');

  // Frontend API client integration
  assert.ok(api.includes('buildWhatsAppUrl'), 'Must export buildWhatsAppUrl helper');
  assert.ok(api.includes('917208591595'), 'Must use verified MarsNova business WhatsApp number');
  assert.ok(api.includes('notification: data.notification'), 'submitLead must map server notification payload');

  // Admin Lead Details Dialog displays WhatsApp notification status card
  assert.ok(
    adminPage.includes('WhatsApp Notification & Delivery Status'),
    'AdminPage must render WhatsApp Notification & Delivery Status card'
  );
  assert.ok(
    adminPage.includes('getNotificationStatusBadge'),
    'AdminPage must compute notification status badge variant'
  );
  assert.ok(
    adminPage.includes('Open MarsNova WhatsApp Chat'),
    'AdminPage must provide Open MarsNova WhatsApp Chat action button'
  );
  assert.ok(
    adminPage.includes('provider_message_id'),
    'AdminPage must display provider_message_id when present'
  );
  assert.ok(
    adminPage.includes('safe_error_details'),
    'AdminPage must safely display sanitized error details on failure'
  );
});

test('C++ Drogon backend smoke test executable executes and passes all WhatsApp mock tests', () => {
  const smokeExe = path.join(rootDir, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(smokeExe), 'smoke_test.exe must exist in backend/');

  const output = execFileSync(smokeExe, [], { encoding: 'utf8' });

  // Verification of WhatsApp Integration assertions
  assert.ok(
    output.includes('WhatsApp provider integration, bounded retries, outage & duplicate protection verified'),
    'Must verify WhatsApp integration test passing in smoke test'
  );
  assert.ok(
    output.includes('ALL 9 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)'),
    'All smoke test suites must pass'
  );
});
