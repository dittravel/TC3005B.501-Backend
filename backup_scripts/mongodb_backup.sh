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
MONGODB_BACKUP_SUBDIR="${MONGODB_BACKUP_SUBDIR:-mongodb}"
MONGODB_RETENTION_DAYS="${MONGODB_RETENTION_DAYS:-14}"
MONGODB_SOURCE="${MONGODB_SOURCE:-auto}"
MONGODB_DB_NAME="${MONGODB_DB_NAME:-fileStorage}"
MONGODB_HOST="${MONGODB_HOST:-127.0.0.1}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_USER="${MONGODB_USER:-}"
MONGODB_PASSWORD="${MONGODB_PASSWORD:-}"
MONGODB_AUTH_DB="${MONGODB_AUTH_DB:-admin}"
MONGODB_DOCKER_SERVICE="${MONGODB_DOCKER_SERVICE:-mongodb}"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
REMOTE_BACKUP_ENABLED="${REMOTE_BACKUP_ENABLED:-false}"
REMOTE_BACKUP_TARGET_DIR="${REMOTE_BACKUP_TARGET_DIR:-/var/backups/dittravel}"
REMOTE_BACKUP_HOST="${REMOTE_BACKUP_HOST:-}"
REMOTE_BACKUP_USER="${REMOTE_BACKUP_USER:-}"
REMOTE_BACKUP_SSH_KEY="${REMOTE_BACKUP_SSH_KEY:-}"
BACKUP_LOG_FILE="${BACKUP_LOG_FILE:-$BACKUP_BASE_DIR/backup.log}"

timestamp="$(date +"%Y%m%d_%H%M%S")"
backup_dir="$BACKUP_BASE_DIR/$MONGODB_BACKUP_SUBDIR"
backup_file="$backup_dir/${MONGODB_DB_NAME}_${BACKUP_ENVIRONMENT}_${timestamp}.archive.gz"

mkdir -p "$backup_dir"
mkdir -p "$(dirname "$BACKUP_LOG_FILE")"

log() {
    local line
    line="[$(date +"%Y-%m-%d %H:%M:%S")] [mongodb] $*"
    printf '%s\n' "$line" >> "$BACKUP_LOG_FILE"
    if [[ -t 1 ]]; then
        printf '%s\n' "$line"
    fi
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

build_auth_args() {
    if [[ -n "$MONGODB_USER" && -n "$MONGODB_PASSWORD" ]]; then
        echo "--username=$MONGODB_USER --password=$MONGODB_PASSWORD --authenticationDatabase=$MONGODB_AUTH_DB"
    fi
}

run_local_backup() {
    local auth_args
    auth_args="$(build_auth_args)"
    log "Creating local MongoDB backup from ${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DB_NAME}."
    mongodump \
        --host "$MONGODB_HOST" \
        --port "$MONGODB_PORT" \
        --db "$MONGODB_DB_NAME" \
        --archive="$backup_file" \
        --gzip \
        ${auth_args}
}

run_docker_backup() {
    local auth_args
    auth_args="$(build_auth_args)"
    log "Creating Docker MongoDB backup from service '$MONGODB_DOCKER_SERVICE'."
    # shellcheck disable=SC2086
    docker compose -f "$COMPOSE_PROJECT_DIR/docker-compose.yml" exec -T \
        "$MONGODB_DOCKER_SERVICE" \
        mongodump --db "$MONGODB_DB_NAME" --archive --gzip ${auth_args} > "$backup_file"
}

upload_remote_backup() {
    if [[ "$REMOTE_BACKUP_ENABLED" != "true" ]]; then
        return 0
    fi

    if [[ -z "$REMOTE_BACKUP_HOST" || -z "$REMOTE_BACKUP_USER" ]]; then
        log "REMOTE_BACKUP_ENABLED=true but REMOTE_BACKUP_HOST/REMOTE_BACKUP_USER are missing."
        return 1
    fi

    local remote_dir="$REMOTE_BACKUP_TARGET_DIR/$MONGODB_BACKUP_SUBDIR"
    local ssh_opts=()
    if [[ -n "$REMOTE_BACKUP_SSH_KEY" ]]; then
        ssh_opts=(-i "$REMOTE_BACKUP_SSH_KEY")
    fi

    log "Uploading MongoDB backup to ${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}:${remote_dir}."
    ssh "${ssh_opts[@]}" "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}" "mkdir -p '$remote_dir'"
    scp "${ssh_opts[@]}" "$backup_file" "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}:$remote_dir/"
}

case "$MONGODB_SOURCE" in
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
        log "Invalid MONGODB_SOURCE='$MONGODB_SOURCE'. Use local|docker|auto."
        exit 1
        ;;
esac

find "$backup_dir" -type f -name '*.archive.gz' -mtime +"$MONGODB_RETENTION_DAYS" -delete
upload_remote_backup

log "Backup created: $backup_file"
