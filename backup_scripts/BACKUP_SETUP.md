# Backup Setup (MariaDB + MongoDB)

This folder provides a unified backup workflow for three environments:

1. `development` (local machine, native DB processes)
2. `preproduction` (Linux VM with Docker)
3. `production` (Linux VM with Docker, segmented DB instance)

The scripts are configurable through `backup.env` and can run manually or automatically with cron.

## 1. Files in this folder

- `backup-mariadb.sh`: MariaDB dump
- `mongodb_backup.sh`: MongoDB dump
- `backup-all.sh`: runs MariaDB + MongoDB backups in sequence
- `install-backup-cron.sh`: installs/updates cron job using schedule in config
- `backup.env.example`: template for configuration

## 2. One-time setup (all environments)

1. Copy and edit config:

```bash
cd backup_scripts
cp backup.env.example backup.env
```

2. Set execution permissions:

```bash
chmod +x backup-mariadb.sh mongodb_backup.sh backup-all.sh install-backup-cron.sh
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
BACKUP_CRON_SCHEDULE=0 */6 * * *
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

Check installed cron:

```bash
crontab -l
```

Superadmin UI:

- The grouped audit log screen (`/bitacora-grupo`) includes a "Automatización de respaldos" panel.
- The schedule is configured with guided fields (frequency, hour, minute, day) and the UI generates the cron expression automatically.
- If needed, there is an "Avanzado (cron)" mode for direct manual cron expressions.
- It updates `backup_scripts/backup.env` and re-runs `install-backup-cron.sh` on the host where the backend API is running.
- In segmented cloud topology, sync those changes to the DB instance (see section 10).

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

Always restore in this order to keep application consistency:

1. Stop backend writes (maintenance mode or stop backend container).
2. Restore MariaDB.
3. Restore MongoDB.
4. Restart backend and validate critical flows.

### 9.1 Restore MariaDB

From SQL backup file (`*.sql.gz`):

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

### 9.2 Restore MongoDB

From archive file (`*.archive.gz`) native restore:

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

### 9.3 Post-restore validation

1. Validate DB connectivity from backend host (`nc -zv <db_ip> 3306` and `27017`).
2. Run backend migrations if schema is behind:

```bash
docker compose exec -T backend npx prisma migrate deploy
```

3. Validate login + one critical read flow + one write flow.

## 10. Cloud rollout for backup changes

When backup scripts or backup automation settings are updated in Git:

1. If superadmin changed schedule/toggle from UI, copy updated settings to DB instance:

```bash
# On backend VM
cd ~/TC3005B.501-Backend/backup_scripts
cat backup.env
```

Apply same values in DB VM `backup.env` (DB VM is where cron must run).

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
