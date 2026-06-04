#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_CONFIG="${BACKUP_CONFIG:-$SCRIPT_DIR/backup.env}"

if [[ -f "$BACKUP_CONFIG" ]]; then
    # shellcheck disable=SC1090
    source "$BACKUP_CONFIG"
fi

BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/var/backups/dittravel}"
BACKUP_LOG_FILE="${BACKUP_LOG_FILE:-$BACKUP_BASE_DIR/backup.log}"
MONGODB_BACKUP_SUBDIR="${MONGODB_BACKUP_SUBDIR:-mongodb}"

MONGODB_RESTORE_SOURCE="${MONGODB_RESTORE_SOURCE:-${MONGODB_SOURCE:-auto}}"
MONGODB_RESTORE_FILE="${MONGODB_RESTORE_FILE:-}"
MONGODB_RESTORE_DROP="${MONGODB_RESTORE_DROP:-true}"

MONGODB_DB_NAME="${MONGODB_DB_NAME:-fileStorage}"
MONGODB_HOST="${MONGODB_HOST:-127.0.0.1}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_USER="${MONGODB_USER:-}"
MONGODB_PASSWORD="${MONGODB_PASSWORD:-}"
MONGODB_AUTH_DB="${MONGODB_AUTH_DB:-admin}"
MONGODB_DOCKER_SERVICE="${MONGODB_DOCKER_SERVICE:-mongodb}"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

restore_dir="$BACKUP_BASE_DIR/$MONGODB_BACKUP_SUBDIR"

mkdir -p "$(dirname "$BACKUP_LOG_FILE")"

log() {
    printf '[%s] [mongodb-restore] %s\n' "$(date +"%Y-%m-%d %H:%M:%S")" "$*" | tee -a "$BACKUP_LOG_FILE"
}

has_docker_service_running() {
    if ! command -v docker >/dev/null 2>&1; then
        return 1
    fi
    if ! docker compose -f "$COMPOSE_PROJECT_DIR/docker-compose.yml" ps "$MONGODB_DOCKER_SERVICE" >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

pick_latest_backup() {
    local latest
    latest="$(ls -t "$restore_dir"/*.archive.gz 2>/dev/null | head -n 1 || true)"
    if [[ -z "$latest" ]]; then
        log "No MongoDB backup file found in $restore_dir (*.archive.gz)."
        exit 1
    fi
    printf '%s\n' "$latest"
}

build_auth_args() {
    local args=()
    if [[ -n "$MONGODB_USER" && -n "$MONGODB_PASSWORD" ]]; then
        args+=("--username=$MONGODB_USER")
        args+=("--password=$MONGODB_PASSWORD")
        args+=("--authenticationDatabase=$MONGODB_AUTH_DB")
    fi
    printf '%s\n' "${args[*]}"
}

build_drop_args() {
    if [[ "$MONGODB_RESTORE_DROP" == "true" ]]; then
        printf '%s\n' "--drop"
    else
        printf '%s\n' ""
    fi
}

restore_local() {
    local backup_file="$1"
    local auth_args
    local drop_arg
    auth_args="$(build_auth_args)"
    drop_arg="$(build_drop_args)"
    log "Restoring MongoDB locally from: $backup_file"
    # shellcheck disable=SC2086
    mongorestore \
        --host "$MONGODB_HOST" \
        --port "$MONGODB_PORT" \
        --db "$MONGODB_DB_NAME" \
        --gzip \
        --archive="$backup_file" \
        ${drop_arg} \
        ${auth_args}
}

restore_docker() {
    local backup_file="$1"
    local auth_args
    local drop_arg
    auth_args="$(build_auth_args)"
    drop_arg="$(build_drop_args)"
    log "Restoring MongoDB in Docker service '$MONGODB_DOCKER_SERVICE' from: $backup_file"
    # shellcheck disable=SC2086
    cat "$backup_file" | docker compose -f "$COMPOSE_PROJECT_DIR/docker-compose.yml" exec -T \
        "$MONGODB_DOCKER_SERVICE" \
        mongorestore --db "$MONGODB_DB_NAME" --gzip --archive \
        ${drop_arg} \
        ${auth_args}
}

backup_to_restore="$MONGODB_RESTORE_FILE"
if [[ -z "$backup_to_restore" ]]; then
    backup_to_restore="$(pick_latest_backup)"
fi

if [[ ! -f "$backup_to_restore" ]]; then
    log "Backup file does not exist: $backup_to_restore"
    exit 1
fi

log "Selected MongoDB backup: $backup_to_restore"

case "$MONGODB_RESTORE_SOURCE" in
    local)
        restore_local "$backup_to_restore"
        ;;
    docker)
        restore_docker "$backup_to_restore"
        ;;
    auto)
        if has_docker_service_running; then
            restore_docker "$backup_to_restore"
        else
            restore_local "$backup_to_restore"
        fi
        ;;
    *)
        log "Invalid MONGODB_RESTORE_SOURCE='$MONGODB_RESTORE_SOURCE'. Use local|docker|auto."
        exit 1
        ;;
esac

log "MongoDB restore completed successfully."
