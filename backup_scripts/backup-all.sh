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
  printf '[%s] [backup-all] %s\n' "$(date +"%Y-%m-%d %H:%M:%S")" "$*" | tee -a "$BACKUP_LOG_FILE"
}

log "Starting full backup workflow."
BACKUP_CONFIG="$BACKUP_CONFIG" "$SCRIPT_DIR/backup-mariadb.sh"
BACKUP_CONFIG="$BACKUP_CONFIG" "$SCRIPT_DIR/mongodb_backup.sh"
log "Full backup workflow completed."
