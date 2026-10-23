import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UI_DIR = path.resolve(__dirname, '../src/components/ui');
const SRC_DIR = path.resolve(__dirname, '../src');

test('All 14 requested shadcn UI component files exist', () => {
  const expectedComponents = [
    'button.tsx',
    'card.tsx',
    'input.tsx',
    'textarea.tsx',
    'select.tsx',
    'dialog.tsx',
    'dropdown-menu.tsx',
    'table.tsx',
    'badge.tsx',
    'tabs.tsx',
    'tooltip.tsx',
    'sonner.tsx',
    'sidebar.tsx',
    'skeleton.tsx'
  ];

  for (const comp of expectedComponents) {
    const fullPath = path.join(UI_DIR, comp);
    assert.ok(fs.existsSync(fullPath), `Expected component file ${comp} to exist in src/components/ui/`);
  }
});

test('src/components/ui/index.ts exports all 14 components', () => {
  const indexPath = path.join(UI_DIR, 'index.ts');
  assert.ok(fs.existsSync(indexPath), 'src/components/ui/index.ts must exist');

  const content = fs.readFileSync(indexPath, 'utf8');

  // Primitives and component exports
  const expectedExports = [
    'button',
    'card',
    'input',
    'textarea',
    'select',
    'dialog',
    'dropdown-menu',
    'table',
    'badge',
    'tabs',
    'tooltip',
    'sonner',
    'sidebar',
    'skeleton'
  ];

  for (const exp of expectedExports) {
    assert.ok(
      content.includes(`./${exp}`) || content.includes(`/${exp}`),
      `index.ts should re-export from ./${exp}`
    );
  }
});

test('shadcn components are actively integrated into website components and pages', () => {
  const appSrc = fs.readFileSync(path.join(SRC_DIR, 'App.tsx'), 'utf8');
  const navbarSrc = fs.readFileSync(path.join(SRC_DIR, 'components/Navbar.tsx'), 'utf8');
  const modalSrc = fs.readFileSync(path.join(SRC_DIR, 'components/RecoveryTrackerModal.tsx'), 'utf8');
  const adminSrc = fs.readFileSync(path.join(SRC_DIR, 'pages/AdminPage.tsx'), 'utf8');
  const contactSrc = fs.readFileSync(path.join(SRC_DIR, 'pages/ContactPage.tsx'), 'utf8');

  // 1. sonner Toaster in App.tsx
  assert.ok(appSrc.includes('<Toaster'), 'App.tsx must mount sonner <Toaster />');

  // 2. tooltip & dropdown-menu in Navbar.tsx
  assert.ok(navbarSrc.includes('TooltipProvider'), 'Navbar.tsx must use TooltipProvider');
  assert.ok(navbarSrc.includes('Tooltip'), 'Navbar.tsx must use Tooltip');
  assert.ok(navbarSrc.includes('DropdownMenu'), 'Navbar.tsx must use DropdownMenu');

  // 3. dialog, tabs, table, skeleton in RecoveryTrackerModal.tsx
  assert.ok(modalSrc.includes('Dialog'), 'RecoveryTrackerModal.tsx must use Dialog');
  assert.ok(modalSrc.includes('Tabs'), 'RecoveryTrackerModal.tsx must use Tabs');
  assert.ok(modalSrc.includes('Table'), 'RecoveryTrackerModal.tsx must use Table');
  assert.ok(modalSrc.includes('Skeleton'), 'RecoveryTrackerModal.tsx must use Skeleton');

  // 4. sidebar, table, tabs in AdminPage.tsx
  assert.ok(adminSrc.includes('SidebarProvider'), 'AdminPage.tsx must use SidebarProvider');
  assert.ok(adminSrc.includes('Sidebar'), 'AdminPage.tsx must use Sidebar');
  assert.ok(adminSrc.includes('Table'), 'AdminPage.tsx must use Table');
  assert.ok(adminSrc.includes('Tabs'), 'AdminPage.tsx must use Tabs');

  // 5. sonner toast in ContactPage.tsx and RecoveryTrackerModal.tsx
  assert.ok(contactSrc.includes('toast.success'), 'ContactPage.tsx must trigger toast.success');
  assert.ok(contactSrc.includes('toast.error'), 'ContactPage.tsx must trigger toast.error');
  assert.ok(modalSrc.includes('toast.success'), 'RecoveryTrackerModal.tsx must trigger toast.success');
});

test('components.json contains valid shadcn configuration and aliases', () => {
  const configPath = path.resolve(__dirname, '../components.json');
  assert.ok(fs.existsSync(configPath), 'components.json must exist');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert.ok(config.style === 'new-york' || config.style === 'default', 'Must use valid style');
  assert.equal(config.aliases.components, '@/components');
  assert.equal(config.aliases.utils, '@/lib/utils');
  assert.equal(config.aliases.ui, '@/components/ui');
});
