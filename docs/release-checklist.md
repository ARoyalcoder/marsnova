# MarsNova Production Release Checklist & Runbook

This checklist serves as the authoritative, mandatory sign-off procedure before deploying any release of the MarsNova platform to staging or production.

---

## 1. Pre-Deployment Verification & Gate Checks

| Check Item | Requirement | Verification Command | Status / Sign-Off |
| :--- | :--- | :--- | :--- |
| **Git Working Tree** | Clean working directory on release branch (`main` or `release/*`), tagged with semantic version | `git status && git log -1 --oneline` | [ ] |
| **Frontend Unit & Integration Tests** | 100% passing across all 182+ test suites (UI, routing, hooks, animations, recovery workflows) | `npm test` | [ ] |
| **TypeScript Type Safety** | Zero compilation errors, strict null checks enabled | `npm run typecheck` | [ ] |
| **Production Frontend Build** | Clean Vite production bundle generation, asset hashes, chunk size optimization | `npm run build` | [ ] |
| **C++ Drogon Backend Smoke Suite** | All 15 functional, security, and integration suites passing with 0 errors | `./backend/smoke_test.exe` (or Linux binary) | [ ] |
| **Concurrency Load Baseline** | Verified zero error rate at 10, 25, 50, and 100 concurrent clients on core endpoints | `./backend/benchmark.exe` | [ ] |

---

## 2. Secrets & Configuration Audit

Before deploying containers or launching processes, verify that `.env` is populated with cryptographically secure, production-grade credentials.

- [ ] **No Default Credentials**: Ensure default passwords (`postgres`, `admin123`, `testsecret`) are completely eradicated.
- [ ] **Database Credentials**:
  - `POSTGRES_DB=marsnova_db`
  - `POSTGRES_USER=marsnova_app`
  - `POSTGRES_PASSWORD`: At least 32 characters generated via `openssl rand -base64 32`.
- [ ] **Session Secrets**:
  - `SESSION_SECRET`: 64-character hexadecimal generated via `openssl rand -hex 32`.
  - Ensure student sessions (`marsnova_student_session`) and staff sessions (`marsnova_session`) use isolated token spaces.
- [ ] **CORS Origin Whitelisting**:
  - Configured to strictly allowed production origins: `CORS_ORIGINS=https://marsnova.in,https://www.marsnova.in`.
  - Wildcard `*` is strictly prohibited in production.
- [ ] **TLS & HTTPS Headers**:
  - Nginx configuration enforces TLSv1.2 and TLSv1.3 only (weak ciphers disabled).
  - HSTS header enabled: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] **WhatsApp & Notification Configuration**:
  - Valid webhook secrets, API tokens, and exponential backoff retry policies configured (5 attempts max: 1s, 2s, 4s, 8s, 16s).

---

## 3. Database Migration Protocol (001 - 009+)

All database migrations must execute sequentially and idempotently via `docker/scripts/migrate.sh`.

```
001_initial_schema.sql                -> Base services, enquiries, admin user table
002_lead_quote_project_workflow.sql   -> Leads, quotes, assignments, audit logs
003_rbac_roles_permissions.sql        -> Granular RBAC tables, roles, permissions
004_fix_case_sensitive_roles.sql      -> Role normalization and constraint fixes
005_fix_whatsapp_status_schema.sql    -> Outbox queuing, notification status, retry counters
006_contact_submissions.sql           -> Public contact inquiry tracking and rate-limiting
007_lab_learning_hub.sql              -> MarsNova Lab courses, modules, syllabus structure
008_recovery_cases.sql                -> Pen-drive diagnostic cases, custody logs, timeline
009_marsnova_lab_learning.sql         -> Student auth, course enrollments, lesson progress
```

### Pre-Migration Step
- [ ] Take a manual full snapshot of the existing database before applying new migrations:
  ```bash
  docker compose exec postgres pg_dump -U marsnova_app -d marsnova_db -F c -b -v -f /backups/pre_migration_$(date +%Y%m%d_%H%M%S).dump
  ```

### Migration Execution & Audit
- [ ] Verify that `schema_migrations` records every applied version:
  ```bash
  docker compose exec postgres psql -U marsnova_app -d marsnova_db -c \
    "SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC;"
  ```
- [ ] Confirm no migration failed or left locks on critical tables.

---

## 4. Container Deployment & Orchestration Steps

- [ ] **Docker Compose Validation**:
  ```bash
  docker compose config
  ```
- [ ] **Launch Production Stack**:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
  ```
- [ ] **Verify Service Health**:
  ```bash
  docker compose ps
  ```
  Ensure all services (`gateway`, `backend`, `postgres`, `backup`) report `healthy` or `running`.
- [ ] **Verify Network Isolation**:
  - Confirm `marsnova-postgres` is attached solely to `marsnova_private` (`internal: true`).
  - Attempting to reach port 5432 from an external host must fail (connection refused / timeout).

---

## 5. Post-Deployment Health & Sanity Smoke Tests

Execute these verification checks immediately following deployment:

### 5.1 Gateway & Backend API Health
```bash
# Gateway Health
curl -I -sS https://marsnova.in/healthz | grep "HTTP/1.1 200 OK"

# Backend Health & Correlation ID
curl -I -sS https://marsnova.in/api/v1/health | grep -E "HTTP/1.1 200 OK|x-request-id:"
```

### 5.2 Public Content & Catalog
```bash
# Public Services Catalog
curl -sS https://marsnova.in/api/v1/services | grep '"success":true'

# MarsNova Lab Courses
curl -sS https://marsnova.in/api/v1/lab/courses | grep '"success":true'
```

### 5.3 Pen-Drive Recovery Tracking
- [ ] Test tracking query with sample reference:
  ```bash
  curl -sS https://marsnova.in/api/v1/recovery/track/MNR-2026-8292 | grep '"success":true'
  ```
- [ ] Verify non-existent reference returns proper 404 error without leaking stack traces:
  ```bash
  curl -sS -i https://marsnova.in/api/v1/recovery/track/INVALID-REF | grep "404"
  ```
- [ ] **Custody Integrity Check**: Confirm that diagnostic notes and custody log are accessible only to authorized lab technicians and never exposed in the public tracking response.
- [ ] **Physical Boundary Policy**: Confirm web portal contains NO mechanism for client USB drive mounting, scanning, raw sector carving, or file payload upload/download.

### 5.4 MarsNova Lab Student Learning Platform
- [ ] Register new test student: `POST /api/v1/lab/auth/register`.
- [ ] Verify `marsnova_student_session` cookie is issued with `HttpOnly; Secure; SameSite=Strict`.
- [ ] Verify course enrollment: `POST /api/v1/lab/enrollments`.
- [ ] Verify lesson progress update: `POST /api/v1/lab/progress`.
- [ ] Verify cross-student isolation: Student A cannot fetch or update Student B's enrollment or lesson progress.

### 5.5 Admin & Staff Workflows
- [ ] Verify staff login via `POST /api/v1/auth/login` (admin / staff).
- [ ] Confirm staff cookie `marsnova_session` is segregated from student cookie.
- [ ] Verify transition lifecycle: Enquiry -> Lead -> Quotation -> Project Assignment.
- [ ] Verify WhatsApp status polling / retry queue inspection in Admin Dashboard.

### 5.6 Security Controls Verification
- [ ] **SQL Injection Prevention**: Ensure parameters with single quotes, comments, or union statements return clean 400 validation errors.
- [ ] **Rate Limiting**: Fire 35 rapid requests to `/api/v1/auth/login` and verify HTTP 429 Too Many Requests is triggered.
- [ ] **CORS**: Verify unauthorized origins (e.g. `Origin: https://evil.com`) are rejected with no CORS headers.

---

## 6. Backup Verification & Disaster Recovery Drill

- [ ] Verify automated backup container scheduled job:
  ```bash
  docker compose exec backup /scripts/backup.sh
  ```
- [ ] Verify backup archive creation and integrity:
  ```bash
  ls -lh /opt/marsnova/backups/
  sha256sum -c /opt/marsnova/backups/*.sha256
  ```
- [ ] Periodic Restoration Drill (Staging / Scratch DB):
  ```bash
  # Restore to temporary test container
  docker run --rm -v /opt/marsnova/backups:/backups postgres:16-alpine \
    psql -h scratch_postgres -U marsnova_app -d marsnova_scratch -f /backups/latest.sql
  ```

---

## 7. Rollback Procedure

If critical regressions or fatal errors are detected post-release, execute the following emergency rollback:

1. **Stop Incoming Traffic (Optional)**:
   Place maintenance page via Nginx:
   ```bash
   docker compose exec gateway ln -sf /etc/nginx/maintenance.html /usr/share/nginx/html/index.html
   docker compose exec gateway nginx -s reload
   ```

2. **Rollback Container Images**:
   Re-deploy the previous known-stable release commit or Docker image tag:
   ```bash
   git checkout <PREVIOUS_STABLE_TAG>
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```

3. **Database Restore (If Schema Corrupted)**:
   ```bash
   # Stop application services to prevent conflicting writes
   docker compose stop backend gateway
   
   # Restore pre-migration backup snapshot
   docker compose exec -T postgres psql -U marsnova_app -d postgres -c "DROP DATABASE marsnova_db;"
   docker compose exec -T postgres psql -U marsnova_app -d postgres -c "CREATE DATABASE marsnova_db OWNER marsnova_app;"
   docker compose exec -T postgres pg_restore -U marsnova_app -d marsnova_db -v /backups/pre_migration_<TIMESTAMP>.dump
   
   # Restart services
   docker compose start backend gateway
   ```

4. **Verify Restored State**:
   Run sanity smoke checks (Section 5) to confirm standard operations are fully recovered.

---

## 8. Monitoring, Logging & Alerting SLAs

- [ ] **Structured Log Collection**: Confirm Drogon backend logs contain `timestamp`, `level`, `request_id`, and `client_ip`.
- [ ] **Resource Limits**:
  - Nginx Gateway: Memory < 128 MB, CPU < 0.5 cores.
  - Drogon C++ Backend: Memory < 256 MB, CPU < 1.0 cores under load.
  - PostgreSQL 16: Memory < 1 GB, connection pool size <= 20 active connections.
- [ ] **Error Rate SLA**: HTTP 5xx error rate < 0.05% of total requests over 15-minute rolling window.
- [ ] **Latency SLA**:
  - API P95 < 50ms for cached/static lookups.
  - API P95 < 150ms for authenticated database transactions.
