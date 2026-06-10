# TC3005B.501-Backend

## Quick Orientation

The backend is responsible for:

- Exposing the API used by the frontend.
- Connecting to MariaDB and MongoDB.
- Managing Prisma migrations and seed scripts.
- Generating and consuming HTTPS certificates for local and Docker-based development.
- Running backup and restore workflows for the databases.

The most important operational idea is this:

- `devLocal` runs the backend natively on your machine.
- `devDocker` runs backend + MariaDB + MongoDB as three containers on your machine.
- `serverDocker` runs only the backend container and points it to external databases.
- `serverDockerDB` runs only the database containers on a separate host and exposes their ports for the backend host to consume.

For the 3-container local topology, the recommended path is `devDocker`.
For a blank Debian host, the recommended path is: base packages -> clone repo -> bootstrap -> choose mode.

## How the Backend Works

At runtime, the backend follows a simple receive-process-send-wait loop.

1. It receives HTTP requests from the frontend, CLI-triggered scripts, or direct operator checks such as health endpoints.
2. It validates the request, parses the payload, and routes the call to the correct controller.
3. The controller delegates work to services or model helpers.
4. Services may read or write MariaDB, MongoDB, files, or backup config, and may also call external APIs such as Banxico, CFDI validation, or email delivery providers.
5. The backend waits on those I/O operations and returns the response only after the service finishes or fails.
6. The response is then sent back to the frontend or caller with a success payload or an error message.

Practical examples:

- A travel request waits on database writes and then returns the updated request state.
- A receipt upload waits on XML/PDF parsing, CFDI validation, and database persistence.
- A backup automation save waits on local config updates and, if configured, remote sync to the DB host.
- A health check waits on the server process itself and returns immediately without touching business data.

API and database backend for the travel management system portal developed in course TC3005B by group 501.

This repository contains the backend application, database tooling, backup and restore scripts, certificate helpers, and the mode switchers used to run the project in three common ways:

1. Native backend on a local machine.
2. Local Docker topology with three segmented containers on the same computer: backend, MariaDB, and MongoDB.
3. Split deployment where the backend runs in one Docker host and the databases run in a separate Docker host, or on cloud VMs when needed.

If you are starting from a blank Debian machine, do not begin by looking for pnpm or Docker. First install the base tools, clone the repository, and then run the bootstrap script described below.

## Repository Structure

```text
TC3005B.501-Backend/
├─ index.js                    # Entry point of the application
├─ controllers/                # API controllers for the business modules
├─ models/                     # Data models for database entities
├─ routes/                     # API route definitions
├─ services/                   # Business logic and operational services
├─ middleware/                 # Auth, validation, rate limiting, decryption, sanitization
├─ database/                   # Database configuration, schemas, and initialization scripts
├─ openapi/                    # OpenAPI specifications and API documentation
├─ backup_scripts/             # MariaDB and MongoDB backup/restore scripts
├─ certs/                      # HTTPS certificate generation scripts and OpenSSL config
├─ scripts/                    # Bootstrap, mode switchers, menu, and helper launchers
├─ tests/                      # Automated tests
├─ CHANGELOG.md                # Project change log
├─ CONTRIBUTING.md             # Contribution guide
├─ mongodb_installation.md     # MongoDB installation notes
├─ package.json                # Node.js dependencies and scripts
├─ pnpm-lock.yaml              # pnpm lock file
└─ README.md                   # This guide
```

## Getting Started

Use this order if you are starting from scratch.

### Debian 12 or newer

This setup is essential for server and VM installs. If you are preparing a Debian server or a VM, start here.

If the machine is completely empty, install only the minimum tools needed to clone the repository and bootstrap the rest.

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
```

If you do not have `sudo`, run the same commands as `root`.

Then clone the repository:

```bash
git clone https://github.com/101-Coconsulting/TC3005B.501-Backend.git
cd TC3005B.501-Backend
```

Now bootstrap the machine:

```bash
bash scripts/bootstrap-server.sh
```

This script installs:

- Docker Engine and Docker Compose plugin
- Node.js LTS
- pnpm through Corepack
- openssh-client
- cron

After it finishes, log out and log back in so the Docker group change takes effect.

### Windows 11 or Windows 10

Use this for local development. The easiest path is Docker Desktop plus WSL2 or Git Bash.

1. Install Git, Docker Desktop, and Node.js LTS or a pnpm-ready Node.js install.
2. Clone the repository.
3. Run `pnpm up:devDocker` for the local 3-container topology, or `pnpm up:devLocal` for native backend development.

If you are using Windows only for local development, you still need the backend API and databases available either locally or through Docker.

### macOS 13 or newer

Use this for local development with Docker Desktop or native Node.js.

1. Install Git, Docker Desktop if you want containers, and Node.js LTS.
2. Clone the repository.
3. Follow the same local commands as the Windows flow.

### 2. Choose the workflow you want to run

The recommended local development flow is:

1. Install prerequisites if needed.
2. Run `pnpm up:devDocker`.
3. Apply migrations.
4. Seed data only if you need it.

If you want native local development instead, use `pnpm env:devLocal` and `pnpm dev:local` after configuring `.env`.

If you are preparing a split deployment, continue with `serverDocker` and `serverDockerDB` after the local install steps above.

## Environment and Database Setup

The backend runtime and the database scripts use different configuration files. Keep them separate in your head:

- `.env` in the repository root controls the backend runtime, mode switchers, Prisma, and service URLs.
- `backup_scripts/backup.env` controls backup and restore automation.

MariaDB and MongoDB are not installed in only one fixed place. The install location depends on the workflow you choose:

- Local Docker topology: MariaDB and MongoDB run as containers on your machine through `docker compose`.
- Native local development: MariaDB and MongoDB must already be installed and running on your machine.
- Split deployment: MariaDB and MongoDB run on the DB host, usually as Docker containers, while the backend runs on a separate host.

### Host Materials Checklist

Before you start a host, make sure the required material is present:

- SSH access if the host is part of a split deployment.
- HTTPS certificates from `certs/create_certs.sh` if the host terminates TLS.
- `backup.env` on the DB host if the host runs backups.
- `backup.env` remote sync values on the backend host if the UI must update DB cron automatically.

### Local Database Installation

If you are running native local development and do not already have the databases installed, use these commands on Debian/Ubuntu:

#### MariaDB

```bash
sudo apt-get update
sudo apt-get install -y mariadb-server mariadb-client
sudo systemctl enable --now mariadb
sudo mysql_secure_installation
```

#### MongoDB

MongoDB installation varies more by distribution version, so the repository also keeps a dedicated guide in [mongodb_installation.md](mongodb_installation.md).

If you already use the official MongoDB repository on Debian/Ubuntu, the typical service setup is:

```bash
sudo systemctl enable --now mongod
sudo systemctl status mongod
```

If MongoDB is not yet installed, follow [mongodb_installation.md](mongodb_installation.md) for the exact package repository and install commands.

### Environment Variables

Create your local `.env` from the example file:

```bash
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

### Database Setup

#### MariaDB

You can manage MariaDB with the scripts in this repository or by using your own local installation.

Manual schema loading is located in `database/Schema/`.

#### MongoDB

MongoDB is used for document storage and backup automation. The repository includes installation notes in `mongodb_installation.md`.

#### Prisma

Prisma is configured through the standard project scripts.

Generate the client:

```bash
pnpm prisma:generate
```

Apply migrations:

```bash
pnpm prisma:migrate:deploy
```

Docker equivalent:

```bash
docker compose exec -T backend npx prisma migrate deploy
```

Seed data:

```bash
pnpm prisma:seed
pnpm prisma:seed:dummy
```

Docker equivalent:

```bash
docker compose exec -T backend pnpm prisma:seed
docker compose exec -T backend pnpm prisma:seed:dummy
```

## Modes and Topologies

| Mode | Where it runs | What it starts | Typical use |
| --- | --- | --- | --- |
| `devLocal` | Your machine | Native backend only | Fast local development with local DBs |
| `devDocker` | Your machine | Backend + MariaDB + MongoDB | Main local Docker workflow |
| `serverDocker` | Backend host | Backend container only | Split deployment where DBs are elsewhere |
| `serverDockerDB` | DB host | MariaDB + MongoDB containers | Separate DB host for split deployment |

The local 3-container topology is the one you should use most of the time when Docker is available on your computer.

## Local Development

### Native backend with local databases

Use this when you want the backend to run natively and your MariaDB/MongoDB are already available locally.

```bash
cp .env.example .env
pnpm env:devLocal
pnpm prisma:migrate:deploy
pnpm dev:local
```

Minimum values to verify in `.env`:

- `DB_HOST=localhost`
- `DB_PORT=3306`
- `MONGO_URI=mongodb://localhost:27017`
- `FRONTEND_URL=https://localhost:4321`
- `BACKEND_URL=https://localhost:3000`

### Local Docker topology on the same computer

This is the recommended path for new contributors and most development tasks.

```bash
cp .env.example .env
pnpm up:devDocker
docker compose exec -T backend npx prisma migrate deploy
```

If you need seed data, choose one:

```bash
docker compose exec -T backend pnpm prisma:seed
docker compose exec -T backend pnpm prisma:seed:dummy
```

The local Docker topology uses three containers on the same machine:

- `backend`
- `mariadb`
- `mongodb`

## Split Deployment Reference

| Scenario | Recommended command | Notes |
| --- | --- | --- |
| Native local backend | `pnpm up:devLocal` | Does not rewrite `docker-compose.yml` |
| Local 3-container Docker topology | `pnpm up:devDocker` | Rewrites `docker-compose.yml` and starts backend + DB containers |
| Split backend host | `pnpm up:serverDocker` | Backend container only; databases live elsewhere |
| Split DB host | `pnpm up:serverDockerDB` | MariaDB + MongoDB only |

### Useful Docker commands

```bash
docker compose ps
docker compose logs -f backend
docker compose down
docker compose down -v
```

## Quick Guides

### Environment Modes

| Mode | Typical usage | DB target | Notes |
| --- | --- | --- | --- |
| `devLocal` | Native backend on your machine | `DEVLOCAL_DB_HOST` / `DEVLOCAL_MONGO_HOST` from `.env` | Patches `.env` only |
| `devDocker` | Full local Docker stack | Docker service names (`mariadb`, `mongodb`) | Rewrites `docker-compose.yml` and runs compose |
| `serverDocker` | Backend host | `SERVER_DOCKER_DB_IP` or one-off `DB_IP` | Backend-only compose |
| `serverDockerDB` | DB host | n/a | MariaDB + MongoDB compose only |

### Configure Once

Set these once in `.env` if you use the switchers often:

- `DEVLOCAL_DB_HOST`
- `DEVLOCAL_MONGO_HOST`
- `SERVER_DOCKER_DB_IP`

Then use:

```bash
pnpm up:devLocal
pnpm up:devDocker
pnpm up:serverDocker
pnpm up:serverDockerDB
```

The `up:*` commands bootstrap `.env` from the matching example file when needed, patch the selected mode, rewrite `docker-compose.yml` when needed, and start the services.

The older `env:*` commands still exist if you only want to switch files without starting services.

Optional one-off overrides:

```bash
LOCAL_DB_HOST=<HOST> LOCAL_MONGO_HOST=<HOST> pnpm env:devLocal
DB_IP=<REAL_DB_IP> pnpm env:serverDocker
```

### Interactive Shortcut Menu

The menu groups setup, mode switching, backups, recovery, and quick commands.

```bash
pnpm run menu
```

Main flow:

1. `0) Initial setup wizard (Flow B)`
2. `1) Mode switching`
3. `2) Backups`
4. `3) Recovery`
5. `4) Quick commands`

Flow B is the guided setup for Debian machines that need the full toolchain installed.

## Flow B: Guided Setup for Debian Machines

Use this when the machine is blank or nearly blank and you want the quickest path with the least manual decisions.

### Step 1. Bootstrap the machine

```bash
pnpm run bootstrap:server
```

This installs and enables the platform tools used by the rest of the workflow.

### Step 2. Open the setup menu

```bash
pnpm run menu
```

Then choose `0) Initial setup wizard (Flow B)`.

### Step 3. Choose the role

- Backend host: choose `serverDocker`
- DB host: choose `serverDockerDB`

The DB host flow also installs or updates the backup cron automatically.

### Step 4. Run the checks

```bash
docker compose ps
docker compose logs -f backend
```

## Backups and Restore

Backup and restore are handled by scripts in `backup_scripts/`.

The full step-by-step backup and restore workflow, including cron installation, remote sync, failure signatures, and recovery checks, lives in [backup_scripts/BACKUP_SETUP.md](backup_scripts/BACKUP_SETUP.md).

Important files:

- `backup_scripts/backup.env.example`
- `backup_scripts/backup-mariadb.sh`
- `backup_scripts/mongodb_backup.sh`
- `backup_scripts/backup-all.sh`
- `backup_scripts/install-backup-cron.sh`
- `backup_scripts/restore-all.sh`

Quick DB host setup:

```bash
cd backup_scripts
cp -n backup.env.example backup.env
chmod +x *.sh
BACKUP_CONFIG=./backup.env ./install-backup-cron.sh
BACKUP_CONFIG=./backup.env ./backup-all.sh
```

## Certificates

HTTPS certificate generation lives in `certs/`.

```bash
cd certs
chmod +x create_certs.sh
./create_certs.sh
```

The OpenSSL configuration file provided by the team must be placed in the `certs/` directory before running the script.

## Email Configuration

This system uses SMTP to send emails.

1. Create a dedicated email account for the system.
2. Enable 2-factor authentication.
3. Create an app password from the provider control panel.
4. Set `MAIL_USER` and `MAIL_PASSWORD` in `.env`.

## Running

### Native

```bash
pnpm run dev
```

or:

```bash
npm run dev
```

### Docker

```bash
pnpm up:devDocker
docker compose exec -T backend npx prisma migrate deploy
```

### Split deployment / server mode

Use these when the backend and the databases are not on the same machine:

```bash
pnpm up:serverDocker
pnpm up:serverDockerDB
```

## Operational Endpoints

The backend exposes system endpoints under `/api/system` that are useful for health checks:

- `GET /api/system/health`
- `GET /api/system/version`

## Split Deployment Reference

If you really are deploying the backend and database containers on separate hosts, follow [CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md).

That guide is secondary to the local-first workflow in this README.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for project rules and collaboration notes.