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

test('Migration 006 adds studio projects schema, dates check constraint, deliverables, and project activities audit table', () => {
  const backendMigration = loadSource('backend/migrations/006_marsnova_projects.sql');
  const supabaseMigration = loadSource('supabase/migrations/202610230006_marsnova_projects.sql');

  // Verify backend and Supabase migrations mirror each other
  assert.equal(
    backendMigration.trim(),
    supabaseMigration.trim(),
    'Backend and Supabase projects migrations must match'
  );

  // Alter table projects columns
  assert.ok(backendMigration.includes('ALTER TABLE projects ADD COLUMN IF NOT EXISTS quotation_id UUID'), 'Must add quotation_id column');
  assert.ok(backendMigration.includes('ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope TEXT;'), 'Must add scope column');
  assert.ok(backendMigration.includes('ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority VARCHAR(32)'), 'Must add priority column');
  assert.ok(backendMigration.includes('ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE'), 'Must add start_date column');
  assert.ok(backendMigration.includes('ALTER TABLE projects ADD COLUMN IF NOT EXISTS deliverables JSONB'), 'Must add deliverables JSONB column');

  // Dates constraint: target_delivery must be >= start_date
  assert.ok(
    backendMigration.includes('chk_project_dates') &&
    backendMigration.includes('target_delivery >= start_date'),
    'Must enforce chk_project_dates constraint (target_delivery >= start_date)'
  );

  // Priority check constraint
  assert.ok(backendMigration.includes("'low'"), 'Must allow low priority');
  assert.ok(backendMigration.includes("'medium'"), 'Must allow medium priority');
  assert.ok(backendMigration.includes("'high'"), 'Must allow high priority');
  assert.ok(backendMigration.includes("'urgent'"), 'Must allow urgent priority');

  // Status check constraint
  assert.ok(backendMigration.includes("'kickoff'"), 'Must allow kickoff stage');
  assert.ok(backendMigration.includes("'pre_production'"), 'Must allow pre_production stage');
  assert.ok(backendMigration.includes("'production'"), 'Must allow production stage');
  assert.ok(backendMigration.includes("'post_editing'"), 'Must allow post_editing stage');
  assert.ok(backendMigration.includes("'client_review'"), 'Must allow client_review stage');
  assert.ok(backendMigration.includes("'final_delivery'"), 'Must allow final_delivery stage');
  assert.ok(backendMigration.includes("'completed'"), 'Must allow completed stage');
  assert.ok(backendMigration.includes("'on_hold'"), 'Must allow on_hold stage');
  assert.ok(backendMigration.includes("'cancelled'"), 'Must allow cancelled stage');

  // Project activities audit trail table
  assert.ok(backendMigration.includes('CREATE TABLE IF NOT EXISTS project_activities'), 'Must create project_activities table');
  assert.ok(backendMigration.includes('REFERENCES projects(id) ON DELETE CASCADE'), 'Must cascade delete activities on project deletion');
  assert.ok(backendMigration.includes('idx_project_activities_project_id'), 'Must index project_id on activities table');
  assert.ok(backendMigration.includes('idx_projects_quotation_id'), 'Must index quotation_id on projects table');
  assert.ok(backendMigration.includes("VALUES ('006',"), 'Must record migration 006 in schema_migrations');
});

test('ProjectController registers studio routes and implements state machine and RBAC controls', () => {
  const header = loadSource('backend/controllers/ProjectController.h');
  const source = loadSource('backend/controllers/ProjectController.cc');
  const cmake = loadSource('backend/CMakeLists.txt');
  const standalone = loadSource('backend/compat/drogon_standalone.cc');

  // CMake and routing registration
  assert.ok(cmake.includes('controllers/ProjectController.cc'), 'Must include ProjectController.cc in CMakeLists.txt');
  assert.ok(standalone.includes('ProjectController.h'), 'Must include ProjectController.h in standalone router');
  assert.ok(standalone.includes('/api/v1/projects'), 'Must dispatch /api/v1/projects in standalone router');

  // Controller route declarations
  assert.ok(header.includes('createProject'), 'Must declare createProject method');
  assert.ok(header.includes('listProjects'), 'Must declare listProjects method');
  assert.ok(header.includes('getProjectDetails'), 'Must declare getProjectDetails method');
  assert.ok(header.includes('updateProjectStatus'), 'Must declare updateProjectStatus method');
  assert.ok(header.includes('assignStaff'), 'Must declare assignStaff method');
  assert.ok(header.includes('removeStaff'), 'Must declare removeStaff method');
  assert.ok(header.includes('updateDeliverables'), 'Must declare updateDeliverables method');

  // Dates validation logic
  assert.ok(source.includes('validateDateOrdering'), 'Must validate target delivery date ordering against start date');
  assert.ok(source.includes('INVALID_PROJECT_DATES'), 'Must reject inverted date ranges with INVALID_PROJECT_DATES code');

  // Staff validation logic
  assert.ok(source.includes('validateStaffUser'), 'Must validate staff user existence and active status');
  assert.ok(source.includes('INVALID_STAFF_ASSIGNMENT'), 'Must reject non-existent or suspended staff assignments');

  // State machine transitions
  assert.ok(source.includes('isAllowedStatusTransition'), 'Must implement state machine transition validation');
  assert.ok(source.includes('INVALID_STATUS_TRANSITION'), 'Must reject invalid status transitions');

  // RBAC enforcement
  assert.ok(source.includes('INSUFFICIENT_PERMISSIONS'), 'Must reject editor role on mutations');
  assert.ok(source.includes('editor'), 'Must check editor role restriction');

  // Change history auditing
  assert.ok(source.includes('activities.push_back'), 'Must record project activities on modifications');
});

test('Frontend types and API client declare full typed Project models and operations', () => {
  const typesSource = loadSource('src/types.ts');
  const apiSource = loadSource('src/api.ts');

  // Type definitions
  assert.ok(typesSource.includes('export type ProjectStatus'), 'Must export ProjectStatus type');
  assert.ok(typesSource.includes('export type ProjectPriority'), 'Must export ProjectPriority type');
  assert.ok(typesSource.includes('export interface ProjectDeliverable'), 'Must export ProjectDeliverable interface');
  assert.ok(typesSource.includes('export interface ProjectAssignment'), 'Must export ProjectAssignment interface');
  assert.ok(typesSource.includes('export interface ProjectActivity'), 'Must export ProjectActivity interface');
  assert.ok(typesSource.includes('export interface ProjectRecord'), 'Must export ProjectRecord interface');
  assert.ok(typesSource.includes('export interface CreateProjectPayload'), 'Must export CreateProjectPayload interface');
  assert.ok(typesSource.includes('export interface ProjectQueryParams'), 'Must export ProjectQueryParams interface');
  assert.ok(typesSource.includes('export interface ProjectPagination'), 'Must export ProjectPagination interface');

  // API Client operations
  assert.ok(apiSource.includes('export async function fetchProjectsPaged'), 'Must export fetchProjectsPaged');
  assert.ok(apiSource.includes('export async function getProjectDetails'), 'Must export getProjectDetails');
  assert.ok(apiSource.includes('export async function createProject'), 'Must export createProject');
  assert.ok(apiSource.includes('export async function updateProjectStatus'), 'Must export updateProjectStatus');
  assert.ok(apiSource.includes('export async function assignProjectStaff'), 'Must export assignProjectStaff');
  assert.ok(apiSource.includes('export async function removeProjectStaff'), 'Must export removeProjectStaff');
  assert.ok(apiSource.includes('export async function updateProjectDeliverables'), 'Must export updateProjectDeliverables');
});

test('Admin UI integrates live Projects tab, stage workflow, staff assignments, and deliverables', () => {
  const adminPage = loadSource('src/pages/AdminPage.tsx');

  // Projects tab and state
  assert.ok(adminPage.includes('fetchProjectsPaged'), 'Must import fetchProjectsPaged in AdminPage');
  assert.ok(adminPage.includes('projectsList'), 'Must maintain live projectsList state');
  assert.ok(adminPage.includes('loadProjects'), 'Must implement loadProjects callback');
  assert.ok(adminPage.includes('handleCreateProject'), 'Must implement handleCreateProject');
  assert.ok(adminPage.includes('handleUpdateProjectStatus'), 'Must implement handleUpdateProjectStatus');
  assert.ok(adminPage.includes('handleAssignStaff'), 'Must implement handleAssignStaff');
  assert.ok(adminPage.includes('handleRemoveStaff'), 'Must implement handleRemoveStaff');
  assert.ok(adminPage.includes('handleAddDeliverable'), 'Must implement handleAddDeliverable');

  // Project Details Dialog
  assert.ok(adminPage.includes('selectedProjectId'), 'Must manage selectedProjectId state');
  assert.ok(adminPage.includes('Stage Workflow Progression'), 'Must provide stage workflow management');
  assert.ok(adminPage.includes('Milestone Deliverables'), 'Must render deliverable milestones');
  assert.ok(adminPage.includes('Manual Team Staff Assignments'), 'Must render staff assignments');
  assert.ok(adminPage.includes('Audited Project Changes History'), 'Must render activity history');

  // Quotation conversion support
  assert.ok(adminPage.includes('Convert from Approved Quotation'), 'Must support converting approved quotations into projects');
});

test('C++ Drogon Backend Smoke & Integration Test 11 passes with 0 errors', () => {
  const smokeExePath = path.join(rootDir, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(smokeExePath), 'backend/smoke_test.exe must exist');

  const stdout = execFileSync(smokeExePath, [], {
    cwd: path.join(rootDir, 'backend'),
    encoding: 'utf8'
  });

  // Verify Test 11 suite execution and assertions
  assert.ok(stdout.includes('[Test 11] Testing project creation, dates, assignments, transitions & RBAC...'), 'Test 11 must run');
  assert.ok(stdout.includes('Project created from approved quotation with kickoff stage and activity history.'), 'Quotation conversion assertion passed');
  assert.ok(stdout.includes('Rejects project conversion from unapproved quotation.'), 'Unapproved quotation rejection assertion passed');
  assert.ok(stdout.includes('Rejects project initiation from lost lead.'), 'Lost lead rejection assertion passed');
  assert.ok(stdout.includes('Rejects target delivery earlier than start date.'), 'Dates validation assertion passed');
  assert.ok(stdout.includes('Rejects assignment of non-existent staff.'), 'Non-existent staff rejection assertion passed');
  assert.ok(stdout.includes('Rejects assignment of suspended staff.'), 'Suspended staff rejection assertion passed');
  assert.ok(stdout.includes('Successfully assigns active studio staff with audit history.'), 'Active staff assignment assertion passed');
  assert.ok(stdout.includes('State machine enforces valid sequential transitions'), 'State machine transition assertion passed');
  assert.ok(stdout.includes('RBAC enforced: editor has read-only access; project creation & team assignment strictly forbidden (403).'), 'RBAC assertion passed');
  assert.ok(stdout.includes('Project persistence, deliverables, assignments and audit activities verified.'), 'Persistence and activities assertion passed');

  // Overall suite pass check
  assert.ok(stdout.includes('ALL 11 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)'), 'All 11 C++ backend tests must pass with 0 errors');
});
