import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const navbarSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/Navbar.tsx'), 'utf8');
const footerSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/Footer.tsx'), 'utf8');
const appSrc = fs.readFileSync(path.resolve(__dirname, '../src/App.tsx'), 'utf8');
const sharedCtaSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/SharedCTA.tsx'), 'utf8');

test('Navbar includes all 6 core navigation destinations', () => {
  const routes = ['/', '/services', '/portfolio', '/lab', '/about', '/contact'];
  for (const route of routes) {
    assert.ok(
      navbarSrc.includes(`path: '${route}'`),
      `Navbar should have navigation item for route ${route}`
    );
  }
});

test('App.tsx registers routes for all 6 core pages', () => {
  assert.ok(appSrc.includes('path="/"'), 'Route / must exist in App.tsx');
  assert.ok(appSrc.includes('path="/services"'), 'Route /services must exist in App.tsx');
  assert.ok(appSrc.includes('path="/portfolio"'), 'Route /portfolio must exist in App.tsx');
  assert.ok(appSrc.includes('path="/lab"'), 'Route /lab must exist in App.tsx');
  assert.ok(appSrc.includes('path="/about"'), 'Route /about must exist in App.tsx');
  assert.ok(appSrc.includes('path="/contact"'), 'Route /contact must exist in App.tsx');
});

test('Mobile navigation implements keyboard accessibility and ARIA semantics', () => {
  assert.ok(navbarSrc.includes('aria-expanded={mobileMenuOpen}'), 'Toggle button must indicate aria-expanded');
  assert.ok(navbarSrc.includes('aria-controls="mobile-nav-menu"'), 'Toggle button must indicate aria-controls');
  assert.ok(navbarSrc.includes("e.key === 'Escape'"), 'Navbar must handle Escape key to close mobile menu');
  assert.ok(navbarSrc.includes('toggleBtnRef.current?.focus()'), 'Must return focus to toggle button upon Escape');
});

test('Footer and CTA use verified company contact details only (never invented)', () => {
  // Verified details from project rules and screenshots
  assert.ok(footerSrc.includes('hello@marsnova.in'), 'Footer must contain verified email hello@marsnova.in');
  assert.ok(footerSrc.includes('@marsnova.in'), 'Footer must contain verified Instagram @marsnova.in');
  assert.ok(footerSrc.includes('+91 7208591595'), 'Footer must contain verified phone +91 7208591595');
  assert.ok(footerSrc.includes('https://wa.me/917208591595'), 'Footer must link to https://wa.me/917208591595');
  assert.ok(sharedCtaSrc.includes('https://wa.me/917208591595'), 'SharedCTA must link to verified WhatsApp number');

  // Verify no placeholder or fake phone numbers/emails
  assert.ok(!footerSrc.includes('123-456-7890'), 'Footer must not contain placeholder phone numbers');
  assert.ok(!footerSrc.includes('example.com'), 'Footer must not contain dummy example.com domains');
});
