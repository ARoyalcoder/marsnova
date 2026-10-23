#!/bin/sh
set -e

# -----------------------------------------------------------------------------
# MarsNova Production Database Backup Script
# Creates compressed, timestamped pg_dump backups with SHA-256 integrity checksums
# -----------------------------------------------------------------------------

echo "=========================================================="
echo "   MarsNova PostgreSQL Automated Backup Utility           "
echo "=========================================================="

export PGHOST="${DB_HOST:-postgres}"
export PGPORT="${DB_PORT:-5432}"
export PGDATABASE="${DB_NAME:-marsnova_db}"
export PGUSER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_FILENAME="marsnova_backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
CHECKSUM_PATH="${BACKUP_PATH}.sha256"

echo "[Backup] Initiating dump for ${PGDATABASE} on ${PGHOST}:${PGPORT}..."

# Execute pg_dump with compression, clean drops, and blob support
pg_dump \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$PGDATABASE" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --format=plain \
    | gzip -9 > "$BACKUP_PATH"

# Generate SHA-256 checksum for audit and restore verification
sha256sum "$BACKUP_PATH" > "$CHECKSUM_PATH"

BACKUP_SIZE=$(ls -lh "$BACKUP_PATH" | awk '{print $5}')
echo "[Backup] Archive created successfully: ${BACKUP_PATH} (Size: ${BACKUP_SIZE})"
echo "[Backup] SHA-256: $(cat "$CHECKSUM_PATH")"

# Prune old backups past the retention threshold
echo "[Backup] Pruning archives older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "marsnova_backup_*.sql.gz*" -type f -mtime "+${RETENTION_DAYS}" -exec rm -f {} +

echo "[Backup] Backup operation completed successfully."
exit 0
