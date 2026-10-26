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
// Course Data & Catalogue Integrity Tests
// -----------------------------------------------------------------------------
test('coursesData contains all 6 core courses with complete curriculum and outcomes', () => {
  const dataContent = loadSource('src/data.ts');

  const expectedCourses = [
    'computer-fundamentals',
    'ai-tools-automation',
    'video-editing-course',
    'graphic-design',
    'social-media-growth',
    'practical-projects'
  ];

  for (const slug of expectedCourses) {
    assert.ok(
      dataContent.includes(`id: '${slug}'`),
      `coursesData must include course id: ${slug}`
    );
  }

  // Ensure learning outcomes and curriculum are defined
  assert.ok(dataContent.includes('learningOutcomes: ['), 'Must include learningOutcomes');
  assert.ok(dataContent.includes('curriculum: ['), 'Must include curriculum');
  assert.ok(dataContent.includes('prerequisites:'), 'Must include prerequisites');
  assert.ok(dataContent.includes('targetAudience:'), 'Must include targetAudience');
});

// -----------------------------------------------------------------------------
// Route Configuration Tests
// -----------------------------------------------------------------------------
test('App.tsx registers /lab and /lab/courses/:slug routes', () => {
  const appContent = loadSource('src/App.tsx');

  assert.ok(
    appContent.includes('<Route path="/lab" element={<LabPage />} />'),
    'App.tsx must register /lab route'
  );
  assert.ok(
    appContent.includes('path="/lab/courses/:slug"'),
    'App.tsx must register /lab/courses/:slug route'
  );
  assert.ok(
    appContent.includes('CourseDetailPage'),
    'App.tsx must import and render CourseDetailPage'
  );
});

// -----------------------------------------------------------------------------
// LabPage Catalogue & Filter Tests
// -----------------------------------------------------------------------------
test('LabPage implements categories, filters, empty state, and media resilience', () => {
  const labContent = loadSource('src/pages/LabPage.tsx');

  // Categories
  assert.ok(labContent.includes("'Foundations'"), 'Must include Foundations category');
  assert.ok(labContent.includes("'AI & Tech'"), 'Must include AI & Tech category');
  assert.ok(labContent.includes("'Creative Production'"), 'Must include Creative Production category');
  assert.ok(labContent.includes("'Design & Branding'"), 'Must include Design & Branding category');
  assert.ok(labContent.includes("'Marketing & Growth'"), 'Must include Marketing & Growth category');

  // Filtering & Empty State
  assert.ok(labContent.includes('activeCategory === cat'), 'Must support interactive activeCategory state');
  assert.ok(labContent.includes('<EmptyState'), 'Must render EmptyState when category has no matches');

  // Link to details and prefilled enquiry
  // The API's ids ("c-1") are not routable; the course page looks courses up by slug.
  assert.ok(labContent.includes('/lab/courses/${course.slug || course.id}'), 'Must link cards to /lab/courses/:slug');
  assert.ok(!labContent.includes('/lab/courses/${course.id}'), 'Must not link cards by the API id');
  assert.ok(labContent.includes('/contact?service='), 'Must link enquiry to /contact?service=...');

  // Media resilience
  assert.ok(labContent.includes('onError={handleImageError}'), 'Lab hero image must handle load failures');

  // Metadata
  assert.ok(
    labContent.includes("document.title = 'MarsNova Lab | Practical Computer, AI & Creative Courses'"),
    'Must set dynamic title'
  );
});

// -----------------------------------------------------------------------------
// CourseDetailPage Tests
// -----------------------------------------------------------------------------
test('CourseDetailPage safely handles unknown slugs with EmptyState', () => {
  const detailContent = loadSource('src/pages/CourseDetailPage.tsx');

  assert.ok(detailContent.includes('useParams<{ slug: string }>()'), 'Must read route slug');
  assert.ok(detailContent.includes('if (!course)'), 'Must check if course exists');
  assert.ok(detailContent.includes('<EmptyState'), 'Must render EmptyState for invalid/unknown course slugs');
  assert.ok(detailContent.includes('Course Not Found'), 'Must present informative title on not found');
  assert.ok(detailContent.includes("navigate('/lab')"), 'Must offer return navigation to catalogue');
});

test('CourseDetailPage displays learning outcomes, curriculum, and prefilled enquiry CTA', () => {
  const detailContent = loadSource('src/pages/CourseDetailPage.tsx');

  // Curriculum & Outcomes
  assert.ok(detailContent.includes('course.learningOutcomes'), 'Must render learning outcomes');
  assert.ok(detailContent.includes('course.curriculum'), 'Must render curriculum breakdown');
  assert.ok(detailContent.includes('course.prerequisites'), 'Must render prerequisites');
  assert.ok(detailContent.includes('course.targetAudience'), 'Must render target audience');

  // Course Enquiry CTAs
  assert.ok(
    detailContent.includes('to={encodedEnquiryUrl}'),
    'Must provide primary enquiry link with prefilled course title'
  );
  assert.ok(
    detailContent.includes('wa.me/917208591595'),
    'Must provide WhatsApp enquiry link with prefilled message'
  );

  // Dynamic Metadata
  assert.ok(
    detailContent.includes('document.title = `${course.title} | MarsNova Lab Course`'),
    'Must set dynamic document title'
  );
});

test('Course catalogue respects scope boundaries: no paid LMS or fake instructor claims', () => {
  const detailContent = loadSource('src/pages/CourseDetailPage.tsx');
  const labContent = loadSource('src/pages/LabPage.tsx');

  // No paid LMS / e-commerce mechanics
  const combined = labContent + detailContent;
  assert.ok(!combined.includes('cart'), 'Must not contain shopping cart');
  assert.ok(!combined.includes('payment_gateway'), 'Must not integrate payment processors');
  assert.ok(!combined.includes('stripe'), 'Must not integrate payment processors');
  assert.ok(!combined.includes('razorpay'), 'Must not integrate payment processors');
  assert.ok(!combined.includes('buy_now'), 'Must not contain buy now transactions');

  // Transparent catalogue messaging
  assert.ok(
    detailContent.includes('Public Studio Catalogue'),
    'Must identify as a public studio catalogue'
  );
  assert.ok(
    detailContent.includes('Enquire for Next Batch') || detailContent.includes('Enquire for Free'),
    'Calls to action must focus on inquiry rather than payment transaction'
  );
});
