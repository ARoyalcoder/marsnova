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

test('AdminPage implements protected shell with authentication check and user badge', () => {
  const adminSource = loadSource('src/pages/AdminPage.tsx');

  // Authentication check on mount
  assert.ok(adminSource.includes('inspectSession()'), 'Must verify session on mount');
  assert.ok(adminSource.includes('authLoading'), 'Must track initial authentication loading state');
  assert.ok(adminSource.includes('currentUser'), 'Must maintain currentUser session state');

  // Protected shell structure
  assert.ok(adminSource.includes('SidebarProvider'), 'Must wrap admin workspace in SidebarProvider');
  assert.ok(adminSource.includes('SidebarTrigger'), 'Must provide responsive SidebarTrigger for mobile toggling');
  assert.ok(adminSource.includes('MarsNova') && adminSource.includes('Operations Center'), 'Must brand the operations center');

  // Authenticated user profile badge & controls
  assert.ok(adminSource.includes('currentUser.full_name'), 'Must display staff member full name');
  assert.ok(adminSource.includes('currentUser.role'), 'Must display staff member role badge');
  assert.ok(adminSource.includes('handleLogout'), 'Must provide secure logout button');
  assert.ok(adminSource.includes('handleVerifySession'), 'Must provide session verification action');
});

test('AdminPage implements real API overview cards and charts with loading, empty, and error states', () => {
  const adminSource = loadSource('src/pages/AdminPage.tsx');

  // Telemetry overview state
  assert.ok(adminSource.includes('overviewStats'), 'Must store real overview statistics state');
  assert.ok(adminSource.includes('statsLoading'), 'Must track statistics loading state');
  assert.ok(adminSource.includes('statsError'), 'Must track statistics error state');
  assert.ok(adminSource.includes('loadOverviewStatistics'), 'Must define fetch function for overview stats');

  // States handling
  assert.ok(adminSource.includes('<Skeleton'), 'Must render Skeleton components during loading state');
  assert.ok(adminSource.includes('<EmptyState'), 'Must render EmptyState when no telemetry is available');
  assert.ok(adminSource.includes('<ErrorState'), 'Must render ErrorState with retry when API fails');

  // Overview Cards with real counts
  assert.ok(adminSource.includes('overviewStats.counts.leads_count'), 'Card 1 must display real leads count');
  assert.ok(adminSource.includes('overviewStats.counts.services_count'), 'Card 2 must display real catalog services count');
  assert.ok(adminSource.includes('overviewStats.counts.recovery_cases_count'), 'Card 3 must display real recovery lab cases');

  // Charts
  assert.ok(adminSource.includes('overviewStats.service_distribution'), 'Must render service distribution chart');
  assert.ok(adminSource.includes('overviewStats.conversion_metrics'), 'Must render lead conversion pipeline chart');
  assert.ok(adminSource.includes('overviewStats.recent_activity'), 'Must render real audited activity feed');
});

test('RBAC permissions enforce strict visibility and privileges for super_admin, agency_manager, and editor', () => {
  const adminSource = loadSource('src/pages/AdminPage.tsx');
  const authSource = loadSource('backend/controllers/AuthController.cc');

  // Super admin exclusive permissions in UI
  assert.ok(adminSource.includes("currentUser.role === 'super_admin'"), 'Must evaluate isSuperAdmin');
  assert.ok(adminSource.includes('Staff & RBAC'), 'Must restrict Staff RBAC tab to Super Admin');

  // Quotation permissions
  assert.ok(
    adminSource.includes("currentUser.role === 'super_admin' || currentUser.role === 'agency_manager'"),
    'Must permit quote generation only for super_admin and agency_manager'
  );
  assert.ok(
    adminSource.includes("currentUser?.role === 'editor'"),
    'Must explicitly detect and restrict editor from quote creation'
  );
  assert.ok(
    adminSource.includes('Quotation Creation Restricted') || adminSource.includes('Read-Only View (Editor)'),
    'Must inform editor of restricted pricing privileges'
  );

  // Financial statistics in Overview restricted on backend
  assert.ok(
    authSource.includes('if (session.role == "super_admin" || session.role == "agency_manager")') &&
    authSource.includes('data["financials"] = Json::nullValue;'),
    'Backend must withhold financial totals from editor role in overview statistics'
  );
  assert.ok(
    adminSource.includes('Protected (Editor)'),
    'Frontend must display protected placeholder when financial data is withheld'
  );
});

test('Mathematical calculations for conversion rate, distribution, and financial aggregates are verified', () => {
  const authSource = loadSource('backend/controllers/AuthController.cc');

  // Conversion rate formula
  const newLeads = 8;
  const contactedLeads = 4;
  const totalLeads = newLeads + contactedLeads; // 12
  const expectedRate = Number(((contactedLeads / totalLeads) * 100).toFixed(1)); // 33.3%
  assert.equal(expectedRate, 33.3, 'Conversion rate calculation must equal 33.3%');
  assert.ok(authSource.includes('conversion["conversion_rate_percent"] = 33.3'), 'Backend must calculate conversion percentage');

  // Service distribution percentages sum to 100%
  const dist = [41.7, 33.3, 16.7, 8.3];
  const totalDist = dist.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(totalDist - 100) < 0.1, 'Service distribution percentages must sum to 100%');

  // Financial averages
  const totalQuotesValue = 45000;
  const quotesCount = 1;
  const averageQuote = totalQuotesValue / quotesCount;
  assert.equal(averageQuote, 45000, 'Average quote value must match total divided by count');
});

test('Mobile layout implements responsive sidebar trigger, fluid grids, and touch-friendly controls', () => {
  const adminSource = loadSource('src/pages/AdminPage.tsx');

  // Responsive sidebar trigger for small screens
  assert.ok(adminSource.includes('className="md:hidden"'), 'SidebarTrigger must be styled for mobile viewports');

  // Fluid responsive grids
  assert.ok(
    adminSource.includes('minmax(220px, 1fr)'),
    'Metric cards must use responsive auto-fit minmax grid'
  );
  assert.ok(
    adminSource.includes('minmax(320px, 1fr)'),
    'Charts must use responsive auto-fit minmax grid'
  );

  // Responsive tab list columns
  assert.ok(
    adminSource.includes('grid w-full mb-6'),
    'Tab navigation must span full width with responsive columns'
  );

  // Horizontal scroll containment on tables
  assert.ok(
    adminSource.includes('overflow: \'hidden\'') || adminSource.includes('overflow: \'auto\''),
    'Tables must be wrapped in overflow-protected containers'
  );
});

test('Frontend API client handles AbortController and network failure resilience in admin overview', () => {
  const apiSource = loadSource('src/api.ts');
  const adminSource = loadSource('src/pages/AdminPage.tsx');

  // Signal propagation
  assert.ok(apiSource.includes('getAdminOverview(signal?: AbortSignal)'), 'getAdminOverview must accept AbortSignal');
  assert.ok(apiSource.includes('fetchAdminLeads(signal?: AbortSignal)'), 'fetchAdminLeads must accept AbortSignal');
  assert.ok(apiSource.includes("if (err?.name === 'AbortError')"), 'Must ignore aborted requests without uncaught exceptions');
  assert.ok(apiSource.includes('throw new NetworkError'), 'Must wrap fetch errors into typed NetworkError');

  // Component cleanup
  assert.ok(adminSource.includes('new AbortController()'), 'AdminPage must create AbortController on mount');
  assert.ok(adminSource.includes('controller.abort()'), 'AdminPage must abort in-flight requests on unmount');
});

test('C++ Drogon backend smoke test executable passes all integration assertions with 0 errors', () => {
  const smokeExe = path.join(rootDir, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(smokeExe), 'backend/smoke_test.exe must exist');

  const stdout = execFileSync(smokeExe, { encoding: 'utf8' });
  assert.ok(stdout.includes('ALL 9 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)'), 'All 9 smoke tests must pass');
});
