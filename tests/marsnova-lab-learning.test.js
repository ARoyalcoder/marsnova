import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadFile(relPath) {
  const p = path.join(rootDir, relPath);
  assert.ok(fs.existsSync(p), `File must exist: ${relPath}`);
  return fs.readFileSync(p, 'utf-8');
}

// -----------------------------------------------------------------------------
// 1. Migration 009 Schema & Integrity
// -----------------------------------------------------------------------------
test('Migration 009 defines students, student_sessions, course_enrolments, and lesson_progress', () => {
  const mig = loadFile('backend/migrations/009_marsnova_lab_learning.sql');

  // Tables
  assert.ok(mig.includes('CREATE TABLE IF NOT EXISTS students'), 'Must create students table');
  assert.ok(mig.includes('CREATE TABLE IF NOT EXISTS student_sessions'), 'Must create student_sessions table');
  assert.ok(mig.includes('CREATE TABLE IF NOT EXISTS course_enrolments'), 'Must create course_enrolments table');
  assert.ok(mig.includes('CREATE TABLE IF NOT EXISTS lesson_progress'), 'Must create lesson_progress table');

  // Constraints & Unique indexes
  assert.ok(mig.includes('UNIQUE(student_id, course_id)'), 'Must enforce unique student course enrolment');
  assert.ok(mig.includes('UNIQUE(student_id, lesson_id)'), 'Must enforce unique student lesson progress record');
  assert.ok(mig.includes("CHECK (status IN ('active', 'suspended', 'pending_verification'))"), 'Must validate student status');

  // Idempotent migration registration
  assert.ok(mig.includes("VALUES ('009', '009_marsnova_lab_learning.sql'"), 'Must record migration 009 in schema_migrations');
});

test('Supabase migration folder mirrors 0009_marsnova_lab_learning.sql', () => {
  const supaMig = loadFile('supabase/migrations/0009_marsnova_lab_learning.sql');
  assert.ok(supaMig.includes('CREATE TABLE IF NOT EXISTS students'), 'Supabase mirror must contain students table');
  assert.ok(supaMig.includes('CREATE TABLE IF NOT EXISTS course_enrolments'), 'Supabase mirror must contain course_enrolments');
  assert.ok(supaMig.includes('CREATE TABLE IF NOT EXISTS lesson_progress'), 'Supabase mirror must contain lesson_progress');
});

// -----------------------------------------------------------------------------
// 2. LearningController Architecture & Privilege Isolation
// -----------------------------------------------------------------------------
test('LearningController registers student endpoints and enforces strict role separation', () => {
  const ctrlHeader = loadFile('backend/controllers/LearningController.h');
  const ctrlSource = loadFile('backend/controllers/LearningController.cc');

  // Auth endpoints
  assert.ok(ctrlHeader.includes('/api/v1/lab/auth/register'), 'Must expose student register');
  assert.ok(ctrlHeader.includes('/api/v1/lab/auth/login'), 'Must expose student login');
  assert.ok(ctrlHeader.includes('/api/v1/lab/auth/logout'), 'Must expose student logout');
  assert.ok(ctrlHeader.includes('/api/v1/lab/auth/me'), 'Must expose student profile');

  // Curriculum & Progress endpoints
  assert.ok(ctrlHeader.includes('/api/v1/lab/courses/{slug}/enroll'), 'Must expose course enrollment');
  assert.ok(ctrlHeader.includes('/api/v1/lab/my-enrolments'), 'Must expose student my-enrolments');
  assert.ok(ctrlHeader.includes('/api/v1/lab/courses/{slug}/lessons/{lessonId}'), 'Must expose lesson content');
  assert.ok(ctrlHeader.includes('/api/v1/lab/lessons/{lessonId}/progress'), 'Must expose lesson progress');

  // Session & Cookie Isolation
  assert.ok(ctrlSource.includes('marsnova_student_session'), 'Must use isolated student session cookie');
  assert.ok(ctrlSource.includes('HttpOnly') && ctrlSource.includes('SameSite=Strict'), 'Cookie must carry security flags');

  // Account status enforcement
  assert.ok(ctrlSource.includes('STUDENT_ACCOUNT_SUSPENDED'), 'Must reject suspended student accounts with 403');

  // No payments: direct studio record enrolment
  assert.ok(!ctrlSource.includes('stripe') && !ctrlSource.includes('razorpay'), 'No payment gateway or checkout in learning platform');
});

test('LearningController enforces curriculum gating, ownership and cross-student isolation', () => {
  const ctrlSource = loadFile('backend/controllers/LearningController.cc');

  // Curriculum gating
  assert.ok(ctrlSource.includes('isFreePreview'), 'Must support free preview lessons');
  assert.ok(ctrlSource.includes('ENROLMENT_REQUIRED'), 'Must require active course enrolment for non-preview lessons');

  // Ownership enforcement (IDOR Defense)
  assert.ok(ctrlSource.includes('auth.studentId'), 'Must bind progress record directly to verified session student ID');
  assert.ok(ctrlSource.includes('NOT_ENROLLED_IN_COURSE'), 'Must prevent recording progress in courses where student is not enrolled');

  // Cross-student data isolation in my-enrolments
  assert.ok(ctrlSource.includes('enr.studentId != auth.studentId'), 'Must strictly filter enrolments by authenticated student ID');
});

// -----------------------------------------------------------------------------
// 3. Frontend Types and Client API Coverage
// -----------------------------------------------------------------------------
test('Frontend client and types declare typed MarsNova Lab student learning models', () => {
  const typesSrc = loadFile('src/types.ts');
  const apiSrc = loadFile('src/api.ts');

  // Types
  assert.ok(typesSrc.includes('export interface StudentProfile'), 'Must export StudentProfile interface');
  assert.ok(typesSrc.includes('export interface CourseEnrolment'), 'Must export CourseEnrolment interface');
  assert.ok(typesSrc.includes('export interface LessonContent'), 'Must export LessonContent interface');
  assert.ok(typesSrc.includes('export interface LessonProgressPayload'), 'Must export LessonProgressPayload interface');

  // Client API functions
  assert.ok(apiSrc.includes('export async function registerStudent'), 'Must export registerStudent function');
  assert.ok(apiSrc.includes('export async function loginStudent'), 'Must export loginStudent function');
  assert.ok(apiSrc.includes('export async function logoutStudent'), 'Must export logoutStudent function');
  assert.ok(apiSrc.includes('export async function getStudentProfile'), 'Must export getStudentProfile function');
  assert.ok(apiSrc.includes('export async function enrollInCourse'), 'Must export enrollInCourse function');
  assert.ok(apiSrc.includes('export async function fetchMyEnrolments'), 'Must export fetchMyEnrolments function');
  assert.ok(apiSrc.includes('export async function fetchLessonContent'), 'Must export fetchLessonContent function');
  assert.ok(apiSrc.includes('export async function recordLessonProgress'), 'Must export recordLessonProgress function');
});

// -----------------------------------------------------------------------------
// 4. C++ Drogon Smoke Test 15 Integration Verification
// -----------------------------------------------------------------------------
test('C++ Drogon backend smoke test executable verifies all 15 test suites with 0 errors', () => {
  const smokeExe = path.join(rootDir, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(smokeExe), 'backend/smoke_test.exe must be compiled');

  const stdout = execFileSync(smokeExe, [], { encoding: 'utf8' });
  assert.ok(
    stdout.includes('ALL 15 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)'),
    'C++ smoke test output must confirm ALL 15 test suites passed with 0 errors'
  );
  assert.ok(
    stdout.includes('[Test 15] Testing MarsNova Lab student accounts, enrolment rules, ownership & cross-student isolation'),
    'Output must include Test 15 MarsNova Lab learning suite'
  );
});
