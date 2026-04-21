#!/usr/bin/env bash
# restore.sh — restore MariaDB + MongoDB from a backup archive
#
# Usage:
#   ./scripts/restore.sh <backup-file.tar.gz>
#
# Example:
#   ./scripts/restore.sh ./backups/backup_20260420_020000.tar.gz
#
# WARNING: This will DROP and recreate the MariaDB database and
#          replace MongoDB collections. All current data will be lost.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

BACKUP_ARCHIVE="${1:?Usage: $0 <backup-file.tar.gz>}"

if [[ ! -f "$BACKUP_ARCHIVE" ]]; then
  echo "[restore] ERROR: file not found: $BACKUP_ARCHIVE" >&2
  exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:?DB_USER is required}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"
DB_NAME="${DB_NAME:?DB_NAME is required}"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017}"

echo "[restore] ⚠️  This will DESTROY current data in '$DB_NAME' and MongoDB."
read -r -p "[restore] Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "[restore] Aborted."
  exit 0
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "[restore] Extracting $BACKUP_ARCHIVE..."
tar -xzf "$BACKUP_ARCHIVE" -C "$WORK_DIR"
EXTRACTED_DIR="$(find "$WORK_DIR" -mindepth 1 -maxdepth 1 -type d | head -1)"

# --- MariaDB ---
SQL_FILE="$(find "$EXTRACTED_DIR" -name "mariadb_*.sql" | head -1)"
if [[ -z "$SQL_FILE" ]]; then
  echo "[restore] ERROR: no MariaDB dump found in archive" >&2
  exit 1
fi

echo "[restore] Restoring MariaDB database '$DB_NAME' from $(basename "$SQL_FILE")..."
MYSQL_PWD="$DB_PASSWORD" mysql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  -e "DROP DATABASE IF EXISTS \`$DB_NAME\`; CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

MYSQL_PWD="$DB_PASSWORD" mysql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  "$DB_NAME" < "$SQL_FILE"
echo "[restore] MariaDB restored."

# --- MongoDB ---
MONGO_DIR="$EXTRACTED_DIR/mongodb"
if [[ ! -d "$MONGO_DIR" ]]; then
  echo "[restore] WARNING: no MongoDB dump found — skipping MongoDB restore" >&2
else
  echo "[restore] Restoring MongoDB from $MONGO_DIR..."
  mongorestore \
    --uri="$MONGO_URI" \
    --drop \
    "$MONGO_DIR"
  echo "[restore] MongoDB restored."
fi

echo "[restore] ✅ Restore complete. Run smoke tests to verify:"
echo "           npm run test:e2e"
