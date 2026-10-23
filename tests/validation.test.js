import test from 'node:test';
import assert from 'node:assert/strict';

function validateEnquiry(payload) {
  if (!payload.name || payload.name.trim().length < 2) {
    throw new Error('Name must be at least 2 characters long');
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!payload.email || !emailPattern.test(payload.email)) {
    throw new Error('Please provide a valid email address');
  }

  if (!payload.service) {
    throw new Error('Please select a service');
  }

  if (!payload.message || payload.message.trim().length < 5) {
    throw new Error('Message must be at least 5 characters long');
  }

  return true;
}

function buildWhatsAppUrl(payload, whatsappNumber = '917208591595') {
  const waText = `Hi MarsNova, I'm ${payload.name}. Email: ${payload.email}${payload.phone ? ` | Phone: ${payload.phone}` : ''}. I'm interested in *${payload.service}*. Message: "${payload.message}".`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waText)}`;
}

function validateRecoveryCaseId(caseId) {
  if (!caseId || typeof caseId !== 'string' || caseId.trim().length < 3) {
    throw new Error('Invalid Case ID format. Example: MN-REC-8291');
  }
  return caseId.trim().toUpperCase();
}

test('Enquiry validation accepts valid payload', () => {
  const valid = {
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    service: 'Video Editing',
    message: 'Need 10 YouTube shorts edited with captions.'
  };
  assert.equal(validateEnquiry(valid), true);
});

test('Enquiry validation rejects invalid name or email', () => {
  assert.throws(() => {
    validateEnquiry({ name: 'A', email: 'test@example.com', service: 'Video Editing', message: 'Hello' });
  }, /Name must be at least 2 characters/);

  assert.throws(() => {
    validateEnquiry({ name: 'Aarav', email: 'not-an-email', service: 'Video Editing', message: 'Hello' });
  }, /valid email address/);
});

test('WhatsApp URL builder formats encoded query parameters correctly', () => {
  const payload = {
    name: 'Priya',
    email: 'priya@example.com',
    phone: '+919876543210',
    service: 'Topic to Video',
    message: 'Can you help produce an educational course?'
  };
  const url = buildWhatsAppUrl(payload);
  assert.ok(url.startsWith('https://wa.me/917208591595?text='));
  assert.ok(url.includes(encodeURIComponent('Priya')));
  assert.ok(url.includes(encodeURIComponent('Topic to Video')));
});

test('Case ID validation checks format and capitalizes', () => {
  assert.equal(validateRecoveryCaseId('mn-rec-8291'), 'MN-REC-8291');
  assert.throws(() => {
    validateRecoveryCaseId(' ');
  }, /Invalid Case ID format/);
});
