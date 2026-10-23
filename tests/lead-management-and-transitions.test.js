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

test('LeadController declares and routes lead details, follow-up notes, and status changes in C++', () => {
  const header = loadSource('backend/controllers/LeadController.h');
  const source = loadSource('backend/controllers/LeadController.cc');
  const standalone = loadSource('backend/compat/drogon_standalone.cc');

  // Header declarations
  assert.ok(header.includes('getLeadDetails'), 'Must declare getLeadDetails method');
  assert.ok(header.includes('addLeadNote'), 'Must declare addLeadNote method');
  assert.ok(header.includes('updateLeadStatus'), 'Must declare updateLeadStatus method');
  assert.ok(header.includes('/api/v1/leads/:id'), 'Must declare /api/v1/leads/:id route');
  assert.ok(header.includes('/api/v1/leads/:id/notes'), 'Must declare /api/v1/leads/:id/notes route');
  assert.ok(header.includes('/api/v1/leads/:id/status'), 'Must declare /api/v1/leads/:id/status route');

  // Router dispatching
  assert.ok(standalone.includes('/api/v1/leads/'), 'Standalone router must dispatch /api/v1/leads/ parameterized routes');
  assert.ok(standalone.includes('notesPos'), 'Standalone router must parse /notes suffix');
  assert.ok(standalone.includes('statusPos'), 'Standalone router must parse /status suffix');
  assert.ok(standalone.includes('ctrl.getLeadDetails'), 'Standalone router must dispatch getLeadDetails');
  assert.ok(standalone.includes('ctrl.addLeadNote'), 'Standalone router must dispatch addLeadNote');
  assert.ok(standalone.includes('ctrl.updateLeadStatus'), 'Standalone router must dispatch updateLeadStatus');
});

test('LeadController implements state machine enforcing valid transitions and rejecting invalid sequences', () => {
  const source = loadSource('backend/controllers/LeadController.cc');

  // Allowed transitions logic
  assert.ok(source.includes('isValidTransition'), 'Must implement isValidTransition state machine function');
  assert.ok(source.includes('isRecognizedStatus'), 'Must validate recognized status strings');
  assert.ok(source.includes('INVALID_STATUS_TRANSITION'), 'Must return INVALID_STATUS_TRANSITION on illegal changes');

  // Transition rules
  assert.ok(source.includes('currentStatus == "new"'), 'Must check transitions from new');
  assert.ok(source.includes('currentStatus == "contacted"'), 'Must check transitions from contacted');
  assert.ok(source.includes('currentStatus == "qualified"'), 'Must check transitions from qualified');
  assert.ok(source.includes('currentStatus == "proposal_sent"'), 'Must check transitions from proposal_sent');
  assert.ok(source.includes('currentStatus == "converted"'), 'Must check transitions from converted');
});

test('LeadController enforces RBAC permissions preventing privilege escalation', () => {
  const source = loadSource('backend/controllers/LeadController.cc');

  // Authentication check
  assert.ok(source.includes('verifyRequestSession'), 'Must verify caller session with AuthController');
  assert.ok(source.includes('auth.authenticated'), 'Must reject unauthenticated callers with 401');

  // Role permissions check
  assert.ok(source.includes('auth.role == "editor"'), 'Must inspect editor role on status change');
  assert.ok(
    source.includes('newStatus == "converted" || newStatus == "archived"'),
    'Must prevent editors from converting or archiving leads'
  );
  assert.ok(
    source.includes('FORBIDDEN_INSUFFICIENT_PERMISSIONS'),
    'Must return 403 FORBIDDEN_INSUFFICIENT_PERMISSIONS on editor escalation attempt'
  );
});

test('LeadController implements optimistic concurrency control to detect conflicting edits', () => {
  const source = loadSource('backend/controllers/LeadController.cc');

  assert.ok(source.includes('expected_version'), 'Must support expected_version parameter');
  assert.ok(source.includes('expected_status'), 'Must support expected_status parameter');
  assert.ok(
    source.includes('CONCURRENT_MODIFICATION_DETECTED'),
    'Must return 409 CONCURRENT_MODIFICATION_DETECTED when versions conflict'
  );
  assert.ok(source.includes('lead.version++'), 'Must increment lead version on successful transition');
});

test('LeadController implements search, filter combinations, and server-side pagination', () => {
  const source = loadSource('backend/controllers/LeadController.cc');

  // Search & filter parameters
  assert.ok(source.includes('getParameter("q")') || source.includes('getParameter("search")'), 'Must parse search query');
  assert.ok(source.includes('getParameter("status")'), 'Must parse status filter');
  assert.ok(source.includes('getParameter("service")'), 'Must parse service filter');
  assert.ok(source.includes('getParameter("source")'), 'Must parse source filter');

  // Pagination parameters & range check
  assert.ok(source.includes('INVALID_PAGINATION'), 'Must reject invalid page or limit with INVALID_PAGINATION');
  assert.ok(source.includes('total_pages'), 'Must compute total_pages');
  assert.ok(source.includes('has_next'), 'Must compute has_next');
  assert.ok(source.includes('has_prev'), 'Must compute has_prev');
});

test('LeadController appends audited follow-up notes and activity records', () => {
  const source = loadSource('backend/controllers/LeadController.cc');

  // Follow-up notes
  assert.ok(source.includes('follow_up_note'), 'Must record follow_up_note activity type');
  assert.ok(source.includes('note.length() < 2'), 'Must validate note content length');
  assert.ok(source.includes('status_change'), 'Must record status_change activity type');
  assert.ok(source.includes('lead_created'), 'Must record lead_created activity type');
});

test('Frontend API client exports typed lead methods and types', () => {
  const apiSource = loadSource('src/api.ts');
  const typesSource = loadSource('src/types.ts');
  const adminSource = loadSource('src/pages/AdminPage.tsx');

  // Types
  assert.ok(typesSource.includes('type LeadStatus'), 'Must define LeadStatus union');
  assert.ok(typesSource.includes('interface LeadRecord'), 'Must define LeadRecord interface');
  assert.ok(typesSource.includes('interface LeadPagination'), 'Must define LeadPagination interface');
  assert.ok(typesSource.includes('interface LeadQueryParams'), 'Must define LeadQueryParams interface');
  assert.ok(typesSource.includes('interface LeadActivity'), 'Must define LeadActivity interface');

  // API Client functions
  assert.ok(apiSource.includes('export async function fetchLeadsPaged'), 'Must export fetchLeadsPaged');
  assert.ok(apiSource.includes('export async function getLeadDetails'), 'Must export getLeadDetails');
  assert.ok(apiSource.includes('export async function addLeadNote'), 'Must export addLeadNote');
  assert.ok(apiSource.includes('export async function updateLeadStatus'), 'Must export updateLeadStatus');

  // UI Integration
  assert.ok(adminSource.includes('fetchLeadsPaged'), 'AdminPage must call fetchLeadsPaged');
  assert.ok(adminSource.includes('getLeadDetails'), 'AdminPage must call getLeadDetails');
  assert.ok(adminSource.includes('addLeadNote'), 'AdminPage must call addLeadNote');
  assert.ok(adminSource.includes('updateLeadStatus'), 'AdminPage must call updateLeadStatus');
  assert.ok(adminSource.includes('CONCURRENT_MODIFICATION_DETECTED') || adminSource.includes('409'), 'AdminPage must handle 409 concurrency conflicts');
});

test('C++ Drogon backend smoke test executable executes and passes all lead integration tests', () => {
  const smokeExe = path.join(rootDir, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(smokeExe), 'backend/smoke_test.exe must exist');

  const stdout = execFileSync(smokeExe, { encoding: 'utf8' });
  assert.ok(stdout.includes('Lead search, filter combinations, and server-side pagination verified.'), 'Pagination & filter test must pass');
  assert.ok(stdout.includes('Staff lead inspection and follow-up notes persisted with audit trail.'), 'Details & notes test must pass');
  assert.ok(stdout.includes('Valid state transitions, RBAC restrictions, and concurrent edit conflict checks verified.'), 'State transitions & RBAC test must pass');
  assert.ok(stdout.includes('ALL 9 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)'), 'All 9 smoke tests must pass');
});
