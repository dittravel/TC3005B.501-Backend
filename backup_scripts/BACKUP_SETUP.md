# Backup Setup (MariaDB + MongoDB)

This folder provides a unified backup workflow for three environments:

1. `development` (local machine, native DB processes)
2. `preproduction` (Linux VM with Docker)
3. `production` (Linux VM with Docker, segmented DB instance)

The scripts are configurable through `backup.env` and can run manually or automatically with cron.

If Node and pnpm are available on the DB VM, you can operate the same workflow through the interactive menu:

```bash
cd /home/dittravel/TC3005B.501-Backend
pnpm run menu
```

Menu shortcuts are wrappers around the same scripts (`backup:*`, `restore:*`), so both methods are equivalent.

## 1. Files in this folder

- `backup-mariadb.sh`: MariaDB dump
- `mongodb_backup.sh`: MongoDB dump
- `backup-all.sh`: runs MariaDB + MongoDB backups in sequence
- `install-backup-cron.sh`: installs/updates cron job using schedule in config
- `restore-mariadb.sh`: restore MariaDB from latest (or explicit) `.sql.gz`
- `restore-mongodb.sh`: restore MongoDB from latest (or explicit) `.archive.gz`
- `restore-all.sh`: runs MariaDB + MongoDB restore in order
- `backup.env.example`: template for configuration

## 2. One-time setup (all environments)

1. Copy and edit config:

```bash
cd backup_scripts
cp -n backup.env.example backup.env
```

2. Set execution permissions:

```bash
chmod +x backup-mariadb.sh mongodb_backup.sh backup-all.sh install-backup-cron.sh restore-mariadb.sh restore-mongodb.sh restore-all.sh
```

3. Install required tools:

### Development (native DB)

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y mariadb-client mongodb-database-tools
```

### Preproduction/Production (Dockerized DB)

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

If you enable remote copy (`REMOTE_BACKUP_ENABLED=true`), ensure SSH access from source VM to backup target is already configured.

## 3. Configure by environment

Update `backup.env` depending on where you run backups.

## 3.1 Development (native local)

Use this when MariaDB and MongoDB run directly on your machine.

```dotenv
BACKUP_ENVIRONMENT=development
MARIADB_SOURCE=local
MONGODB_SOURCE=local
MARIADB_HOST=127.0.0.1
MARIADB_PORT=3306
MONGODB_HOST=127.0.0.1
MONGODB_PORT=27017
```

## 3.2 Preproduction (Dockerized)

Use this on the preproduction DB host where DB services run in Docker Compose.

```dotenv
BACKUP_ENVIRONMENT=preproduction
MARIADB_SOURCE=docker
MONGODB_SOURCE=docker
COMPOSE_PROJECT_DIR=/home/dittravel/TC3005B.501-Backend
MARIADB_DOCKER_SERVICE=mariadb
MONGODB_DOCKER_SERVICE=mongodb
```

## 3.3 Production (Dockerized, segmented DB instance)

Use this on the production DB VM (the one running `serverDockerDB`).

```dotenv
BACKUP_ENVIRONMENT=production
MARIADB_SOURCE=docker
MONGODB_SOURCE=docker
COMPOSE_PROJECT_DIR=/home/dittravel/TC3005B.501-Backend
MARIADB_DOCKER_SERVICE=mariadb
MONGODB_DOCKER_SERVICE=mongodb
```

Important: run backups on the DB instance, not on backend/frontend instances.

## 4. Manual execution

PNPM shortcuts (same behavior):

```bash
cd /home/dittravel/TC3005B.501-Backend
pnpm run backup:all
pnpm run backup:mariadb
pnpm run backup:mongodb
```

Run both backups:

```bash
cd /home/dittravel/TC3005B.501-Backend/backup_scripts
BACKUP_CONFIG=./backup.env ./backup-all.sh
```

Run only MariaDB:

```bash
BACKUP_CONFIG=./backup.env ./backup-mariadb.sh
```

Run only MongoDB:

```bash
BACKUP_CONFIG=./backup.env ./mongodb_backup.sh
```

## 5. Automatic execution (configurable by superadmin)

The superadmin can configure frequency by editing:

```dotenv
BACKUP_CRON_SCHEDULE="0 */6 * * *"
```

Examples:

- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at 03:00: `0 3 * * *`

Install/update cron job:

```bash
cd /home/dittravel/TC3005B.501-Backend/backup_scripts
BACKUP_CONFIG=./backup.env ./install-backup-cron.sh
```

Equivalent shortcut:

```bash
cd /home/dittravel/TC3005B.501-Backend
pnpm run backup:cron:install
```

Check installed cron:

```bash
crontab -l
```

Superadmin UI:

- The grouped audit log screen (`/bitacora-grupo`) includes a "Automatización de respaldos" panel.
- The schedule is configured with guided fields (frequency, hour, minute, day) and the UI generates the cron expression automatically.
- If needed, there is an "Avanzado (cron)" mode for direct manual cron expressions.
- It always updates `backup_scripts/backup.env`.
- It only re-runs `install-backup-cron.sh` automatically when the backend host has cron installation enabled and available.
- In the segmented 3-VM topology, this usually means the UI saves the config file but does not touch the real cron job. The cron that matters lives on the DB VM, so you must sync those values to the DB VM and apply `install-backup-cron.sh` there.
- UI message meaning: "Configuración guardada" means `backup.env` was updated successfully.
- UI message meaning: "La tarea cron no se pudo aplicar automáticamente en este entorno" means the backend host could not install or update `crontab`; backups can still work if the DB VM cron already points to the same `backup.env` values.

## 6. Output, retention, and logs

Local backups are saved under:

- MariaDB: `${BACKUP_BASE_DIR}/mariadb`
- MongoDB: `${BACKUP_BASE_DIR}/mongodb`

Retention is controlled by:

- `MARIADB_RETENTION_DAYS`
- `MONGODB_RETENTION_DAYS`

Logs go to:

- `BACKUP_LOG_FILE`

## 7. Optional remote copy

Enable in `backup.env`:

```dotenv
REMOTE_BACKUP_ENABLED=true
REMOTE_BACKUP_HOST=172.16.61.151
REMOTE_BACKUP_USER=backupUser
REMOTE_BACKUP_TARGET_DIR=/var/backups/dittravel
REMOTE_BACKUP_SSH_KEY=/home/dittravel/.ssh/backup_key
```

When enabled, each backup uploads the generated file to the remote target.

## 8. Operational verification checklist

After any backup run:

1. Check script exit code is `0`.
2. Confirm local files exist in configured backup directories.
3. Review `BACKUP_LOG_FILE` for errors.
4. If remote copy enabled, verify files on remote host.
5. Periodically test restore on non-production environment.

## 9. Restore procedure

Recovery is intentionally CLI-only (not UI-driven), so it can run during incidents where normal app auth/UI is unavailable.

Always restore in this order to keep application consistency:

1. Stop backend writes (maintenance mode or stop backend container).
2. Restore MariaDB.
3. Restore MongoDB.
4. Restart backend and validate critical flows.

### 9.0 One-command disaster recovery

Run on the DB VM (the one with `serverDockerDB`):

```bash
cd /home/dittravel/TC3005B.501-Backend
BACKUP_CONFIG=./backup_scripts/backup.env ./backup_scripts/restore-all.sh
```

If Node and pnpm are available in that host, equivalent shortcut:

```bash
pnpm restore:all
```

Menu path (same operation):

1. `pnpm run menu`
2. `3) Recovery`
3. `1) Restore all (MariaDB -> MongoDB)`
4. Type `RESTORE` to confirm.

Default behavior:

- Uses latest MariaDB `.sql.gz` and latest MongoDB `.archive.gz`.
- Reuses `backup.env` (same integration as backup scripts).
- For MariaDB, creates a safety backup before restore (`MARIADB_RESTORE_CREATE_SAFETY_BACKUP=true`).
- For MongoDB, restores with `--drop` by default (`MONGODB_RESTORE_DROP=true`).

Override file selection in `backup.env` when needed:

```dotenv
MARIADB_RESTORE_FILE=/var/backups/dittravel/mariadb/CocoScheme_production_20260101_030000.sql.gz
MONGODB_RESTORE_FILE=/var/backups/dittravel/mongodb/fileStorage_production_20260101_030000.archive.gz
```

### 9.1 Restore MariaDB

CLI command:

```bash
cd /home/dittravel/TC3005B.501-Backend
BACKUP_CONFIG=./backup_scripts/backup.env ./backup_scripts/restore-mariadb.sh
```

Manual equivalent from SQL backup file (`*.sql.gz`):

```bash
gunzip -c /var/backups/dittravel/mariadb/<file>.sql.gz | \
	mariadb -h <db_host> -P 3306 -u <db_user> -p <db_name>
```

Dockerized DB service restore:

```bash
gunzip -c /var/backups/dittravel/mariadb/<file>.sql.gz | \
	docker compose -f /home/dittravel/TC3005B.501-Backend/docker-compose.yml exec -T mariadb \
	mariadb -u<db_user> -p<db_password> <db_name>
```

Typical 3-VM production example on the DB VM:

```bash
gunzip -c /var/backups/dittravel/mariadb/<file>.sql.gz | \
	docker compose -f /home/dittravel/TC3005B.501-Backend/docker-compose.yml exec -T mariadb \
	mariadb -uroot -p"$DB_ROOT_PASSWORD" CocoScheme
```

### 9.2 Restore MongoDB

CLI command:

```bash
cd /home/dittravel/TC3005B.501-Backend
BACKUP_CONFIG=./backup_scripts/backup.env ./backup_scripts/restore-mongodb.sh
```

Manual equivalent from archive file (`*.archive.gz`) native restore:

```bash
mongorestore --host <mongo_host> --port 27017 --db <mongo_db> --drop --gzip \
	--archive=/var/backups/dittravel/mongodb/<file>.archive.gz
```

Dockerized service restore:

```bash
docker compose -f /home/dittravel/TC3005B.501-Backend/docker-compose.yml exec -T mongodb \
	mongorestore --db <mongo_db> --drop --gzip --archive \
	< /var/backups/dittravel/mongodb/<file>.archive.gz
```

Typical 3-VM production example on the DB VM:

```bash
docker compose -f /home/dittravel/TC3005B.501-Backend/docker-compose.yml exec -T mongodb \
	mongorestore --db CocoScheme --drop --gzip --archive \
	< /var/backups/dittravel/mongodb/<file>.archive.gz
```

### 9.3 Post-restore validation

1. Validate DB connectivity from backend host (`nc -zv <db_ip> 3306` and `27017`).
2. Run backend migrations if schema is behind:

```bash
docker compose exec -T backend npx prisma migrate deploy
```

3. Validate login + one critical read flow + one write flow.

Recommended operational note for production restore:

- Stop the backend container on the backend VM before restore so the app does not write while data is being replaced.
- Restore both databases on the DB VM.
- Start the backend again and validate exchange rate, login, and one request creation flow.

## 10. Cloud rollout for backup changes

When backup scripts or backup automation settings are updated in Git:

1. If superadmin changed schedule/toggle from UI, copy updated settings to DB instance:

```bash
# On backend VM
cd ~/TC3005B.501-Backend/backup_scripts
cat backup.env
```

Apply same values in DB VM `backup.env` (DB VM is where cron must run). In other words, the backend UI is the editor for the config file, but the DB VM is the owner of the active cron job.

2. Update DB instance code:

```bash
ssh dittdb
cd ~/TC3005B.501-Backend
git pull
chmod +x backup_scripts/*.sh
```

3. Ensure active config exists:

```bash
cd backup_scripts
cp -n backup.env.example backup.env
```

4. Apply/update cron job:

```bash
BACKUP_CONFIG=./backup.env ./install-backup-cron.sh
crontab -l
```

5. Execute one manual dry run:

```bash
BACKUP_CONFIG=./backup.env ./backup-all.sh
```

6. Validate output files and logs.

## 11. Flow B (DB VM) quick start

When preparing a new DB VM using the guided menu:

1. Clone backend repo in VM.
2. Run `pnpm run bootstrap:server` once.
3. Log out and back in.
4. Configure `.env` DB credentials.
5. Run `pnpm run menu`.
6. Choose `0) Initial setup wizard (Flow B)`.
7. Choose `3) Setup this machine as DB VM (serverDockerDB + backups)`.
8. Cron is installed/updated automatically from `backup.env`.
9. Run one manual backup (`pnpm run backup:all`) and verify logs/files.
