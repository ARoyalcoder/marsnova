import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadSource(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf-8');
}

// -----------------------------------------------------------------------------
// Catalog Controller Route Registration & Header Declarations
// -----------------------------------------------------------------------------
test('CatalogController declares all 5 catalog routes in header', () => {
  const header = loadSource('backend/controllers/CatalogController.h');

  // Verify all 5 endpoints are declared with Drogon METHOD_LIST_MAPPING
  assert.ok(header.includes('/api/v1/services'), 'Must map /api/v1/services');
  assert.ok(
    header.includes('/api/v1/services/:slug') || header.includes('/api/v1/services/{slug}'),
    'Must map /api/v1/services/:slug'
  );
  assert.ok(header.includes('/api/v1/portfolio'), 'Must map /api/v1/portfolio');
  assert.ok(header.includes('/api/v1/courses'), 'Must map /api/v1/courses');
  assert.ok(
    header.includes('/api/v1/courses/:slug') || header.includes('/api/v1/courses/{slug}'),
    'Must map /api/v1/courses/:slug'
  );

  // Verify method handlers exist
  assert.ok(header.includes('getServices'), 'Must declare getServices');
  assert.ok(header.includes('getServiceBySlug'), 'Must declare getServiceBySlug');
  assert.ok(header.includes('getPortfolio'), 'Must declare getPortfolio');
  assert.ok(header.includes('getCourses'), 'Must declare getCourses');
  assert.ok(header.includes('getCourseBySlug'), 'Must declare getCourseBySlug');
});

// -----------------------------------------------------------------------------
// Published-Only Filtering & Safe Database Queries
// -----------------------------------------------------------------------------
test('CatalogController enforces published-only content and safe parameterized SQL queries', () => {
  const source = loadSource('backend/controllers/CatalogController.cc');

  // 1. Services: is_active = TRUE
  assert.ok(
    source.includes('is_active = TRUE') || source.includes('is_active == true') || source.includes('s["is_active"].asBool()'),
    'Services must filter for active/published items only'
  );

  // 2. Portfolio: is_published = TRUE
  assert.ok(
    source.includes('is_published = TRUE') || source.includes('is_published == true') || source.includes('item["is_published"].asBool()') || source.includes('["is_published"].asBool()'),
    'Portfolio items must filter for published items only'
  );

  // 3. Courses: is_published = TRUE
  assert.ok(
    source.includes('is_published = TRUE') || source.includes('is_published == true') || source.includes('["is_published"].asBool()'),
    'Courses must filter for published items only'
  );

  // 4. Safe Database Queries with parameterization ($1, $2, etc.)
  assert.ok(
    source.includes('execSqlAsync') || source.includes('getDbClient'),
    'Must support asynchronous Drogon DB client execution'
  );

  // Ensure SQL strings use placeholders instead of direct interpolation
  const sqlStatements = source.match(/SELECT[\s\S]*?FROM[\s\S]*?;/gi) || [];
  for (const sql of sqlStatements) {
    assert.ok(
      !sql.includes('\'" +') && !sql.includes('\' + '),
      'SQL must not use raw string concatenation for user parameters'
    );
  }
});

// -----------------------------------------------------------------------------
// Query Parameter Validation & Pagination
// -----------------------------------------------------------------------------
test('CatalogController validates query parameters and computes pagination', () => {
  const source = loadSource('backend/controllers/CatalogController.cc');

  // Page validation: reject < 1
  assert.ok(source.includes('page < 1'), 'Must validate page >= 1');
  assert.ok(source.includes('INVALID_QUERY_PARAMS'), 'Must return INVALID_QUERY_PARAMS code for bad params');

  // Limit validation: reject < 1 or > 50
  assert.ok(source.includes('limit < 1') || source.includes('limit > 50'), 'Must validate limit between 1 and 50');

  // Pagination calculation
  assert.ok(source.includes('total_pages') || source.includes('totalPages'), 'Must compute total pages');
  assert.ok(source.includes('pagination'), 'Must return pagination metadata block');
});

// -----------------------------------------------------------------------------
// Slug Validation & 404 Behavior (Never Leak Drafts)
// -----------------------------------------------------------------------------
test('CatalogController validates slugs and returns 404 for unknown or draft items', () => {
  const source = loadSource('backend/controllers/CatalogController.cc');

  // Slug format validator regex
  assert.ok(source.includes('isValidSlug'), 'Must contain slug validator helper');
  assert.ok(source.includes('INVALID_SLUG'), 'Must return INVALID_SLUG on malformed slug');

  // 404 Not Found status
  assert.ok(source.includes('k404NotFound'), 'Must set k404NotFound status for missing resources');
  assert.ok(source.includes('"NOT_FOUND"'), 'Must return structured NOT_FOUND error code');

  // Drafts must trigger 404
  assert.ok(
    source.includes('!s["is_active"].asBool()') || source.includes('!c["is_published"].asBool()'),
    'Unpublished draft slugs must trigger 404 Not Found'
  );
});

// -----------------------------------------------------------------------------
// Standalone Route Dispatcher Integration
// -----------------------------------------------------------------------------
test('backend/compat/drogon_standalone.cc dispatches all catalog routes with query parameters', () => {
  const standalone = loadSource('backend/compat/drogon_standalone.cc');

  assert.ok(standalone.includes('/api/v1/services'), 'Must route /api/v1/services');
  assert.ok(standalone.includes('/api/v1/portfolio'), 'Must route /api/v1/portfolio');
  assert.ok(standalone.includes('/api/v1/courses'), 'Must route /api/v1/courses');
  assert.ok(standalone.includes('getServiceBySlug'), 'Must call getServiceBySlug');
  assert.ok(standalone.includes('getCourseBySlug'), 'Must call getCourseBySlug');
  assert.ok(standalone.includes('setParameter'), 'Must parse and populate query string parameters');
});
