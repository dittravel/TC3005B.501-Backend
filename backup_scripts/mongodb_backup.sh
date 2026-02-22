#!/bin/bash

# ============================================================================
# MongoDB Backup Script
# ============================================================================
# This script creates a backup of a MongoDB database, compresses it, and
# transfers it to a remote server using SCP. Old backups are automatically
# cleaned up both locally and remotely to conserve disk space.
# ============================================================================

# Log script start time for debugging and monitoring
echo "[$(date)] Inicio del script de backup MongoDB" >> /var/backups/mongodb/debug_cron.log

# MongoDB connection parameters
mongoHost="172.16.61.137"       # IP address or hostname of the MongoDB server
mongoPort="27017"               # MongoDB port (default is 27017)
mongoDatabase="fileStorage"     # Name of the MongoDB database to backup

# MongoDB authentication (if required, uncomment and configure these)
#mongoUser="db_user"            # MongoDB username with read access to the database
#mongoPassword="your_secure_password"  # MongoDB user password

# Local backup configuration
backupDir="/var/backups/mongodb"              # Local directory for storing backups
timestamp=$(date +"%Y%m%d_%H%M%S")            # Current timestamp for unique filenames
backupFilename="${mongoDatabase}_${timestamp}"  # Backup folder name (before compression)

# Remote server configuration for SCP transfer
remoteUser="backupUser"         # SSH user on the remote backup server
remotePassword="backupPassword" # SSH password for remote server authentication
remoteHost="172.16.61.151"      # IP address of the remote backup server
remoteDir="~/backupsmongo"      # Directory on remote server for MongoDB backups

# Remove old backup locally (if it exists) to free up disk space
echo "Limpiando directorio local de backups..." >> /var/backups/mongodb/debug_cron.log
rm -fr $backupDir
mkdir -p $backupDir

# Create MongoDB backup using mongodump
echo "Ejecutando mongodump..." >> /var/backups/mongodb/debug_cron.log

# Choose one of these commands based on whether you need authentication:
# Without authentication (current configuration):
mongodump --host $mongoHost --port $mongoPort --db $mongoDatabase --out "$backupDir/$backupFilename"

# With authentication (uncomment and configure mongoUser/mongoPassword if needed):
#mongodump --host $mongoHost --port $mongoPort --username $mongoUser --password $mongoPassword --authenticationDatabase admin --db $mongoDatabase --out "$backupDir/$backupFilename"

# Check if mongodump completed successfully
dumpStatus=$?
if [ $dumpStatus -eq 0 ]; then
    echo "mongodump completado exitosamente" >> /var/backups/mongodb/debug_cron.log
else
    echo "Error en mongodump (código: $dumpStatus)" >> /var/backups/mongodb/debug_cron.log
    exit 1  # Exit script if backup creation failed
fi

# Compress the backup to save storage space and reduce transfer time
echo "Comprimiendo backup..." >> /var/backups/mongodb/debug_cron.log
tar -czf "$backupDir/${backupFilename}.tar.gz" -C "$backupDir" "$backupFilename"
rm -rf "$backupDir/$backupFilename"  # Remove uncompressed directory after compression

# Clean up remote backup directory before transferring new backup
# This ensures only the latest backup is kept on the remote server
echo "Limpiando directorio remoto..." >> /var/backups/mongodb/debug_cron.log
sshpass -p "${remotePassword}" ssh -o StrictHostKeyChecking=no ${remoteUser}@${remoteHost} "rm -fr ${remoteDir}/* && mkdir -p ${remoteDir}"
sshStatus=$?

# Check if remote cleanup was successful
if [ $sshStatus -ne 0 ]; then
    echo "Error al limpiar directorio remoto (código: $sshStatus)" >> /var/backups/mongodb/debug_cron.log
fi

# Transfer compressed backup file to remote server using SCP
echo "Iniciando transferencia SCP..." >> /var/backups/mongodb/debug_cron.log
sshpass -p "${remotePassword}" scp -o StrictHostKeyChecking=no "$backupDir/${backupFilename}.tar.gz" ${remoteUser}@${remoteHost}:${remoteDir}/
scpStatus=$?

# Verify SCP transfer success and log the result
if [ $scpStatus -eq 0 ]; then
    echo "Transferencia SCP completada exitosamente" >> /var/backups/mongodb/debug_cron.log
else
    echo "Error en la transferencia SCP (código: $scpStatus)" >> /var/backups/mongodb/debug_cron.log
fi
