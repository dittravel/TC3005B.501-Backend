#!/bin/bash

# ============================================================================
# MariaDB Backup Script
# ============================================================================
# This script creates a backup of the MariaDB database and transfers it
# to a remote server using SCP. It cleans up old backups before creating
# new ones to save disk space.
# ============================================================================

# Log script start time for debugging
echo "[$(date)] Inicio del script" >> ~/debug_cron.log

# Database connection credentials
dbUser="CocoAdmin"              # MariaDB database user with backup privileges
dbPassword="CocoPassword"       # Database user password
databaseName="CocoScheme"       # Name of the database to backup

# Local backup configuration
backupDir="/var/backups/mariadb"              # Directory where backups are stored locally
timestamp=$(date +"%Y%m%d_%H%M%S")            # Current timestamp for unique filenames
backupFilename="${databaseName}_${timestamp}.sql"  # Complete backup filename with timestamp

# Remove old backup directory (if it exists) to free up space
echo "Limpiando directorio local de backups..." >> /var/backups/mariadb/debug_cron.log
rm -fr $backupDir
mkdir -p $backupDir

# Create database backup using mysqldump
echo "Ejecutando mysqldump..." >> /var/backups/mariadb/debug_cron.log
mysqldump -u $dbUser -p$dbPassword $databaseName > "$backupDir/$backupFilename"
echo "mysqldump finalizado" >> /var/backups/mariadb/debug_cron.log

# Remote server configuration for SCP transfer
remoteUser="backupUser"         # SSH user on the remote backup server
remotePassword="backupPassword" # SSH password for remote server
remoteHost="172.16.61.151"      # IP address of the remote backup server
remoteDir="~/backups"           # Directory on remote server where backups are stored

# Clean up remote backup directory before transferring new backup
# This ensures only the latest backup is kept on the remote server
echo "Limpiando directorio remoto..." >> /var/backups/mariadb/debug_cron.log
sshpass -p "${remotePassword}" ssh ${remoteUser}@${remoteHost} "rm -fr ${remoteDir}/* && mkdir -p ${remoteDir}"
sshStatus=$?

# Check if remote cleanup was successful
if [ $sshStatus -ne 0 ]; then
    echo "Error al limpiar directorio remoto (código: $sshStatus)" >> ~/debug_cron.log
fi

# Transfer backup file to remote server using SCP
echo "Iniciando transferencia SCP..." >> /var/backups/mariadb/debug_cron.log
sshpass -p "${remotePassword}" scp "$backupDir/$backupFilename" ${remoteUser}@${remoteHost}:${remoteDir}/
scpStatus=$?

# Verify SCP transfer success and log the result
if [ $scpStatus -eq 0 ]; then
    echo "Transferencia SCP completada exitosamente" >> /var/backups/mariadb/debug_cron.log
else
    echo "Error en la transferencia SCP (código: $scpStatus)" >> /var/backups/mariadb/debug_cron.log
fi
