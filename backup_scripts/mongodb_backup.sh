#!/bin/bash
# MongoDB Backup Script
# Automatically backs up MongoDB database, compresses it, and transfers to remote server

echo "[$(date)] Inicio del script de backup MongoDB" >> /var/backups/mongodb/debug_cron.log

# MongoDB connection parameters
mongoHost="172.16.61.137"
mongoPort="27017"
mongoDb="fileStorage"
# If authentication is required, uncomment and set these
#mongoUser="db_user"
#mongoPassword="your_secure_password"

# Local backup configuration
backupDir="/var/backups/mongodb"
date=$(date +"%Y%m%d_%H%M%S")
filename="${mongoDb}_${date}"

# Remote server settings for backup transfer
remoteUser="backupUser"
remotePassword="backupPassword"  # Add the remote password here
remoteHost="172.16.61.151"
remoteDir="~/backupsmongo"

# Clean up and prepare local backup directory
# Remove old backup locally (if it exists) to save disk space
echo "Limpiando directorio local de backups..." >> /var/backups/mongodb/debug_cron.log
rm -fr $backupDir
mkdir -p $backupDir

# Create MongoDB backup using mongodump
echo "Ejecutando mongodump..." >> /var/backups/mongodb/debug_cron.log

# Choose one of these commands based on whether you need authentication
# Without authentication:
mongodump --host $mongoHost --port $mongoPort --db $mongoDb --out "$backupDir/$filename"

# With authentication (uncomment if needed):
#mongodump --host $mongoHost --port $mongoPort --username $mongoUser --password $mongoPassword --authenticationDatabase admin --db $mongoDb --out "$backupDir/$filename"

# Check if mongodump was successful
dumpStatus=$?
if [ $dumpStatus -eq 0 ]; then
    echo "mongodump completado exitosamente" >> /var/backups/mongodb/debug_cron.log
else
    echo "Error en mongodump (código: $dumpStatus)" >> /var/backups/mongodb/debug_cron.log
    exit 1
fi

# Compress the backup to reduce storage space and transfer time
echo "Comprimiendo backup..." >> /var/backups/mongodb/debug_cron.log
tar -czf "$backupDir/${filename}.tar.gz" -C "$backupDir" "$filename"
rm -rf "$backupDir/$filename"  # Remove uncompressed directory after compression

# Clean up remote backup directory before transferring new backup
# This ensures we don't accumulate old backups on the remote server
echo "Limpiando directorio remoto..." >> /var/backups/mongodb/debug_cron.log
sshpass -p "${remotePassword}" ssh -o StrictHostKeyChecking=no ${remoteUser}@${remoteHost} "rm -fr ${remoteDir}/* && mkdir -p ${remoteDir}"
sshStatus=$?

# Check if remote directory cleanup was successful
if [ $sshStatus -ne 0 ]; then
    echo "Error al limpiar directorio remoto (código: $sshStatus)" >> /var/backups/mongodb/debug_cron.log
fi

# Transfer compressed backup file to remote server using SCP
echo "Iniciando transferencia SCP..." >> /var/backups/mongodb/debug_cron.log
sshpass -p "${remotePassword}" scp -o StrictHostKeyChecking=no "$backupDir/${filename}.tar.gz" ${remoteUser}@${remoteHost}:${remoteDir}/
scpStatus=$?

# Verify transfer completion and log results
if [ $scpStatus -eq 0 ]; then
    echo "Transferencia SCP completada exitosamente" >> /var/backups/mongodb/debug_cron.log
else
    echo "Error en la transferencia SCP (código: $scpStatus)" >> /var/backups/mongodb/debug_cron.log
fi
