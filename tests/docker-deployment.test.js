import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadFile(relPath) {
  const p = path.join(rootDir, relPath);
  assert.ok(fs.existsSync(p), `File must exist: ${relPath}`);
  return fs.readFileSync(p, 'utf-8');
}

// -----------------------------------------------------------------------------
// 1. Multi-Stage Dockerfile Verification
// -----------------------------------------------------------------------------
test('Dockerfile.frontend implements multi-stage Node.js build and hardened Nginx runtime', () => {
  const df = loadFile('Dockerfile.frontend');

  // Multi-stage builder
  assert.ok(df.includes('FROM node:20-alpine AS builder'), 'Must use node:20-alpine for builder');
  assert.ok(df.includes('npm ci'), 'Must use npm ci for deterministic installs');
  assert.ok(df.includes('npm run build'), 'Must execute production build');

  // Hardened runtime
  assert.ok(df.includes('FROM nginx:1.27-alpine-slim AS runtime'), 'Must use nginx alpine for runtime');
  assert.ok(df.includes('COPY --from=builder /app/dist /usr/share/nginx/html'), 'Must copy build output to Nginx root');
  assert.ok(df.includes('USER nginx'), 'Must execute as non-root user nginx');
  assert.ok(df.includes('HEALTHCHECK'), 'Must define healthcheck instruction');
  assert.ok(df.includes('EXPOSE 80'), 'Must expose port 80');
});

test('Dockerfile.backend implements multi-stage C++ Drogon build with non-root security', () => {
  const df = loadFile('Dockerfile.backend');

  // Multi-stage builder
  assert.ok(df.includes('FROM debian:bookworm-slim AS builder'), 'Must use debian for C++ build environment');
  assert.ok(df.includes('cmake'), 'Must include cmake');
  assert.ok(df.includes('build-essential'), 'Must include build-essential toolchain');
  assert.ok(df.includes('cmake --build build --target marsnova_backend'), 'Must build marsnova_backend target');

  // Hardened runtime
  assert.ok(df.includes('FROM debian:bookworm-slim AS runtime'), 'Must use debian runtime');
  assert.ok(df.includes('useradd') && df.includes('marsnova'), 'Must create dedicated unprivileged marsnova user');
  assert.ok(df.includes('USER marsnova'), 'Must execute as unprivileged user');
  assert.ok(df.includes('EXPOSE 8080'), 'Must expose Drogon port 8080');
  assert.ok(df.includes('HEALTHCHECK'), 'Must define container healthcheck');
  assert.ok(df.includes('/api/v1/health'), 'Healthcheck must target /api/v1/health');
});

test('Dockerfile.gateway implements combined SPA delivery, reverse proxy, and health check', () => {
  const df = loadFile('Dockerfile.gateway');

  assert.ok(df.includes('FROM node:20-alpine AS builder'), 'Must build frontend in stage 1');
  assert.ok(df.includes('FROM nginx:1.27-alpine-slim AS runtime'), 'Must use nginx in stage 2');
  assert.ok(df.includes('COPY --from=builder /app/dist /usr/share/nginx/html'), 'Must copy compiled assets');
  assert.ok(df.includes('EXPOSE 80 443'), 'Must expose HTTP and HTTPS ports');
  assert.ok(df.includes('healthz'), 'Healthcheck must verify /healthz probe');
});

// -----------------------------------------------------------------------------
// 2. Docker Compose Configuration & Network Isolation
// -----------------------------------------------------------------------------
test('docker-compose.yml defines private PostgreSQL networking, persistence, and health dependencies', () => {
  const compose = loadFile('docker-compose.yml');

  // Core services
  assert.ok(compose.includes('postgres:'), 'Must declare postgres service');
  assert.ok(compose.includes('migration:'), 'Must declare migration runner service');
  assert.ok(compose.includes('backend:'), 'Must declare backend service');
  assert.ok(compose.includes('gateway:'), 'Must declare gateway reverse proxy service');

  // Private Network Isolation
  assert.ok(compose.includes('marsnova_private:'), 'Must declare marsnova_private network');
  assert.ok(compose.includes('internal: true'), 'marsnova_private must be internal: true');

  // Volumes & Persistence
  assert.ok(compose.includes('postgres_data:'), 'Must declare persistent postgres_data volume');
  assert.ok(compose.includes('backend_uploads:'), 'Must declare persistent backend_uploads volume');

  // Database security: ensure port 5432 is NOT published to host
  const postgresSection = compose.substring(compose.indexOf('postgres:'), compose.indexOf('migration:'));
  assert.ok(!postgresSection.includes('"5432:5432"') && !postgresSection.includes("'5432:5432'"), 'PostgreSQL port 5432 must never be published to host');

  // Health checks and strict service ordering
  assert.ok(compose.includes('condition: service_healthy'), 'Backend must wait for database healthcheck');
  assert.ok(compose.includes('condition: service_completed_successfully'), 'Backend must wait for migrations to succeed');
});

test('docker-compose.prod.yml declares resource limits, log rotation, and automated backup daemon', () => {
  const prod = loadFile('docker-compose.prod.yml');

  // Resource limits
  assert.ok(prod.includes('resources:') && prod.includes('limits:'), 'Must enforce resource limits in production');
  assert.ok(prod.includes('cpus:'), 'Must enforce CPU limits');
  assert.ok(prod.includes('memory:'), 'Must enforce memory limits');

  // Log rotation
  assert.ok(prod.includes('json-file'), 'Must use json-file logging driver');
  assert.ok(prod.includes('max-size:'), 'Must enforce max-size log rotation');
  assert.ok(prod.includes('max-file:'), 'Must enforce max-file log retention');

  // Backup service
  assert.ok(prod.includes('backup:'), 'Must declare automated backup service');
  assert.ok(prod.includes('postgres_backups:'), 'Must declare persistent postgres_backups volume');
});

// -----------------------------------------------------------------------------
// 3. Shell Automation Scripts Integrity
// -----------------------------------------------------------------------------
test('docker/scripts/entrypoint-backend.sh generates secure Drogon configuration from environment', () => {
  const ep = loadFile('docker/scripts/entrypoint-backend.sh');

  assert.ok(ep.startsWith('#!/bin/sh'), 'Must be POSIX shell compliant');
  assert.ok(ep.includes('set -e'), 'Must halt on failure');
  assert.ok(ep.includes('config.json'), 'Must generate config.json');
  assert.ok(ep.includes('DB_HOST') && ep.includes('DB_PORT') && ep.includes('DB_NAME'), 'Must read database environment variables');
  assert.ok(ep.includes('CORS_ORIGINS'), 'Must configure CORS origins');
  assert.ok(ep.includes('exec "$@"'), 'Must exec target binary to preserve PID 1 signals');
});

test('docker/scripts/migrate.sh enforces alphanumeric ordering, idempotency, and ON_ERROR_STOP', () => {
  const mig = loadFile('docker/scripts/migrate.sh');

  assert.ok(mig.includes('pg_isready'), 'Must wait for PostgreSQL with pg_isready');
  assert.ok(mig.includes('schema_migrations'), 'Must manage schema_migrations table');
  assert.ok(mig.includes('ON_ERROR_STOP=1'), 'Must enforce ON_ERROR_STOP=1');
  assert.ok(mig.includes('sort'), 'Must sort migration files in order');
  assert.ok(mig.includes('is_applied'), 'Must skip already applied migrations');
});

test('docker/scripts/backup.sh and restore.sh implement compression, SHA-256 checksums, and safety', () => {
  const backup = loadFile('docker/scripts/backup.sh');
  const restore = loadFile('docker/scripts/restore.sh');

  // Backup assertions
  assert.ok(backup.includes('pg_dump'), 'Backup must use pg_dump');
  assert.ok(backup.includes('gzip'), 'Backup must compress output');
  assert.ok(backup.includes('sha256sum'), 'Backup must generate SHA-256 checksum');
  assert.ok(backup.includes('BACKUP_RETENTION_DAYS'), 'Backup must implement retention pruning');

  // Restore assertions
  assert.ok(restore.includes('sha256sum'), 'Restore must verify SHA-256 checksum');
  assert.ok(restore.includes('--single-transaction'), 'Restore must execute in a single transaction');
  assert.ok(restore.includes('schema_migrations'), 'Restore must verify schema_migrations post-restore');
});

// -----------------------------------------------------------------------------
// 4. Nginx Gateway & Reverse Proxy Configuration
// -----------------------------------------------------------------------------
test('Nginx configurations implement rate-limiting, security headers, SPA fallback, and SSL templates', () => {
  const nginxConf = loadFile('docker/nginx/nginx.conf');
  const gwConf = loadFile('docker/nginx/conf.d/marsnova.conf');
  const sslTemplate = loadFile('docker/nginx/conf.d/ssl.conf.template');

  // nginx.conf
  assert.ok(nginxConf.includes('limit_req_zone'), 'Must declare rate limiting zones');
  assert.ok(nginxConf.includes('gzip on;'), 'Must enable gzip compression');
  assert.ok(nginxConf.includes('server_tokens off;'), 'Must hide Nginx server tokens');

  // marsnova.conf (Gateway)
  assert.ok(gwConf.includes('proxy_pass http://drogon_backend;'), 'Must proxy /api/ to drogon_backend');
  assert.ok(gwConf.includes('try_files $uri $uri/ /index.html;'), 'Must implement SPA routing fallback');
  assert.ok(gwConf.includes('X-Frame-Options') && gwConf.includes('SAMEORIGIN'), 'Must set X-Frame-Options header');
  assert.ok(gwConf.includes('X-Content-Type-Options') && gwConf.includes('nosniff'), 'Must set X-Content-Type-Options header');
  assert.ok(gwConf.includes('/healthz'), 'Must provide /healthz gateway probe');

  // ssl.conf.template (HTTPS & TLS)
  assert.ok(sslTemplate.includes('listen 443 ssl http2;'), 'Must support HTTP/2 and SSL');
  assert.ok(sslTemplate.includes('Strict-Transport-Security'), 'Must enforce HSTS');
  assert.ok(sslTemplate.includes('TLSv1.2 TLSv1.3;'), 'Must enforce TLSv1.2 and TLSv1.3');
  assert.ok(sslTemplate.includes('ssl_stapling on;'), 'Must enable OCSP stapling');
});

// -----------------------------------------------------------------------------
// 5. Documentation & Environment Template
// -----------------------------------------------------------------------------
test('.env.example and DEPLOYMENT.md document all deployment, HTTPS, backup, restore, and rollback procedures', () => {
  const envEx = loadFile('.env.example');
  const depMd = loadFile('DEPLOYMENT.md');

  // .env.example
  assert.ok(envEx.includes('POSTGRES_DB='), 'Must document POSTGRES_DB');
  assert.ok(envEx.includes('POSTGRES_PASSWORD='), 'Must document POSTGRES_PASSWORD');
  assert.ok(envEx.includes('SESSION_SECRET='), 'Must document SESSION_SECRET');
  assert.ok(envEx.includes('CORS_ORIGINS='), 'Must document CORS_ORIGINS');

  // DEPLOYMENT.md
  assert.ok(depMd.includes('Architecture & Network Topology'), 'Must document architecture');
  assert.ok(depMd.includes('SSL/TLS Certificate Provisioning'), 'Must document HTTPS / Certbot');
  assert.ok(depMd.includes('Database Backup & Restore Procedures'), 'Must document backup and restore');
  assert.ok(depMd.includes('Rollback Procedure'), 'Must document rollback procedure');
  assert.ok(depMd.includes('Zero-Downtime Deployment'), 'Must document zero-downtime rolling update');
});
