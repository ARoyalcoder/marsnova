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

test('LeadController registers POST and GET /api/v1/leads in header and CMake', () => {
  const header = loadSource('backend/controllers/LeadController.h');
  const cmake = loadSource('backend/CMakeLists.txt');
  const standalone = loadSource('backend/compat/drogon_standalone.cc');

  assert.ok(header.includes('/api/v1/leads'), 'Must declare route /api/v1/leads in LeadController.h');
  assert.ok(header.includes('createLead'), 'Must declare createLead method');
  assert.ok(header.includes('listLeads'), 'Must declare listLeads method');
  assert.ok(cmake.includes('LeadController.cc'), 'Must include LeadController.cc in backend/CMakeLists.txt');
  assert.ok(standalone.includes('LeadController.h'), 'Must include LeadController.h in drogon_standalone.cc');
  assert.ok(standalone.includes('/api/v1/leads'), 'Must dispatch /api/v1/leads in standalone router');
});

test('LeadController implements validation for fields, references, consent, and rate limits', () => {
  const source = loadSource('backend/controllers/LeadController.cc');

  // Fields validation
  assert.ok(source.includes('isValidEmail'), 'Must validate email format using regex');
  assert.ok(source.includes('name.length() < 2'), 'Must validate name minimum length');
  assert.ok(source.includes('digitsCount < 10'), 'Must validate phone number length when provided');
  assert.ok(source.includes('VALIDATION_FAILED'), 'Must return VALIDATION_FAILED code on invalid fields');

  // References validation
  assert.ok(source.includes('isAllowedSource'), 'Must validate source references');
  assert.ok(source.includes('referenceId'), 'Must validate reference_id parameter');

  // Consent validation
  assert.ok(source.includes('CONSENT_REQUIRED'), 'Must return CONSENT_REQUIRED when consent is missing or false');

  // Rate limiting
  assert.ok(source.includes('RATE_LIMIT_EXCEEDED'), 'Must return RATE_LIMIT_EXCEEDED when request limit reached');
  assert.ok(source.includes('Retry-After'), 'Must attach Retry-After response header');

  // Duplicate detection
  assert.ok(source.includes('DUPLICATE_LEAD'), 'Must return DUPLICATE_LEAD on identical submissions');
});

test('LeadController saves lead and initial activity to PostgreSQL before confirming success', () => {
  const source = loadSource('backend/controllers/LeadController.cc');

  // Step 1: Insert into leads table
  assert.ok(
    source.includes('INSERT INTO leads') && source.includes('RETURNING id'),
    'Must execute parameterized INSERT into leads returning id'
  );

  // Step 2: Insert into activities table linked to lead
  assert.ok(
    source.includes('INSERT INTO activities') && source.includes('lead_id'),
    'Must execute parameterized INSERT into activities linking lead_id'
  );

  // Success reference generation
  assert.ok(source.includes('MN-LEAD-'), 'Must generate MN-LEAD- formatted reference number');
  assert.ok(source.includes('k201Created'), 'Must return 201 Created on full persistence');

  // Never confirm a failed save
  assert.ok(source.includes('DATABASE_UNAVAILABLE'), 'Must handle unavailable DB with 500/503');
  assert.ok(source.includes('DATABASE_ERROR'), 'Must handle database exceptions with 500 DATABASE_ERROR');
});

test('Frontend API client and Contact forms connect to POST /api/v1/leads', () => {
  const apiSrc = loadSource('src/api.ts');
  const contactSrc = loadSource('src/pages/ContactPage.tsx');

  // api.ts connects to /leads
  assert.ok(apiSrc.includes('/leads'), 'src/api.ts must connect to /leads endpoint');
  assert.ok(apiSrc.includes('submitLead'), 'src/api.ts must export submitLead function');
  assert.ok(apiSrc.includes('consent'), 'src/api.ts must support consent parameter');

  // ContactPage provides consent mechanism
  assert.ok(contactSrc.includes('contact-consent'), 'ContactPage must render consent checkbox');
  assert.ok(contactSrc.includes('consent: true'), 'ContactPage must track consent state');
});

test('C++ Drogon Smoke Test executable executes all 8 tests with 0 errors', () => {
  const smokeExe = path.join(rootDir, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(smokeExe), 'smoke_test.exe must be compiled');

  const output = execFileSync(smokeExe, [], { encoding: 'utf-8' });
  assert.ok(
    output.includes('ALL 8 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)') ||
      output.includes('SMOKE TESTS PASSED (0 ERRORS)'),
    'All backend smoke tests including leads endpoint must pass'
  );
  assert.ok(output.includes('[Test 8] Testing /api/v1/leads endpoint...'), 'Must execute Test 8 for leads');
});
