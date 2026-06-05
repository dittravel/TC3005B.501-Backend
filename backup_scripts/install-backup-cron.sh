#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_CONFIG="${BACKUP_CONFIG:-$SCRIPT_DIR/backup.env}"

read_config_value() {
  local key="$1"
  local raw_value

  raw_value="$({ grep -E "^${key}=" "$BACKUP_CONFIG" | tail -n 1 | sed "s/^${key}=//"; } 2>/dev/null || true)"
  raw_value="${raw_value%$'\r'}"

  if [[ -z "$raw_value" ]]; then
    printf '%s' ""
    return 0
  fi

  if [[ ( "$raw_value" == '"'*'"' ) || ( "$raw_value" == "'"*"'" ) ]]; then
    raw_value="${raw_value:1:${#raw_value}-2}"
  fi

  printf '%s' "$raw_value"
}

if [[ -f "$BACKUP_CONFIG" ]]; then
  BACKUP_AUTOMATION_ENABLED="$(read_config_value BACKUP_AUTOMATION_ENABLED)"
  BACKUP_CRON_SCHEDULE="$(read_config_value BACKUP_CRON_SCHEDULE)"
  BACKUP_LOG_FILE="$(read_config_value BACKUP_LOG_FILE)"
fi

BACKUP_AUTOMATION_ENABLED="${BACKUP_AUTOMATION_ENABLED:-true}"
BACKUP_CRON_SCHEDULE="${BACKUP_CRON_SCHEDULE:-0 */6 * * *}"
BACKUP_LOG_FILE="${BACKUP_LOG_FILE:-/var/backups/dittravel/backup.log}"

# Always use absolute paths in the cron entry so it works regardless of cron's working directory.
BACKUP_CONFIG_ABS="$(cd "$(dirname "$BACKUP_CONFIG")" && pwd)/$(basename "$BACKUP_CONFIG")"

CRON_TAG="# dittravel-backup-job"
JOB_CMD="BACKUP_CONFIG=$BACKUP_CONFIG_ABS $SCRIPT_DIR/backup-all.sh >> $BACKUP_LOG_FILE 2>&1"
CRON_LINE="$BACKUP_CRON_SCHEDULE $JOB_CMD $CRON_TAG"

ensure_cron_available() {
  if command -v crontab >/dev/null 2>&1; then
    return 0
  fi

  echo "crontab command not found. Trying to install cron package..."

  if ! command -v apt-get >/dev/null 2>&1; then
    echo "Error: apt-get not available and crontab is missing. Install cron manually."
    exit 1
  fi

  local sudo_cmd=""
  if [[ ${EUID:-0} -ne 0 ]]; then
    sudo_cmd="sudo"
  fi

  $sudo_cmd apt-get update
  $sudo_cmd apt-get install -y cron
  $sudo_cmd systemctl enable --now cron

  if ! command -v crontab >/dev/null 2>&1; then
    echo "Error: cron installation completed but crontab is still unavailable."
    exit 1
  fi
}

ensure_cron_available

current_cron="$(crontab -l 2>/dev/null || true)"
cleaned_cron="$(printf '%s\n' "$current_cron" | grep -v "$CRON_TAG" || true)"

if [[ "$BACKUP_AUTOMATION_ENABLED" == "true" ]]; then
  printf '%s\n%s\n' "$cleaned_cron" "$CRON_LINE" | crontab -
  if ! crontab -l | grep -Fq "$CRON_TAG"; then
    echo "Error: cron job was not installed correctly."
    exit 1
  fi
  echo "Backup cron installed."
  echo "Schedule: $BACKUP_CRON_SCHEDULE"
  echo "Command:  $JOB_CMD"
else
  printf '%s\n' "$cleaned_cron" | crontab -
  if crontab -l 2>/dev/null | grep -Fq "$CRON_TAG"; then
    echo "Error: cron job was not removed correctly."
    exit 1
  fi
  echo "Backup cron removed because BACKUP_AUTOMATION_ENABLED=false."
fi
