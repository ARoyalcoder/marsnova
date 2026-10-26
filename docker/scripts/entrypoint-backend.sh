#!/bin/sh
set -e

# -----------------------------------------------------------------------------
# MarsNova Backend Entrypoint Script
# Injects environment-based configurations & starts Drogon C++ server
# -----------------------------------------------------------------------------

echo "[MarsNova Entrypoint] Preparing Drogon C++ Backend runtime environment..."

# 1. Parse DATABASE_URL if provided (e.g. Render, Fly.io, Railway)
if [ -n "$DATABASE_URL" ]; then
    echo "[MarsNova Entrypoint] Parsing connection details from DATABASE_URL..."
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

# 2. Environment Defaults
export DB_HOST="${DB_HOST:-postgres}"
export DB_PORT="${DB_PORT:-5432}"
export DB_NAME="${DB_NAME:-marsnova_db}"
export DB_USER="${DB_USER:-postgres}"
export DB_PASSWORD="${DB_PASSWORD:-}"
export PORT="${PORT:-8080}"
export APP_THREADS="${APP_THREADS:-4}"
export CLIENT_MAX_BODY_SIZE="${CLIENT_MAX_BODY_SIZE:-25M}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost,http://localhost:80,https://marsnova.in,https://marsnova.vercel.app}"
export WHATSAPP_NUMBER="${WHATSAPP_NUMBER:-917208591595}"

# Format CORS origins as JSON string array
CORS_ARRAY=$(echo "$CORS_ORIGINS" | awk -F',' '{
    printf "["
    for (i=1; i<=NF; i++) {
        gsub(/^[ \t]+|[ \t]+$/, "", $i)
        printf "\"%s\"", $i
        if (i < NF) printf ", "
    }
    printf "]"
}')

# 3. Optional automated database migrations on startup
if [ "$AUTO_MIGRATE" = "true" ] && [ -x /migrate.sh ]; then
    echo "[MarsNova Entrypoint] AUTO_MIGRATE is true: executing database migrations..."
    /migrate.sh || echo "[MarsNova Entrypoint] WARNING: Database migrations encountered an issue; proceeding with startup."
fi

# 4. Generate Runtime config.json
cat <<EOF > /app/config.json
{
  "listeners": [
    {
      "address": "0.0.0.0",
      "port": ${PORT},
      "https": false
    }
  ],
  "db_clients": [
    {
      "name": "default",
      "rdbms": "postgresql",
      "host": "${DB_HOST}",
      "port": ${DB_PORT},
      "dbname": "${DB_NAME}",
      "user": "${DB_USER}",
      "passwd": "${DB_PASSWORD}",
      "is_fast": false,
      "connection_number": 10
    }
  ],
  "app": {
    "number_of_threads": ${APP_THREADS},
    "enable_session": false,
    "upload_path": "./uploads",
    "client_max_body_size": "${CLIENT_MAX_BODY_SIZE}"
  },
  "custom_config": {
    "cors_allowed_origins": ${CORS_ARRAY},
    "whatsapp_business_number": "${WHATSAPP_NUMBER}"
  }
}
EOF

echo "[MarsNova Entrypoint] Configuration rendered successfully (database target: ${DB_HOST}:${DB_PORT}/${DB_NAME})."

# Ensure uploads directory exists
mkdir -p /app/uploads

# 3. Hand over execution to the Drogon executable
echo "[MarsNova Entrypoint] Starting Drogon executable: $@"
exec "$@"
