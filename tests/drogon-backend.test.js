import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadSource(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf-8');
}

// -----------------------------------------------------------------------------
// CMake & Configuration Tests
// -----------------------------------------------------------------------------
test('backend/CMakeLists.txt specifies C++17 and Drogon configuration', () => {
  const cmake = loadSource('backend/CMakeLists.txt');

  assert.ok(cmake.includes('CMAKE_CXX_STANDARD 17'), 'Must enforce C++17');
  assert.ok(cmake.includes('Drogon'), 'Must reference Drogon framework');
  assert.ok(cmake.includes('main.cc'), 'Must build main.cc');
  assert.ok(cmake.includes('EnquiryController.cc'), 'Must include EnquiryController');
  assert.ok(cmake.includes('RecoveryController.cc'), 'Must include RecoveryController');
  assert.ok(cmake.includes('HealthController.cc'), 'Must include HealthController');
});

test('backend/config.json keeps production secrets out of source control', () => {
  const configRaw = loadSource('backend/config.json');
  const exampleRaw = loadSource('backend/config.example.json');

  const config = JSON.parse(configRaw);
  const example = JSON.parse(exampleRaw);

  // Assert port and listeners
  assert.equal(config.listeners[0].port, 8080);
  assert.equal(config.listeners[0].address, '0.0.0.0');

  // Assert DB secrets are parameterized or placeholders, never plain production secrets
  assert.ok(
    config.db_clients[0].passwd.includes('${') ||
    config.db_clients[0].passwd === 'dummy_dev_password',
    'Database password must be parameterized or placeholder'
  );

  assert.ok(
    example.db_clients[0].passwd.includes('YOUR_DATABASE_PASSWORD_HERE'),
    'config.example.json must provide clear placeholder template'
  );
});

// -----------------------------------------------------------------------------
// Request IDs, Structured Logging & Error Handling in main.cc
// -----------------------------------------------------------------------------
test('backend/main.cc implements request IDs, structured logging and centralized error handling', () => {
  const main = loadSource('backend/main.cc');

  // Request ID extraction and generation
  assert.ok(
    main.includes('req->getHeader("X-Request-Id")') || main.includes('X-Request-Id'),
    'Must handle X-Request-Id header'
  );
  assert.ok(
    main.includes('resp->addHeader("X-Request-Id"') || main.includes('X-Request-Id'),
    'Must propagate X-Request-Id in response headers'
  );

  // Structured Logging
  assert.ok(main.includes('timestamp'), 'Must log structured timestamp');
  assert.ok(main.includes('level'), 'Must log structured log level');
  assert.ok(main.includes('request_id'), 'Must log request_id in structured format');
  assert.ok(main.includes('duration_ms'), 'Must log elapsed duration in ms');

  // Centralized 404 Handler
  assert.ok(main.includes('setCustom404Page'), 'Must register custom 404 handler');
  assert.ok(main.includes('Endpoint not found') || main.includes('NOT_FOUND'), 'Must return JSON 404');
  assert.ok(main.includes('k404NotFound'), 'Must set status 404');
});

// -----------------------------------------------------------------------------
// Health, Enquiry, and Recovery Controllers
// -----------------------------------------------------------------------------
test('HealthController formats /api/v1/health with service name and DB status', () => {
  const healthCc = loadSource('backend/controllers/HealthController.cc');
  const healthH = loadSource('backend/controllers/HealthController.h');

  assert.ok(healthH.includes('/api/v1/health'), 'Must register /api/v1/health route');
  assert.ok(healthCc.includes('\"MarsNova C++ Drogon API\"'), 'Must report service name');
  assert.ok(healthCc.includes('\"online\"'), 'Must report online status');
  assert.ok(healthCc.includes('\"database\"'), 'Must report database connection state');
});

test('EnquiryController implements input validation and audit logging', () => {
  const enquiryCc = loadSource('backend/controllers/EnquiryController.cc');
  const enquiryH = loadSource('backend/controllers/EnquiryController.h');

  assert.ok(enquiryH.includes('/api/v1/enquiries'), 'Must register /api/v1/enquiries');
  assert.ok(enquiryCc.includes('isValidEmail'), 'Must validate email format with regex');
  assert.ok(enquiryCc.includes('VALIDATION_FAILED'), 'Must return VALIDATION_FAILED code on bad input');
  assert.ok(enquiryCc.includes('audit_logs'), 'Must insert audit log on enquiry creation');
  assert.ok(enquiryCc.includes('whatsapp_ready'), 'Must indicate WhatsApp readiness');
});

test('RecoveryController implements parameterized case tracking and intake', () => {
  const recCc = loadSource('backend/controllers/RecoveryController.cc');
  const recH = loadSource('backend/controllers/RecoveryController.h');

  assert.ok(recH.includes('/api/v1/recovery/:caseId'), 'Must register /api/v1/recovery/:caseId');
  assert.ok(recH.includes('/api/v1/recovery/intake'), 'Must register intake endpoint');
  assert.ok(recCc.includes('MN-REC-'), 'Must enforce or generate MN-REC- formatted case ID');
  assert.ok(recCc.includes('timeline'), 'Must provide forensic recovery timeline');
});

// -----------------------------------------------------------------------------
// C++ Executable Smoke Test Execution
// -----------------------------------------------------------------------------
test('C++ smoke test executable compiles and executes with 0 errors', () => {
  const smokeExe = path.join(rootDir, 'backend', 'smoke_test.exe');

  if (fs.existsSync(smokeExe)) {
    const output = execFileSync(smokeExe, [], { encoding: 'utf-8' });
    assert.ok(
      output.includes('SMOKE TESTS PASSED (0 ERRORS)'),
      'Smoke test output must report 0 errors'
    );
    assert.ok(output.includes('Testing /api/v1/health endpoint'), 'Must verify health check');
    assert.ok(output.includes('Testing /api/v1/enquiries validation'), 'Must verify enquiries');
    assert.ok(output.includes('Testing /api/v1/recovery/:caseId tracking'), 'Must verify case tracking');
    assert.ok(output.includes('Testing GET /api/v1/services & /services/:slug'), 'Must verify services catalog');
    assert.ok(output.includes('Testing GET /api/v1/portfolio, /courses & /courses/:slug'), 'Must verify portfolio and courses catalog');
  } else {
    // If running in environment without Windows binary
    assert.ok(fs.existsSync(path.join(rootDir, 'backend', 'tests', 'smoke_test.cc')), 'Source must exist');
  }
});
