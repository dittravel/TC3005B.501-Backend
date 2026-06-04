# TC3005B.501-Backend

API and Database for the conection and the functioning of the trip management system portal developed in course TC3005B by group 501.

## File Structure

```
TC3005B.501-Backend/
├─ index.js                    # Entry point of the application
├─ controllers/                # Controllers for handling API logic for different modules
├─ models/                     # Data models for database entities
├─ routes/                     # API route definitions for different endpoints
├─ services/                   # Business logic services for processing data and operations
├─ middleware/                 # Authentication, validation, rate limiting, decryption, and sanitization middleware
├─ database/                   # Database configuration, schemas, and initialization scripts
├─ openapi/                    # OpenAPI specifications for API documentation
├─ backup_scripts/             # Scripts for backing up MariaDB and MongoDB databases
├─ certs/                      # Scripts and configuration for generating HTTPS certificates
├─ email/                      # Email service utilities and templates
├─ CHANGELOG.md                # Changelog of project updates
├─ CONTRIBUTING.md             # Guidelines for contributing to the project
├─ mongodb_installation.md     # Instructions for MongoDB installation
├─ package.json                # Node.js dependencies and scripts
├─ pnpm-lock.yaml              # Lock file for pnpm package manager
└─ README.md                   # This file
```

---

## Getting Started

To run this backend, follow the steps in this guide.

## Quick Guides (from `git pull`)

This section is a practical, step-by-step runbook for the team.

### Environment Modes (current)

| Mode | Typical usage | DB target | Notes |
| --- | --- | --- | --- |
| `devLocal` | Native backend on your machine | `DEVLOCAL_DB_HOST` / `DEVLOCAL_MONGO_HOST` from `.env` | Patches `.env` only |
| `devDocker` | Full local Docker stack | Docker service names (`mariadb`, `mongodb`) | Rewrites `docker-compose.yml` and runs compose |
| `serverDocker` | Backend cloud/server VM | `SERVER_DOCKER_DB_IP` (or one-off `DB_IP`) | Backend-only compose |
| `serverDockerDB` | DB cloud/server VM | n/a (this VM hosts DB containers) | MariaDB + MongoDB compose only |

### Docker vs Local vs Cloud (Summary)

| Step # | Local Docker | Local native | Cloud VMs |
| --- | --- | --- | --- |
| 1. Set mode + bring up | `pnpm up:devDocker` | `pnpm up:devLocal` | `bash switch-env.sh serverDocker` (backend VM) / `bash switch-env.sh serverDockerDB` (DB VM) |
| 2. Install deps | `pnpm install` | `pnpm install` | `git pull` only (no Node/pnpm required on VMs) |
| 3. Start services | already handled by `pnpm up:devDocker` | Local MariaDB + MongoDB running; backend starts with `pnpm dev:local` | `switch-env.sh` handles compose |
| 4. Migrations | `docker compose exec -T backend npx prisma migrate deploy` | `npx prisma migrate deploy` | Backend VM: `docker compose exec -T backend npx prisma migrate deploy` |
| 5. Seed (optional) | `docker compose exec -T backend pnpm prisma:seed` | `pnpm prisma:seed` | Backend VM only, same Docker command |
| 6. Run backend | Containerized (`https://localhost:3000`) | `pnpm dev:local` | Containerized on backend VM |

For complete 3-instance setup details, see [CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md).

### Disaster Recovery (CLI only)

Recovery is command-based (not UI-based) by design, so it works even if the app/auth UI is unavailable.

On the DB VM:

```sh
cd /home/dittravel/TC3005B.501-Backend
BACKUP_CONFIG=./backup_scripts/backup.env ./backup_scripts/restore-all.sh
```

Optional if Node+pnpm are installed:

```sh
pnpm restore:all
```

Individual restore commands:

```sh
pnpm restore:mariadb
pnpm restore:mongodb
```

### Interactive Shortcut Menu (for less technical users)

You can run a guided CLI menu that groups environment switching, backups, recovery and quick commands:

```sh
pnpm run menu
```

The menu does not replace existing commands (`env:*`, `up:*`, `backup:*`, `restore:*`); it is a shortcut wrapper around them.

Flow B (server-friendly guided setup):

1. Run one-time bootstrap (installs git + docker + node + pnpm on Debian/Ubuntu):

```sh
pnpm run bootstrap:server
```

2. Start guided setup:

```sh
pnpm run menu
```

3. In the menu use `0) Initial setup wizard (Flow B)` and choose:

- Backend VM setup (`serverDocker` + optional migrate deploy), or
- DB VM setup (`serverDockerDB` + backup config + optional cron install)

### VM Rollout Step-by-Step (Flow B recommended)

Use this sequence when preparing cloud/server VMs from scratch.

1. Clone repository on each VM:

```sh
git clone <BACKEND_REPO_URL> ~/TC3005B.501-Backend
cd ~/TC3005B.501-Backend
```

2. One-time bootstrap on each backend/db VM (installs git, docker, node, pnpm):

```sh
pnpm run bootstrap:server
```

3. Log out and log back in (required for docker group permissions).

4. Configure `.env` in each VM:

- DB VM: set at least `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`
- Backend VM: set at least `SERVER_DOCKER_DB_IP`, DB credentials, and secrets (`JWT_SECRET`, `AES_SECRET_KEY`, `AES_IV`)

5. Run setup wizard:

```sh
pnpm run menu
```

6. In menu choose `0) Initial setup wizard (Flow B)`:

- DB VM: choose DB setup (`serverDockerDB`) and optionally install backup cron.
- Backend VM: choose Backend setup (`serverDocker`) and optionally run migrate deploy.

7. Validate services:

```sh
docker compose ps
docker compose logs -f backend
```

8. For DB VM backup baseline:

```sh
pnpm run backup:all
pnpm run backup:cron:install
```

9. Recovery drill (recommended in non-production):

```sh
pnpm run restore:all
```

Flow B keeps legacy commands available. You can still run `bash switch-env.sh <mode>`, `pnpm backup:*`, `pnpm restore:*` directly when needed.

### Configure Once

Set these once in backend `.env`:

- `DEVLOCAL_DB_HOST`
- `DEVLOCAL_MONGO_HOST`
- `SERVER_DOCKER_DB_IP`

Then use:

```sh
pnpm up:devLocal
pnpm up:devDocker
pnpm up:serverDocker
pnpm up:serverDockerDB
```

`pnpm up:*` auto-bootstraps `.env` from the matching example file when missing, patches the selected mode, rewrites `docker-compose.yml` when needed, and starts the services. The older `pnpm env:*` commands are still available if you only want to switch files without using the one-shot flow.

On cloud VMs, run bash directly (no Node/pnpm required there):

```sh
bash switch-env.sh serverDocker
bash switch-env.sh serverDockerDB
```

Optional one-off overrides (rare):

```sh
LOCAL_DB_HOST=<HOST> LOCAL_MONGO_HOST=<HOST> pnpm env:devLocal
DB_IP=<REAL_DB_IP> pnpm env:serverDocker
```

### A) Docker Guide (recommended for the team)

Use this flow when Docker Desktop is available.

#### 1. Update code from the repository

From the backend root:

```sh
git pull
pnpm install
```

#### 2. Switch mode and start/rebuild containers

```sh
pnpm up:devDocker
```

`pnpm up:devDocker` rewrites `docker-compose.yml`, ensures `.env` exists, and runs compose automatically.

#### 3. Apply Prisma migrations in Docker

```sh
docker compose exec -T backend npx prisma migrate deploy
```

#### 4. Seed the database (choose ONE mode)

Base/normal data:

```sh
docker compose exec -T backend pnpm prisma:seed
```

Dummy/demo data:

```sh
docker compose exec -T backend pnpm prisma:seed:dummy
```

Important behavior:

- `prisma:seed` keeps only base reference data and the default admin (`admin / admin123`)
- `prisma:seed:dummy` loads demo users/data (for example `admin.tec / 123`)
- both seed scripts run `prisma migrate reset --force` internally (development only; data is dropped and recreated)

#### Default Role Permissions (base and dummy)

The default permission matrix is defined in `prisma/seedShared.js` and is the same for:

- base seed (`pnpm prisma:seed`)
- dummy seed (`pnpm prisma:seed:dummy`)

In dummy mode, this same matrix is replicated for each dummy society group.

| Role | Permissions by module | Default permission keys |
| --- | --- | --- |
| Requester (Solicitante) | Travel, Receipts | `travel:view`, `travel:create`, `travel:edit`, `receipts:create`, `receipts:edit` |
| Travel Agency (Agencia de viajes) | Travel | `travel:view`, `travel:edit`, `travel:view_flights`, `travel:view_hotels`, `travel:approve` |
| Accounts Payable (Cuentas por pagar) | Receipts | `receipts:view`, `receipts:approve` |
| Authorizer (Autorizador) | Travel, Receipts | `travel:view`, `travel:create`, `travel:edit`, `travel:approve`, `travel:reject`, `receipts:create`, `receipts:edit` |
| Administrator (Administrador) | All modules | all `permission_key` values available in the `Permission` table |

#### 5. Useful Docker operations and when to use them

Check container status:

```sh
docker compose ps
```

View backend logs in real time:

```sh
docker compose logs -f backend
```

Stop the stack but keep DB volumes/data:

```sh
docker compose down
```

Stop the stack and remove DB volumes/data (full cleanup):

```sh
docker compose down -v
```

#### 6. End-to-end reset flow (clean machine/development reset)

```sh
docker compose down -v
pnpm env:devDocker
docker compose exec -T backend npx prisma migrate deploy
docker compose exec -T backend pnpm prisma:seed
```

If you need demo data instead of base data, replace the last command with:

```sh
docker compose exec -T backend pnpm prisma:seed:dummy
```

### B) Local Guide without Docker (backend + frontend)

Use this flow when someone on the team still does not have Docker.

Prerequisites:

- Node.js + pnpm installed
- Local MariaDB running
- Local MongoDB running

#### 1. Backend terminal (Terminal 1)

From `TC3005B.501-Backend`:

```sh
git pull
pnpm install
```

Create `.env` from the example and adjust local values:

```sh
# PowerShell (Windows)
Copy-Item .env.example .env

# Bash
cp .env.example .env
```

Set local mode:

```sh
pnpm env:devLocal
```

Minimum variables to verify in local mode:

- `DB_HOST=localhost`
- `DB_PORT=3306` (or the port you use for your local MariaDB)
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `DATABASE_URL` consistent with the values above
- `MONGO_URI=mongodb://localhost:27017`
- `JWT_SECRET`, `AES_SECRET_KEY`, `MAIL_USER`, `MAIL_PASSWORD`
- `FRONTEND_URL=https://localhost:4321`
- `BACKEND_URL=https://localhost:3000`
- `DB_DOCKER_PORT=3307` and `MONGO_DOCKER_PORT=27018` (used only for Docker port publishing)

Apply migrations locally:

```sh
npx prisma migrate deploy
```

Seed locally (choose ONE):

```sh
pnpm prisma:seed
```

or:

```sh
pnpm prisma:seed:dummy
```

Start backend API:

```sh
pnpm dev:local
```

#### 2. Frontend terminal (Terminal 2)

From `TC3005B.501-Frontend`:

```sh
git pull
pnpm install

# PowerShell (Windows)
Copy-Item .env.example .env

# Bash
cp .env.example .env

pnpm dev
```

Verify in `TC3005B.501-Frontend/.env`:

- `PUBLIC_API_BASE_URL=https://localhost:3000/api`

#### 3. Local URLs

- Backend API: `https://localhost:3000`
- Frontend app: `https://localhost:4321`

#### 4. Which seed should each team member use?

- Use `pnpm prisma:seed` for normal development, closer to a production-like baseline.
- Use `pnpm prisma:seed:dummy` when QA/testing needs more users and richer demo scenarios.

## Installing

The only option currently is to clone the repository locally from GitHub.

### Using `git`

```sh
git clone https://github.com/101-Coconsulting/TC3005B.501-Backend
```

### Using `gh` (GitHub CLI)

```sh
gh repo clone 101-Coconsulting/TC3005B.501-Backend
```

## Dependencies

The dependencies for this project are managed using [the pnpm package manager](https://pnpm.io/), so it is recommended to use this. However, [npm](https://www.npmjs.com/) can also be used.

### Using `pnpm`

```sh
pnpm install
```

### Using `npm`

```sh
npm install
```

## Dockerized Setup (Recommended)

For new machines, the recommended way to run this project is with Docker.

### 1. Install Docker Desktop

1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Open Docker Desktop and verify it is running.
3. Verify Docker in terminal:

```sh
docker --version
docker compose version
```

### 2. Prepare environment

From the backend root:

```sh
cp .env.example .env
pnpm env:devDocker
```

Then update at least these variables in `.env`:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_ROOT_PASSWORD`
- `JWT_SECRET`
- `AES_SECRET_KEY`
- `MAIL_USER`
- `MAIL_PASSWORD`
- `FRONTEND_URL`
- `BACKEND_URL`

### 3. Build and start the stack

```sh
pnpm env:devDocker
```

This starts:

- `backend` on `https://localhost:3000`
- `mariadb` on host port `${DB_DOCKER_PORT:-3307}`
- `mongodb` on host port `${MONGO_DOCKER_PORT:-27018}`

### 4. Apply Prisma migrations (inside Docker)

```sh
docker compose exec -T backend npx prisma migrate deploy
```

### 5. Seed data manually (optional)

Standard seed:

```sh
docker compose exec -T backend pnpm prisma:seed
```

Dummy seed:

```sh
docker compose exec -T backend pnpm prisma:seed:dummy
```

### 6. Recommended Prisma + Docker runbooks

Clean reset (drop volumes and recreate everything):

```sh
docker compose down -v
pnpm env:devDocker
docker compose exec -T backend npx prisma migrate deploy
```

No-wipe update (preserve DB data):

```sh
pnpm env:devDocker
docker compose exec -T backend npx prisma migrate deploy
```

## Cloud Server Deployment (Docker-only)

For the 3 Debian VM topology (DB VM, Backend VM, Frontend VM), use:

- DB VM: `bash switch-env.sh serverDockerDB`
- Backend VM: `bash switch-env.sh serverDocker`

And then run backend migrations:

```sh
docker compose exec -T backend npx prisma migrate deploy
```

Full runbook (SSH config, Docker install, daily update loop, network rules): [CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md)

## Backup automation and restore

Backup scripts are in [backup_scripts](backup_scripts) and support development, preproduction, and production.

Main files:

- `backup_scripts/backup.env.example` (template)
- `backup_scripts/backup-mariadb.sh`
- `backup_scripts/mongodb_backup.sh`
- `backup_scripts/backup-all.sh`
- `backup_scripts/install-backup-cron.sh`
- `backup_scripts/BACKUP_SETUP.md`

Quick setup on DB host:

```sh
cd backup_scripts
cp -n backup.env.example backup.env
chmod +x *.sh
BACKUP_CONFIG=./backup.env ./install-backup-cron.sh
BACKUP_CONFIG=./backup.env ./backup-all.sh
```

Superadmin control panel:

- In frontend grouped log page (`/bitacora-grupo`), Superadministrador can edit backup schedule/toggle/retention.
- Schedule is configured with user-friendly fields (frequency, time, day) that are translated to cron automatically.
- For expert usage, the panel includes an advanced manual cron mode.
- The backend API always updates `backup_scripts/backup.env`.
- In the 3-VM topology, the real cron runs on the DB VM. If the panel says the config was saved but cron was not applied automatically, that means `backup.env` was updated successfully but the backend container could not modify the host cron. This is expected unless cron installation is explicitly enabled on that host.
- In segmented cloud deployments, copy or replicate the final `backup.env` values to the DB instance where backups actually run, then run `install-backup-cron.sh` there.

Restore (summary):

1. Stop backend writes.
2. Restore MariaDB from `.sql.gz`.
3. Restore MongoDB from `.archive.gz`.
4. Restart backend and run `docker compose exec -T backend npx prisma migrate deploy` if needed.
5. Validate login and critical flows.

Detailed restore and cloud rollout steps: `backup_scripts/BACKUP_SETUP.md`.

## Create HTTPS certificates

To succesfully create the certificates to use the server with HTTPS you will need to follow the next steps.

### Configuring OpenSSL

> [!Important]
> You have to download the `.cnf` file provided in SharePoint and place it in the [`/certs`](/certs) directory.

### Generating keys and certificates

1. Access the [`/certs`](/certs) directory.

```sh
cd certs
```

2. Ensure the file is executable:

```sh
chmod +x create_certs.sh
```

3. Create the certificates:

```sh
./create_certs.sh
```

## Configuring the Database

For the database to be operational, some initial configuration is required.

### Setup MariaDB

In order to properly setup MariaDB, the following steps are required:

1. [Download `mariadb`](https://mariadb.com/kb/en/where-to-download-mariadb/).
2. It is recommended that you [secure your MariaDB installation](https://mariadb.com/kb/en/mysql_secure_installation/).
3. [Start the `mariadb` server](https://mariadb.com/kb/en/starting-and-stopping-mariadb-automatically/).
4. To setup the database with dummy data, run `pnpm dummy_db` or `node database/config/dev_db.js dev` from the root of the repository.
5. To setup only the database, run `pnpm empty_db` or `node database/config/init_db.js` from the root of the repository.

### Manual MariaDB Setup

1. Go to the [/database/Schema](/database/Schema) directory.

```sh
cd database/Schema
```

2. Run the `mariadb` client in batch mode with your user/password.

Load database schema:

```sh
mariadb -u DB_USER -p DB_USER_PASSWORD < Scheme.sql
```

Load database prepopulation:

```sh
mariadb -u DB_USER -p DB_USER_PASSWORD < Prepopulate.sql
```

Load triggers:

```sh
mariadb -u DB_USER -p DB_USER_PASSWORD < Triggers.sql
```

Load views:

```sh
mariadb -u DB_USER -p DB_USER_PASSWORD < Views.sql
```

Load dummy data:

```sh
mariadb -u DB_USER -p DB_USER_PASSWORD < Dummy.sql
```

### Setup MongoDB

1. [Download `mongodb`](https://www.mongodb.com/docs/manual/installation/) using your preferred method or package manager.
2. [Download `mongosh`](https://www.mongodb.com/try/download/shell) if you want to interact with the database directly (recommended).
3. Test that MongoDB was installed correctly by running `mongod` or `mongosh`.
4. Verify that MongoDB is running using `systemctl status mongod`.
5. If inactive, start it with `systemctl start mongod`.

## Setup Prisma

### 1. Environment Variables

Setup `DATABASE_URL` and related variables in your `.env` file.

```env
DATABASE_URL="mysql://travel_user:supersecret@localhost:3306/CocoScheme"
DATABASE_USER="travel_user"
DATABASE_PASSWORD="supersecret"
DATABASE_NAME="CocoScheme"
DATABASE_HOST="localhost"
DATABASE_PORT=3306
```

### 2. Generate Prisma Client

```sh
npx prisma generate
```

### 3. Run migrations

```sh
npx prisma migrate deploy
```

In Dockerized environments:

```sh
docker compose exec -T backend npx prisma migrate deploy
```

### 4. Seed database

```sh
pnpm prisma:seed
pnpm prisma:seed:dummy
```

Dockerized:

```sh
docker compose exec -T backend pnpm prisma:seed
docker compose exec -T backend pnpm prisma:seed:dummy
```

### Useful Prisma Commands

| Command | Description |
|---------|-------------|
| `pnpm prisma:seed` | Run the seed script with initial data |
| `pnpm prisma:seed:dummy` | Run the seed script with dummy data |
| `npx prisma migrate dev --name <name>` | Create a new migration |
| `npx prisma migrate deploy` | Apply pending migrations |
| `npx prisma migrate reset` | Reset the database |

> [!Important]
> Seeding is always manual. Docker startup does not auto-run seed scripts.

## Environment Variables

Finally, it is crucial that a local `.env` file is created based off [`.env.example`](/.env.example).

```sh
cp .env.example .env
```

Core fields to verify:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=https://localhost:4321
BACKEND_URL=https://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=travel_management
DB_USER=username
DB_PASSWORD=password

DB_DOCKER_PORT=3307
MONGO_DOCKER_PORT=27018
MONGO_URI=mongodb://localhost:27017

AES_SECRET_KEY=<32 character key>
AES_IV=<16 character key>
JWT_SECRET=<key>
MAIL_USER=test.mail@outlook.com
MAIL_PASSWORD=password

DATABASE_URL="mysql://username:password@localhost:3306/mydb"
DATABASE_USER="username"
DATABASE_PASSWORD="password"
DATABASE_NAME="mydb"
DATABASE_HOST="localhost"
DATABASE_PORT=3306
```

## Email Configuration

This system uses Gmail SMTP to send emails. To configure:

1. Create a dedicated email account for the system.
2. Enable 2-factor authentication.
3. Create an app password from <https://myaccount.google.com/apppasswords>.
4. Set these `.env` variables:

- `MAIL_USER=<email_account>`
- `MAIL_PASSWORD=<app_password>`

## Running

### Using `pnpm`

```sh
pnpm run dev
```

### Using `npm`

```sh
npm run dev
```

### Running with Docker

```sh
pnpm env:devDocker
docker compose exec -T backend npx prisma migrate deploy
```

If you want seed data (manual step):

```sh
docker compose exec -T backend pnpm prisma:seed
docker compose exec -T backend pnpm prisma:seed:dummy
```

Tail logs:

```sh
docker compose logs -f backend
```

Stop services:

```sh
docker compose down
```

## System Endpoints

The backend exposes operational endpoints under `/api/system` that do not require authentication:

- `GET /api/system/health`: Returns service health status, uptime, and metadata.
- `GET /api/system/version`: Returns service version metadata.

Example health response:

```json
{
	"status": "ok",
	"uptime_seconds": 31.46,
	"service": "tc3005b-501-backend",
	"version": "0.1.0",
	"timestamp": "2026-02-26T23:00:00.000Z"
}
```
