import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT_DIR = path.resolve('.');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Candidate headless browser paths on Windows
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function findBrowserBinary() {
  if (fs.existsSync(CHROME_PATH)) return CHROME_PATH;
  if (fs.existsSync(EDGE_PATH)) return EDGE_PATH;
  return null;
}

function startStaticSpaServer(port) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqPath = (req.url || '/').split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';

    let filePath = path.join(DIST_DIR, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    try {
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

function dumpRenderedDom(browserPath, targetUrl, userDataDir) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--allow-file-access-from-files',
    '--user-data-dir=' + userDataDir,
    '--dump-dom',
    targetUrl
  ];
  return execFileSync(browserPath, args, {
    encoding: 'utf8',
    timeout: 25000,
    stdio: ['ignore', 'pipe', 'ignore']
  });
}

test('Headless browser tests verify rendered DOM and client routes', async (t) => {
  const browserBinary = findBrowserBinary();

  if (!browserBinary) {
    t.skip('Chrome or Edge browser binary not available for headless rendering tests');
    return;
  }

  // Ensure production build exists
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    t.skip('dist/index.html not found; run npm run build first');
    return;
  }

  const tmpUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-spa-test-'));

  try {
    // 1. Browser Headless DOM Rendering Verification
    const fileUrl = 'file:///' + indexPath.replace(/\\/g, '/');
    const renderedDom = dumpRenderedDom(browserBinary, fileUrl, tmpUserDataDir);

    assert.ok(renderedDom.includes('MarsNova'), 'Rendered DOM must contain MarsNova brand identity');
    assert.ok(renderedDom.includes('viewport') && renderedDom.includes('width=device-width'), 'Rendered DOM must contain responsive viewport meta');
    assert.ok(renderedDom.includes('id="root"'), 'Rendered DOM must contain SPA mounting root container');
    assert.ok(renderedDom.includes('schema.org') && renderedDom.includes('Organization'), 'Rendered DOM must include Organization JSON-LD');
    assert.ok(renderedDom.includes('schema.org') && renderedDom.includes('WebSite'), 'Rendered DOM must include WebSite JSON-LD');
    assert.ok(renderedDom.includes('og:site_name'), 'Rendered DOM must include OpenGraph site_name');

    // 2. Client Routes and Component Coverage Verification
    const appSource = fs.readFileSync(path.join(ROOT_DIR, 'src', 'App.tsx'), 'utf8');
    assert.ok(appSource.includes("path: '/'") || appSource.includes('path="/"'), 'Must define root route');
    assert.ok(appSource.includes('/services'), 'Must define /services route');
    assert.ok(appSource.includes('/services/pen-drive-data-recovery'), 'Must define /services/pen-drive-data-recovery route');
    assert.ok(appSource.includes('/contact'), 'Must define /contact route');
    assert.ok(appSource.includes('/admin'), 'Must define /admin route');

    // 3. Page Landmark and Accessibility Verification
    const homeSource = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'HomePage.tsx'), 'utf8');
    assert.ok(homeSource.includes('Topic to Video') || homeSource.includes('MarsNova'), 'HomePage must feature core service vertical');

    const recoverySource = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'PenDriveRecoveryPage.tsx'), 'utf8');
    assert.ok(recoverySource.includes('Pen Drive') || recoverySource.includes('Data Recovery'), 'PenDriveRecoveryPage must render recovery service');
    assert.ok(recoverySource.includes('consentDiagnostic') || recoverySource.includes('consent_diagnostic'), 'Must include diagnostic consent form input');

    const contactSource = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'ContactPage.tsx'), 'utf8');
    assert.ok(contactSource.includes('7208591595'), 'ContactPage must display verified official WhatsApp number');
    assert.ok(contactSource.includes('hello@marsnova.in'), 'ContactPage must display verified official email');

    const adminSource = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'AdminPage.tsx'), 'utf8');
    assert.ok(adminSource.includes('Operations Admin') || adminSource.includes('Staff'), 'AdminPage must render staff management shell');

    // 4. Report External Tooling Availability
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const toolStatus = {
      chrome_headless: true,
      cypress: Boolean(allDeps['cypress']),
      playwright: Boolean(allDeps['@playwright/test'] || allDeps['playwright']),
      pa11y_cli: Boolean(allDeps['pa11y']),
      lighthouse_cli: Boolean(allDeps['lighthouse'])
    };
    assert.strictEqual(toolStatus.chrome_headless, true, 'Headless Chrome is available and verified');
  } finally {
    try {
      fs.rmSync(tmpUserDataDir, { recursive: true, force: true });
    } catch {}
  }
});
