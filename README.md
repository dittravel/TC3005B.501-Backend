# TC3005B.501-Backend

Backend API for Dittravel.

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm
- Docker Desktop for devDocker
- Local MariaDB + MongoDB for devLocal

### Environment Modes

| Mode | Use case | DB target | Behavior |
| --- | --- | --- | --- |
| devLocal | Native backend on your machine | configured in .env via DEVLOCAL_DB_HOST / DEVLOCAL_MONGO_HOST | Patches .env only |
| devDocker | Full local Docker stack | mariadb / mongodb service names | Rewrites docker-compose.yml and runs compose |
| serverDocker | Server/OpenStack backend | SERVER_DOCKER_DB_IP (or one-off DB_IP) | Rewrites docker-compose.yml to backend-only and runs compose |

## Configure Once

Set these once in backend .env:

- DEVLOCAL_DB_HOST
- DEVLOCAL_MONGO_HOST
- SERVER_DOCKER_DB_IP

Then use the same three commands forever:

```sh
pnpm env:devLocal
pnpm env:devDocker
pnpm env:serverDocker
```

Optional one-off overrides (rare):

```sh
LOCAL_DB_HOST=<HOST> LOCAL_MONGO_HOST=<HOST> pnpm env:devLocal
DB_IP=<REAL_DB_IP> pnpm env:serverDocker
```

## Installation

```sh
git clone https://github.com/101-Coconsulting/TC3005B.501-Backend
cd TC3005B.501-Backend
pnpm install
```

Create .env once:

```sh
# PowerShell
Copy-Item .env.example .env

# Bash
cp .env.example .env
```

Fill at least:

- DB_NAME
- DB_USER
- DB_PASSWORD
- JWT_SECRET
- AES_SECRET_KEY
- MAIL_USER
- MAIL_PASSWORD

Env file policy:

- Keep .env as the only active runtime file.
- Keep .env.example, .env.local.example, and .env.docker.example as templates.
- Do not keep .env.local or .env.docker runtime files.

## Essential Commands by Environment

### devLocal (native backend)

```sh
pnpm env:devLocal
npx prisma migrate deploy
pnpm prisma:seed          # wipes data
pnpm prisma:seed:dummy    # wipes data
pnpm dev:local
```

### devDocker (backend + DB containers)

```sh
pnpm env:devDocker
docker compose exec -T backend npx prisma migrate deploy
docker compose exec -T backend npm run prisma:seed        # wipes data
docker compose exec -T backend npm run prisma:seed:dummy  # wipes data
docker compose restart backend
docker compose ps
docker compose logs -f backend
```

Default switch behavior avoids full down to reduce unnecessary DB restarts.

Full stop/start only when needed:

```sh
FORCE_DOWN=1 pnpm env:devDocker
```

### serverDocker (backend server instance)

```sh
pnpm env:serverDocker
docker compose exec -T backend npx prisma migrate deploy
docker compose restart backend
docker compose ps
```

For full server workflow: see CLOUD_DEPLOYMENT.md.

## Troubleshooting

### Unknown authentication plugin 'sha256_password'

This is a DB user/plugin issue, not a mode-name issue.

Check plugin:

```sql
SELECT user, host, plugin FROM mysql.user;
```

If needed:

```sql
ALTER USER 'your_db_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_db_password';
FLUSH PRIVILEGES;
```

Then rerun:

```sh
pnpm env:devLocal
npx prisma migrate deploy
pnpm dev:local
```
