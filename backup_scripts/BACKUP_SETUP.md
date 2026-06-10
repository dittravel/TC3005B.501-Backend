# Backup and Restore Runbook (DB VM first)

This document explains exactly how to configure backups, cron, and restore with minimum ambiguity.

## Quick Orientation

Use this guide when you are setting up backups on the host that runs MariaDB and MongoDB.

The backup cron belongs on the DB host, not on the backend host. The backend may update the DB host backup settings through remote sync, but the actual cron execution still happens on the DB host.

## Getting Started

### 1. Bootstrap the DB host

On the DB host, run the backend bootstrap script after cloning the backend repository.

```bash
cd /home/dittravel/TC3005B.501-Backend
bash scripts/bootstrap-server.sh
bash switch-env.sh serverDockerDB
docker compose ps
```

Expected services healthy:

- `mariadb`
- `mongodb`

### 2. Create the backup config

```bash
cd /home/dittravel/TC3005B.501-Backend/backup_scripts
cp -n backup.env.example backup.env
chmod +x *.sh
```

### 3. Fill in the required backup values

Fill in the required backup values in `backup.env` using the template below, then install cron.

Primary host for this runbook:
- DB VM (`serverDockerDB`)
- repository path: `/home/dittravel/TC3005B.501-Backend`

## 1. Scope and ownership

1. Backup scripts run on DB VM.
2. Cron job that executes backups is installed on DB VM.
3. Backend VM may update DB VM backup settings only through remote sync.

## 2. Required `backup.env` baseline (DB VM)

Use this as the minimum functional template.

```dotenv
# Base paths
BACKUP_BASE_DIR=/var/backups/dittravel
BACKUP_LOG_FILE=/var/backups/dittravel/backup.log

# Where DBs are read from during backup
MARIADB_SOURCE=docker
MONGODB_SOURCE=docker
COMPOSE_PROJECT_DIR=/home/dittravel/TC3005B.501-Backend

# MariaDB backup credentials
MARIADB_DB_NAME=CocoScheme
MARIADB_USER=travel_user
MARIADB_PASSWORD=<db_password>

# Mongo backup target database
MONGODB_DB_NAME=fileStorage

# Retention
MARIADB_RETENTION_DAYS=14
MONGODB_RETENTION_DAYS=14

# Automation
BACKUP_AUTOMATION_ENABLED=true
BACKUP_CRON_SCHEDULE="0 */6 * * *"
```

## 3. Install or update cron from config

```bash
cd /home/dittravel/TC3005B.501-Backend
pnpm run backup:cron:install
```

Verify:

```bash
crontab -l | grep dittravel-backup-job
```

Expected characteristics:
- includes marker `# dittravel-backup-job`
- uses absolute `BACKUP_CONFIG=/home/dittravel/TC3005B.501-Backend/backup_scripts/backup.env`
- calls absolute backup script path

## 4. Test backup manually before trusting cron

```bash
cd /home/dittravel/TC3005B.501-Backend
pnpm run backup:all
```

Validate outputs:

```bash
tail -n 120 /var/backups/dittravel/backup.log
ls -lt /var/backups/dittravel/mariadb | head -n 5
ls -lt /var/backups/dittravel/mongodb | head -n 5
```

## 5. Validate cron execution

Use temporary high frequency schedule:

```dotenv
BACKUP_CRON_SCHEDULE="*/5 * * * *"
```

Apply:

```bash
pnpm run backup:cron:install
```

Wait one cycle and verify log growth:

```bash
tail -n 120 /var/backups/dittravel/backup.log
```

Restore to production schedule after validation.

## 6. Remote sync from backend VM (optional but recommended)

When superadmin saves backup automation in UI, backend can push config+cron update to DB VM.

### 8.1 Backend VM `backup.env` keys

In backend VM repo `backup_scripts/backup.env` set:

```dotenv
BACKUP_REMOTE_SYNC_ENABLED=true
BACKUP_REMOTE_SYNC_HOST=172.16.60.115
BACKUP_REMOTE_SYNC_USER=dittravel
BACKUP_REMOTE_SYNC_TARGET_DIR=/home/dittravel/TC3005B.501-Backend
BACKUP_REMOTE_SYNC_SSH_KEY=/home/dittravel/.ssh/dittravel
```

### 8.2 Backend VM SSH prerequisites

```bash
mkdir -p /home/dittravel/.ssh
chmod 700 /home/dittravel/.ssh
chmod 600 /home/dittravel/.ssh/dittravel
ssh -i /home/dittravel/.ssh/dittravel -o BatchMode=yes dittravel@172.16.60.115 'echo OK'
```

### 8.3 Backend container recreation

```bash
cd /home/dittravel/TC3005B.501-Backend
docker compose up -d --force-recreate backend
```

### 8.4 End-to-end verification

1. Save backup automation config from UI.
2. On DB VM:

```bash
crontab -l | grep dittravel-backup-job
tail -n 80 /var/backups/dittravel/backup.log
```

## 7. Restore procedures

Run from DB VM in backend repo root.

### 7.1 Restore all

```bash
pnpm run restore:all
```

### 7.2 Restore MariaDB only

```bash
pnpm run restore:mariadb
```

### 7.3 Restore MongoDB only

```bash
pnpm run restore:mongodb
```

## 8. Restore safety checklist

Before restore:
1. Confirm target environment (DB VM host and repo path).
2. Confirm backup file/date selected is correct.
3. Ensure application traffic is controlled for consistency.

After restore:
1. Verify API health from backend VM.
2. Verify critical business queries in app.
3. Keep backup + restore logs for audit.

## 9. Failure signatures and fixes

### 9.1 `spawn ssh ENOENT`

Meaning:
- backend container cannot find `ssh` binary.

Fix:

```bash
cd /home/dittravel/TC3005B.501-Backend
docker compose up -d --build --force-recreate backend
```

### 9.2 `Permission denied (publickey)`

Meaning:
- remote sync key/permissions/user/host mismatch.

Fix:

```bash
chmod 700 /home/dittravel/.ssh
chmod 600 /home/dittravel/.ssh/dittravel
ssh -i /home/dittravel/.ssh/dittravel dittravel@172.16.60.115 'echo OK'
```

### 9.3 `mariadb-dump ... 1045`

Meaning:
- wrong MariaDB credentials in `backup.env`.

Fix:
1. align `MARIADB_USER` and `MARIADB_PASSWORD` with DB VM `.env`/container credentials
2. rerun `pnpm run backup:all`

### 9.4 No new backups from cron

Meaning:
- cron disabled, stale entry, or wrong path.

Fix:

```bash
cd /home/dittravel/TC3005B.501-Backend
pnpm run backup:cron:install
crontab -l | grep dittravel-backup-job
```

## 10. Operator quick commands

```bash
# show cron
crontab -l

# install cron from backup.env
pnpm run backup:cron:install

# run immediate backup
pnpm run backup:all

# inspect latest log
tail -n 120 /var/backups/dittravel/backup.log

# check latest artifacts
ls -lt /var/backups/dittravel/mariadb | head -n 5
ls -lt /var/backups/dittravel/mongodb | head -n 5
```
