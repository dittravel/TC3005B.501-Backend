#!/bin/bash
# MariaDB Backup Script
# Automatically backs up the database and transfers it to a remote server

echo "[$(date)] Inicio del script" >> ~/debug_cron.log

# Database credentials
user="CocoAdmin"
password="CocoPassword"
database="CocoScheme"

# Local backup configuration
backupDir="/var/backups/mariadb"
date=$(date +"%Y%m%d_%H%M%S")
filename="${database}_${date}.sql"

# Clean up and prepare local backup directory
# Remove old backup (if it exists) to save disk space
rm -fr $backupDir
mkdir -p $backupDir

# Create database backup using mysqldump
echo "Ejecutando mysqldump..." >> /var/backups/mariadb/debug_cron.log
mysqldump -u $user -p$password $database > "$backupDir/$filename"
echo "mysqldump finalizado" >> /var/backups/mariadb/debug_cron.log

# Remote server configuration for backup transfer
remoteUser="backupUser"
remotePassword="backupPassword"
remoteHost="172.16.61.151"
remoteDir="~/backups"

# Clean up remote backup directory before transferring new backup
# This ensures we don't accumulate old backups on the remote server
echo "Limpiando directorio remoto..." >> /var/backups/mariadb/debug_cron.log
sshpass -p "${remotePassword}" ssh ${remoteUser}@${remoteHost} "rm -fr ${remoteDir}/* && mkdir -p ${remoteDir}"
sshStatus=$?

# Check if remote directory cleanup was successful
if [ $sshStatus -ne 0 ]; then
    echo "Error al limpiar directorio remoto (código: $sshStatus)" >> ~/debug_cron.log
fi

# Transfer backup file to remote server using SCP
echo "Iniciando transferencia SCP..." >> /var/backups/mariadb/debug_cron.log
sshpass -p "${remotePassword}" scp "$backupDir/$filename" ${remoteUser}@${remoteHost}:${remoteDir}/
scpStatus=$?

# Verify transfer completion and log results
if [ $scpStatus -eq 0 ]; then
    echo "Transferencia SCP completada exitosamente" >> /var/backups/mariadb/debug_cron.log
else
    echo "Error en la transferencia SCP (código: $scpStatus)" >> /var/backups/mariadb/debug_cron.log
fi
