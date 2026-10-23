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

test('Migration 005 adds manual quotations with decimal precision, validity, revisions, and status workflow', () => {
  const backendMigration = loadSource('backend/migrations/005_marsnova_quotations.sql');
  const supabaseMigration = loadSource('supabase/migrations/202610230005_marsnova_quotations.sql');

  // Verify backend and Supabase migrations mirror each other
  assert.equal(
    backendMigration.trim(),
    supabaseMigration.trim(),
    'Backend and Supabase Quotations migrations must match'
  );

  // Alter table quotations columns
  assert.ok(backendMigration.includes('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS reference VARCHAR(64);'), 'Must add reference column');
  assert.ok(backendMigration.includes('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS scope TEXT;'), 'Must add scope column');
  assert.ok(backendMigration.includes('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS amount NUMERIC(14, 2)'), 'Must add decimal monetary storage');
  assert.ok(backendMigration.includes('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency VARCHAR(3)'), 'Must add currency column');
  assert.ok(backendMigration.includes('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms TEXT;'), 'Must add terms column');
  assert.ok(backendMigration.includes('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS revision_number INTEGER'), 'Must add revision_number column');
  assert.ok(backendMigration.includes('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);'), 'Must add idempotency_key column');

  // Monetary precision constraint
  assert.ok(backendMigration.includes('CHECK (amount >= 0.00)'), 'Must enforce non-negative monetary amounts');

  // Status check constraint
  assert.ok(backendMigration.includes("'draft'"), 'Must allow draft status');
  assert.ok(backendMigration.includes("'sent'"), 'Must allow sent status');
  assert.ok(backendMigration.includes("'approved'"), 'Must allow approved status');
  assert.ok(backendMigration.includes("'rejected'"), 'Must allow rejected status');
  assert.ok(backendMigration.includes("'expired'"), 'Must allow expired status');
  assert.ok(backendMigration.includes("'cancelled'"), 'Must allow cancelled status');

  // Revisions history table
  assert.ok(backendMigration.includes('CREATE TABLE IF NOT EXISTS quotation_revisions'), 'Must create quotation_revisions table');
  assert.ok(backendMigration.includes('REFERENCES quotations(id) ON DELETE CASCADE'), 'Must cascade delete revisions on quote deletion');
  assert.ok(backendMigration.includes('uq_quotation_revision UNIQUE (quotation_id, revision_number)'), 'Must enforce unique revision number per quote');

  // Idempotency and reference indexes
  assert.ok(backendMigration.includes('idx_quotations_reference'), 'Must index unique reference');
  assert.ok(backendMigration.includes('idx_quotations_idempotency'), 'Must index unique idempotency key');
  assert.ok(backendMigration.includes("VALUES ('005',"), 'Must record migration 005 in schema_migrations');
});

test('QuotationController registers manual quote routes and enforces record-only studio boundaries', () => {
  const header = loadSource('backend/controllers/QuotationController.h');
  const source = loadSource('backend/controllers/QuotationController.cc');
  const cmake = loadSource('backend/CMakeLists.txt');
  const standalone = loadSource('backend/compat/drogon_standalone.cc');

  // CMake and routing registration
  assert.ok(cmake.includes('controllers/QuotationController.cc'), 'Must include QuotationController.cc in CMakeLists.txt');
  assert.ok(standalone.includes('QuotationController.h'), 'Must include QuotationController.h in standalone router');
  assert.ok(standalone.includes('/api/v1/quotations'), 'Must dispatch /api/v1/quotations in standalone router');

  // Route declarations
  assert.ok(header.includes('createQuotation'), 'Must declare createQuotation method');
  assert.ok(header.includes('listQuotations'), 'Must declare listQuotations method');
  assert.ok(header.includes('getQuotationDetails'), 'Must declare getQuotationDetails method');
  assert.ok(header.includes('updateQuotationStatus'), 'Must declare updateQuotationStatus method');
  assert.ok(header.includes('createQuotationRevision'), 'Must declare createQuotationRevision method');

  // Record-only invariant: no payment gateways, checkout, webhooks, or commissions
  assert.ok(source.includes('is_record_only'), 'Must explicitly flag quotations as records only');
  assert.ok(!source.includes('stripe_payment_intent'), 'Must not integrate payment gateway');
  assert.ok(!source.includes('webhook_secret'), 'Must not have payment webhooks');
  assert.ok(!source.includes('sales_commission'), 'Must not calculate commissions');
});

test('QuotationController enforces monetary decimal precision, state transitions, expiry, and RBAC', () => {
  const source = loadSource('backend/controllers/QuotationController.cc');

  // Monetary decimal precision
  assert.ok(source.includes('parseDecimalAmount'), 'Must parse and validate decimal monetary amounts');
  assert.ok(source.includes('INVALID_DECIMAL_AMOUNT'), 'Must return INVALID_DECIMAL_AMOUNT on non-conforming precision');

  // Expiry check
  assert.ok(source.includes('isDatePassed'), 'Must check if validity date is in past');
  assert.ok(source.includes('QUOTATION_EXPIRED'), 'Must return QUOTATION_EXPIRED on approving expired quotes');

  // State machine transitions
  assert.ok(source.includes('isTransitionAllowed'), 'Must implement state machine transition validator');
  assert.ok(source.includes('INVALID_STATUS_TRANSITION'), 'Must return INVALID_STATUS_TRANSITION on invalid jump');

  // Duplicate request / Idempotency protection
  assert.ok(source.includes('s_idempotencyToId'), 'Must store and lookup idempotency keys');
  assert.ok(source.includes('DUPLICATE_QUOTATION'), 'Must return DUPLICATE_QUOTATION on duplicate reference or key');

  // RBAC permission checks: editor role has read-only access
  assert.ok(source.includes('auth.role == "editor"'), 'Must check editor role');
  assert.ok(source.includes('INSUFFICIENT_PERMISSIONS'), 'Must return INSUFFICIENT_PERMISSIONS when editor attempts mutation');

  // Revisions management
  assert.ok(source.includes('q->revisionNumber += 1'), 'Must increment revision number');
  assert.ok(source.includes('q->status = "draft"'), 'Must revert status to draft upon issuing new revision');
});

test('Frontend API client and AdminPage integrate manual quotations and revisions management', () => {
  const types = loadSource('src/types.ts');
  const api = loadSource('src/api.ts');
  const adminPage = loadSource('src/pages/AdminPage.tsx');

  // Types definitions
  assert.ok(types.includes('QuotationStatus ='), 'Must define QuotationStatus type union');
  assert.ok(types.includes('QuotationRecord'), 'Must define QuotationRecord interface');
  assert.ok(types.includes('QuotationRevision'), 'Must define QuotationRevision interface');
  assert.ok(types.includes('CreateQuotationPayload'), 'Must define CreateQuotationPayload');
  assert.ok(types.includes('CreateRevisionPayload'), 'Must define CreateRevisionPayload');

  // API methods
  assert.ok(api.includes('export async function fetchQuotationsPaged'), 'Must export fetchQuotationsPaged');
  assert.ok(api.includes('export async function getQuotationDetails'), 'Must export getQuotationDetails');
  assert.ok(api.includes('export async function createQuotation'), 'Must export createQuotation');
  assert.ok(api.includes('export async function updateQuotationStatus'), 'Must export updateQuotationStatus');
  assert.ok(api.includes('export async function createQuotationRevision'), 'Must export createQuotationRevision');

  // Admin UI integration
  assert.ok(adminPage.includes('Issued Quotations Register'), 'AdminPage must display quotations register table');
  assert.ok(adminPage.includes('Create Manual Quotation'), 'AdminPage must provide quotation creation form');
  assert.ok(adminPage.includes('Quotation Details & Revisions Dialog'), 'AdminPage must render quotation details dialog');
  assert.ok(adminPage.includes('getQuotationStatusBadgeVariant'), 'AdminPage must compute quotation status badge variant');
  assert.ok(adminPage.includes('getAllowedQuotationTransitions'), 'AdminPage must compute allowed quotation transitions');
  assert.ok(adminPage.includes('Quotation Expired'), 'AdminPage must surface expired quotation alert');
  assert.ok(adminPage.includes('Quotation Creation Restricted'), 'AdminPage must inform editor of read-only access');
});

test('C++ Drogon backend smoke test executable executes and passes all quotation integration tests', () => {
  const smokeExe = path.join(rootDir, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(smokeExe), 'smoke_test.exe must exist in backend/');

  const output = execFileSync(smokeExe, [], { encoding: 'utf8' });

  // Verification of Test 10 subtests in smoke_test.cc
  assert.ok(output.includes('Testing manual quotations, decimal precision, expiry, transitions & RBAC'), 'Test 10 must run');
  assert.ok(output.includes('Monetary decimal precision verified (45000.00) with record-only schema'), 'Precision subtest must pass');
  assert.ok(output.includes('Fractional monetary decimal precision verified (125000.50)'), 'Fractional precision must pass');
  assert.ok(output.includes('Rejects non-conforming decimal amounts (> 2 decimal places)'), 'Precision validation must pass');
  assert.ok(output.includes('Rejects duplicate quotation reference with 409 Conflict'), 'Duplicate reference check must pass');
  assert.ok(output.includes('Duplicate requests protected via idempotency key'), 'Idempotency check must pass');
  assert.ok(output.includes('Expiry detected; approval of expired quotes strictly blocked'), 'Expiry check must pass');
  assert.ok(output.includes('State machine strictly enforces valid transitions & terminal cancelled state'), 'Transition check must pass');
  assert.ok(output.includes('Revision incremented to version 2 with scope, pricing & audit history'), 'Revision check must pass');
  assert.ok(output.includes('RBAC enforced: editor has read-only access; mutations strictly forbidden (403)'), 'RBAC check must pass');
  assert.ok(output.includes('ALL 10 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)'), 'All 10 smoke test suites must pass');
});
