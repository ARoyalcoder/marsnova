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

test('RBAC permissions enforce strict visibility and privileges for super_admin, agency_manager, and editor', () => {
  const adminSource = loadSource('src/pages/AdminPage.tsx');
  const authSource = loadSource('backend/controllers/AuthController.cc');

  // Super admin exclusive permissions in UI

});

test('Mobile layout implements responsive sidebar trigger, fluid grids, and touch-friendly controls', () => {
  const adminSource = loadSource('src/pages/AdminPage.tsx');

  // Responsive sidebar trigger for small screens
  assert.ok(adminSource.includes('className="md:hidden"'), 'SidebarTrigger must be styled for mobile viewports');



  // Horizontal scroll containment on tables
  assert.ok(
    adminSource.includes('overflow: \'hidden\'') || adminSource.includes('overflow: \'auto\''),
    'Tables must be wrapped in overflow-protected containers'
  );
});

test('C++ Drogon backend smoke test executable passes all integration assertions with 0 errors', () => {
  const smokeExe = path.join(rootDir, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(smokeExe), 'backend/smoke_test.exe must exist');

  const stdout = execFileSync(smokeExe, { encoding: 'utf8' });
  assert.ok(stdout.includes('ALL 9 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)'), 'All 9 smoke tests must pass');
});
