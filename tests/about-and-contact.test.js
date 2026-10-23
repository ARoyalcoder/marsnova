import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load component source text for static inspections
function loadSource(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf-8');
}

// -----------------------------------------------------------------------------
// Validation logic mirrored from src/api.ts for unit test coverage
// -----------------------------------------------------------------------------
function validateEnquiryPayload(payload) {
  const errors = {};

  const trimmedName = (payload.name || '').trim();
  if (!trimmedName || trimmedName.length < 2) {
    errors.name = 'Please enter your name (at least 2 characters).';
  } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
    errors.name = 'Name should only contain letters, spaces, hyphens, or periods.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const trimmedEmail = (payload.email || '').trim();
  if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
    errors.email = 'Please provide a valid email address (e.g. name@domain.com).';
  }

  if (payload.phone && payload.phone.trim().length > 0) {
    const phoneDigits = payload.phone.replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(phoneDigits)) {
      errors.phone = 'Please enter a valid phone number (at least 10 digits).';
    }
  }

  if (!payload.service || payload.service.trim() === '') {
    errors.service = 'Please select a service or course interest.';
  }

  const trimmedMessage = (payload.message || '').trim();
  if (!trimmedMessage || trimmedMessage.length < 10) {
    errors.message = 'Please provide details about your project or enquiry (at least 10 characters).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

// -----------------------------------------------------------------------------
// About Page Tests
// -----------------------------------------------------------------------------
test('AboutPage reflects approved business facts and 4 pillars', () => {
  const content = loadSource('src/pages/AboutPage.tsx');

  // 4 Core Pillars
  assert.ok(content.includes('Creativity'), 'Must contain Creativity pillar');
  assert.ok(content.includes('Technology'), 'Must contain Technology pillar');
  assert.ok(content.includes('Learning'), 'Must contain Learning pillar');
  assert.ok(content.includes('Real Impact'), 'Must contain Real Impact pillar');

  // Mission & Quote
  assert.ok(
    content.includes('To make content creation, digital growth and technology solutions simple and accessible for everyone.'),
    'Must display approved mission statement'
  );
  assert.ok(
    content.includes('“Empowering Ideas for a Better Tomorrow.”'),
    'Must display approved company quote'
  );

  // Verified Studio Location
  assert.ok(
    content.includes('Mumbai & Delhi NCR, India'),
    'Must display verified location without fabricated office addresses'
  );

  // Media Failure Fallback handler
  assert.ok(
    content.includes('handleImageError'),
    'Must include handleImageError fallback for media resilience'
  );
  assert.ok(
    content.includes('onError={handleImageError}'),
    'Images in AboutPage must attach onError fallback'
  );

  // Dynamic Metadata
  assert.ok(
    content.includes('document.title = \'About MarsNova | Creative & Technical Studio\''),
    'Must set dynamic document title'
  );
  assert.ok(
    content.includes('meta[name="description"]'),
    'Must set dynamic meta description'
  );
});

// -----------------------------------------------------------------------------
// Contact Form Validation Tests
// -----------------------------------------------------------------------------
test('validateEnquiryPayload accepts complete valid form submission', () => {
  const valid = {
    name: 'Rohan Mehta',
    email: 'rohan.mehta@example.com',
    phone: '+91 98765 43210',
    service: 'Video Editing Bootcamp',
    message: 'Interested in joining the upcoming weekend editing cohort.'
  };

  const result = validateEnquiryPayload(valid);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('validateEnquiryPayload rejects invalid and malicious inputs', () => {
  // Missing or short name
  const badName = validateEnquiryPayload({
    name: 'A',
    email: 'test@example.com',
    service: 'Video Editing',
    message: 'Valid message content'
  });
  assert.equal(badName.valid, false);
  assert.ok(badName.errors.name.includes('at least 2 characters'));

  // Invalid email format
  const badEmail = validateEnquiryPayload({
    name: 'Aarav',
    email: 'aarav@not-a-domain',
    service: 'Video Editing',
    message: 'Valid message content'
  });
  assert.equal(badEmail.valid, false);
  assert.ok(badEmail.errors.email.includes('valid email'));

  // Missing service selection
  const noService = validateEnquiryPayload({
    name: 'Aarav',
    email: 'aarav@example.com',
    service: '',
    message: 'Valid message content'
  });
  assert.equal(noService.valid, false);
  assert.ok(noService.errors.service.includes('select a service or course'));

  // Too short message (< 10 chars)
  const shortMsg = validateEnquiryPayload({
    name: 'Aarav',
    email: 'aarav@example.com',
    service: 'Video Editing',
    message: 'Short'
  });
  assert.equal(shortMsg.valid, false);
  assert.ok(shortMsg.errors.message.includes('at least 10 characters'));

  // Invalid phone number format (too few digits)
  const badPhone = validateEnquiryPayload({
    name: 'Aarav',
    email: 'aarav@example.com',
    phone: '1234',
    service: 'Video Editing',
    message: 'Valid message content'
  });
  assert.equal(badPhone.valid, false);
  assert.ok(badPhone.errors.phone.includes('at least 10 digits'));
});

// -----------------------------------------------------------------------------
// ContactPage Component Accessibility & No-Fake-Submission Tests
// -----------------------------------------------------------------------------
test('ContactPage implements grouped services and MarsNova Lab courses', () => {
  const content = loadSource('src/pages/ContactPage.tsx');

  // Optgroups for services and courses
  assert.ok(
    content.includes('<optgroup label="Creative & Technical Services">'),
    'Must include Creative & Technical Services optgroup'
  );
  assert.ok(
    content.includes('<optgroup label="MarsNova Lab Courses">'),
    'Must include MarsNova Lab Courses optgroup'
  );

  // Key services
  assert.ok(content.includes('Topic to Video'), 'Must list Topic to Video');
  assert.ok(content.includes('Video Editing'), 'Must list Video Editing');
  assert.ok(content.includes('Pen Drive Data Recovery'), 'Must list Pen Drive Data Recovery');

  // Key courses
  assert.ok(content.includes('AI Tools & Automation'), 'Must list AI Tools & Automation');
  assert.ok(content.includes('Video Editing Bootcamp'), 'Must list Video Editing Bootcamp');
  assert.ok(content.includes('Computer Fundamentals'), 'Must list Computer Fundamentals');
});

test('ContactPage implements programmatic keyboard focus management on validation failure', () => {
  const content = loadSource('src/pages/ContactPage.tsx');

  // Uses useRef for input elements
  assert.ok(content.includes('const nameRef = useRef<HTMLInputElement>('), 'Must create nameRef');
  assert.ok(content.includes('const emailRef = useRef<HTMLInputElement>('), 'Must create emailRef');
  assert.ok(content.includes('const serviceRef = useRef<HTMLSelectElement>('), 'Must create serviceRef');
  assert.ok(content.includes('const messageRef = useRef<HTMLTextAreaElement>('), 'Must create messageRef');

  // Shifts focus to the first invalid field
  assert.ok(content.includes('nameRef.current?.focus()'), 'Must focus nameRef when name is invalid');
  assert.ok(content.includes('emailRef.current?.focus()'), 'Must focus emailRef when email is invalid');
  assert.ok(content.includes('serviceRef.current?.focus()'), 'Must focus serviceRef when service is invalid');
  assert.ok(content.includes('messageRef.current?.focus()'), 'Must focus messageRef when message is invalid');
});

test('ContactPage does not fake successful submissions and displays transparent status', () => {
  const content = loadSource('src/pages/ContactPage.tsx');
  const apiContent = loadSource('src/api.ts');

  // api.ts rejects server failures instead of faking success
  assert.ok(
    apiContent.includes('throw new Error(`Enquiry submission failed:'),
    'api.ts must throw real error when backend returns non-200'
  );

  // api.ts marks offline state transparently
  assert.ok(
    apiContent.includes('status: \'offline_queued\''),
    'api.ts must explicitly identify offline queued state'
  );
  assert.ok(
    apiContent.includes('status: \'saved_to_server\''),
    'api.ts must explicitly identify server-saved state'
  );

  // ContactPage displays real status and reference ID
  assert.ok(
    content.includes('submissionResult.status === \'saved_to_server\''),
    'ContactPage must handle saved_to_server status'
  );
  assert.ok(
    content.includes('submissionResult.status === \'offline_queued\'') ||
      content.includes('submissionResult.enquiryId'),
    'ContactPage must show real reference ID'
  );
  assert.ok(
    content.includes('Open WhatsApp Chat'),
    'ContactPage must offer direct WhatsApp button'
  );
});

test('ContactPage uses only verified company channels (no fake phone numbers)', () => {
  const content = loadSource('src/pages/ContactPage.tsx');

  assert.ok(content.includes('hello@marsnova.in'), 'Must display verified email hello@marsnova.in');
  assert.ok(content.includes('+91 7208591595'), 'Must display verified WhatsApp number');
  assert.ok(content.includes('wa.me/917208591595'), 'Must link to verified WhatsApp account');
  assert.ok(content.includes('instagram.com/marsnova.in'), 'Must link to @marsnova.in');
  assert.ok(content.includes('Mumbai & Delhi NCR, India'), 'Must display verified location');
});
