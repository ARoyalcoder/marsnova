#!/bin/sh
set -e

# -----------------------------------------------------------------------------
# MarsNova Database Migration Runner
# Executes migrations (001-009+) in strict alphanumeric sequence with idempotency
# -----------------------------------------------------------------------------

echo "=========================================================="
echo "   MarsNova PostgreSQL Automated Migration Runner         "
echo "=========================================================="

# Parse DATABASE_URL if provided (e.g. Render, Railway, Fly.io)
if [ -n "$DATABASE_URL" ]; then
    echo "[Migration] Extracting credentials from DATABASE_URL..."
    proto_stripped=$(echo "$DATABASE_URL" | sed -E "s|^postgres(ql)?://||")
    user_pass=$(echo "$proto_stripped" | awk -F'@' '{print $1}')
    host_rest=$(echo "$proto_stripped" | awk -F'@' '{print $2}')
    if [ -n "$host_rest" ]; then
        parsed_user=$(echo "$user_pass" | cut -d':' -f1)
        parsed_pass=$(echo "$user_pass" | cut -s -d':' -f2-)
        [ -n "$parsed_user" ] && DB_USER="$parsed_user"
        [ -n "$parsed_pass" ] && DB_PASSWORD="$parsed_pass"
    else
        host_rest="$proto_stripped"
    fi
    host_port=$(echo "$host_rest" | cut -d'/' -f1)
    db_query=$(echo "$host_rest" | cut -s -d'/' -f2-)
    parsed_host=$(echo "$host_port" | cut -d':' -f1)
    parsed_port=$(echo "$host_port" | cut -s -d':' -f2)
    parsed_db=$(echo "$db_query" | cut -d'?' -f1)
    [ -n "$parsed_host" ] && DB_HOST="$parsed_host"
    [ -n "$parsed_port" ] && DB_PORT="$parsed_port"
    [ -n "$parsed_db" ] && DB_NAME="$parsed_db"
fi

export PGHOST="${DB_HOST:-postgres}"
export PGPORT="${DB_PORT:-5432}"
export PGDATABASE="${DB_NAME:-marsnova_db}"
export PGUSER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-}"

if [ -d "/migrations" ]; then
    MIGRATIONS_DIR="/migrations"
elif [ -d "/app/migrations" ]; then
    MIGRATIONS_DIR="/app/migrations"
else
    MIGRATIONS_DIR="${MIGRATIONS_DIR:-./backend/migrations}"
fi

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
# The migration files record themselves with different column sets: 001, 002 and 004-008 insert
# (version, description), 003 inserts (version, name, executed_by) and 009 inserts (version, name,
# applied_at). This table is created BEFORE any of them run, so it must accept all three shapes;
# with only (version, name NOT NULL, applied_at) the first INSERT in migration 001 failed with
# 'column "description" does not exist', rolled that migration back and stopped the whole run.
psql -v ON_ERROR_STOP=1 <<-EOSQL
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255),
        description TEXT,
        executed_by VARCHAR(64),
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    -- bring a table created by an earlier version of this script up to the same shape
    ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS executed_by VARCHAR(64);
    ALTER TABLE schema_migrations ALTER COLUMN name DROP NOT NULL;
    ALTER TABLE schema_migrations ALTER COLUMN version TYPE VARCHAR(64);
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
            ON CONFLICT (version) DO UPDATE
                SET name = COALESCE(schema_migrations.name, EXCLUDED.name);
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
