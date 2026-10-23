import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const homeSrc = fs.readFileSync(path.resolve(__dirname, '../src/pages/HomePage.tsx'), 'utf8');

test('HomePage contains all sections matching the visual specification', () => {
  // 1. Hero
  assert.ok(homeSrc.includes('Your Ideas'), 'Hero must contain "Your Ideas"');
  assert.ok(homeSrc.includes('Our Creation'), 'Hero must contain "Our Creation"');
  assert.ok(homeSrc.includes('CREATE · LEARN · GROW') || homeSrc.includes('Create · Learn · Grow'), 'Hero must contain eyebrow tag');

  // 2. Statistics Bar
  assert.ok(homeSrc.includes('statsData.map'), 'Hero must render stats bar');

  // 3. Our Services Preview
  assert.ok(homeSrc.includes('Our Services'), 'Must contain Our Services heading');
  assert.ok(homeSrc.includes('Video Creation & Editing'), 'Must contain Video Creation & Editing');
  assert.ok(homeSrc.includes('Social Media Services'), 'Must contain Social Media Services');
  assert.ok(homeSrc.includes('Business Promotion'), 'Must contain Business Promotion');
  assert.ok(homeSrc.includes('Tech Services'), 'Must contain Tech Services');

  // 4. Our Work / Portfolio Preview
  assert.ok(homeSrc.includes('Our Work'), 'Must contain Our Work heading');
  assert.ok(homeSrc.includes('workTabs'), 'Must contain filterable category tabs');
  assert.ok(homeSrc.includes('/portfolio'), 'Must link to /portfolio for more work');

  // 5. About MarsNova
  assert.ok(homeSrc.includes('About MarsNova'), 'Must contain About MarsNova');
  assert.ok(homeSrc.includes('Ideas reach further when creativity meets technology'), 'Must include Mars quote');
  assert.ok(homeSrc.includes('Creative Approach'), 'Must include Creative Approach');
  assert.ok(homeSrc.includes('Practical Solutions'), 'Must include Practical Solutions');
  assert.ok(homeSrc.includes('Trusted Support'), 'Must include Trusted Support');

  // 6. MarsNova Lab Preview
  assert.ok(homeSrc.includes('MarsNova Lab'), 'Must include MarsNova Lab section');
  assert.ok(homeSrc.includes('labPreviewCourses'), 'Must include preview courses');
  assert.ok(homeSrc.includes('/lab'), 'Must link to /lab');

  // 7. Shared CTA
  assert.ok(homeSrc.includes('<SharedCTA'), 'Must render final SharedCTA component');
});

test('HomePage enforces media failure resilience with fallback handling', () => {
  assert.ok(homeSrc.includes('handleImageError'), 'Must define image error handler');
  assert.ok(homeSrc.includes('onError={handleImageError}'), 'Image elements must attach onError handler');
});

test('HomePage contains approved statistics without fabricated testimonials', () => {
  const dataSrc = fs.readFileSync(path.resolve(__dirname, '../src/data.ts'), 'utf8');
  assert.ok(dataSrc.includes('100+'), 'Contains 100+ metric');
  assert.ok(dataSrc.includes('Videos Created'), 'Contains Videos Created');
  assert.ok(dataSrc.includes('35K+'), 'Contains 35K+ metric');
  assert.ok(dataSrc.includes('Instagram Followers'), 'Contains Instagram Followers');
  assert.ok(dataSrc.includes('Happy Creators'), 'Contains Happy Creators');
  assert.ok(dataSrc.includes('Trusted by Brands'), 'Contains Trusted by Brands');

  // Ensure no fabricated testimonials
  assert.ok(!homeSrc.includes('Testimonials'), 'No fabricated testimonials section');
  assert.ok(!homeSrc.includes('Customer Review'), 'No fake customer review quotes');
});
