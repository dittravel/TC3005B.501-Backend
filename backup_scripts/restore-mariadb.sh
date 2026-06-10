#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_CONFIG="${BACKUP_CONFIG:-$SCRIPT_DIR/backup.env}"

if [[ -f "$BACKUP_CONFIG" ]]; then
    # shellcheck disable=SC1090
    source "$BACKUP_CONFIG"
fi

BACKUP_ENVIRONMENT="${BACKUP_ENVIRONMENT:-development}"
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/var/backups/dittravel}"
BACKUP_LOG_FILE="${BACKUP_LOG_FILE:-$BACKUP_BASE_DIR/backup.log}"
MARIADB_BACKUP_SUBDIR="${MARIADB_BACKUP_SUBDIR:-mariadb}"

MARIADB_RESTORE_SOURCE="${MARIADB_RESTORE_SOURCE:-${MARIADB_SOURCE:-auto}}"
MARIADB_RESTORE_FILE="${MARIADB_RESTORE_FILE:-}"
MARIADB_RESTORE_CREATE_SAFETY_BACKUP="${MARIADB_RESTORE_CREATE_SAFETY_BACKUP:-true}"

MARIADB_DB_NAME="${MARIADB_DB_NAME:-${DB_NAME:-CocoScheme}}"
MARIADB_USER="${MARIADB_USER:-${DB_USER:-travel_user}}"
MARIADB_PASSWORD="${MARIADB_PASSWORD:-${DB_PASSWORD:-password}}"
MARIADB_HOST="${MARIADB_HOST:-${DB_HOST:-127.0.0.1}}"
MARIADB_PORT="${MARIADB_PORT:-${DB_PORT:-3306}}"
MARIADB_DOCKER_SERVICE="${MARIADB_DOCKER_SERVICE:-mariadb}"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

restore_dir="$BACKUP_BASE_DIR/$MARIADB_BACKUP_SUBDIR"
timestamp="$(date +"%Y%m%d_%H%M%S")"

mkdir -p "$(dirname "$BACKUP_LOG_FILE")"

log() {
    printf '[%s] [mariadb-restore] %s\n' "$(date +"%Y-%m-%d %H:%M:%S")" "$*" | tee -a "$BACKUP_LOG_FILE"
}

has_docker_service_running() {
    if ! command -v docker >/dev/null 2>&1; then
        return 1
    fi
    if ! docker compose -f "$COMPOSE_PROJECT_DIR/docker-compose.yml" ps "$MARIADB_DOCKER_SERVICE" >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

pick_latest_backup() {
    local latest
    latest="$(ls -t "$restore_dir"/*.sql.gz 2>/dev/null | head -n 1 || true)"
    if [[ -z "$latest" ]]; then
        log "No MariaDB backup file found in $restore_dir (*.sql.gz)."
        exit 1
    fi
    printf '%s\n' "$latest"
}

create_safety_backup_local() {
    local safety_file="$restore_dir/${MARIADB_DB_NAME}_${BACKUP_ENVIRONMENT}_SAFETY_BEFORE_RESTORE_${timestamp}.sql.gz"
    log "Creating local safety backup before restore: $safety_file"
    mkdir -p "$restore_dir"
    MYSQL_PWD="$MARIADB_PASSWORD" mysqldump \
        -h "$MARIADB_HOST" \
        -P "$MARIADB_PORT" \
        -u "$MARIADB_USER" \
        "$MARIADB_DB_NAME" | gzip > "$safety_file"
}

create_safety_backup_docker() {
    local safety_file="$restore_dir/${MARIADB_DB_NAME}_${BACKUP_ENVIRONMENT}_SAFETY_BEFORE_RESTORE_${timestamp}.sql.gz"
    log "Creating Docker safety backup before restore: $safety_file"
    mkdir -p "$restore_dir"
    docker compose -f "$COMPOSE_PROJECT_DIR/docker-compose.yml" exec -T \
        -e MYSQL_PWD="$MARIADB_PASSWORD" \
        "$MARIADB_DOCKER_SERVICE" \
        mariadb-dump -h127.0.0.1 -u"$MARIADB_USER" "$MARIADB_DB_NAME" | gzip > "$safety_file"
}

restore_local() {
    local backup_file="$1"
    log "Restoring MariaDB locally from: $backup_file"
    gunzip -c "$backup_file" | MYSQL_PWD="$MARIADB_PASSWORD" mariadb \
        -h "$MARIADB_HOST" \
        -P "$MARIADB_PORT" \
        -u "$MARIADB_USER" \
        "$MARIADB_DB_NAME"
}

restore_docker() {
    local backup_file="$1"
    log "Restoring MariaDB in Docker service '$MARIADB_DOCKER_SERVICE' from: $backup_file"
    gunzip -c "$backup_file" | docker compose -f "$COMPOSE_PROJECT_DIR/docker-compose.yml" exec -T \
        -e MYSQL_PWD="$MARIADB_PASSWORD" \
        "$MARIADB_DOCKER_SERVICE" \
        mariadb -h127.0.0.1 -u"$MARIADB_USER" "$MARIADB_DB_NAME"
}

backup_to_restore="$MARIADB_RESTORE_FILE"
if [[ -z "$backup_to_restore" ]]; then
    backup_to_restore="$(pick_latest_backup)"
fi

if [[ ! -f "$backup_to_restore" ]]; then
    log "Backup file does not exist: $backup_to_restore"
    exit 1
fi

log "Selected MariaDB backup: $backup_to_restore"

case "$MARIADB_RESTORE_SOURCE" in
    local)
        if [[ "$MARIADB_RESTORE_CREATE_SAFETY_BACKUP" == "true" ]]; then
            create_safety_backup_local
        fi
        restore_local "$backup_to_restore"
        ;;
    docker)
        if [[ "$MARIADB_RESTORE_CREATE_SAFETY_BACKUP" == "true" ]]; then
            create_safety_backup_docker
        fi
        restore_docker "$backup_to_restore"
        ;;
    auto)
        if has_docker_service_running; then
            if [[ "$MARIADB_RESTORE_CREATE_SAFETY_BACKUP" == "true" ]]; then
                create_safety_backup_docker
            fi
            restore_docker "$backup_to_restore"
        else
            if [[ "$MARIADB_RESTORE_CREATE_SAFETY_BACKUP" == "true" ]]; then
                create_safety_backup_local
            fi
            restore_local "$backup_to_restore"
        fi
        ;;
    *)
        log "Invalid MARIADB_RESTORE_SOURCE='$MARIADB_RESTORE_SOURCE'. Use local|docker|auto."
        exit 1
        ;;
esac

log "MariaDB restore completed successfully."
