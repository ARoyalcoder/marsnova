# MarsNova Production Deployment & Operations Runbook

Comprehensive deployment, HTTPS/TLS termination, automated database migrations, backup, restore, and rollback procedures for MarsNova's hybrid architecture (React Vite SPA + Drogon C++ Backend + Private PostgreSQL 16 + Nginx Gateway).

---

## 1. Architecture & Network Topology

```
                     Internet (Port 80 / 443)
                                │
                                ▼
         ┌───────────────────────────────────────────────┐
         │          marsnova-gateway (Nginx)             │
         │  - HTTP -> HTTPS 301 Redirect                 │
         │  - TLSv1.2 / TLSv1.3 & HSTS Termination       │
         │  - Static SPA Delivery & Caching (/assets/)   │
         │  - Rate Limiting (api_limit, auth_limit)      │
         └───────┬───────────────────────────────┬───────┘
                 │ (Internal Docker Network)     │
                 │ marsnova_private              │
                 ▼                               ▼
    ┌──────────────────────────┐   ┌──────────────────────────┐
    │  marsnova-backend        │   │  Static Frontend Assets  │
    │  - Drogon C++17 Runtime  │   │  - /usr/share/nginx/html │
    │  - Port 8080 (Internal)  │   │  - Client-side SPA routes│
    │  - Salted Auth & RBAC    │   └──────────────────────────┘
    │  - Uploads / Media Store │
    └────────────┬─────────────┘
                 │
                 ▼
    ┌──────────────────────────┐   ┌──────────────────────────┐
    │  marsnova-postgres       │   │  marsnova-migration      │
    │  - PostgreSQL 16 Alpine  │◄──┤  - Automated 001 - 009+  │
    │  - Port 5432 (Isolated)  │   │  - Runs before Backend   │
    │  - Volume: postgres_data │   └──────────────────────────┘
    └────────────┬─────────────┘
                 │
                 ▼
    ┌──────────────────────────┐
    │  marsnova-backup         │
    │  - Automated 24h Cron    │
    │  - Gzip + SHA256 Checksum│
    │  - Volume: pg_backups    │
    └──────────────────────────┘
```

### Security Isolation Principles
- **No Direct Database Exposure**: `marsnova-postgres` is attached exclusively to `marsnova_private` (`internal: true`). Port 5432 is never mapped or reachable from the public host interface.
- **Backend Isolation**: `marsnova-backend` communicates solely over `marsnova_private` and accepts requests exclusively from the trusted Nginx reverse proxy gateway.
- **Non-Root Execution**: Both Nginx (`nginx:nginx`) and Drogon C++ (`marsnova:marsnova` UID 10001) run under unprivileged system accounts.

---

## 2. Prerequisites & Server Sizing

| Component | Minimum | Recommended Production |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 24.04 LTS / Debian 12 |
| **Compute** | 2 vCPU | 4 vCPU |
| **RAM** | 2 GB | 4 GB - 8 GB |
| **Storage** | 25 GB SSD | 50 GB NVMe SSD |
| **Runtime** | Docker Engine 24.0+ & Compose v2 | Docker Engine 26.0+ & Compose v2.27+ |

---

## 3. Environment & Secrets Setup

1. Clone the repository onto the production server:
   ```bash
   git clone https://github.com/marsnova/project.git /opt/marsnova
   cd /opt/marsnova
   ```

2. Copy the template and generate cryptographically secure secrets:
   ```bash
   cp .env.example .env
   chmod 600 .env
   ```

3. Populate required production values in `.env`:
   ```bash
   # Generate strong 32-character database password:
   openssl rand -base64 32

   # Generate 64-character session secret:
   openssl rand -hex 32
   ```

   **Required keys in `.env`**:
   ```ini
   POSTGRES_DB=marsnova_db
   POSTGRES_USER=marsnova_app
   POSTGRES_PASSWORD=<STRONG_GENERATED_PASSWORD>

   SESSION_SECRET=<64_CHAR_HEX_SECRET>
   CORS_ORIGINS=https://marsnova.in,https://www.marsnova.in
   DOMAIN_NAME=marsnova.in

   HTTP_PORT=80
   HTTPS_PORT=443
   BACKUP_RETENTION_DAYS=14
   ```

### First admin account

MarsNova ships **no default staff logins**. The backend creates the first `super_admin` at
startup from two variables in `.env`:

```ini
MARSNOVA_BOOTSTRAP_ADMIN_EMAIL=you@marsnova.in
MARSNOVA_BOOTSTRAP_ADMIN_PASSWORD=<STRONG_PASSWORD_12_PLUS_CHARS>
# optional display name (default: Studio Administrator)
MARSNOVA_BOOTSTRAP_ADMIN_NAME=Studio Administrator
```

- It is one-time: the account is created only when no **active** `super_admin` exists, and
  an existing account is never overwritten or reset. A skipped bootstrap says so in the backend log.
- The password needs at least 12 characters. The email may use letters, digits, underscores and dots.
- After the first successful start, **remove `MARSNOVA_BOOTSTRAP_ADMIN_PASSWORD` from `.env`**
  and run `docker compose up -d backend`. Further staff are added by a `super_admin`.
- Do not reuse an email suspended by migration 011 (`admin@`, `manager@`, `editor@marsnova.in`):
  a duplicate email is skipped.
- Check the backend log line `Staff user store:`. It reads `PostgreSQL` when the backend is built
  against Drogon. If it reads `in-process memory`, the backend was built in standalone mode, which has
  no database access: accounts are lost on restart, and the bootstrap admin is recreated from
  `.env` on every start, so keep the variables set in that mode.

---

## 4. Initial Deployment & Execution

### Standard Deployment (HTTP / Reverse Proxy Gateway)
```bash
# 1. Validate docker compose configuration syntax
docker compose config

# 2. Build and launch all services in detached mode
docker compose up -d --build

# 3. Monitor the automated database migration runner
docker compose logs -f migration

# 4. Confirm container health status
docker compose ps
```

### Production Deployment (with SSL Override & Resource Limits)
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Verification Checks
Verify that each container passes its internal health check:
```bash
# Gateway Health
curl -I http://localhost/healthz
# Expected: HTTP/1.1 200 OK

# Backend API Health
curl -I http://localhost/api/v1/health
# Expected: HTTP/1.1 200 OK (with X-Request-Id header)

# Verify Database Migrations Table
docker compose exec postgres psql -U marsnova_app -d marsnova_db -c "SELECT version, name, applied_at FROM schema_migrations ORDER BY version;"
```

---

## 5. SSL/TLS Certificate Provisioning (Let's Encrypt / Certbot)

For production HTTPS termination on `marsnova.in`:

1. Obtain certificates using Certbot standalone or webroot:
   ```bash
   sudo apt-get update && sudo apt-get install -y certbot

   # Initial certificate issuance via standalone (stop gateway temporarily if port 80 is occupied):
   docker compose stop gateway
   sudo certbot certonly --standalone -d marsnova.in -d www.marsnova.in --agree-tos -m operations@marsnova.in --non-interactive
   docker compose start gateway
   ```

2. Automatic Certificate Renewal:
   Certbot installs a systemd timer by default (`certbot.timer`). Configure post-renewal hook to reload Nginx gracefully:
   ```bash
   sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
   cat << 'EOF' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
   #!/bin/sh
   cd /opt/marsnova && docker compose exec gateway nginx -s reload
   EOF
   sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
   ```

---

## 6. Database Backup & Restore Procedures

### Automated Backups
The `marsnova-backup` service in `docker-compose.prod.yml` runs daily and:
- Generates compressed archives (`/backups/marsnova_backup_YYYYMMDD_HHMMSSZ.sql.gz`)
- Computes SHA-256 checksums (`.sha256`)
- Automatically prunes archives older than `BACKUP_RETENTION_DAYS` (default 14 days)

### Manual On-Demand Backup
```bash
docker compose exec -T postgres /bin/sh -c '
  export PGUSER="$POSTGRES_USER"
  export PGDATABASE="$POSTGRES_DB"
  export PGPASSWORD="$POSTGRES_PASSWORD"
  TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
  pg_dump --no-owner --no-privileges --clean --if-exists | gzip -9
' > /opt/marsnova/backups/manual_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Point-in-Time Database Restore
To restore from an existing backup archive:

```bash
# 1. Place backup file inside the container's volume or pipe directly:
cat /path/to/marsnova_backup_20261023_120000Z.sql.gz | \
  docker compose exec -T postgres /bin/sh -c '
    export PGUSER="$POSTGRES_USER"
    export PGDATABASE="$POSTGRES_DB"
    export PGPASSWORD="$POSTGRES_PASSWORD"
    gunzip | psql -v ON_ERROR_STOP=1 --single-transaction
  '

# 2. Verify table records post-restore:
docker compose exec postgres psql -U marsnova_app -d marsnova_db -c "SELECT COUNT(*) FROM schema_migrations; SELECT COUNT(*) FROM enquiries;"
```

---

## 7. Zero-Downtime Deployment & Rolling Updates

When pushing code updates:

```bash
# 1. Pull latest Git release
git pull origin main

# 2. Rebuild images with layer caching
docker compose build --pull

# 3. Apply any new database migrations
docker compose run --rm migration

# 4. Perform rolling restart of the backend
docker compose up -d --no-deps --build backend

# 5. Reload Nginx gateway configuration
docker compose exec gateway nginx -s reload
```

---

## 8. Rollback Procedure

### Application Container Rollback
If a newly deployed container exhibits defects:

1. Roll back to the previous Git commit or image tag:
   ```bash
   git checkout <PREVIOUS_STABLE_COMMIT_OR_TAG>
   docker compose up -d --build backend gateway
   ```

2. Confirm health status:
   ```bash
   docker compose ps
   curl -f http://localhost/api/v1/health
   ```

### Database Migration Rollback
If a migration must be reverted:

1. Identify the applied version in `schema_migrations`:
   ```bash
   docker compose exec postgres psql -U marsnova_app -d marsnova_db -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;"
   ```

2. Execute targeted revert script or restore from the pre-deployment backup archive created in Section 6.

---

## 9. Monitoring, Logs & Troubleshooting

### Container Logs
```bash
# View aggregated real-time logs
docker compose logs -f

# View structured JSON access logs from Nginx gateway
docker compose logs -f gateway

# View Drogon C++ server logs and request metrics
docker compose logs -f backend

# View PostgreSQL query and error logs
docker compose logs -f postgres
```

### Common Issues & Remedies

| Symptom | Cause | Remedy |
| :--- | :--- | :--- |
| **502 Bad Gateway on `/api/`** | Backend starting or crashed | Check `docker compose logs backend`. Verify database connection parameters in `.env`. |
| **Database Connection Refused** | PostgreSQL container not healthy | Verify `postgres` container logs. Check disk space on host (`df -h`). |
| **Migration Timeout** | Migration script unable to reach DB | Check `POSTGRES_USER` and `POSTGRES_PASSWORD` match in both `postgres` and `migration` services. |
| **Rate Limit 429 Errors** | Traffic exceeded Nginx zone limits | Tune `rate` or `burst` values in `docker/nginx/nginx.conf` and reload (`nginx -s reload`). |
