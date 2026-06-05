# Cloud Deployment Runbook (3 VMs, least interaction)

This guide is the exact order to deploy Dittravel on a split-host setup with minimum trial/error.

## Quick Orientation

Use this guide only when you are deploying backend and database containers on separate hosts.

The local 3-container Docker topology on a single machine is still the default path for regular development. This document is the secondary reference for the split deployment case.

The workflow in this guide is:

1. Prepare SSH access from your operator machine.
2. Clone the repositories on each host.
3. Bootstrap the backend and DB hosts.
4. Bring up the DB host first.
5. Configure DB backups.
6. Bring up the backend host.
7. Enable remote sync if the backend should push backup settings to the DB host.
8. Bring up the frontend host.

## TCP Ports and Network Rules

The split-host setup depends on fixed TCP ports. Keep these consistent on both the host firewall and the Docker port mappings.

| Service | Port | Who connects | Notes |
| --- | --- | --- | --- |
| Backend API | `3000/tcp` | Frontend and operator checks | HTTPS or TLS-terminated backend traffic depending on your compose/cert setup |
| MariaDB | `3306/tcp` | Backend host and backup scripts | Database traffic from backend to DB host |
| MongoDB | `27017/tcp` | Backend host and backup scripts | MongoDB traffic from backend to DB host |
| Frontend | `4321/tcp` | Browser clients | Local frontend dev/default Astro port |

Use private network access only. Do not expose `3306` or `27017` to the public internet.

On the DB host, `serverDockerDB` maps the containers directly to those ports on the host network.
On the backend host, `serverDocker` expects `SERVER_DOCKER_DB_IP` to resolve the DB host address on the private network.

## Keys and Certificates

Each host needs the right material before you try to start services.

- Operator machine: SSH private key that can reach `serverDockerDB`, `serverDocker`, and `serverFrontend`.
- Backend host: SSH private key for remote sync to the DB host, mounted or available at `/home/dittravel/.ssh/dittravel`.
- Backend repo: HTTPS certificates generated from `certs/create_certs.sh` and the shared OpenSSL config file placed in `certs/`.
- Frontend host: `PUBLIC_API_BASE_URL` pointing at the backend host; if the frontend terminates HTTPS itself, its own compose/cert setup must match the frontend repo instructions.

If any of these are missing, fix them before trying to validate the network flow, because missing keys or certs usually look like application failures later.

## Getting Started

### 1. Prepare SSH access

Edit `~/.ssh/config` on your operator machine and validate that each host resolves.

```sshconfig
Host serverDockerDB
  HostName 172.16.60.115
  User dittravel
  IdentityFile ~/.ssh/dittravel

Host serverDocker
  HostName 172.16.60.186
  User dittravel
  IdentityFile ~/.ssh/dittravel

Host serverFrontend
  HostName 172.16.60.106
  User dittravel
  IdentityFile ~/.ssh/dittravel
```

```bash
ssh serverDockerDB 'hostname'
ssh serverDocker 'hostname'
ssh serverFrontend 'hostname'
```

### 2. Clone the repositories

Clone the repository on each host that will run it. The DB host and backend host both use the backend repo; the frontend host uses the frontend repo.

### 3. Bootstrap the backend and DB hosts

On both backend and DB hosts, run the bootstrap script after cloning the backend repository.

```bash
cd /home/dittravel/TC3005B.501-Backend
bash scripts/bootstrap-server.sh
```

After bootstrap, log out and log back in so Docker group membership is applied.

## 1. VM roles

Use these role names consistently:

1. `serverDockerDB`: DB VM (MariaDB + MongoDB + backup cron)
2. `serverDocker`: Backend VM (API)
3. Frontend VM: frontend repo service

Example private IPs:
- DB VM: `172.16.60.115`
- Backend VM: `172.16.60.186`
- Frontend VM: `172.16.60.106`

Expected port reachability on the private network:

- Backend VM -> DB VM: `172.16.60.115:3306` and `172.16.60.115:27017`
- Frontend clients -> Backend VM: `172.16.60.186:3000`
- Browser -> Frontend VM: `172.16.60.106:4321` if you run the frontend container separately

## 2. Clone repositories on each VM

### DB VM

```bash
ssh serverDockerDB
mkdir -p /home/dittravel && cd /home/dittravel
git clone https://github.com/dittravel/TC3005B.501-Backend.git
cd TC3005B.501-Backend
```

### Backend VM

```bash
ssh serverDocker
mkdir -p /home/dittravel && cd /home/dittravel
git clone https://github.com/dittravel/TC3005B.501-Backend.git
cd TC3005B.501-Backend
```

### Frontend VM

```bash
ssh serverFrontend
mkdir -p /home/dittravel && cd /home/dittravel
git clone https://github.com/dittravel/TC3005B.501-Frontend.git
cd TC3005B.501-Frontend
```

## 3. Deploy DB VM first

On DB VM:

```bash
cd /home/dittravel/TC3005B.501-Backend
cp -n .env.example .env
```

Set DB values in `.env`:

```dotenv
DB_NAME=CocoScheme
DB_USER=travel_user
DB_PASSWORD=<strong_password>
DB_ROOT_PASSWORD=<strong_root_password>
```

Switch mode and start:

```bash
bash switch-env.sh serverDockerDB
docker compose ps
```

Expected:
- `mariadb` healthy
- `mongodb` healthy

## 4. Configure backups on DB VM

```bash
cd /home/dittravel/TC3005B.501-Backend/backup_scripts
cp -n backup.env.example backup.env
chmod +x *.sh
```

Edit `backup.env` minimum:

```dotenv
BACKUP_BASE_DIR=/var/backups/dittravel
BACKUP_LOG_FILE=/var/backups/dittravel/backup.log

MARIADB_SOURCE=docker
MONGODB_SOURCE=docker
COMPOSE_PROJECT_DIR=/home/dittravel/TC3005B.501-Backend

MARIADB_DB_NAME=CocoScheme
MARIADB_USER=travel_user
MARIADB_PASSWORD=<same_as_db_env>
MONGODB_DB_NAME=fileStorage

BACKUP_AUTOMATION_ENABLED=true
BACKUP_CRON_SCHEDULE="0 */6 * * *"
```

Install cron and validate:

```bash
cd /home/dittravel/TC3005B.501-Backend
pnpm run backup:cron:install
crontab -l | grep dittravel-backup-job
pnpm run backup:all
tail -n 100 /var/backups/dittravel/backup.log
```

## 5. Deploy backend VM

On backend VM:

```bash
cd /home/dittravel/TC3005B.501-Backend
cp -n .env.example .env
```

Edit `.env`:

```dotenv
SERVER_DOCKER_DB_IP=172.16.60.115
DB_NAME=CocoScheme
DB_USER=travel_user
DB_PASSWORD=<same_as_db_env>
JWT_SECRET=<secret>
AES_SECRET_KEY=<32 chars>
AES_IV=<16 chars>
MAIL_USER=<mail_user>
MAIL_PASSWORD=<mail_password>
```

Switch mode and start:

```bash
bash switch-env.sh serverDocker
docker compose ps
```

Run migrations:

```bash
docker compose exec -T backend npx prisma migrate deploy
```

Health checks:

```bash
curl -k https://localhost:3000/api/system/health
curl -k https://localhost:3000/api/system/version
```

## 6. Enable backend -> DB VM remote sync (recommended)

This allows UI backup automation changes to apply directly on DB VM cron.

### 6.1 Prepare key on backend VM host

```bash
mkdir -p /home/dittravel/.ssh
chmod 700 /home/dittravel/.ssh
# put private key in /home/dittravel/.ssh/dittravel
chmod 600 /home/dittravel/.ssh/dittravel
```

Validate host-level SSH:

```bash
ssh -i /home/dittravel/.ssh/dittravel -o BatchMode=yes dittravel@172.16.60.115 'echo REMOTE_OK'
```

### 6.2 Configure backend VM `backup_scripts/backup.env`

```dotenv
BACKUP_REMOTE_SYNC_ENABLED=true
BACKUP_REMOTE_SYNC_HOST=172.16.60.115
BACKUP_REMOTE_SYNC_USER=dittravel
BACKUP_REMOTE_SYNC_TARGET_DIR=/home/dittravel/TC3005B.501-Backend
BACKUP_REMOTE_SYNC_SSH_KEY=/home/dittravel/.ssh/dittravel
```

### 6.3 Recreate backend container

```bash
cd /home/dittravel/TC3005B.501-Backend
docker compose up -d --force-recreate backend
```

### 6.4 Validate from UI/API

Save backup automation settings from superadmin panel, then verify on DB VM:

```bash
ssh serverDockerDB "crontab -l | grep dittravel-backup-job"
```

## 7. Deploy frontend VM

On frontend VM:

```bash
cd /home/dittravel/TC3005B.501-Frontend
cp -n .env.example .env
```

Set backend target:

```dotenv
SERVER_DOCKER_BACKEND_IP=172.16.60.186
PUBLIC_API_BASE_URL=https://172.16.60.186:3000/api
PUBLIC_IS_DEV=false
```

Start frontend in server mode:

```bash
bash switch-env.sh serverDocker
docker compose ps
```

Validate:
- Open frontend URL
- login
- confirm API calls hit backend VM

## 10. Daily update sequence (safe)

Always update in this order.

### 10.1 DB VM

```bash
ssh serverDockerDB
cd /home/dittravel/TC3005B.501-Backend
git pull
bash switch-env.sh serverDockerDB
chmod +x backup_scripts/*.sh
pnpm run backup:cron:install
pnpm run backup:all
```

### 10.2 Backend VM

```bash
ssh serverDocker
cd /home/dittravel/TC3005B.501-Backend
git pull
bash switch-env.sh serverDocker
docker compose exec -T backend npx prisma migrate deploy
```

### 10.3 Frontend VM

```bash
ssh serverFrontend
cd /home/dittravel/TC3005B.501-Frontend
git pull
bash switch-env.sh serverDocker
```

## 11. Verification checklist

Run after deployment:

```bash
ssh serverDockerDB "docker compose -f /home/dittravel/TC3005B.501-Backend/docker-compose.yml ps"
ssh serverDocker "docker compose -f /home/dittravel/TC3005B.501-Backend/docker-compose.yml ps"
ssh serverDockerDB "crontab -l | grep dittravel-backup-job"
ssh serverDockerDB "tail -n 80 /var/backups/dittravel/backup.log"
```

## 12. Common failures and exact fixes

### 12.1 `spawn ssh ENOENT` on backend API
Cause:
- backend container lacks ssh client or not recreated after image change.

Fix:

```bash
ssh serverDocker
cd /home/dittravel/TC3005B.501-Backend
docker compose up -d --build --force-recreate backend
```

### 12.2 `Permission denied (publickey)` remote sync
Cause:
- wrong key path/permissions/user.

Fix:

```bash
chmod 700 /home/dittravel/.ssh
chmod 600 /home/dittravel/.ssh/dittravel
ssh -i /home/dittravel/.ssh/dittravel dittravel@172.16.60.115 'echo OK'
```

### 12.3 Cron job points to relative `BACKUP_CONFIG`
Cause:
- old install script/old crontab entry.

Fix:

```bash
ssh serverDockerDB
cd /home/dittravel/TC3005B.501-Backend
pnpm run backup:cron:install
crontab -l | grep dittravel-backup-job
```

### 12.4 `mariadb-dump: 1045`
Cause:
- credential mismatch in DB VM `backup.env` vs actual DB user.

Fix:
- align `MARIADB_USER` and `MARIADB_PASSWORD`
- rerun `pnpm run backup:all`

## 13. Notes about mode switchers

`switch-env.sh` rewrites `docker-compose.yml` per mode.

Operational consequence:
- manual compose edits can be lost after each mode switch.
- keep custom behavior in scripts/templates tracked in git, not manual local edits.
