#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_CONFIG="${BACKUP_CONFIG:-$SCRIPT_DIR/backup.env}"

if [[ -f "$BACKUP_CONFIG" ]]; then
  # shellcheck disable=SC1090
  source "$BACKUP_CONFIG"
fi

BACKUP_LOG_FILE="${BACKUP_LOG_FILE:-/var/backups/dittravel/backup.log}"
mkdir -p "$(dirname "$BACKUP_LOG_FILE")"

log() {
  printf '[%s] [restore-all] %s\n' "$(date +"%Y-%m-%d %H:%M:%S")" "$*" | tee -a "$BACKUP_LOG_FILE"
}

log "Starting full restore workflow (MariaDB -> MongoDB)."
BACKUP_CONFIG="$BACKUP_CONFIG" "$SCRIPT_DIR/restore-mariadb.sh"
BACKUP_CONFIG="$BACKUP_CONFIG" "$SCRIPT_DIR/restore-mongodb.sh"
log "Full restore workflow completed."
