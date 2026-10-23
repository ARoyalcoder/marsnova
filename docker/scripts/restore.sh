#!/bin/sh
set -e

# -----------------------------------------------------------------------------
# MarsNova Production Database Restore Script
# Verifies SHA-256 integrity checksum & executes clean transaction restoration
# -----------------------------------------------------------------------------

echo "=========================================================="
echo "   MarsNova PostgreSQL Database Restore Utility           "
echo "=========================================================="

if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    echo "Example: $0 /backups/marsnova_backup_20261023_120000Z.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file '$BACKUP_FILE' does not exist."
    exit 1
fi

export PGHOST="${DB_HOST:-postgres}"
export PGPORT="${DB_PORT:-5432}"
export PGDATABASE="${DB_NAME:-marsnova_db}"
export PGUSER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-}"

# 1. Verify SHA-256 Checksum if present
if [ -f "$CHECKSUM_FILE" ]; then
    echo "[Restore] Verifying SHA-256 checksum..."
    sha256sum -c "$CHECKSUM_FILE"
    echo "[Restore] Checksum verification PASSED."
else
    echo "[Restore] WARNING: No checksum file found at ${CHECKSUM_FILE}. Proceeding with caution."
fi

# 2. Wait for PostgreSQL readiness
echo "[Restore] Checking target database connectivity (${PGHOST}:${PGPORT}/${PGDATABASE})..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; do
    echo "[Restore] Waiting for database..."
    sleep 2
done

# 3. Execute Point-in-time Restore
echo "[Restore] Restoring database '${PGDATABASE}' from '${BACKUP_FILE}'..."

gunzip -c "$BACKUP_FILE" | psql -v ON_ERROR_STOP=1 \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$PGDATABASE" \
    --single-transaction

# 4. Post-restore Verification
echo "[Restore] Verifying schema and migration state..."
APPLIED_MIGRATIONS=$(psql -v ON_ERROR_STOP=1 -t -A -c "SELECT COUNT(*) FROM schema_migrations;")
ENQUIRIES_COUNT=$(psql -v ON_ERROR_STOP=1 -t -A -c "SELECT COUNT(*) FROM enquiries;")

echo "=========================================================="
echo "   Restore Completed Successfully!                        "
echo "   Recorded Migrations: $APPLIED_MIGRATIONS | Enquiries: $ENQUIRIES_COUNT"
echo "=========================================================="
exit 0
