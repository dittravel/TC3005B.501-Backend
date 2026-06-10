#!/bin/bash
# Usage: ./switch-env.sh [devLocal|devDocker|serverDocker|serverDockerDB]
#   DB_IP=10.20.30.40 ./switch-env.sh serverDocker
#
# Modes:
#   devLocal        -> backend runs NATIVELY (nodemon); DB/Mongo hosts come from
#                      one-time .env switcher config keys (DEVLOCAL_DB_HOST,
#                      DEVLOCAL_MONGO_HOST), with localhost fallback.
#                      .env patched only; docker compose is NOT touched.
#   devDocker       -> backend + mariadb + mongodb all on this machine via Compose.
#                      docker-compose.yml is rewritten to the full stack.
#   serverDocker    -> backend container ONLY (no DBs); DBs reachable at DB_IP
#                      or SERVER_DOCKER_DB_IP in .env (default 999.999.999.999).
#   serverDockerDB  -> DB-only host: mariadb + mongodb containers exposed on host
#                      ports 3306 and 27017 for the backend instance to reach
#                      over the private network.
#
# Secrets / API keys / mail creds in .env are preserved.
# The switcher only changes connection TARGETS (host/port/URI), not usernames,
# passwords, or DB names.

set -e
MODE=$1

case "$MODE" in
  devLocal|devDocker|serverDocker|serverDockerDB) ;;
  *)
    echo "Usage: $0 [devLocal|devDocker|serverDocker|serverDockerDB]"
    echo "  devLocal        - native backend, DBs on localhost"
    echo "  devDocker       - full stack (backend + DBs) in Compose on this host"
    echo "  serverDocker    - backend container; DBs on remote instance via DB_IP"
    echo "  serverDockerDB  - DB-only host: mariadb + mongodb exposed on host ports"
    echo ""
    echo "  Optional: DB_IP=<ip> ./switch-env.sh serverDocker"
    echo "            (default 999.999.999.999 - placeholder, change when DB instance is up)"
    exit 1
    ;;
esac

if [[ ! -f .env ]]; then
  # Auto-bootstrap from the closest matching example so users don't have to copy manually.
  if [[ "$MODE" == "devLocal" && -f .env.local.example ]]; then
    cp .env.local.example .env
    echo "Bootstrapped .env from .env.local.example (fill in secrets before using)."
  elif [[ -f .env.docker.example ]]; then
    cp .env.docker.example .env
    echo "Bootstrapped .env from .env.docker.example (fill in secrets before using)."
  elif [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Bootstrapped .env from .env.example (fill in secrets before using)."
  else
    echo "Error: .env not found in $(pwd) and no example file available."
    exit 1
  fi
fi

# Read KEY=value from .env (last occurrence wins).
read_env_value() {
  local key="$1"
  local raw
  raw="$(grep -E "^${key}=" .env | tail -n 1 | cut -d'=' -f2- | tr -d '\r')"
  # Trim surrounding whitespace first.
  raw="$(printf '%s' "$raw" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  # Strip one pair of wrapping double quotes if present.
  raw="${raw#\"}"
  raw="${raw%\"}"
  printf '%s' "$raw"
}

# upsert KEY VALUE -- replace 'KEY=...' line if present, else append.
upsert() {
  local key="$1" value="$2"
  if grep -qE "^${key}=" .env; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" .env
    rm -f .env.bak
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

echo "Switching backend to '$MODE' mode..."

CONFIG_DEVLOCAL_DB_HOST="$(read_env_value DEVLOCAL_DB_HOST)"
CONFIG_DEVLOCAL_MONGO_HOST="$(read_env_value DEVLOCAL_MONGO_HOST)"
CONFIG_SERVER_DB_IP="$(read_env_value SERVER_DOCKER_DB_IP)"

DB_IP="${DB_IP:-${CONFIG_SERVER_DB_IP:-999.999.999.999}}"
LOCAL_DB_HOST="${LOCAL_DB_HOST:-${CONFIG_DEVLOCAL_DB_HOST:-localhost}}"
LOCAL_MONGO_HOST="${LOCAL_MONGO_HOST:-${CONFIG_DEVLOCAL_MONGO_HOST:-localhost}}"

if [[ "$MODE" == "devLocal" ]]; then
  echo "devLocal: DB host=$LOCAL_DB_HOST, Mongo host=$LOCAL_MONGO_HOST"
fi

case "$MODE" in
  devLocal)
    upsert NODE_ENV       'development'
    upsert DB_HOST        "${LOCAL_DB_HOST}"
    upsert DB_PORT        '3306'
    upsert MONGO_URI      "mongodb://${LOCAL_MONGO_HOST}:27017"
    upsert DATABASE_HOST  "\"${LOCAL_DB_HOST}\""
    ;;
  devDocker)
    upsert NODE_ENV       'development'
    upsert DB_HOST        'mariadb'
    upsert DB_PORT        '3306'
    upsert MONGO_URI      'mongodb://mongodb:27017'
    upsert DATABASE_HOST  '"mariadb"'
    ;;
  serverDocker)
    upsert NODE_ENV       'production'
    upsert DB_HOST        "${DB_IP}"
    upsert DB_PORT        '3306'
    upsert MONGO_URI      "mongodb://${DB_IP}:27017"
    upsert DATABASE_HOST  "\"${DB_IP}\""
    ;;
  serverDockerDB)
    # DB host: backend app is NOT run here. .env only used to feed compose vars
    # (DB_NAME, DB_USER, DB_PASSWORD, DB_ROOT_PASSWORD).
    ;;
esac

echo ".env patched for '$MODE' mode."

# ---------------------------------------------------------------------------
# docker-compose.yml + container lifecycle (skipped for devLocal)
# ---------------------------------------------------------------------------
if [[ "$MODE" == "devLocal" ]]; then
  echo "devLocal: skipping docker compose (run 'nodemon index.js' or 'npm run dev' natively)."
  exit 0
fi

if [[ "$MODE" == "devDocker" ]]; then
  cat > docker-compose.yml <<'EOF'
services:
  mongodb:
    image: mongo:7
    restart: unless-stopped
    ports:
      - "${MONGO_DOCKER_PORT:-27018}:27017"
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping').ok"]
      interval: 10s
      timeout: 5s
      retries: 10

  mariadb:
    image: mariadb:11.4
    restart: unless-stopped
    environment:
      MARIADB_DATABASE: ${DB_NAME:-CocoScheme}
      MARIADB_USER: ${DB_USER:-travel_user}
      MARIADB_PASSWORD: ${DB_PASSWORD:-password}
      MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-root_password}
    ports:
      - "${DB_DOCKER_PORT:-3307}:3306"
    volumes:
      - mariadb_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - .env
    depends_on:
      mongodb:
        condition: service_healthy
      mariadb:
        condition: service_healthy
    environment:
      PORT: ${PORT:-3000}
      NODE_ENV: ${NODE_ENV:-development}
      DB_HOST: mariadb
      DB_PORT: 3306
      DB_NAME: ${DB_NAME:-CocoScheme}
      DB_USER: ${DB_USER:-travel_user}
      DB_PASSWORD: ${DB_PASSWORD:-password}
      JWT_SECRET: ${JWT_SECRET:-change_me}
      AES_SECRET_KEY: ${AES_SECRET_KEY:-12345678901234567890123456789012}
      AES_IV: ${AES_IV:-1234567890123456}
      MAIL_USER: ${MAIL_USER:-}
      MAIL_PASSWORD: ${MAIL_PASSWORD:-}
      FRONTEND_URL: ${FRONTEND_URL:-https://localhost:4321}
      BACKEND_URL: ${BACKEND_URL:-https://localhost:3000}
      MONGO_URI: mongodb://mongodb:27017
      DATABASE_HOST: mariadb
      DUFFEL_TOKEN: ${DUFFEL_TOKEN:-}
      SERPAPI_API_KEY: ${SERPAPI_API_KEY:-}
      BANXICO_API_KEY: ${BANXICO_API_KEY:-}
      BANXICO_API_URL: ${BANXICO_API_URL:-https://www.banxico.org.mx/SieAPIRest/service/v1/}
      BANXICO_CACHE_TTL: ${BANXICO_CACHE_TTL:-3600}
      VALIDA_CFDI_API_KEY: ${VALIDA_CFDI_API_KEY:-}
      FLIGHT_SEARCH_PAGE_SIZE: ${FLIGHT_SEARCH_PAGE_SIZE:-10}
      HOTEL_SEARCH_PAGE_SIZE: ${HOTEL_SEARCH_PAGE_SIZE:-10}
    volumes:
      - ./certs:/app/certs:ro
    ports:
      - "${PORT:-3000}:3000"

volumes:
  mongodb_data:
  mariadb_data:
EOF
fi

if [[ "$MODE" == "serverDockerDB" ]]; then
  cat > docker-compose.yml <<'EOF'
# Generated by switch-env.sh (serverDockerDB mode).
# DB-only host. Exposes MariaDB on 3306 and MongoDB on 27017 on the host's
# private interface so the backend instance can reach them over the private
# network. Backend service is intentionally NOT defined here.
services:
  mariadb:
    image: mariadb:11.4
    restart: unless-stopped
    environment:
      MARIADB_DATABASE: ${DB_NAME:-CocoScheme}
      MARIADB_USER: ${DB_USER:-travel_user}
      MARIADB_PASSWORD: ${DB_PASSWORD:-password}
      MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-root_password}
    ports:
      - "3306:3306"
    volumes:
      - mariadb_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 10

  mongodb:
    image: mongo:7
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping').ok"]
      interval: 10s
      timeout: 5s
      retries: 10

volumes:
  mariadb_data:
  mongodb_data:
EOF
fi

if [[ "$MODE" == "serverDocker" ]]; then
  cat > docker-compose.yml <<EOF
# Generated by switch-env.sh (serverDocker mode).
# Backend ONLY. MariaDB and MongoDB are expected to be reachable at:
#   ${DB_IP}:3306   (mariadb)
#   ${DB_IP}:27017  (mongodb)
# Update DB_IP via:  DB_IP=<real_ip> ./switch-env.sh serverDocker
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - .env
    environment:
      PORT: \${PORT:-3000}
      NODE_ENV: production
      DB_HOST: ${DB_IP}
      DB_PORT: 3306
      DB_NAME: \${DB_NAME:-CocoScheme}
      DB_USER: \${DB_USER:-travel_user}
      DB_PASSWORD: \${DB_PASSWORD:-password}
      JWT_SECRET: \${JWT_SECRET:-change_me}
      AES_SECRET_KEY: \${AES_SECRET_KEY:-12345678901234567890123456789012}
      AES_IV: \${AES_IV:-1234567890123456}
      MAIL_USER: \${MAIL_USER:-}
      MAIL_PASSWORD: \${MAIL_PASSWORD:-}
      FRONTEND_URL: \${FRONTEND_URL:-https://localhost:4321}
      BACKEND_URL: \${BACKEND_URL:-https://localhost:3000}
      MONGO_URI: mongodb://${DB_IP}:27017
      DATABASE_HOST: "${DB_IP}"
      DUFFEL_TOKEN: \${DUFFEL_TOKEN:-}
      SERPAPI_API_KEY: \${SERPAPI_API_KEY:-}
      BANXICO_API_KEY: \${BANXICO_API_KEY:-}
      BANXICO_API_URL: \${BANXICO_API_URL:-https://www.banxico.org.mx/SieAPIRest/service/v1/}
      BANXICO_CACHE_TTL: \${BANXICO_CACHE_TTL:-3600}
      VALIDA_CFDI_API_KEY: \${VALIDA_CFDI_API_KEY:-}
      FLIGHT_SEARCH_PAGE_SIZE: \${FLIGHT_SEARCH_PAGE_SIZE:-10}
      HOTEL_SEARCH_PAGE_SIZE: \${HOTEL_SEARCH_PAGE_SIZE:-10}
    volumes:
      - ./certs:/app/certs:ro
      - /home/dittravel/.ssh:/home/dittravel/.ssh:ro
    ports:
      - "\${PORT:-3000}:3000"
EOF
fi

echo "docker-compose.yml rewritten for '$MODE' mode."

# By default, avoid full shutdown so DB containers don't restart unnecessarily.
# Use FORCE_DOWN=1 (or true) when you explicitly want a full stop/start cycle.
if [[ "${FORCE_DOWN:-0}" == "1" || "${FORCE_DOWN:-false}" == "true" ]]; then
  echo "FORCE_DOWN enabled -> running docker compose down"
  docker compose down
fi

docker compose up -d --build --remove-orphans
echo "Done. Backend running in '$MODE' mode."
docker compose ps
