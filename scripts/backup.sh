#!/usr/bin/env bash
# TVA Collect production backup script.
#
# Backs up the PostgreSQL database and uploaded files (S3/MinIO bucket or the
# local uploads directory, depending on UPLOAD_STORAGE), then prunes backups
# older than the configured retention window.
#
# Usage (run from the project root on the VPS, next to docker-compose.prod.yml):
#   ./scripts/backup.sh
#
# Intended to run daily via cron. See docs/backup-restore.md for the cron
# example and full restore instructions.
#
# Secrets are never hardcoded here — they are read from .env.production
# (or the file named by $ENV_FILE) at run time.
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.production}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "[backup] WARNING: $ENV_FILE not found; relying on variables already in the environment." >&2
fi

: "${POSTGRES_USER:?POSTGRES_USER is required (set in $ENV_FILE)}"
: "${POSTGRES_DB:?POSTGRES_DB is required (set in $ENV_FILE)}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required (set in $ENV_FILE)}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DB_BACKUP_DIR="$BACKUP_DIR/database"
UPLOADS_BACKUP_DIR="$BACKUP_DIR/uploads"
COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.prod.yml"

mkdir -p "$DB_BACKUP_DIR" "$UPLOADS_BACKUP_DIR"

echo "[backup] Dumping PostgreSQL database ($POSTGRES_DB)..."
DB_DUMP_PATH="$DB_BACKUP_DIR/tvacollect-$TIMESTAMP.dump"
$COMPOSE exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > "$DB_DUMP_PATH"
echo "[backup] Database dump saved to $DB_DUMP_PATH ($(du -h "$DB_DUMP_PATH" | cut -f1))"

# Uploaded documents. Prefer mirroring the S3/MinIO bucket; fall back to
# tarring the local upload directory when UPLOAD_STORAGE is not s3.
if [ "${UPLOAD_STORAGE:-}" = "s3" ] && command -v mc >/dev/null 2>&1; then
  echo "[backup] Mirroring uploads from S3/MinIO bucket ${S3_BUCKET:-unset}..."
  : "${S3_BUCKET:?S3_BUCKET is required when UPLOAD_STORAGE=s3}"
  : "${S3_ACCESS_KEY:?S3_ACCESS_KEY is required when UPLOAD_STORAGE=s3}"
  : "${S3_SECRET_KEY:?S3_SECRET_KEY is required when UPLOAD_STORAGE=s3}"
  mc alias set tvacollect-backup-source "${S3_ENDPOINT:-http://localhost:9000}" "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null
  mc mirror --quiet --overwrite "tvacollect-backup-source/${S3_BUCKET}" "$UPLOADS_BACKUP_DIR/$TIMESTAMP"
  echo "[backup] Uploads mirrored to $UPLOADS_BACKUP_DIR/$TIMESTAMP"
elif [ "${UPLOAD_STORAGE:-}" = "s3" ]; then
  echo "[backup] WARNING: UPLOAD_STORAGE=s3 but the 'mc' (MinIO client) binary is not installed — uploads were NOT backed up. Install mc or run this from a host that has it." >&2
elif [ -n "${LOCAL_UPLOAD_DIR:-}" ] && [ -d "${LOCAL_UPLOAD_DIR:-}" ]; then
  echo "[backup] Archiving local upload directory ($LOCAL_UPLOAD_DIR)..."
  UPLOADS_TAR_PATH="$UPLOADS_BACKUP_DIR/uploads-$TIMESTAMP.tar.gz"
  tar -czf "$UPLOADS_TAR_PATH" -C "$(dirname "$LOCAL_UPLOAD_DIR")" "$(basename "$LOCAL_UPLOAD_DIR")"
  echo "[backup] Local uploads archived to $UPLOADS_TAR_PATH ($(du -h "$UPLOADS_TAR_PATH" | cut -f1))"
else
  echo "[backup] WARNING: no upload storage backup performed — LOCAL_UPLOAD_DIR is unset/missing and UPLOAD_STORAGE is not s3." >&2
fi

# Optional off-site copy. Set BACKUP_REMOTE (an rclone remote:path, e.g.
# "b2:tvacollect-backups") to also push today's backups off the VPS. Skipped
# entirely if rclone isn't installed or BACKUP_REMOTE isn't set — a single
# VPS holding both the live data and its only backup is a real risk, so set
# this up before trusting the product with real client documents.
if [ -n "${BACKUP_REMOTE:-}" ] && command -v rclone >/dev/null 2>&1; then
  echo "[backup] Syncing backups off-site to $BACKUP_REMOTE..."
  rclone copy "$DB_BACKUP_DIR" "$BACKUP_REMOTE/database" --min-age 1s
  rclone copy "$UPLOADS_BACKUP_DIR" "$BACKUP_REMOTE/uploads" --min-age 1s
  echo "[backup] Off-site sync complete."
elif [ -n "${BACKUP_REMOTE:-}" ]; then
  echo "[backup] WARNING: BACKUP_REMOTE is set but 'rclone' is not installed — off-site sync skipped." >&2
fi

echo "[backup] Applying retention policy: deleting backups older than $RETENTION_DAYS day(s)..."
find "$DB_BACKUP_DIR" -maxdepth 1 -type f -name '*.dump' -mtime +"$RETENTION_DAYS" -print -delete
find "$UPLOADS_BACKUP_DIR" -maxdepth 1 -type f -name 'uploads-*.tar.gz' -mtime +"$RETENTION_DAYS" -print -delete
find "$UPLOADS_BACKUP_DIR" -maxdepth 1 -mindepth 1 -type d -mtime +"$RETENTION_DAYS" -print -exec rm -rf {} +

echo "[backup] Done."
