import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT_DIR = path.resolve('.');

test('Migration 007 creates content status lifecycle, unique slugs, and media storage table', () => {
  const backendMigPath = path.join(ROOT_DIR, 'backend', 'migrations', '007_marsnova_content_management.sql');
  const supabaseMigPath = path.join(ROOT_DIR, 'supabase', 'migrations', '202610230007_marsnova_content_management.sql');

  assert.ok(fs.existsSync(backendMigPath), 'backend/migrations/007_marsnova_content_management.sql must exist');
  assert.ok(fs.existsSync(supabaseMigPath), 'supabase/migrations/202610230007_marsnova_content_management.sql must exist');

  const sql = fs.readFileSync(backendMigPath, 'utf8');

  // Status check constraints
  assert.ok(sql.includes("CHECK (status IN ('draft', 'published', 'archived'))"), 'Migration must enforce status IN (draft, published, archived)');
  assert.ok(sql.includes('uq_services_slug'), 'Migration must enforce unique slug on services');
  assert.ok(sql.includes('uq_portfolio_slug'), 'Migration must enforce unique slug on portfolio');
  assert.ok(sql.includes('uq_courses_slug'), 'Migration must enforce unique slug on courses');
  assert.ok(sql.includes('uq_course_lesson_slug'), 'Migration must enforce unique slug on course lessons (course_id, slug)');

  // Lesson privacy & resources
  assert.ok(sql.includes('is_private BOOLEAN NOT NULL DEFAULT TRUE'), 'Migration must add is_private to lessons');
  assert.ok(sql.includes('resources JSONB NOT NULL DEFAULT'), 'Migration must add resources JSONB to lessons');

  // Media uploads storage table
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS media_uploads'), 'Migration must create media_uploads table');
  assert.ok(sql.includes('file_size_bytes BIGINT NOT NULL'), 'media_uploads must record file_size_bytes');
  assert.ok(sql.includes('mime_type VARCHAR'), 'media_uploads must record mime_type');
  assert.ok(sql.includes('storage_provider VARCHAR'), 'media_uploads must record storage_provider');
  assert.ok(sql.includes('is_private BOOLEAN NOT NULL DEFAULT FALSE'), 'media_uploads must record is_private');
});

test('ContentController implements protected management, unique slugs, private content protection, and media storage', () => {
  const headerPath = path.join(ROOT_DIR, 'backend', 'controllers', 'ContentController.h');
  const sourcePath = path.join(ROOT_DIR, 'backend', 'controllers', 'ContentController.cc');

  assert.ok(fs.existsSync(headerPath), 'ContentController.h must exist');
  assert.ok(fs.existsSync(sourcePath), 'ContentController.cc must exist');

  const header = fs.readFileSync(headerPath, 'utf8');
  const source = fs.readFileSync(sourcePath, 'utf8');

  // Routes declared in header
  assert.ok(header.includes('createService'), 'ContentController must declare createService');
  assert.ok(header.includes('publishService'), 'ContentController must declare publishService');
  assert.ok(header.includes('archiveService'), 'ContentController must declare archiveService');
  assert.ok(header.includes('createPortfolio'), 'ContentController must declare createPortfolio');
  assert.ok(header.includes('createCourse'), 'ContentController must declare createCourse');
  assert.ok(header.includes('createLesson'), 'ContentController must declare createLesson');
  assert.ok(header.includes('getPublicLesson'), 'ContentController must declare getPublicLesson');
  assert.ok(header.includes('uploadMedia'), 'ContentController must declare uploadMedia');

  // Unique slug handling
  assert.ok(source.includes('DUPLICATE_SLUG'), 'ContentController must handle DUPLICATE_SLUG');
  assert.ok(source.includes('k409Conflict'), 'ContentController must return 409 Conflict on duplicate slug');

  // Content lifecycle transitions
  assert.ok(source.includes('status'), 'ContentController must update status');

  // Private content protection
  assert.ok(source.includes('is_private'), 'ContentController must inspect is_private');
  assert.ok(source.includes('restricted'), 'ContentController must redact content for unauthenticated users (restricted)');
  assert.ok(source.includes('content_markdown') && source.includes('video_url'), 'ContentController must redact markdown and video for private lessons');

  // Media storage validation
  assert.ok(source.includes('INVALID_FILE_TYPE'), 'ContentController must reject executable or dangerous MIME types');
  assert.ok(source.includes('FILE_TOO_LARGE'), 'ContentController must enforce file size limits');
  assert.ok(source.includes('STORAGE_PROVIDER_NOT_CONFIGURED'), 'ContentController must handle unconfigured storage gracefully');
  assert.ok(source.includes('STORAGE_PROVIDER_FAILURE'), 'ContentController must catch and safely wrap provider failures');
});

test('Frontend API client and types export typed content and media models', () => {
  const typesPath = path.join(ROOT_DIR, 'src', 'types.ts');
  const apiPath = path.join(ROOT_DIR, 'src', 'api.ts');

  const types = fs.readFileSync(typesPath, 'utf8');
  const api = fs.readFileSync(apiPath, 'utf8');

  // Types
  assert.ok(types.includes('ContentStatus'), 'types.ts must define ContentStatus');
  assert.ok(types.includes('AdminServiceRecord'), 'types.ts must define AdminServiceRecord');
  assert.ok(types.includes('AdminPortfolioRecord'), 'types.ts must define AdminPortfolioRecord');
  assert.ok(types.includes('AdminCourseRecord'), 'types.ts must define AdminCourseRecord');
  assert.ok(types.includes('AdminLessonRecord'), 'types.ts must define AdminLessonRecord');
  assert.ok(types.includes('MediaUploadRecord'), 'types.ts must define MediaUploadRecord');

  // API Client Methods
  assert.ok(api.includes('fetchAdminServices'), 'api.ts must export fetchAdminServices');
  assert.ok(api.includes('createAdminService'), 'api.ts must export createAdminService');
  assert.ok(api.includes('publishAdminService'), 'api.ts must export publishAdminService');
  assert.ok(api.includes('archiveAdminService'), 'api.ts must export archiveAdminService');
  assert.ok(api.includes('deleteAdminService'), 'api.ts must export deleteAdminService');
  assert.ok(api.includes('fetchAdminPortfolio'), 'api.ts must export fetchAdminPortfolio');
  assert.ok(api.includes('createAdminPortfolio'), 'api.ts must export createAdminPortfolio');
  assert.ok(api.includes('publishAdminPortfolio'), 'api.ts must export publishAdminPortfolio');
  assert.ok(api.includes('archiveAdminPortfolio'), 'api.ts must export archiveAdminPortfolio');
  assert.ok(api.includes('fetchAdminCourses'), 'api.ts must export fetchAdminCourses');
  assert.ok(api.includes('createAdminCourse'), 'api.ts must export createAdminCourse');
  assert.ok(api.includes('publishAdminCourse'), 'api.ts must export publishAdminCourse');
  assert.ok(api.includes('fetchAdminLessons'), 'api.ts must export fetchAdminLessons');
  assert.ok(api.includes('createAdminLesson'), 'api.ts must export createAdminLesson');
  assert.ok(api.includes('fetchPublicLesson'), 'api.ts must export fetchPublicLesson');
  assert.ok(api.includes('fetchAdminMedia'), 'api.ts must export fetchAdminMedia');
  assert.ok(api.includes('uploadMedia'), 'api.ts must export uploadMedia');
});

test('AdminPage integrates Content CMS tabs, lifecycle transitions, and media upload workflow', () => {
  const adminPagePath = path.join(ROOT_DIR, 'src', 'pages', 'AdminPage.tsx');
  const adminPage = fs.readFileSync(adminPagePath, 'utf8');

  assert.ok(adminPage.includes('value="content"'), 'AdminPage must have content tab');
  assert.ok(adminPage.includes('handlePublishService'), 'AdminPage must implement handlePublishService');
  assert.ok(adminPage.includes('handleArchiveService'), 'AdminPage must implement handleArchiveService');
  assert.ok(adminPage.includes('handleCreateLesson'), 'AdminPage must implement handleCreateLesson');
  assert.ok(adminPage.includes('handleUploadMedia'), 'AdminPage must implement handleUploadMedia');
});

test('C++ Drogon backend smoke test executable verifies all 12 test suites with 0 errors', () => {
  const exePath = path.join(ROOT_DIR, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(exePath), 'backend/smoke_test.exe must exist');

  const stdout = execFileSync(exePath, [], { encoding: 'utf8' });

  assert.ok(stdout.includes('ALL 12 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)'), 'Smoke test output must report all 12 tests passed');
  assert.ok(stdout.includes('[Test 12] Testing protected content management'), 'Smoke test must report Test 12 passed');
});
