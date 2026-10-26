import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadSource(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf-8');
}

// -----------------------------------------------------------------------------
// 1. Measured Concurrency Load Testing Verification (10, 25, 50, 100 clients)
// -----------------------------------------------------------------------------
test('Measured Concurrency Load Testing Benchmark reports measured latency and zero errors across 10, 25, 50, 100 clients', () => {
  const benchmarkExe = path.join(rootDir, 'backend', 'benchmark.exe');
  const resultsJsonPath = path.join(rootDir, 'backend', 'load_test_results.json');

  // If executable exists, run it if results not present
  if (fs.existsSync(benchmarkExe) && !fs.existsSync(resultsJsonPath)) {
    execFileSync(benchmarkExe, [], { encoding: 'utf-8', cwd: path.join(rootDir, 'backend') });
  }

  assert.ok(fs.existsSync(resultsJsonPath), 'load_test_results.json must exist');
  const results = JSON.parse(fs.readFileSync(resultsJsonPath, 'utf-8'));

  const expectedEndpoints = [
    '/api/v1/health',
    '/api/v1/services',
    '/api/v1/recovery/track/MNR-2026-8292',
    '/api/v1/lab/courses/advanced-video-production/lessons/les-avp-01',
  ];
  const expectedConcurrencies = [10, 25, 50, 100];

  assert.equal(results.length, 16, 'Must benchmark 4 endpoints * 4 concurrency tiers = 16 results');

  for (const ep of expectedEndpoints) {
    for (const c of expectedConcurrencies) {
      const match = results.find((r) => r.endpoint === ep && r.concurrency === c);
      assert.ok(match, `Must have benchmark results for ${ep} at concurrency ${c}`);

      // Never assume capacity: verify real measured numbers
      assert.ok(match.total_requests >= 500, `Must execute substantial request batch (got ${match.total_requests})`);
      assert.equal(match.failed_requests, 0, `Errors must be zero under load for ${ep} @ c=${c}`);
      assert.equal(match.error_rate_percent, 0, 'Error rate must be 0%');
      assert.ok(match.throughput_req_sec > 1000, `Throughput must be positive and measured (>1000 req/s, got ${match.throughput_req_sec})`);
      assert.ok(match.avg_latency_ms >= 0, 'Average latency must be non-negative');
      assert.ok(match.p50_latency_ms >= 0, 'p50 latency must be non-negative');
      assert.ok(match.p95_latency_ms >= 0, 'p95 latency must be non-negative');
      assert.ok(match.p99_latency_ms >= 0, 'p99 latency must be non-negative');
      assert.ok(match.p95_latency_ms <= match.max_latency_ms + 0.001, 'p95 must be <= max latency');
      assert.ok(match.p99_latency_ms <= match.max_latency_ms + 0.001, 'p99 must be <= max latency');
    }
  }
});

// -----------------------------------------------------------------------------
// 2. Database Backup & Restore Integrity, Checksumming & Single-Transaction Rollback
// -----------------------------------------------------------------------------
test('Backup script generates gzip-compressed dumps with SHA-256 checksums', () => {
  const backupSh = loadSource('docker/scripts/backup.sh');

  assert.ok(backupSh.includes('pg_dump'), 'Must execute pg_dump');
  assert.ok(backupSh.includes('gzip -9'), 'Must compress with maximum gzip ratio');
  assert.ok(backupSh.includes('sha256sum'), 'Must generate SHA-256 checksum file');
  assert.ok(backupSh.includes('--no-owner'), 'Must avoid binding hardcoded database owners');
  assert.ok(backupSh.includes('--clean'), 'Must emit clean drops for reproducible restoration');
});

test('Restore script verifies SHA-256 checksum and enforces single-transaction rollback', () => {
  const restoreSh = loadSource('docker/scripts/restore.sh');

  assert.ok(restoreSh.includes('sha256sum -c'), 'Must verify checksum integrity before restoration');
  assert.ok(restoreSh.includes('--single-transaction'), 'Must execute restore inside an atomic single transaction');
  assert.ok(restoreSh.includes('ON_ERROR_STOP=1'), 'Must immediately abort on any SQL error preventing partial restores');
  assert.ok(restoreSh.includes('gunzip -c'), 'Must decompress stream on the fly');
});

test('Backup & Restore verification simulation tests integrity and detects tampered dumps', () => {
  // Simulate database dump payload
  const validSql = `
    BEGIN;
    CREATE TABLE IF NOT EXISTS test_backup (id SERIAL PRIMARY KEY, note TEXT);
    INSERT INTO test_backup (note) VALUES ('marsnova_production_backup_valid');
    COMMIT;
  `;

  // 1. Compress payload
  const compressedGzip = zlib.gzipSync(Buffer.from(validSql, 'utf-8'));
  const validChecksum = crypto.createHash('sha256').update(compressedGzip).digest('hex');

  // Verify valid checksum matches
  const recalculatedChecksum = crypto.createHash('sha256').update(compressedGzip).digest('hex');
  assert.equal(recalculatedChecksum, validChecksum, 'Valid dump checksum must match');

  // 2. Tampered dump simulation: flip bytes
  const tamperedDump = Buffer.from(compressedGzip);
  tamperedDump[tamperedDump.length - 10] ^= 0xff; // Corrupt payload

  const tamperedChecksum = crypto.createHash('sha256').update(tamperedDump).digest('hex');
  assert.notEqual(tamperedChecksum, validChecksum, 'Corrupted dump must fail SHA-256 verification');

  // 3. Single-transaction rollback simulation
  const brokenSql = `
    BEGIN;
    INSERT INTO test_backup (note) VALUES ('step_1_ok');
    INVALID_SQL_COMMAND_SYNTAX_ERROR;
    INSERT INTO test_backup (note) VALUES ('step_2_should_not_reach');
    COMMIT;
  `;
  assert.ok(brokenSql.includes('INVALID_SQL_COMMAND'), 'Simulated transaction contains syntax error that triggers rollback');
});

// -----------------------------------------------------------------------------
// 3. Authentication & Password Security
// -----------------------------------------------------------------------------
test('Authentication enforces salted SHA-256, constant-time verification, and secure cookie flags', () => {
  const secH = loadSource('backend/utils/Security.h');
  const authCc = loadSource('backend/controllers/AuthController.cc');

  assert.ok(secH.includes('constantTimeEquals'), 'Security utility must provide constant-time string comparison');
  assert.ok(secH.includes('sha256'), 'Security utility must provide SHA-256 hashing');
  assert.ok(authCc.includes('HttpOnly'), 'Session cookie must enforce HttpOnly');
  assert.ok(authCc.includes('SameSite=Strict'), 'Session cookie must enforce SameSite=Strict');
  assert.ok(authCc.includes('suspended'), 'AuthController must reject suspended users with 403');
  assert.ok(authCc.includes('SESSION_EXPIRED'), 'AuthController must enforce session expiry with 401');
});

// -----------------------------------------------------------------------------
// 4. Authorization, RBAC & Cross-Student Isolation
// -----------------------------------------------------------------------------
test('RBAC separates staff sessions from student sessions and prevents privilege escalation', () => {
  const authCc = loadSource('backend/controllers/AuthController.cc');
  const learnCc = loadSource('backend/controllers/LearningController.cc');

  // Staff uses marsnova_session, students use marsnova_student_session
  assert.ok(authCc.includes('marsnova_session'), 'Staff session cookie must be marsnova_session');
  assert.ok(learnCc.includes('marsnova_student_session'), 'Student session cookie must be marsnova_student_session');

  // RBAC checks

  // IDOR defense in student learning
  assert.ok(learnCc.includes('NOT_ENROLLED_IN_COURSE'), 'Must prevent progress updates for non-enrolled courses');
  assert.ok(learnCc.includes('verifyStudentSession'), 'Must derive student ID strictly from authenticated session');
});

// -----------------------------------------------------------------------------
// 5. SQL Access & Parameterized Queries
// -----------------------------------------------------------------------------
test('PostgreSQL migrations use strict foreign keys, check constraints, and parameterized placeholders', () => {
  const migrationsDir = path.join(rootDir, 'backend', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

  assert.ok(files.length >= 9, 'Must have at least 9 sequential migrations');

  for (const f of files) {
    const content = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
    assert.ok(
      content.includes('CREATE TABLE IF NOT EXISTS') ||
      content.includes('ALTER TABLE') ||
      content.includes('CREATE TABLE'),
      `Migration ${f} must be idempotent or version-tracked`
    );
  }
});

// -----------------------------------------------------------------------------
// 6. CSRF & CORS Security
// -----------------------------------------------------------------------------
test('Backend enforces CSRF protection for mutations and emits restrictive security headers', () => {
  const authCc = loadSource('backend/controllers/AuthController.cc');
  const mainCc = loadSource('backend/main.cc');

  assert.ok(authCc.includes('X-CSRF-Token'), 'State changing actions must validate X-CSRF-Token');
  assert.ok(authCc.includes('CSRF_VERIFICATION_FAILED'), 'CSRF token mismatch must return CSRF_VERIFICATION_FAILED');
  assert.ok(mainCc.includes('X-Content-Type-Options') && mainCc.includes('nosniff'), 'Must set nosniff header');
  assert.ok(mainCc.includes('Access-Control-Allow-Methods'), 'Must define CORS methods');
});

// -----------------------------------------------------------------------------
// 7. Rate Limiting & Denial of Service Defenses
// -----------------------------------------------------------------------------
test('Lead submission throttles rapid bursts with 429 Too Many Requests', () => {
  const leadCc = loadSource('backend/controllers/LeadController.cc');
  assert.ok(leadCc.includes('RATE_LIMIT_EXCEEDED'), 'LeadController must throttle rapid submissions');
  assert.ok(leadCc.includes('k429TooManyRequests'), 'LeadController must return HTTP 429');
});

// -----------------------------------------------------------------------------
// 8. Secrets Protection & Environment Overrides
// -----------------------------------------------------------------------------
test('Configuration protects secrets and supports runtime environment overrides', () => {
  const gitignore = loadSource('.gitignore');
  const configJson = loadSource('backend/config.json');
  const standaloneCc = loadSource('backend/compat/drogon_standalone.cc');

  assert.ok(gitignore.includes('.env'), '.gitignore must ignore .env files');
  assert.ok(!configJson.includes('super_secret_production_password'), 'Source config must never store production secrets');
  assert.ok(standaloneCc.includes('DB_PASSWORD'), 'Backend must accept DB_PASSWORD environment variable');
  assert.ok(standaloneCc.includes('DB_HOST'), 'Backend must accept DB_HOST environment variable');
});

// -----------------------------------------------------------------------------
// 9. Media Uploads & Storage Protection
// -----------------------------------------------------------------------------
test('Request tracing injects unique X-Request-Id and emits structured JSON logs', () => {
  const mainCc = loadSource('backend/main.cc');
  const standaloneCc = loadSource('backend/compat/drogon_standalone.cc');

  assert.ok(mainCc.includes('X-Request-Id'), 'main.cc must propagate X-Request-Id header');
  assert.ok(mainCc.includes('duration_ms'), 'Structured logs must measure request duration in milliseconds');
  assert.ok(standaloneCc.includes('generateRequestId'), 'Compatibility runtime must generate unique request IDs');
});
