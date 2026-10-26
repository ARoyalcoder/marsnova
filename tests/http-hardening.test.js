import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// These tests start the real backend executable and talk to it over TCP, because the bugs they pin
// (process crashes, hangs, CORS, request limits, predictable tokens) only exist at that level.
// Like the smoke-test suites, they need backend/marsnova_backend.exe built from the current source.

const rootDir = path.resolve(__dirname, '..');
const backendExe = process.env.MARSNOVA_BACKEND_EXE || path.join(rootDir, 'backend', 'marsnova_backend.exe');
const BASE_CONFIG = path.join(rootDir, 'backend', 'config.json');
const ADMIN_EMAIL = 'hardening@marsnova.in';
const ADMIN_PASSWORD = 'Hardening-Test-2026-pw';

const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

const request = ({ port, method = 'GET', pathname = '/', headers = {}, body }) =>
  new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: pathname, headers, agent: false, timeout: 15000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('timeout', () => req.destroy(new Error('request timed out')));
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });

// Sends raw bytes and returns everything the server answers until it closes the connection.
const rawExchange = (port, payload, { half = false } = {}) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const sock = net.connect(port, '127.0.0.1', () => {
      sock.write(payload);
      if (half) sock.end();
    });
    sock.setTimeout(10000, () => sock.destroy(new Error('raw exchange timed out')));
    sock.on('data', (c) => chunks.push(c));
    sock.on('error', reject);
    sock.on('close', () => resolve(Buffer.concat(chunks).toString('latin1')));
  });

async function startServer({ corsOrigins = ['https://app.example.test'], maxBody = '1M' } = {}) {
  assert.ok(fs.existsSync(backendExe), 'backend/marsnova_backend.exe must be built from the current source');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mn-hardening-'));
  const config = JSON.parse(fs.readFileSync(BASE_CONFIG, 'utf8'));
  config.custom_config = { ...(config.custom_config || {}), cors_allowed_origins: corsOrigins };
  config.app = { ...(config.app || {}), client_max_body_size: maxBody };
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config));

  const port = await freePort();
  const child = spawn(backendExe, [], {
    cwd: dir,
    env: { ...process.env, PORT: String(port), MARSNOVA_BOOTSTRAP_ADMIN_EMAIL: ADMIN_EMAIL, MARSNOVA_BOOTSTRAP_ADMIN_PASSWORD: ADMIN_PASSWORD },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stdout = '';
  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', () => {});
  let exited = false;
  child.on('exit', () => (exited = true));

  for (let i = 0; i < 60; i++) {
    if (exited) throw new Error('backend exited during startup:\n' + stdout);
    try {
      const r = await request({ port, pathname: '/api/v1/health' });
      if (r.status === 200) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  return {
    port,
    stdout: () => stdout,
    alive: () => !exited,
    async stop() {
      child.kill();
      await new Promise((r) => (exited ? r() : child.once('exit', r)));
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

const json = (obj) => JSON.stringify(obj);
const post = (port, pathname, body, headers = {}) =>
  request({ port, method: 'POST', pathname, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers }, body });

test('malformed or hostile request bodies get a 400 and never crash or hang the server', async () => {
  const srv = await startServer();
  try {
    const cases = {
      'array with an unexpected token ([x])': '[x]',
      '20,000 levels of nesting': '['.repeat(20000),
      '200,000 levels of nesting': '['.repeat(200000),
      'trailing garbage after a valid object': '{"a":1} garbage',
      'a 50 KB email address': json({ name: 'QA', email: 'a'.repeat(50000) + '@example.com', phone: '+919876543210', service: 'Video Editing', message: 'Testing a very long email.', consent: true }),
    };
    for (const [label, body] of Object.entries(cases)) {
      const started = Date.now();
      const r = await post(srv.port, '/api/v1/leads', body);
      assert.strictEqual(r.status, 400, `${label} should be rejected with 400, got ${r.status}`);
      assert.ok(Date.now() - started < 5000, `${label} must be answered quickly`);
      assert.ok(srv.alive(), `server must survive: ${label}`);
    }
    for (const endpoint of ['/api/v1/auth/login', '/api/v1/enquiries', '/api/v1/lab/auth/register']) {
      const r = await post(srv.port, endpoint, json({ email: 'b'.repeat(60000) + '@example.com', password: 'Whatever-123!', name: 'QA', full_name: 'QA', phone: '+919876543210', service: 'x', message: 'long email probe message' }));
      assert.ok(r.status >= 400 && r.status < 500, `${endpoint} should reject a huge email with a 4xx, got ${r.status}`);
      assert.ok(srv.alive(), `server must survive a huge email on ${endpoint}`);
    }
    const health = await request({ port: srv.port, pathname: '/api/v1/health' });
    assert.strictEqual(health.status, 200, 'server still answers after all of the above');
  } finally {
    await srv.stop();
  }
});

test('people with hyphens or plus signs in their email can submit the enquiry form', async () => {
  const srv = await startServer();
  try {
    for (const email of ['anita@my-studio.in', 'first-last@gmail.com', 'name+promo@gmail.com']) {
      const r = await post(srv.port, '/api/v1/leads', json({ name: 'QA Tester', email, phone: '+919876543210', service: 'Video Editing', message: `Enquiry from ${email} for QA.`, consent: true }));
      assert.strictEqual(r.status, 201, `${email} must be accepted, got ${r.status}: ${r.body.slice(0, 120)}`);
    }
    const bad = await post(srv.port, '/api/v1/leads', json({ name: 'QA Tester', email: 'not-an-email', phone: '+919876543210', service: 'Video Editing', message: 'Invalid email must still fail.', consent: true }));
    assert.strictEqual(bad.status, 400);
  } finally {
    await srv.stop();
  }
});

test('multi-word category filters are percent-decoded (+ and %20)', async () => {
  const srv = await startServer();
  try {
    const expectations = [
      ['/api/v1/portfolio?category=YouTube+Videos', 'YouTube Videos'],
      ['/api/v1/portfolio?category=Business%20Promotion', 'Business Promotion'],
      ['/api/v1/services?category=Social+Media', 'Social Media'],
      ['/api/v1/courses?category=AI+%26+Tech', 'AI & Tech'],
    ];
    for (const [url, category] of expectations) {
      const r = await request({ port: srv.port, pathname: url });
      assert.strictEqual(r.status, 200, url);
      const data = JSON.parse(r.body).data;
      assert.ok(data.length > 0, `${url} must return items`);
      assert.ok(data.every((d) => d.category === category), `${url} must only return "${category}" items`);
    }
  } finally {
    await srv.stop();
  }
});

test('CORS: only allowlisted or loopback origins receive credentialed access', async () => {
  const srv = await startServer({ corsOrigins: ['https://app.example.test'] });
  try {
    const get = (origin) => request({ port: srv.port, pathname: '/api/v1/health', headers: origin ? { Origin: origin } : {} });

    const evil = await get('https://evil.example');
    assert.strictEqual(evil.headers['access-control-allow-origin'], undefined, 'an unknown origin must not be echoed back');
    assert.strictEqual(evil.headers['access-control-allow-credentials'], undefined);
    assert.match(String(evil.headers.vary), /origin/i, 'responses must vary on Origin');

    const listed = await get('https://app.example.test');
    assert.strictEqual(listed.headers['access-control-allow-origin'], 'https://app.example.test');
    assert.strictEqual(listed.headers['access-control-allow-credentials'], 'true');

    const local = await get('http://localhost:5173');
    assert.strictEqual(local.headers['access-control-allow-origin'], 'http://localhost:5173');
    const loopbackOtherPort = await get('http://127.0.0.1:5199');
    assert.strictEqual(loopbackOtherPort.headers['access-control-allow-origin'], 'http://127.0.0.1:5199');

    const lookalike = await get('http://localhost.evil.example');
    assert.strictEqual(lookalike.headers['access-control-allow-origin'], undefined, 'localhost.evil.example is not loopback');
    const noOrigin = await get(null);
    assert.strictEqual(noOrigin.headers['access-control-allow-origin'], undefined, 'same-origin requests need no CORS headers');

    const preflight = await request({ port: srv.port, method: 'OPTIONS', pathname: '/api/v1/auth/login', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
    assert.strictEqual(preflight.headers['access-control-allow-origin'], undefined, 'preflight from an unknown origin must be refused');
    const goodPreflight = await request({ port: srv.port, method: 'OPTIONS', pathname: '/api/v1/auth/login', headers: { Origin: 'https://app.example.test', 'Access-Control-Request-Method': 'POST' } });
    assert.strictEqual(goodPreflight.headers['access-control-allow-origin'], 'https://app.example.test');
    assert.ok(/POST/.test(String(goodPreflight.headers['access-control-allow-methods'])));
  } finally {
    await srv.stop();
  }
});

test('HTTP edge cases: unknown methods, HEAD, oversized and truncated requests, malformed request lines', async () => {
  const srv = await startServer({ maxBody: '1M' });
  try {
    const trace = await request({ port: srv.port, method: 'TRACE', pathname: '/api/v1/services' });
    assert.strictEqual(trace.status, 501, 'unknown methods must not be treated as GET');

    const head = await rawExchange(srv.port, 'HEAD /api/v1/health HTTP/1.1\r\nHost: x\r\n\r\n');
    const headEnd = head.indexOf('\r\n\r\n');
    assert.ok(head.startsWith('HTTP/1.1 200'), 'HEAD succeeds');
    assert.match(head.slice(0, headEnd), /content-length: [1-9]/i, 'HEAD reports the length the GET would have');
    assert.strictEqual(head.slice(headEnd + 4).length, 0, 'HEAD must not send a body');

    const hugeHeaders = await rawExchange(srv.port, `GET /api/v1/health HTTP/1.1\r\nHost: x\r\nX-Big: ${'a'.repeat(40000)}\r\n\r\n`);
    assert.ok(hugeHeaders.startsWith('HTTP/1.1 431'), 'oversized headers get 431');

    const declaredHuge = await rawExchange(srv.port, 'POST /api/v1/leads HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 2000000000\r\n\r\n{');
    assert.ok(declaredHuge.startsWith('HTTP/1.1 413'), 'a body larger than client_max_body_size is refused up front');
    const overConfigured = await rawExchange(srv.port, 'POST /api/v1/leads HTTP/1.1\r\nHost: x\r\nContent-Length: 1500000\r\n\r\n{');
    assert.ok(overConfigured.startsWith('HTTP/1.1 413'), '1.5 MB is over the configured 1M limit');

    const truncated = await rawExchange(srv.port, 'POST /api/v1/leads HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 500\r\n\r\n{"name":"cut off"', { half: true });
    assert.ok(truncated.startsWith('HTTP/1.1 400'), 'a body that stops short is rejected, not processed');

    const noUri = await rawExchange(srv.port, 'GET\r\n\r\n');
    assert.ok(noUri.startsWith('HTTP/1.1 400'), 'a malformed request line gets 400');

    assert.ok(srv.alive());
    const health = await request({ port: srv.port, pathname: '/api/v1/health' });
    assert.strictEqual(health.status, 200);
  } finally {
    await srv.stop();
  }
});

test('log lines stay valid JSON even when the request path or X-Request-Id contains quotes', async () => {
  const srv = await startServer();
  try {
    await rawExchange(srv.port, 'GET /api/v1/x"y\\z","status":200,"forged":"1 HTTP/1.1\r\nHost: x\r\nX-Request-Id: id"},"forged":"yes\r\n\r\n');
    await request({ port: srv.port, pathname: '/api/v1/health' });
    await new Promise((r) => setTimeout(r, 300));
    const lines = srv.stdout().split(/\r?\n/).filter((l) => l.startsWith('{"timestamp"'));
    assert.ok(lines.length >= 2, 'request log lines are written');
    for (const line of lines) {
      const entry = JSON.parse(line); // throws if a request managed to break the log format
      assert.ok(!('forged' in entry), 'a request must not be able to add fields to its own log entry');
    }
  } finally {
    await srv.stop();
  }
});

test('session tokens and request ids are different after every restart', async () => {
  const sessions = [];
  const csrfTokens = [];
  const requestIds = [];
  for (let run = 0; run < 3; run++) {
    const srv = await startServer();
    try {
      const login = await post(srv.port, '/api/v1/auth/login', json({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }));
      assert.strictEqual(login.status, 200, `bootstrap admin can sign in: ${login.body.slice(0, 160)}`);
      const body = JSON.parse(login.body);
      sessions.push(body.session.session_id);
      csrfTokens.push(body.session.csrf_token);
      requestIds.push((await request({ port: srv.port, pathname: '/api/v1/health' })).headers['x-request-id']);
    } finally {
      await srv.stop();
    }
  }
  // On MinGW the old generator produced the identical first session id after every restart.
  assert.strictEqual(new Set(sessions).size, 3, 'first session id must differ between server starts');
  assert.strictEqual(new Set(csrfTokens).size, 3, 'first CSRF token must differ between server starts');
  assert.strictEqual(new Set(requestIds).size, 3, 'request ids must not repeat across restarts');
  for (const id of sessions) assert.match(id, /^[0-9a-f]{64}$/);
});
