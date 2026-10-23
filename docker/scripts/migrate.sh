#!/bin/sh
set -e

# -----------------------------------------------------------------------------
# MarsNova Database Migration Runner
# Executes migrations (001-009+) in strict alphanumeric sequence with idempotency
# -----------------------------------------------------------------------------

echo "=========================================================="
echo "   MarsNova PostgreSQL Automated Migration Runner         "
echo "=========================================================="

export PGHOST="${DB_HOST:-postgres}"
export PGPORT="${DB_PORT:-5432}"
export PGDATABASE="${DB_NAME:-marsnova_db}"
export PGUSER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-}"

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"

echo "[Migration] Target database: ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}"

# 1. Wait for PostgreSQL to become fully ready
MAX_RETRIES=30
RETRY_COUNT=0

echo "[Migration] Waiting for PostgreSQL database connection..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        echo "[Migration] ERROR: Database connection timed out after $MAX_RETRIES attempts. Aborting."
        exit 1
    fi
    echo "[Migration] Database not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES)... retrying in 2 seconds."
    sleep 2
done

echo "[Migration] Successfully connected to PostgreSQL."

# 2. Ensure schema_migrations tracking table exists
psql -v ON_ERROR_STOP=1 <<-EOSQL
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(32) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
EOSQL

echo "[Migration] Tracking table 'schema_migrations' verified."

# 3. Discover and execute pending migrations in order
APPLIED_COUNT=0
SKIPPED_COUNT=0

for mig_file in $(find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" | sort); do
    filename=$(basename "$mig_file")
    # Extract version prefix (e.g., 001 from 001_marsnova_core_schema.sql)
    version=$(echo "$filename" | cut -d'_' -f1)

    # Check if migration has already been applied
    is_applied=$(psql -v ON_ERROR_STOP=1 -t -A -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';")

    if [ "$is_applied" -gt 0 ]; then
        echo "  [SKIP] Migration $filename (version $version already applied)"
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    else
        echo "  [APPLY] Executing migration: $filename (version $version)..."
        
        # Execute migration within a single transaction with ON_ERROR_STOP=1
        psql -v ON_ERROR_STOP=1 -1 -f "$mig_file"

        # Record migration completion
        psql -v ON_ERROR_STOP=1 <<-EOSQL
            INSERT INTO schema_migrations (version, name, applied_at)
            VALUES ('$version', '$filename', CURRENT_TIMESTAMP)
            ON CONFLICT (version) DO NOTHING;
EOSQL
        echo "  [SUCCESS] Migration $filename applied successfully."
        APPLIED_COUNT=$((APPLIED_COUNT + 1))
    fi
done

echo "=========================================================="
echo "   Migration Execution Summary:                           "
echo "   Applied: $APPLIED_COUNT | Previously Skipped: $SKIPPED_COUNT"
echo "=========================================================="
exit 0
