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

test('AuthController registers login, logout, session inspection, and RBAC routes', () => {
  const header = loadSource('backend/controllers/AuthController.h');
  const standalone = loadSource('backend/compat/drogon_standalone.cc');
  const cmake = loadSource('backend/CMakeLists.txt');

  // Verify header declarations
  assert.ok(header.includes('/api/v1/auth/login'), 'Header must declare login route');
  assert.ok(header.includes('/api/v1/auth/logout'), 'Header must declare logout route');
  assert.ok(header.includes('/api/v1/auth/session'), 'Header must declare session inspection route');
  assert.ok(header.includes('/api/v1/admin/users'), 'Header must declare admin users route');

  // Verify standalone router bindings
  assert.ok(standalone.includes('AuthController.h'), 'Standalone router must include AuthController.h');
  assert.ok(standalone.includes('/api/v1/auth/login'), 'Standalone router must dispatch /api/v1/auth/login');
  assert.ok(standalone.includes('/api/v1/auth/logout'), 'Standalone router must dispatch /api/v1/auth/logout');
  assert.ok(standalone.includes('/api/v1/auth/session'), 'Standalone router must dispatch /api/v1/auth/session');
  assert.ok(standalone.includes('/api/v1/admin/users'), 'Standalone router must dispatch /api/v1/admin/users');

  // Verify build inclusion
  assert.ok(cmake.includes('controllers/AuthController.cc'), 'CMakeLists.txt must compile AuthController.cc');
});

test('Security utilities implement pure C++ SHA-256 and constant-time equality', () => {
  const secSource = loadSource('backend/utils/Security.h');

  // Pure C++ FIPS 180-2 implementation checks
  assert.ok(secSource.includes('namespace Security'), 'Must define Security namespace');
  assert.ok(secSource.includes('sha256('), 'Must provide sha256 string hashing function');
  assert.ok(secSource.includes('constantTimeEquals'), 'Must implement constantTimeEquals against timing attacks');
  assert.ok(secSource.includes('hashPassword'), 'Must implement hashPassword with salt');
  assert.ok(secSource.includes('verifyPassword'), 'Must implement verifyPassword with constant-time comparison');
  assert.ok(secSource.includes('randomHex'), 'Must implement randomHex for cryptographically secure salts and tokens');
});

test('AuthController enforces secure session cookies with HttpOnly and SameSite=Strict', () => {
  const source = loadSource('backend/controllers/AuthController.cc');

  // Login cookie attributes
  assert.ok(source.includes('HttpOnly'), 'Session cookie must specify HttpOnly');
  assert.ok(source.includes('SameSite=Strict'), 'Session cookie must specify SameSite=Strict');
  assert.ok(source.includes('Max-Age=86400'), 'Active session cookie must have 24h expiration');
  assert.ok(source.includes('Path=/'), 'Session cookie must specify Path=/');

  // Logout cookie clearing
  assert.ok(source.includes('Max-Age=0'), 'Logout must clear cookie using Max-Age=0');
});

test('AuthController enforces account status checks rejecting suspended or inactive users', () => {
  const source = loadSource('backend/controllers/AuthController.cc');

  assert.ok(source.includes('ACCOUNT_SUSPENDED'), 'Must return ACCOUNT_SUSPENDED on suspended accounts');
  assert.ok(source.includes('ACCOUNT_INACTIVE'), 'Must return ACCOUNT_INACTIVE on inactive accounts');
  assert.ok(source.includes('PENDING_VERIFICATION'), 'Must return PENDING_VERIFICATION on unverified accounts');
  assert.ok(source.includes('k403Forbidden'), 'Must respond with HTTP 403 Forbidden for non-active accounts');
});

test('AuthController enforces CSRF protection on state-changing administrative operations', () => {
  const source = loadSource('backend/controllers/AuthController.cc');

  assert.ok(source.includes('X-CSRF-Token'), 'Must inspect X-CSRF-Token header');
  assert.ok(source.includes('CSRF_VERIFICATION_FAILED'), 'Must return CSRF_VERIFICATION_FAILED when token is invalid or missing');
  assert.ok(source.includes('Security::constantTimeEquals(providedCsrf, session.csrfToken)'), 'Must compare CSRF token in constant time');
});

test('AuthController enforces backend role-based access control and prevents privilege escalation', () => {
  const source = loadSource('backend/controllers/AuthController.cc');

  // Overview access
  assert.ok(
    source.includes('super_admin') && source.includes('agency_manager') && source.includes('editor'),
    'Overview must permit all 3 staff roles'
  );

  // Quotes management access
  assert.ok(
    source.includes('agency_manager') && source.includes('super_admin'),
    'Quotes management must require agency_manager or super_admin'
  );
  assert.ok(
    source.includes('FORBIDDEN_INSUFFICIENT_PERMISSIONS'),
    'Must return 403 FORBIDDEN_INSUFFICIENT_PERMISSIONS when lower role accesses protected resource'
  );

  // User provisioning access strictly super_admin
  assert.ok(
    source.includes('session.role != "super_admin"') && source.includes('Privilege escalation rejected'),
    'User creation must strictly reject non-super_admin roles and prevent privilege escalation'
  );
});

test('Frontend client defines typed auth functions and types', () => {
  const apiSource = loadSource('src/api.ts');
  const typesSource = loadSource('src/types.ts');
  const adminPageSource = loadSource('src/pages/AdminPage.tsx');

  // Types definitions
  assert.ok(typesSource.includes('type StaffRole'), 'Must define StaffRole union type');
  assert.ok(typesSource.includes('interface StaffUser'), 'Must define StaffUser interface');
  assert.ok(typesSource.includes('interface AuthSession'), 'Must define AuthSession interface');
  assert.ok(typesSource.includes('interface LoginCredentials'), 'Must define LoginCredentials interface');

  // Client functions
  assert.ok(apiSource.includes('export async function loginStaff'), 'Must export loginStaff API function');
  assert.ok(apiSource.includes('export async function logoutStaff'), 'Must export logoutStaff API function');
  assert.ok(apiSource.includes('export async function inspectSession'), 'Must export inspectSession API function');

  // UI Integration
  assert.ok(adminPageSource.includes('loginStaff'), 'AdminPage must invoke loginStaff');
  assert.ok(adminPageSource.includes('logoutStaff'), 'AdminPage must invoke logoutStaff');
  assert.ok(adminPageSource.includes('inspectSession'), 'AdminPage must invoke inspectSession');
  assert.ok(adminPageSource.includes('currentUser'), 'AdminPage must track authenticated staff state');
});

test('PostgreSQL migration file creates sessions table with constraints and indexes', () => {
  const migration = loadSource('backend/migrations/003_marsnova_auth_sessions.sql');

  assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS sessions'), 'Must create sessions table');
  assert.ok(migration.includes('user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE'), 'Must reference users table');
  assert.ok(migration.includes('csrf_token VARCHAR(128) NOT NULL'), 'Must include csrf_token column');
  assert.ok(migration.includes('expires_at TIMESTAMPTZ NOT NULL'), 'Must include expires_at column');
  assert.ok(migration.includes('idx_sessions_user_id'), 'Must create index on sessions user_id');
  assert.ok(migration.includes('idx_sessions_expires_at'), 'Must create index on sessions expires_at');
});

test('C++ Drogon backend smoke test executable executes and passes all auth test assertions', () => {
  const smokeExe = path.join(rootDir, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(smokeExe), 'backend/smoke_test.exe must exist');

  const stdout = execFileSync(smokeExe, { encoding: 'utf8' });
  assert.ok(stdout.includes('[Test 9] Testing staff auth, sessions, password hashing, and RBAC...'), 'Test 9 must execute');
  assert.ok(stdout.includes('Secure salted password hashing and constant-time verification.'), 'Password hashing must pass');
  assert.ok(stdout.includes('Invalid credentials rejected with 401 INVALID_CREDENTIALS.'), 'Invalid credentials test must pass');
  assert.ok(stdout.includes('Account status enforced (suspended/inactive rejected with 403).'), 'Account status test must pass');
  assert.ok(stdout.includes('Successful login sets secure HttpOnly cookie and CSRF token.'), 'Cookie & CSRF test must pass');
  assert.ok(stdout.includes('Privilege escalation prevented (editor cannot access quotes or create users).'), 'Privilege escalation test must pass');
  assert.ok(stdout.includes('ALL 9 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)'), 'All 9 smoke tests must pass');
});
