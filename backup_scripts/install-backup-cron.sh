#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_CONFIG="${BACKUP_CONFIG:-$SCRIPT_DIR/backup.env}"

if [[ -f "$BACKUP_CONFIG" ]]; then
  # shellcheck disable=SC1090
  source "$BACKUP_CONFIG"
fi

BACKUP_AUTOMATION_ENABLED="${BACKUP_AUTOMATION_ENABLED:-true}"
BACKUP_CRON_SCHEDULE="${BACKUP_CRON_SCHEDULE:-0 */6 * * *}"
BACKUP_LOG_FILE="${BACKUP_LOG_FILE:-/var/backups/dittravel/backup.log}"
CRON_TAG="# dittravel-backup-job"
JOB_CMD="BACKUP_CONFIG=$BACKUP_CONFIG $SCRIPT_DIR/backup-all.sh >> $BACKUP_LOG_FILE 2>&1"
CRON_LINE="$BACKUP_CRON_SCHEDULE $JOB_CMD $CRON_TAG"

current_cron="$(crontab -l 2>/dev/null || true)"
cleaned_cron="$(printf '%s\n' "$current_cron" | grep -v "$CRON_TAG" || true)"

if [[ "$BACKUP_AUTOMATION_ENABLED" == "true" ]]; then
  printf '%s\n%s\n' "$cleaned_cron" "$CRON_LINE" | crontab -
  echo "Backup cron installed."
  echo "Schedule: $BACKUP_CRON_SCHEDULE"
  echo "Command:  $JOB_CMD"
else
  printf '%s\n' "$cleaned_cron" | crontab -
  echo "Backup cron removed because BACKUP_AUTOMATION_ENABLED=false."
fi
