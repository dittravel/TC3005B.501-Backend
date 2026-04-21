# Deployment Guide

Step-by-step instructions to deploy DitTravel Backend from scratch.

---

## Prerequisites

- Node.js 22+
- pnpm (`npm install -g pnpm`)
- MariaDB 10.6+
- MongoDB 6+
- `mysqldump` / `mysql` CLI tools (for backups)
- `mongodump` / `mongorestore` CLI tools (for backups)

---

## First Deploy

### 1. Clone and install

```bash
git clone <repo-url> dittravel-backend
cd dittravel-backend
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in DB credentials, JWT_SECRET, AES keys, mail config
```

Required values to set before the app will start:

| Variable | Description |
|----------|-------------|
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MariaDB credentials |
| `JWT_SECRET` | Any random 32+ character string |
| `AES_SECRET_KEY` | Exactly 32 characters |
| `AES_IV` | Exactly 16 characters |
| `DATABASE_URL` | Full Prisma connection string (MySQL format) |

### 3. Set up the database

```bash
# Create the database in MariaDB first
mysql -u root -p -e "CREATE DATABASE CocoScheme CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Apply all migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed with base admin account
node prisma/seed.js

# (Optional) Seed with sample data
node prisma/seedDummy.js
```

### 4. Start the application

```bash
# Requires SSL certificates (see below for local dev without certs)
node index.js
```

The server starts on `https://localhost:3000` (HTTPS) by default.

#### Running without SSL (development only)

```bash
node tests/e2e/start-server.js   # plain HTTP on port 3001
```

---

## SSL Certificates

Production requires SSL certificates placed at the paths configured in `index.js`.
For local development, accept the self-signed certificate in your browser by visiting
`https://localhost:3000` and proceeding past the warning.

---

## Verify the Deploy

```bash
# Unit tests
npm run test:auth

# E2E tests (set TEST_* vars in .env first)
npm run test:e2e
```

---

## Updating an Existing Deploy

```bash
git pull
pnpm install              # in case new dependencies were added
npx prisma generate       # in case schema changed
npx prisma migrate deploy # apply any new migrations
# restart the app process
```

---

## Setting Up Automated Backups

```bash
crontab -e
# Add:
0 2 * * * cd /path/to/dittravel-backend && ./scripts/backup.sh >> /var/log/dittravel-backup.log 2>&1
```

See [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) for full backup and restore documentation.

---

## Environment Variables Reference

See `.env.example` for the full list with descriptions.
