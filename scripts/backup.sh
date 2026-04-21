#!/usr/bin/env bash
# backup.sh — dump MariaDB + MongoDB to a timestamped archive, then upload to MinIO
#
# Usage:
#   ./scripts/backup.sh
#
# Required env vars (loaded from .env if present):
#   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
#   MONGO_URI
#   BACKUP_DIR              (default: ./backups)
#   BACKUP_RETENTION_DAYS   (default: 7)
#
# Optional — set these to enable offsite upload to MinIO (or any S3-compatible store):
#   BACKUP_S3_ENDPOINT      e.g. http://minio-host:9000
#   BACKUP_S3_BUCKET        e.g. dittravel-backups
#   BACKUP_S3_ACCESS_KEY
#   BACKUP_S3_SECRET_KEY
#
# Cron example (daily at 2am):
#   0 2 * * * cd /path/to/app && ./scripts/backup.sh >> /var/log/dittravel-backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:?DB_USER is required}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"
DB_NAME="${DB_NAME:?DB_NAME is required}"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DEST="$BACKUP_DIR/$TIMESTAMP"

mkdir -p "$DEST"

echo "[backup] Starting backup at $TIMESTAMP"
echo "[backup] Destination: $DEST"

# --- MariaDB ---
echo "[backup] Dumping MariaDB database '$DB_NAME'..."
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" > "$DEST/mariadb_${DB_NAME}.sql"
echo "[backup] MariaDB dump: $(du -sh "$DEST/mariadb_${DB_NAME}.sql" | cut -f1)"

# --- MongoDB ---
echo "[backup] Dumping MongoDB from $MONGO_URI..."
mongodump \
  --uri="$MONGO_URI" \
  --out="$DEST/mongodb"
echo "[backup] MongoDB dump: $(du -sh "$DEST/mongodb" | cut -f1)"

# --- Compress ---
echo "[backup] Compressing..."
ARCHIVE="$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz"
tar -czf "$ARCHIVE" -C "$BACKUP_DIR" "$TIMESTAMP"
rm -rf "$DEST"
echo "[backup] Archive: $(du -sh "$ARCHIVE" | cut -f1)"

# --- Upload to MinIO (optional) ---
if [[ -n "${BACKUP_S3_ENDPOINT:-}" && -n "${BACKUP_S3_BUCKET:-}" ]]; then
  echo "[backup] Uploading to MinIO: s3://${BACKUP_S3_BUCKET}/backup_${TIMESTAMP}.tar.gz"

  if ! command -v aws &>/dev/null; then
    echo "[backup] WARNING: aws CLI not found — skipping MinIO upload. Install with: apt install awscli" >&2
  else
    AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY:?BACKUP_S3_ACCESS_KEY is required for MinIO upload}" \
    AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_KEY:?BACKUP_S3_SECRET_KEY is required for MinIO upload}" \
    aws s3 cp "$ARCHIVE" \
      "s3://${BACKUP_S3_BUCKET}/backup_${TIMESTAMP}.tar.gz" \
      --endpoint-url="${BACKUP_S3_ENDPOINT}" \
      --no-verify-ssl 2>/dev/null \
    && echo "[backup] MinIO upload: OK" \
    || echo "[backup] WARNING: MinIO upload failed — local backup still intact." >&2
  fi
else
  echo "[backup] MinIO upload skipped (BACKUP_S3_ENDPOINT / BACKUP_S3_BUCKET not set)."
  echo "[backup] Set these in .env to enable offsite backup — see .env.example."
fi

# --- Rotate old local backups ---
echo "[backup] Removing local backups older than ${BACKUP_RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime "+${BACKUP_RETENTION_DAYS}" -delete

echo "[backup] Done. Latest backup: backup_${TIMESTAMP}.tar.gz"
