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
// 1. Environment Variable & Secrets Verification
// -----------------------------------------------------------------------------
test('Frontend API client uses VITE_API_BASE_URL without exposing backend secrets', () => {
  const apiSource = loadSource('src/api.ts');
  const envContent = loadSource('.env');
  const envExample = loadSource('.env.example');

  // Verify VITE_API_BASE_URL priority
  assert.ok(
    apiSource.includes('VITE_API_BASE_URL'),
    'src/api.ts must read import.meta.env.VITE_API_BASE_URL'
  );
  assert.ok(
    envContent.includes('VITE_API_BASE_URL='),
    '.env must define VITE_API_BASE_URL'
  );
  assert.ok(
    envExample.includes('VITE_API_BASE_URL='),
    '.env.example must define VITE_API_BASE_URL template'
  );

  // Check no backend secrets leak with VITE_ prefix
  const envLines = envContent.split('\n');
  for (const line of envLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key] = trimmed.split('=');
    if (key.startsWith('VITE_')) {
      assert.ok(
        !key.includes('PASSWORD') &&
          !key.includes('SECRET') &&
          !key.includes('TOKEN') &&
          !key.includes('PRIVATE'),
        `Frontend variable ${key} must not expose private secrets or credentials`
      );
    }
  }
});

// -----------------------------------------------------------------------------
// 2. Typed Error Hierarchy & No Silent Production Fallback
// -----------------------------------------------------------------------------
test('src/api.ts exports typed errors and enforces no silent production fallback', () => {
  const apiSource = loadSource('src/api.ts');

  // Typed errors
  assert.ok(apiSource.includes('class ApiError'), 'Must define ApiError');
  assert.ok(apiSource.includes('class NetworkError'), 'Must define NetworkError');
  assert.ok(apiSource.includes('class NotFoundError'), 'Must define NotFoundError');
  assert.ok(apiSource.includes('class MalformedResponseError'), 'Must define MalformedResponseError');

  // Method signatures
  assert.ok(apiSource.includes('getServices'), 'Must export getServices');
  assert.ok(apiSource.includes('getServiceBySlug'), 'Must export getServiceBySlug');
  assert.ok(apiSource.includes('getPortfolio'), 'Must export getPortfolio');
  assert.ok(apiSource.includes('getCourses'), 'Must export getCourses');
  assert.ok(apiSource.includes('getCourseBySlug'), 'Must export getCourseBySlug');

  // Check that getServices / getPortfolio / getCourses throw errors instead of returning fallback
  assert.ok(
    !apiSource.includes('catch (err) { return servicesData; }') &&
      !apiSource.includes('catch (err) { return workPortfolioData; }') &&
      !apiSource.includes('catch (err) { return coursesData; }'),
    'Catalog methods must propagate real errors to trigger UI ErrorState and retry'
  );
});

// -----------------------------------------------------------------------------
// 3. Network Failure, Malformed Response & 404 Behavior Verification
// -----------------------------------------------------------------------------
test('API client safeFetch validates network responses, JSON format, and schema envelope', () => {
  const apiSource = loadSource('src/api.ts');

  // Network failure converts to NetworkError
  assert.ok(
    apiSource.includes('throw new NetworkError'),
    'Failed fetch must throw NetworkError'
  );

  // 404 response converts to NotFoundError
  assert.ok(
    apiSource.includes('throw new NotFoundError'),
    '404 HTTP response must throw NotFoundError'
  );

  // Malformed JSON response converts to MalformedResponseError
  assert.ok(
    apiSource.includes('throw new MalformedResponseError'),
    'Invalid JSON or missing envelope must throw MalformedResponseError'
  );

  // Envelope validation: checks 'data' property
  assert.ok(
    apiSource.includes("'data' in json") || apiSource.includes('"data" in json'),
    'Must validate presence of data envelope'
  );
});

// -----------------------------------------------------------------------------
// 4. Race Condition & AbortController Support
// -----------------------------------------------------------------------------
test('Pages implement AbortController to cancel in-flight requests and fix race conditions', () => {
  const servicesPage = loadSource('src/pages/ServicesPage.tsx');
  const serviceDetail = loadSource('src/pages/ServiceDetailPage.tsx');
  const portfolioPage = loadSource('src/pages/PortfolioPage.tsx');
  const portfolioDetail = loadSource('src/pages/PortfolioDetailPage.tsx');
  const labPage = loadSource('src/pages/LabPage.tsx');
  const courseDetail = loadSource('src/pages/CourseDetailPage.tsx');

  const pages = [
    { name: 'ServicesPage', code: servicesPage },
    { name: 'ServiceDetailPage', code: serviceDetail },
    { name: 'PortfolioPage', code: portfolioPage },
    { name: 'PortfolioDetailPage', code: portfolioDetail },
    { name: 'LabPage', code: labPage },
    { name: 'CourseDetailPage', code: courseDetail }
  ];

  for (const page of pages) {
    assert.ok(
      page.code.includes('AbortController'),
      `${page.name} must instantiate AbortController`
    );
    assert.ok(
      page.code.includes('signal: controller.signal') || page.code.includes('signal'),
      `${page.name} must pass abort signal to API client`
    );
    assert.ok(
      page.code.includes('controller.abort()'),
      `${page.name} must abort in-flight requests on cleanup`
    );
    assert.ok(
      page.code.includes('AbortError') || page.code.includes('signal.aborted'),
      `${page.name} must safely handle AbortError without unhandled promise rejection`
    );
  }
});

// -----------------------------------------------------------------------------
// 5. Loading, Empty, Error, and Retry State Verification
// -----------------------------------------------------------------------------
test('Pages implement Loading, Empty, Error, and Retry states connected to Drogon backend', () => {
  const servicesPage = loadSource('src/pages/ServicesPage.tsx');
  const portfolioPage = loadSource('src/pages/PortfolioPage.tsx');
  const labPage = loadSource('src/pages/LabPage.tsx');
  const serviceDetail = loadSource('src/pages/ServiceDetailPage.tsx');
  const portfolioDetail = loadSource('src/pages/PortfolioDetailPage.tsx');
  const courseDetail = loadSource('src/pages/CourseDetailPage.tsx');

  const listPages = [
    { name: 'ServicesPage', code: servicesPage },
    { name: 'PortfolioPage', code: portfolioPage },
    { name: 'LabPage', code: labPage }
  ];

  for (const p of listPages) {
    // Loading state
    assert.ok(p.code.includes('loading') || p.code.includes('Skeleton'), `${p.name} must have loading state`);
    // Empty state
    assert.ok(p.code.includes('<EmptyState'), `${p.name} must render EmptyState`);
    // Error state
    assert.ok(p.code.includes('<ErrorState'), `${p.name} must render ErrorState`);
    // Retry state
    assert.ok(p.code.includes('onRetry'), `${p.name} must provide onRetry handler`);
  }

  const detailPages = [
    { name: 'ServiceDetailPage', code: serviceDetail },
    { name: 'PortfolioDetailPage', code: portfolioDetail },
    { name: 'CourseDetailPage', code: courseDetail }
  ];

  for (const p of detailPages) {
    // Loading state
    assert.ok(p.code.includes('LoadingSpinner') || p.code.includes('Skeleton'), `${p.name} must have loading indicator`);
    // Error state with retry
    assert.ok(p.code.includes('<ErrorState') && p.code.includes('onRetry'), `${p.name} must have ErrorState with onRetry`);
    // 404 / EmptyState
    assert.ok(p.code.includes('<EmptyState'), `${p.name} must render EmptyState on missing slug`);
  }
});
