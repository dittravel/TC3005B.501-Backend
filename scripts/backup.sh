#!/usr/bin/env bash
# backup.sh — dump MariaDB + MongoDB to a timestamped directory
#
# Usage:
#   ./scripts/backup.sh
#
# Required env vars (loaded from .env if present):
#   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
#   MONGO_URI
#   BACKUP_DIR  (default: ./backups)
#   BACKUP_RETENTION_DAYS  (default: 7)
#
# Cron example (daily at 2am):
#   0 2 * * * cd /path/to/app && ./scripts/backup.sh >> /var/log/dittravel-backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if it exists and vars are not already set
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
tar -czf "$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz" -C "$BACKUP_DIR" "$TIMESTAMP"
rm -rf "$DEST"
echo "[backup] Archive: $(du -sh "$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz" | cut -f1)"

# --- Rotate old backups ---
echo "[backup] Removing backups older than ${BACKUP_RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime "+${BACKUP_RETENTION_DAYS}" -delete

echo "[backup] Done. Latest backup: backup_${TIMESTAMP}.tar.gz"
