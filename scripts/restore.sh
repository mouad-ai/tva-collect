#!/usr/bin/env bash
# TVA Collect production restore script.
#
# DESTRUCTIVE: replaces the current database contents. Read
# docs/backup-restore.md and run the restore drill checklist there.
#
# Usage (run from the project root on the VPS, next to docker-compose.prod.yml):
#   ./scripts/restore.sh backups/database/tvacollect-YYYYMMDD-HHMMSS.dump [uploads-source]
#
# [uploads-source] is optional:
#   - a path to backups/uploads/uploads-YYYYMMDD-HHMMSS.tar.gz (local storage), or
#   - a path to backups/uploads/YYYYMMDD-HHMMSS (S3/MinIO mirror directory)
set -euo pipefail

cd "$(dirname "$0")/.."

DUMP_FILE="${1:-}"
if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "Usage: $0 <path-to-database-dump> [uploads-backup-path]" >&2
  exit 1
fi
UPLOADS_SOURCE="${2:-}"

ENV_FILE="${ENV_FILE:-.env.production}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "[restore] WARNING: $ENV_FILE not found; relying on variables already in the environment." >&2
fi

: "${POSTGRES_USER:?POSTGRES_USER is required (set in $ENV_FILE)}"
: "${POSTGRES_DB:?POSTGRES_DB is required (set in $ENV_FILE)}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required (set in $ENV_FILE)}"

COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.prod.yml"

echo "This will REPLACE the current contents of database '$POSTGRES_DB' with $DUMP_FILE."
read -r -p "Type 'restore' to continue: " CONFIRM
if [ "$CONFIRM" != "restore" ]; then
  echo "Aborted."
  exit 1
fi

echo "[restore] Stopping the app to prevent writes during restore..."
$COMPOSE stop app

echo "[restore] Restoring database from $DUMP_FILE..."
$COMPOSE exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$DUMP_FILE"

if [ -n "$UPLOADS_SOURCE" ]; then
  if [[ "$UPLOADS_SOURCE" == *.tar.gz ]]; then
    echo "[restore] Restoring local upload archive $UPLOADS_SOURCE..."
    TARGET_DIR="${LOCAL_UPLOAD_DIR:-./uploads}"
    mkdir -p "$TARGET_DIR"
    tar -xzf "$UPLOADS_SOURCE" -C "$(dirname "$TARGET_DIR")"
  elif command -v mc >/dev/null 2>&1; then
    echo "[restore] Restoring S3/MinIO uploads from $UPLOADS_SOURCE..."
    : "${S3_BUCKET:?S3_BUCKET is required to restore S3/MinIO uploads}"
    : "${S3_ACCESS_KEY:?S3_ACCESS_KEY is required to restore S3/MinIO uploads}"
    : "${S3_SECRET_KEY:?S3_SECRET_KEY is required to restore S3/MinIO uploads}"
    mc alias set tvacollect-restore-target "${S3_ENDPOINT:-http://localhost:9000}" "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null
    mc mirror --overwrite "$UPLOADS_SOURCE" "tvacollect-restore-target/${S3_BUCKET}"
  else
    echo "[restore] WARNING: 'mc' not found — cannot restore S3/MinIO uploads automatically. See docs/backup-restore.md for manual steps." >&2
  fi
else
  echo "[restore] No uploads source provided — skipping upload restore."
fi

echo "[restore] Applying Prisma migrations..."
$COMPOSE run --rm app node node_modules/prisma/build/index.js migrate deploy

echo "[restore] Starting the app..."
$COMPOSE start app

cat <<'EOF'
[restore] Done.

Verify before trusting this restore:
  1. curl -f https://app.tvacollect.com/api/health (or your domain)
  2. Log in as a cabinet user and check the client/document list looks right.
  3. Open one public /upload/[token] link.
  4. Download one protected document to confirm file storage matches the DB.
EOF
