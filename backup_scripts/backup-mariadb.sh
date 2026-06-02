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
MARIADB_BACKUP_SUBDIR="${MARIADB_BACKUP_SUBDIR:-mariadb}"
MARIADB_RETENTION_DAYS="${MARIADB_RETENTION_DAYS:-14}"
MARIADB_SOURCE="${MARIADB_SOURCE:-auto}"
MARIADB_DB_NAME="${MARIADB_DB_NAME:-${DB_NAME:-CocoScheme}}"
MARIADB_USER="${MARIADB_USER:-${DB_USER:-travel_user}}"
MARIADB_PASSWORD="${MARIADB_PASSWORD:-${DB_PASSWORD:-password}}"
MARIADB_HOST="${MARIADB_HOST:-${DB_HOST:-127.0.0.1}}"
MARIADB_PORT="${MARIADB_PORT:-${DB_PORT:-3306}}"
MARIADB_DOCKER_SERVICE="${MARIADB_DOCKER_SERVICE:-mariadb}"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
REMOTE_BACKUP_ENABLED="${REMOTE_BACKUP_ENABLED:-false}"
REMOTE_BACKUP_TARGET_DIR="${REMOTE_BACKUP_TARGET_DIR:-/var/backups/dittravel}"
REMOTE_BACKUP_HOST="${REMOTE_BACKUP_HOST:-}"
REMOTE_BACKUP_USER="${REMOTE_BACKUP_USER:-}"
REMOTE_BACKUP_SSH_KEY="${REMOTE_BACKUP_SSH_KEY:-}"
BACKUP_LOG_FILE="${BACKUP_LOG_FILE:-$BACKUP_BASE_DIR/backup.log}"

timestamp="$(date +"%Y%m%d_%H%M%S")"
backup_dir="$BACKUP_BASE_DIR/$MARIADB_BACKUP_SUBDIR"
backup_file="$backup_dir/${MARIADB_DB_NAME}_${BACKUP_ENVIRONMENT}_${timestamp}.sql"

mkdir -p "$backup_dir"
mkdir -p "$(dirname "$BACKUP_LOG_FILE")"

log() {
    printf '[%s] [mariadb] %s\n' "$(date +"%Y-%m-%d %H:%M:%S")" "$*" | tee -a "$BACKUP_LOG_FILE"
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

run_local_backup() {
    log "Creating local MariaDB backup from ${MARIADB_HOST}:${MARIADB_PORT}/${MARIADB_DB_NAME}."
    MYSQL_PWD="$MARIADB_PASSWORD" mysqldump \
        -h "$MARIADB_HOST" \
        -P "$MARIADB_PORT" \
        -u "$MARIADB_USER" \
        "$MARIADB_DB_NAME" > "$backup_file"
}

run_docker_backup() {
    log "Creating Docker MariaDB backup from service '$MARIADB_DOCKER_SERVICE'."
    docker compose -f "$COMPOSE_PROJECT_DIR/docker-compose.yml" exec -T \
    -e MYSQL_PWD="$MARIADB_PASSWORD" \
        "$MARIADB_DOCKER_SERVICE" \
        mariadb-dump -u"$MARIADB_USER" "$MARIADB_DB_NAME" > "$backup_file"
}

upload_remote_backup() {
    if [[ "$REMOTE_BACKUP_ENABLED" != "true" ]]; then
        return 0
    fi

    if [[ -z "$REMOTE_BACKUP_HOST" || -z "$REMOTE_BACKUP_USER" ]]; then
        log "REMOTE_BACKUP_ENABLED=true but REMOTE_BACKUP_HOST/REMOTE_BACKUP_USER are missing."
        return 1
    fi

    local remote_dir="$REMOTE_BACKUP_TARGET_DIR/$MARIADB_BACKUP_SUBDIR"
    local ssh_opts=()
    if [[ -n "$REMOTE_BACKUP_SSH_KEY" ]]; then
        ssh_opts=(-i "$REMOTE_BACKUP_SSH_KEY")
    fi

    log "Uploading MariaDB backup to ${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}:${remote_dir}."
    ssh "${ssh_opts[@]}" "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}" "mkdir -p '$remote_dir'"
    scp "${ssh_opts[@]}" "$backup_file.gz" "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}:$remote_dir/"
}

case "$MARIADB_SOURCE" in
    local)
        run_local_backup
        ;;
    docker)
        run_docker_backup
        ;;
    auto)
        if has_docker_service_running; then
            run_docker_backup
        else
            run_local_backup
        fi
        ;;
    *)
        log "Invalid MARIADB_SOURCE='$MARIADB_SOURCE'. Use local|docker|auto."
        exit 1
        ;;
esac

gzip -f "$backup_file"
find "$backup_dir" -type f -name '*.sql.gz' -mtime +"$MARIADB_RETENTION_DAYS" -delete
upload_remote_backup

log "Backup created: ${backup_file}.gz"
