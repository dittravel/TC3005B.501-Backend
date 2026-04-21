#!/usr/bin/env bash
# test-restore.sh — verify the backup/restore cycle works end-to-end
#
# Creates a backup, restores it to a shadow database, checks row counts match.
# Run this after first deploy and after any schema change.
#
# Usage:
#   ./scripts/test-restore.sh

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
SHADOW_DB="${DB_NAME}_restore_test"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"

echo "[test-restore] Step 1: Creating backup..."
"$SCRIPT_DIR/backup.sh"
LATEST="$(ls -t "$BACKUP_DIR"/backup_*.tar.gz | head -1)"
echo "[test-restore] Backup: $LATEST"

echo "[test-restore] Step 2: Extracting backup..."
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"; MYSQL_PWD="$DB_PASSWORD" mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" -e "DROP DATABASE IF EXISTS \`$SHADOW_DB\`;" 2>/dev/null || true' EXIT

tar -xzf "$LATEST" -C "$WORK_DIR"
EXTRACTED_DIR="$(find "$WORK_DIR" -mindepth 1 -maxdepth 1 -type d | head -1)"
SQL_FILE="$(find "$EXTRACTED_DIR" -name "mariadb_*.sql" | head -1)"

echo "[test-restore] Step 3: Restoring to shadow database '$SHADOW_DB'..."
MYSQL_PWD="$DB_PASSWORD" mysql \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  -e "DROP DATABASE IF EXISTS \`$SHADOW_DB\`; CREATE DATABASE \`$SHADOW_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Rewrite database name in dump so it targets the shadow DB
sed "s/USE \`$DB_NAME\`/USE \`$SHADOW_DB\`/g" "$SQL_FILE" | \
  MYSQL_PWD="$DB_PASSWORD" mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER"

echo "[test-restore] Step 4: Comparing row counts..."
PASS=true
TABLES=$(MYSQL_PWD="$DB_PASSWORD" mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  -N -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_TYPE='BASE TABLE';")

for TABLE in $TABLES; do
  ORIG=$(MYSQL_PWD="$DB_PASSWORD" mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
    -N -e "SELECT COUNT(*) FROM \`$DB_NAME\`.\`$TABLE\`;")
  COPY=$(MYSQL_PWD="$DB_PASSWORD" mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
    -N -e "SELECT COUNT(*) FROM \`$SHADOW_DB\`.\`$TABLE\`;")
  if [[ "$ORIG" == "$COPY" ]]; then
    echo "  ✓ $TABLE: $ORIG rows"
  else
    echo "  ✗ $TABLE: original=$ORIG restored=$COPY  ← MISMATCH"
    PASS=false
  fi
done

if $PASS; then
  echo "[test-restore] ✅ All row counts match — backup/restore cycle verified."
  exit 0
else
  echo "[test-restore] ❌ Row count mismatches detected — backup may be incomplete." >&2
  exit 1
fi
