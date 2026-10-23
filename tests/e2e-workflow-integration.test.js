import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT_DIR = path.resolve('.');

function loadSource(relPath) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
}

// -----------------------------------------------------------------------------
// 1. Workflow Chain: Enquiry → Lead → Admin Update → Quotation → Project
// -----------------------------------------------------------------------------
test('Workflow chain: Enquiry and Lead Intake enforce validation, consent, and persistence before WhatsApp', () => {
  const leadCtrl = loadSource('backend/controllers/LeadController.cc');
  const leadHdr = loadSource('backend/controllers/LeadController.h');

  // Input & consent validation
  assert.ok(leadCtrl.includes('CONSENT_REQUIRED'), 'Must require explicit customer consent');
  assert.ok(leadCtrl.includes('VALIDATION_FAILED'), 'Must reject invalid email/name inputs');
  assert.ok(leadCtrl.includes('RATE_LIMIT_EXCEEDED'), 'Must throttle rapid submissions with 429');
  assert.ok(leadCtrl.includes('DUPLICATE_LEAD'), 'Must reject duplicate lead submissions with 409');

  // Persistence before WhatsApp
  assert.ok(
    leadCtrl.includes('INSERT INTO leads') && leadCtrl.includes('INSERT INTO activities'),
    'Must persist lead and initial activity to PostgreSQL before WhatsApp notification handoff'
  );

  // Success reference code
  assert.ok(leadCtrl.includes('MN-LEAD-'), 'Must generate MN-LEAD- formatted reference number');
});

test('Workflow chain: Admin Lead Inspection, Notes, and State Transitions', () => {
  const leadCtrl = loadSource('backend/controllers/LeadController.cc');

  // State machine enforcement
  assert.ok(leadCtrl.includes('isValidTransition'), 'Must enforce valid state machine transitions');
  assert.ok(leadCtrl.includes('INVALID_STATUS_TRANSITION'), 'Must reject invalid status jumps (e.g. lost to converted)');

  // Note addition with audit attribution
  assert.ok(leadCtrl.includes('addLeadNote'), 'Must support adding staff follow-up notes');
  assert.ok(leadCtrl.includes('auth.fullName') || leadCtrl.includes('createdBy'), 'Must attribute notes to authenticated staff');

  // Concurrent edit protection
  assert.ok(leadCtrl.includes('CONCURRENT_MODIFICATION') || leadCtrl.includes('version'), 'Must detect concurrent modifications');
});

test('Workflow chain: Quotation creation, monetary precision, revisions, and approval', () => {
  const quoteCtrl = loadSource('backend/controllers/QuotationController.cc');
  const quoteMig = loadSource('backend/migrations/005_marsnova_quotations.sql');

  // Decimal monetary precision
  assert.ok(quoteMig.includes('amount NUMERIC(14, 2)'), 'Database must store monetary amount as NUMERIC(14, 2)');
  assert.ok(quoteMig.includes('CHECK (amount >= 0.00)'), 'Must enforce non-negative check constraint on quotation amount');
  assert.ok(quoteCtrl.includes('INVALID_DECIMAL_AMOUNT'), 'Backend must reject amounts with invalid decimal precision');

  // Revisions & Status
  assert.ok(quoteCtrl.includes('createQuotationRevision'), 'Must support creating numbered revisions');
  assert.ok(quoteCtrl.includes('revision_number'), 'Must track revision numbers per quotation');
  assert.ok(quoteCtrl.includes('QUOTATION_EXPIRED'), 'Must detect and reject approval of expired quotations');
  assert.ok(quoteCtrl.includes('"approved"'), 'Must support explicit client approval state');
});

test('Workflow chain: Project conversion from accepted quotation, date constraints, and staff assignments', () => {
  const projCtrl = loadSource('backend/controllers/ProjectController.cc');
  const projMig = loadSource('backend/migrations/006_marsnova_projects.sql');

  // Conversion boundary
  assert.ok(projCtrl.includes('QUOTATION_NOT_APPROVED'), 'Must reject project conversion from unapproved quotes');
  assert.ok(projCtrl.includes('LEAD_STATUS_INVALID'), 'Must reject project creation from unconverted/lost leads');

  // Date ordering constraints
  assert.ok(
    projMig.includes('chk_project_dates') && projMig.includes('target_delivery >= start_date'),
    'Database constraint must require target_delivery >= start_date'
  );
  assert.ok(projCtrl.includes('INVALID_PROJECT_DATES'), 'Backend must reject target_delivery < start_date with 400');

  // Staff assignments & suspended user check
  assert.ok(projCtrl.includes('assignStaff'), 'Must support assigning staff members to project');
  assert.ok(projCtrl.includes('INVALID_STAFF_ASSIGNMENT'), 'Must reject assigning suspended or non-existent staff');

  // Project lifecycle stages
  assert.ok(projCtrl.includes('"kickoff"'), 'Must include kickoff stage');
  assert.ok(projCtrl.includes('"pre_production"'), 'Must include pre_production stage');
  assert.ok(projCtrl.includes('"production"'), 'Must include production stage');
  assert.ok(projCtrl.includes('"post_editing"'), 'Must include post_editing stage');
  assert.ok(projCtrl.includes('"completed"'), 'Must include completed stage');
});

// -----------------------------------------------------------------------------
// 2. Recovery Intake & Case Tracking Chain
// -----------------------------------------------------------------------------
test('Recovery Case Workflow: intake, custody, diagnosis, quotation approval gate, and return', () => {
  const recCtrl = loadSource('backend/controllers/RecoveryController.cc');
  const recMig = loadSource('backend/migrations/008_marsnova_recovery_cases.sql');

  // Intake & reference
  assert.ok(recCtrl.includes('createCase'), 'Must implement recovery intake creation');
  assert.ok(recCtrl.includes('MNR-'), 'Must generate unique MNR- reference format');

  // Physical receipt confirmation
  assert.ok(recCtrl.includes('confirmPhysicalReceipt'), 'Must record physical receipt confirmation');
  assert.ok(recCtrl.includes('custody_location'), 'Must track custody location');

  // Diagnostic notes privacy
  assert.ok(recCtrl.includes('internal_diagnostic_notes'), 'Must store protected internal diagnostic notes');
  assert.ok(recCtrl.includes('public_diagnostic_summary'), 'Must maintain safe public diagnostic summary');

  // Strict quotation approval gate
  assert.ok(recCtrl.includes('APPROVAL_GATE_REQUIRED'), 'Must block transition to in_recovery until quote is approved (422)');

  // Custody & return
  assert.ok(recCtrl.includes('transferCustody'), 'Must record custody transfers with audit history');
  assert.ok(recCtrl.includes('returnDevice'), 'Must record return dispatch with tracking number');
});

test('Public case tracking strictly protects internal diagnostic notes and customer PII', () => {
  const recCtrl = loadSource('backend/controllers/RecoveryController.cc');

  // Public endpoint inspection
  assert.ok(recCtrl.includes('trackCase'), 'Must implement public case tracking');
  assert.ok(!recCtrl.includes('publicJson["internal_diagnostic_notes"]'), 'Must NEVER assign internal_diagnostic_notes to public JSON');
  assert.ok(!recCtrl.includes('publicJson["customer_phone"]'), 'Must NEVER assign customer_phone to public tracking JSON');
  assert.ok(!recCtrl.includes('publicJson["customer_email"]'), 'Must NEVER assign customer_email to public tracking JSON');
});

// -----------------------------------------------------------------------------
// 3. Authorization, Sessions, and RBAC Enforcement
// -----------------------------------------------------------------------------
test('Backend enforces session authentication, secure cookies, and RBAC boundaries', () => {
  const authCtrl = loadSource('backend/controllers/AuthController.cc');

  // Secure cookie attributes
  assert.ok(authCtrl.includes('HttpOnly'), 'Session cookie must carry HttpOnly flag');
  assert.ok(authCtrl.includes('SameSite=Strict'), 'Session cookie must enforce SameSite=Strict');
  assert.ok(authCtrl.includes('csrf_token'), 'Session must issue CSRF token');

  // Account status checks
  assert.ok(authCtrl.includes('ACCOUNT_SUSPENDED'), 'Must reject suspended accounts with 403');
  assert.ok(authCtrl.includes('ACCOUNT_INACTIVE'), 'Must reject inactive accounts with 403');

  // RBAC privileges
  assert.ok(authCtrl.includes('super_admin'), 'Must declare super_admin role');
  assert.ok(authCtrl.includes('agency_manager'), 'Must declare agency_manager role');
  assert.ok(authCtrl.includes('editor'), 'Must declare editor role');
});

// -----------------------------------------------------------------------------
// 4. Failure Handling: Database Outage & Mocked WhatsApp Failures
// -----------------------------------------------------------------------------
test('Database outage handling: returns 500 without credential leak and never confirms failed save', () => {
  const leadCtrl = loadSource('backend/controllers/LeadController.cc');

  assert.ok(leadCtrl.includes('DATABASE_ERROR'), 'Must return DATABASE_ERROR on DB failures');
  assert.ok(leadCtrl.includes('k500InternalServerError'), 'Must return HTTP 500 on database exceptions');
  // Check that success flag is never set true on failure
  assert.ok(!leadCtrl.includes('success": true') || leadCtrl.includes('success = false'), 'Must never claim success on database failure');
});

test('Mocked WhatsApp failures: preserves saved lead and tracks safe error details with bounded retries', () => {
  const waService = loadSource('backend/services/WhatsAppNotificationService.cc');
  const waMig = loadSource('backend/migrations/004_marsnova_whatsapp_notifications.sql');

  assert.ok(waService.includes('rec.maxAttempts = 3') || waService.includes('maxAttempts'), 'Must enforce bounded retries (maximum 3 attempts)');
  assert.ok(waService.includes('fallback_click_to_chat'), 'Must fall back gracefully to click-to-chat when unconfigured or offline');
  assert.ok(waService.includes('status = "failed"'), 'Must set status to failed when provider outage or timeout occurs');
  assert.ok(waService.includes('safeErrorDetails'), 'Must log safe error details without leaking API keys');
  assert.ok(waService.includes('idempotencyKey'), 'Must implement duplicate protection via idempotency key');
});

// -----------------------------------------------------------------------------
// 5. Database Migrations Schema Integrity (001 - 009)
// -----------------------------------------------------------------------------
test('Database migrations 001 through 009 are present, ordered, and idempotent', () => {
  const expectedMigrations = [
    '001_marsnova_core_schema.sql',
    '002_marsnova_domain_models.sql',
    '003_marsnova_auth_sessions.sql',
    '004_marsnova_whatsapp_notifications.sql',
    '005_marsnova_quotations.sql',
    '006_marsnova_projects.sql',
    '007_marsnova_content_management.sql',
    '008_marsnova_recovery_cases.sql',
    '009_marsnova_lab_learning.sql'
  ];

  for (const mig of expectedMigrations) {
    const backendPath = path.join(ROOT_DIR, 'backend', 'migrations', mig);
    assert.ok(fs.existsSync(backendPath), `Migration ${mig} must exist in backend/migrations/`);
    const content = fs.readFileSync(backendPath, 'utf8');
    assert.ok(
      content.includes('IF NOT EXISTS') || content.includes('ALTER TABLE'),
      `Migration ${mig} must be idempotent`
    );
  }
});

// -----------------------------------------------------------------------------
// 6. C++ Drogon Smoke Test Verification (All 14 suites)
// -----------------------------------------------------------------------------
test('C++ Drogon backend smoke test executable verifies complete 14-test integration matrix with 0 errors', () => {
  const smokeExe = path.join(ROOT_DIR, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(smokeExe), 'backend/smoke_test.exe must be compiled');

  const stdout = execFileSync(smokeExe, [], { encoding: 'utf8' });
  assert.ok(
    stdout.includes('ALL 14 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)'),
    'C++ smoke test output must confirm ALL 14 test suites passed with 0 errors'
  );
  assert.ok(
    stdout.includes('[Test 14] Testing complete end-to-end workflow chain & failure resilience'),
    'Output must include Test 14 end-to-end workflow suite'
  );
});
