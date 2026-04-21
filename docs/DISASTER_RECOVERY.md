# Disaster Recovery Runbook

**System**: DitTravel Backend  
**RTO target**: 8 hours  
**RPO target**: 24 hours  

---

## Overview

This runbook covers recovery from a complete server failure. Following these steps
in order should restore the system within 4–5 hours, well within the 8-hour RTO target.

---

## Prerequisites

Before an incident occurs, ensure the following are in place:

- [ ] Daily backups running via cron (see [Backup Setup](#backup-setup))
- [ ] Latest backup stored in an offsite location (external drive, cloud storage, or remote server)
- [ ] A copy of the `.env` file stored securely and separately from the server
- [ ] Access to the production server or ability to provision a new one
- [ ] `mysqldump`, `mysql`, `mongodump`, `mongorestore` installed on the recovery machine

---

## Backup Setup

### Install the cron job (run once on the server)

```bash
crontab -e
# Add this line — runs backup daily at 2:00 AM
0 2 * * * cd /path/to/dittravel-backend && ./scripts/backup.sh >> /var/log/dittravel-backup.log 2>&1
```

### Set up MinIO for offsite storage (recommended)

Deploy MinIO on a **separate machine** so backups survive a server failure:

```bash
# On the backup machine
docker compose -f docker-compose.backup.yml up -d

# One-time: create the bucket
docker exec dittravel-minio mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
docker exec dittravel-minio mc mb local/dittravel-backups
```

Then add these to `.env` on the application server:
```
BACKUP_S3_ENDPOINT=http://<backup-machine-ip>:9000
BACKUP_S3_BUCKET=dittravel-backups
BACKUP_S3_ACCESS_KEY=<minio-access-key>
BACKUP_S3_SECRET_KEY=<minio-secret-key>
```

After this, every `backup.sh` run uploads the archive to MinIO automatically.
Access the MinIO web console at `http://<backup-machine-ip>:9001` to browse archives.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `./backups` | Where local backup archives are stored |
| `BACKUP_RETENTION_DAYS` | `7` | How many days of local backups to keep |
| `BACKUP_S3_ENDPOINT` | — | MinIO URL (optional, enables offsite upload) |
| `BACKUP_S3_BUCKET` | — | Bucket name in MinIO |
| `BACKUP_S3_ACCESS_KEY` | — | MinIO access key |
| `BACKUP_S3_SECRET_KEY` | — | MinIO secret key |

### Verify the backup works

```bash
./scripts/test-restore.sh
```

This creates a backup, restores it to a shadow database, and verifies all row counts match.
Run this after initial deploy and after any schema migration.

---

## Recovery Procedure

### Step 1 — Detect and assess (est. 30 min)

1. Confirm the system is down (not just a transient error)
2. Identify the failure type:
   - **App crash only** → restart the process (skip to Step 4)
   - **DB corruption** → proceed with full restore
   - **Server hardware failure** → provision new server, then proceed from Step 2
3. Notify stakeholders of estimated recovery time

### Step 2 — Provision server / restart service (est. 1 hour)

If the server is gone:

```bash
# On the new server — install Node.js 22+, MariaDB, MongoDB, pnpm
# Then clone the repo
git clone <repo-url> dittravel-backend
cd dittravel-backend
pnpm install
npx prisma generate
```

Copy the `.env` file to the server.

### Step 3 — Retrieve and restore databases (est. 1 hour)

**If MinIO is configured**, download the latest backup from the web console
(`http://<backup-machine-ip>:9001`) or via CLI:

```bash
AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> \
  aws s3 cp s3://dittravel-backups/backup_<TIMESTAMP>.tar.gz ./backups/ \
  --endpoint-url=http://<backup-machine-ip>:9000 --no-verify-ssl
```

**If only local backups exist**, copy the archive from wherever it was stored.

Then restore:

```bash
./scripts/restore.sh ./backups/backup_<TIMESTAMP>.tar.gz
```

The script will:
1. Ask for confirmation before dropping existing data
2. Restore MariaDB from the SQL dump
3. Restore MongoDB collections

To find the latest archive:
```bash
ls -lt ./backups/backup_*.tar.gz | head -5
```

### Step 4 — Apply pending migrations (est. 15 min)

```bash
npx prisma migrate deploy
```

> Only needed if schema migrations were added between the backup date and now.

### Step 5 — Start the application (est. 15 min)

```bash
# Development / handoff environment
node index.js

# Or with a process manager
pm2 start index.js --name dittravel-backend
pm2 save
```

Verify the process is running:
```bash
curl -s https://localhost:3000/api/health || curl -s http://localhost:3000/
```

### Step 6 — Run smoke tests (est. 30 min)

```bash
# Unit tests
npm run test:auth

# E2E tests (requires TEST_* env vars — see .env.example)
npm run test:e2e
```

All tests should pass before declaring recovery complete.

### Step 7 — Notify stakeholders (est. 15 min)

Confirm the system is operational and communicate:
- Actual downtime duration
- Data loss window (time of last successful backup)
- Root cause (if known)

---

## Recovery Time Estimate

| Step | Estimated Time |
|------|---------------|
| Detect + assess | 30 min |
| Provision server | 60 min |
| Restore databases | 60 min |
| Apply migrations | 15 min |
| Start application | 15 min |
| Smoke tests | 30 min |
| Notify stakeholders | 15 min |
| **Total** | **~3.5 hours** |

Worst-case with complications: ~6 hours — still within the 8-hour RTO.

---

## Upgrade Path (to reduce RTO further)

To achieve RTO < 1 hour, the following infrastructure changes would be required:

- **Hot standby server** with streaming replication (MariaDB GTID replication)
- **MongoDB replica set** with automatic primary election
- **Load balancer** (nginx, HAProxy) with health checks for automatic failover
- **Automated backup upload** to cloud storage (AWS S3, Azure Blob)

These are out of scope for the current deployment but represent the natural next step
if DitTravel's availability requirements increase.

---

## Contact / Escalation

| Role | Contact |
|------|---------|
| Primary on-call | _(fill in)_ |
| Database admin | _(fill in)_ |
| Infrastructure | _(fill in)_ |
