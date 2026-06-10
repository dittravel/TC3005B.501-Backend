import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const BACKUP_CONFIG_FILE =
  process.env.BACKUP_CONFIG_FILE ||
  path.resolve(process.cwd(), 'backup_scripts', 'backup.env');

const INSTALL_CRON_SCRIPT =
  process.env.BACKUP_INSTALL_CRON_SCRIPT ||
  path.resolve(process.cwd(), 'backup_scripts', 'install-backup-cron.sh');

const APPLY_CRON_ON_SAVE = ['true', '1', 'yes'].includes(
  String(process.env.BACKUP_APPLY_CRON_ON_SAVE || '').trim().toLowerCase()
);

function parseEnvLines(content) {
  return content.split(/\r?\n/);
}

function getEnvValue(lines, key) {
  const line = lines.find((entry) => entry.startsWith(`${key}=`));
  if (!line) return '';
  const value = line.slice(key.length + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function upsertEnvValue(lines, key, value) {
  const serializedValue = key === 'BACKUP_CRON_SCHEDULE' ? `"${value}"` : value;
  const expected = `${key}=${serializedValue}`;
  const index = lines.findIndex((entry) => entry.startsWith(`${key}=`));
  if (index >= 0) {
    lines[index] = expected;
  } else {
    lines.push(expected);
  }
}

function parseBoolean(value, fallback = false) {
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function isValidCronExpression(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;

  if (/^@(hourly|daily|weekly|monthly|yearly|annually|reboot)$/.test(trimmed)) {
    return true;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) return false;

  return parts.every((part) => /^[0-9*/,-]+$/.test(part));
}

function buildSshOptions(remoteSync) {
  const sshOptions = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new'];
  if (remoteSync.sshKey) {
    sshOptions.push('-i', remoteSync.sshKey);
  }
  return sshOptions;
}

function resolveRemoteSyncConfig(lines) {
  const enabledRaw = getEnvValue(lines, 'BACKUP_REMOTE_SYNC_ENABLED') || process.env.BACKUP_REMOTE_SYNC_ENABLED || '';
  const host = (getEnvValue(lines, 'BACKUP_REMOTE_SYNC_HOST') || process.env.BACKUP_REMOTE_SYNC_HOST || '').trim();
  const user = (getEnvValue(lines, 'BACKUP_REMOTE_SYNC_USER') || process.env.BACKUP_REMOTE_SYNC_USER || '').trim();
  const targetDir = (
    getEnvValue(lines, 'BACKUP_REMOTE_SYNC_TARGET_DIR') ||
    process.env.BACKUP_REMOTE_SYNC_TARGET_DIR ||
    '/home/dittravel/TC3005B.501-Backend'
  ).trim();
  const sshKey = (getEnvValue(lines, 'BACKUP_REMOTE_SYNC_SSH_KEY') || process.env.BACKUP_REMOTE_SYNC_SSH_KEY || '').trim();

  return {
    enabled: ['true', '1', 'yes'].includes(String(enabledRaw).trim().toLowerCase()),
    host,
    user,
    targetDir,
    sshKey,
  };
}

async function syncConfigToRemoteDbVm(configFile, remoteSync) {
  if (!remoteSync.enabled) {
    return { applied: false, target: null };
  }

  if (!remoteSync.host || !remoteSync.user) {
    throw new Error(
      'BACKUP_REMOTE_SYNC_HOST and BACKUP_REMOTE_SYNC_USER must be set to sync the backup config to the DB VM.'
    );
  }

  const sshOptions = buildSshOptions(remoteSync);
  const remoteRepoDir = remoteSync.targetDir.replaceAll('\\', '/');
  const remoteConfigFile = path.posix.join(remoteRepoDir, 'backup_scripts', 'backup.env');
  const remoteTarget = `${remoteSync.user}@${remoteSync.host}`;

  await execFileAsync('ssh', [...sshOptions, remoteTarget, `mkdir -p '${path.posix.dirname(remoteConfigFile)}'`], {
    cwd: process.cwd(),
  });

  await execFileAsync('scp', [...sshOptions, configFile, `${remoteTarget}:${remoteConfigFile}`], {
    cwd: process.cwd(),
  });

  await execFileAsync(
    'ssh',
    [
      ...sshOptions,
      remoteTarget,
      `cd '${remoteRepoDir}' && BACKUP_CONFIG=./backup_scripts/backup.env bash ./backup_scripts/install-backup-cron.sh`,
    ],
    { cwd: process.cwd() }
  );

  return { applied: true, target: 'remote-db-vm' };
}

async function applyCronLocally(configFile) {
  await execFileAsync('/bin/bash', [INSTALL_CRON_SCRIPT], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BACKUP_CONFIG: configFile,
    },
  });
  return { applied: true, target: 'local-backend' };
}

function validateBackupAutomationInput(input) {
  const enabled = Boolean(input?.enabled);
  const schedule = String(input?.schedule || '').trim();
  const mariadbRetentionDays = Number.parseInt(String(input?.mariadbRetentionDays || ''), 10);
  const mongodbRetentionDays = Number.parseInt(String(input?.mongodbRetentionDays || ''), 10);

  if (!isValidCronExpression(schedule)) {
    throw new Error('Invalid cron expression. Use 5 fields, e.g. 0 */6 * * *');
  }

  if (!Number.isInteger(mariadbRetentionDays) || mariadbRetentionDays < 1 || mariadbRetentionDays > 3650) {
    throw new Error('mariadbRetentionDays must be an integer between 1 and 3650');
  }

  if (!Number.isInteger(mongodbRetentionDays) || mongodbRetentionDays < 1 || mongodbRetentionDays > 3650) {
    throw new Error('mongodbRetentionDays must be an integer between 1 and 3650');
  }

  return {
    enabled,
    schedule,
    mariadbRetentionDays,
    mongodbRetentionDays,
  };
}

async function ensureConfigFileExists() {
  try {
    await fs.access(BACKUP_CONFIG_FILE);
  } catch {
    const examplePath = path.resolve(process.cwd(), 'backup_scripts', 'backup.env.example');
    const template = await fs.readFile(examplePath, 'utf-8');
    await fs.writeFile(BACKUP_CONFIG_FILE, template, 'utf-8');
  }
}

export async function getBackupAutomationConfig() {
  await ensureConfigFileExists();
  const content = await fs.readFile(BACKUP_CONFIG_FILE, 'utf-8');
  const lines = parseEnvLines(content);
  const stats = await fs.stat(BACKUP_CONFIG_FILE);

  return {
    enabled: parseBoolean(getEnvValue(lines, 'BACKUP_AUTOMATION_ENABLED'), true),
    schedule: getEnvValue(lines, 'BACKUP_CRON_SCHEDULE') || '0 */6 * * *',
    mariadbRetentionDays: Number.parseInt(getEnvValue(lines, 'MARIADB_RETENTION_DAYS') || '14', 10),
    mongodbRetentionDays: Number.parseInt(getEnvValue(lines, 'MONGODB_RETENTION_DAYS') || '14', 10),
    configFile: BACKUP_CONFIG_FILE,
    updatedAt: stats.mtime.toISOString(),
  };
}

export async function updateBackupAutomationConfig(input) {
  const { enabled, schedule, mariadbRetentionDays, mongodbRetentionDays } = validateBackupAutomationInput(input);

  await ensureConfigFileExists();
  const content = await fs.readFile(BACKUP_CONFIG_FILE, 'utf-8');
  const lines = parseEnvLines(content);
  const remoteSync = resolveRemoteSyncConfig(lines);

  upsertEnvValue(lines, 'BACKUP_AUTOMATION_ENABLED', enabled ? 'true' : 'false');
  upsertEnvValue(lines, 'BACKUP_CRON_SCHEDULE', schedule);
  upsertEnvValue(lines, 'MARIADB_RETENTION_DAYS', String(mariadbRetentionDays));
  upsertEnvValue(lines, 'MONGODB_RETENTION_DAYS', String(mongodbRetentionDays));

  await fs.writeFile(BACKUP_CONFIG_FILE, `${lines.join('\n').trimEnd()}\n`, 'utf-8');

  let cronApplied = false;
  let cronInstallError = null;
  let cronInstallTarget = null;

  if (remoteSync.enabled) {
    try {
      const syncResult = await syncConfigToRemoteDbVm(BACKUP_CONFIG_FILE, remoteSync);
      cronApplied = syncResult.applied;
      cronInstallTarget = syncResult.target;
    } catch (error) {
      cronInstallError = error instanceof Error ? error.message : String(error);
      console.warn('[backupAutomationService] Remote DB VM sync failed:', cronInstallError);
      throw error;
    }
  } else if (APPLY_CRON_ON_SAVE) {
    try {
      const localResult = await applyCronLocally(BACKUP_CONFIG_FILE);
      cronApplied = localResult.applied;
      cronInstallTarget = localResult.target;
    } catch (error) {
      cronInstallError = error instanceof Error ? error.message : String(error);
      console.warn('[backupAutomationService] Cron install skipped or failed:', cronInstallError);
    }
  }

  const config = await getBackupAutomationConfig();
  return {
    ...config,
    cronApplied,
    cronInstallTarget,
    cronInstallError,
    cronInstallationAttempted: remoteSync.enabled || APPLY_CRON_ON_SAVE,
    remoteSyncEnabled: remoteSync.enabled,
    remoteSyncTargetDir: remoteSync.targetDir,
  };
}

export default {
  getBackupAutomationConfig,
  updateBackupAutomationConfig,
};
