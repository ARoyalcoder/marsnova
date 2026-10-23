import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadFile(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), 'utf-8');
}

// -----------------------------------------------------------------------------
// Immutability Check: Never edit already-applied migrations
// -----------------------------------------------------------------------------
test('Applied migration 001_marsnova_core_schema.sql remains unchanged', () => {
  const m1 = loadFile('backend/migrations/001_marsnova_core_schema.sql');

  // Verify Version 001 core tables remain intact
  assert.ok(m1.includes('CREATE TABLE IF NOT EXISTS schema_migrations'), 'Must contain schema_migrations');
  assert.ok(m1.includes('CREATE TABLE IF NOT EXISTS enquiries'), 'Must contain enquiries');
  assert.ok(m1.includes('CREATE TABLE IF NOT EXISTS data_recovery_cases'), 'Must contain data_recovery_cases');
  assert.ok(m1.includes('CREATE TABLE IF NOT EXISTS recovery_case_timeline'), 'Must contain recovery_case_timeline');
  assert.ok(m1.includes('CREATE TABLE IF NOT EXISTS quotations'), 'Must contain quotations');
  assert.ok(m1.includes('CREATE TABLE IF NOT EXISTS projects'), 'Must contain projects');
  assert.ok(m1.includes('CREATE TABLE IF NOT EXISTS audit_logs'), 'Must contain audit_logs');
  assert.ok(m1.includes("VALUES ('001',"), 'Must record migration 001');
});

// -----------------------------------------------------------------------------
// Versioning & Parity Tests
// -----------------------------------------------------------------------------
test('Migration versions follow sequential ordering across backend and Supabase folders', () => {
  const backendDir = path.join(rootDir, 'backend', 'migrations');
  const supabaseDir = path.join(rootDir, 'supabase', 'migrations');

  const backendFiles = fs.readdirSync(backendDir).sort();
  const supabaseFiles = fs.readdirSync(supabaseDir).sort();

  assert.ok(backendFiles.includes('001_marsnova_core_schema.sql'), 'Must have 001 migration');
  assert.ok(backendFiles.includes('002_marsnova_domain_models.sql'), 'Must have 002 migration');

  assert.ok(
    supabaseFiles.some((f) => f.includes('0001_marsnova_core_schema.sql')),
    'Supabase must mirror migration 0001'
  );
  assert.ok(
    supabaseFiles.some((f) => f.includes('0002_marsnova_domain_models.sql')),
    'Supabase must mirror migration 0002'
  );
});

// -----------------------------------------------------------------------------
// Domain Table Coverage
// -----------------------------------------------------------------------------
test('Migration 002 defines all required domain models with constraints and indexes', () => {
  const m2 = loadFile('backend/migrations/002_marsnova_domain_models.sql');

  const requiredTables = [
    'roles',
    'users',
    'services',
    'portfolio',
    'leads',
    'activities',
    'assignments',
    'media',
    'courses',
    'lessons',
    'notifications'
  ];

  for (const table of requiredTables) {
    assert.ok(
      m2.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
      `Migration 002 must create table: ${table}`
    );
  }

  // 1. Foreign Key Constraints
  assert.ok(m2.includes('role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT'), 'users -> roles FK');
  assert.ok(m2.includes('enquiry_id UUID REFERENCES enquiries(id) ON DELETE SET NULL'), 'leads -> enquiries FK');
  assert.ok(m2.includes('assigned_to UUID REFERENCES users(id) ON DELETE SET NULL'), 'leads -> users FK');
  assert.ok(m2.includes('lead_id UUID REFERENCES leads(id) ON DELETE CASCADE'), 'activities -> leads FK');
  assert.ok(m2.includes('project_id UUID REFERENCES projects(id) ON DELETE CASCADE'), 'activities -> projects FK');
  assert.ok(m2.includes('project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE'), 'assignments -> projects FK');
  assert.ok(m2.includes('assigned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE'), 'assignments -> users FK');
  assert.ok(m2.includes('course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE'), 'lessons -> courses FK');
  assert.ok(m2.includes('user_id UUID REFERENCES users(id) ON DELETE CASCADE'), 'notifications -> users FK');

  // 2. CHECK Constraints
  assert.ok(m2.includes("CHECK (status IN ('active', 'inactive', 'suspended', 'pending_verification'))"), 'users status check');
  assert.ok(m2.includes("CHECK (category IN ('Video', 'Social Media', 'Promotion', 'Tech'))"), 'services category check');
  assert.ok(m2.includes("CHECK (status IN ('new', 'contacted', 'discovery', 'proposal_sent', 'won', 'lost'))"), 'leads status check');
  assert.ok(m2.includes('CHECK (lead_score >= 0 AND lead_score <= 100)'), 'leads score check');

  // 3. Unique Constraints
  assert.ok(m2.includes('email VARCHAR(160) UNIQUE NOT NULL'), 'users unique email');
  assert.ok(m2.includes('slug VARCHAR(80) UNIQUE NOT NULL'), 'services & portfolio unique slug');
  assert.ok(m2.includes('role_name VARCHAR(40) UNIQUE NOT NULL'), 'roles unique role_name');

  // 4. Indexes
  assert.ok(m2.includes('CREATE INDEX IF NOT EXISTS idx_users_email'), 'Index on users email');
  assert.ok(m2.includes('CREATE INDEX IF NOT EXISTS idx_users_role_id'), 'Index on users role_id');
  assert.ok(m2.includes('CREATE INDEX IF NOT EXISTS idx_leads_status'), 'Index on leads status');
  assert.ok(m2.includes('CREATE INDEX IF NOT EXISTS idx_courses_slug'), 'Index on courses slug');
  assert.ok(m2.includes('CREATE INDEX IF NOT EXISTS idx_notifications_user'), 'Index on notifications user_id');
});

// -----------------------------------------------------------------------------
// Consistent Timestamps Verification
// -----------------------------------------------------------------------------
test('All mutable tables use consistent TIMESTAMPTZ default current_timestamp', () => {
  const m1 = loadFile('backend/migrations/001_marsnova_core_schema.sql');
  const m2 = loadFile('backend/migrations/002_marsnova_domain_models.sql');
  const combined = m1 + '\n' + m2;

  const tablesWithTimestamps = [
    'enquiries',
    'data_recovery_cases',
    'quotations',
    'projects',
    'users',
    'services',
    'portfolio',
    'leads',
    'media',
    'courses',
    'lessons'
  ];

  for (const table of tablesWithTimestamps) {
    const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\([\\s\\S]*?\\);`, 'm');
    const match = combined.match(tableRegex);
    assert.ok(match, `Table definition for ${table} must be found`);
    assert.ok(
      match[0].includes('created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP'),
      `${table} must have consistent created_at TIMESTAMPTZ`
    );
    assert.ok(
      match[0].includes('updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP'),
      `${table} must have consistent updated_at TIMESTAMPTZ`
    );
  }
});

// -----------------------------------------------------------------------------
// Migration Repeatability & Idempotency
// -----------------------------------------------------------------------------
test('Migrations enforce idempotency with IF NOT EXISTS and ON CONFLICT clauses', () => {
  const m1 = loadFile('backend/migrations/001_marsnova_core_schema.sql');
  const m2 = loadFile('backend/migrations/002_marsnova_domain_models.sql');

  // Verify all CREATE TABLE statements have IF NOT EXISTS
  const tableStatementsM1 = m1.match(/CREATE TABLE[^\n(]+/g) || [];
  const tableStatementsM2 = m2.match(/CREATE TABLE[^\n(]+/g) || [];
  const allTableStatements = [...tableStatementsM1, ...tableStatementsM2];

  for (const stmt of allTableStatements) {
    assert.ok(
      stmt.includes('IF NOT EXISTS'),
      `Table creation statement must be idempotent: "${stmt}"`
    );
  }

  // Verify all CREATE INDEX statements have IF NOT EXISTS
  const indexStatementsM1 = m1.match(/CREATE INDEX[^\n]+/g) || [];
  const indexStatementsM2 = m2.match(/CREATE INDEX[^\n]+/g) || [];
  const allIndexStatements = [...indexStatementsM1, ...indexStatementsM2];

  for (const stmt of allIndexStatements) {
    assert.ok(
      stmt.includes('IF NOT EXISTS'),
      `Index creation statement must be idempotent: "${stmt}"`
    );
  }

  // Verify seed inserts have ON CONFLICT DO NOTHING
  assert.ok(m1.includes('ON CONFLICT (version) DO NOTHING;'), '001 records migration safely');
  assert.ok(m2.includes('ON CONFLICT (role_name) DO NOTHING;'), '002 role seed is idempotent');
  assert.ok(m2.includes('ON CONFLICT (version) DO NOTHING;'), '002 records migration safely');
});

// -----------------------------------------------------------------------------
// Fresh Database Setup: Dependency Topological Ordering
// -----------------------------------------------------------------------------
test('Tables are created in strict dependency order without circular or forward references', () => {
  const m1 = loadFile('backend/migrations/001_marsnova_core_schema.sql');
  const m2 = loadFile('backend/migrations/002_marsnova_domain_models.sql');
  const script = m1 + '\n' + m2;

  // Extract table creation order
  const tableMatches = [...script.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]);

  // roles must precede users
  assert.ok(tableMatches.indexOf('roles') < tableMatches.indexOf('users'), 'roles created before users');

  // users must precede leads assigned_to
  assert.ok(tableMatches.indexOf('users') < tableMatches.indexOf('leads'), 'users created before leads');

  // leads must precede activities
  assert.ok(tableMatches.indexOf('leads') < tableMatches.indexOf('activities'), 'leads created before activities');

  // projects must precede assignments & media
  assert.ok(tableMatches.indexOf('projects') < tableMatches.indexOf('assignments'), 'projects created before assignments');
  assert.ok(tableMatches.indexOf('projects') < tableMatches.indexOf('media'), 'projects created before media');

  // courses must precede lessons
  assert.ok(tableMatches.indexOf('courses') < tableMatches.indexOf('lessons'), 'courses created before lessons');

  // users must precede notifications
  assert.ok(tableMatches.indexOf('users') < tableMatches.indexOf('notifications'), 'users created before notifications');
});
