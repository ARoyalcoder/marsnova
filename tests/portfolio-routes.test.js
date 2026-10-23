import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataSrc = fs.readFileSync(path.resolve(__dirname, '../src/data.ts'), 'utf8');
const detailSrc = fs.readFileSync(path.resolve(__dirname, '../src/pages/PortfolioDetailPage.tsx'), 'utf8');
const listSrc = fs.readFileSync(path.resolve(__dirname, '../src/pages/PortfolioPage.tsx'), 'utf8');
const appSrc = fs.readFileSync(path.resolve(__dirname, '../src/App.tsx'), 'utf8');

test('App.tsx registers the /portfolio and /portfolio/:slug routes', () => {
  assert.ok(appSrc.includes('path="/portfolio"'), 'Must register /portfolio');
  assert.ok(appSrc.includes('path="/portfolio/:slug"'), 'Must register /portfolio/:slug');
  assert.ok(appSrc.includes('<PortfolioDetailPage'), 'Must mount PortfolioDetailPage');
});

test('Portfolio items have real approved content (challenge, approach, outcome, metrics)', () => {
  assert.ok(dataSrc.includes('challenge:'), 'Portfolio data must contain challenge breakdown');
  assert.ok(dataSrc.includes('approach:'), 'Portfolio data must contain approach strategy');
  assert.ok(dataSrc.includes('outcome:'), 'Portfolio data must contain verified outcome');
  assert.ok(dataSrc.includes('metrics:'), 'Portfolio data must contain metrics array');
  assert.ok(dataSrc.includes('deliverables:'), 'Portfolio data must contain deliverables list');
  assert.ok(dataSrc.includes('tools:'), 'Portfolio data must contain tools used');
});

test('PortfolioDetailPage safely handles invalid slugs with accessible EmptyState', () => {
  assert.ok(
    detailSrc.includes('EmptyState'),
    'Must render EmptyState for nonexistent case studies'
  );
  assert.ok(
    detailSrc.includes('Case Study Not Found'),
    'EmptyState title must be "Case Study Not Found"'
  );
  assert.ok(
    detailSrc.includes("navigate('/portfolio')"),
    'Must provide button to navigate back to /portfolio'
  );
});

test('Portfolio items handle media failures gracefully via handleImageError', () => {
  assert.ok(detailSrc.includes('handleImageError'), 'PortfolioDetailPage must handle image errors');
  assert.ok(listSrc.includes('handleImageError'), 'PortfolioPage must handle image errors');
  assert.ok(detailSrc.includes('onError={'), 'Thumbnail img must attach onError handler');
});

test('Portfolio cards support keyboard triggers (Enter / Space) for accessible playback', () => {
  assert.ok(detailSrc.includes("e.key === 'Enter' || e.key === ' '"), 'Detail media must support keyboard playback');
  assert.ok(listSrc.includes("e.key === 'Enter' || e.key === ' '"), 'Listing cards must support keyboard playback');
});

test('Portfolio detail page links to contact enquiry with prefilled service context', () => {
  assert.ok(
    detailSrc.includes('`/contact?service=${encodeURIComponent(work.category)}`'),
    'Must link to contact form with prefilled service category'
  );
});
