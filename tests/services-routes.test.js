import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataSrc = fs.readFileSync(path.resolve(__dirname, '../src/data.ts'), 'utf8');
const detailSrc = fs.readFileSync(path.resolve(__dirname, '../src/pages/ServiceDetailPage.tsx'), 'utf8');
const appSrc = fs.readFileSync(path.resolve(__dirname, '../src/App.tsx'), 'utf8');
const contactSrc = fs.readFileSync(path.resolve(__dirname, '../src/pages/ContactPage.tsx'), 'utf8');

test('All 8 service slugs are defined in servicesData', () => {
  const expectedSlugs = [
    'topic-to-video',
    'video-editing',
    'video-to-shorts',
    'thumbnail-title',
    'social-media-consultation',
    'business-promotion',
    'pen-drive-data-recovery',
    'online-tech-support'
  ];

  for (const slug of expectedSlugs) {
    assert.ok(
      dataSrc.includes(`id: '${slug}'`),
      `servicesData must contain slug: ${slug}`
    );
  }
});

test('App.tsx registers the /services/:slug parameterized route', () => {
  assert.ok(
    appSrc.includes('path="/services/:slug"'),
    'App.tsx must register the /services/:slug route'
  );
  assert.ok(
    appSrc.includes('<ServiceDetailPage'),
    'App.tsx must render ServiceDetailPage for /services/:slug'
  );
});

test('ServiceDetailPage handles invalid slugs with EmptyState', () => {
  assert.ok(
    detailSrc.includes('EmptyState'),
    'ServiceDetailPage must render EmptyState for unknown slugs'
  );
  assert.ok(
    detailSrc.includes('Service Not Found'),
    'EmptyState title must be "Service Not Found"'
  );
  assert.ok(
    detailSrc.includes("navigate('/services')"),
    'EmptyState must provide a button to return to all services'
  );
});

test('Enquiry CTA links prefill selected service and ContactPage reads query params', () => {
  assert.ok(
    detailSrc.includes('`/contact?service=${encodeURIComponent(service.title)}`'),
    'ServiceDetailPage must link to /contact with encoded service query parameter'
  );

  assert.ok(
    contactSrc.includes('useSearchParams'),
    'ContactPage must import and use useSearchParams'
  );
  assert.ok(
    contactSrc.includes("searchParams.get('service')"),
    'ContactPage must read service query parameter'
  );
});

test('ServiceDetailPage manages dynamic document metadata and Open Graph / description', () => {
  assert.ok(
    detailSrc.includes('document.title = `${service.title} | MarsNova Studio Services`'),
    'Must update document.title dynamically'
  );
  assert.ok(
    detailSrc.includes("document.querySelector('meta[name=\"description\"]')"),
    'Must update meta description for SEO'
  );
});
