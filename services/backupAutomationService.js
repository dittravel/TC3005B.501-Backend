import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const BACKUP_CONFIG_FILE =
  process.env.BACKUP_CONFIG_FILE ||
  path.resolve(process.cwd(), 'backup_scripts', 'backup.env');

const INSTALL_CRON_SCRIPT =
  process.env.BACKUP_INSTALL_CRON_SCRIPT ||
  path.resolve(process.cwd(), 'backup_scripts', 'install-backup-cron.sh');

function parseEnvLines(content) {
  return content.split(/\r?\n/);
}

function getEnvValue(lines, key) {
  const line = lines.find((entry) => entry.startsWith(`${key}=`));
  if (!line) return '';
  return line.slice(key.length + 1).trim();
}

function upsertEnvValue(lines, key, value) {
  const expected = `${key}=${value}`;
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

  await ensureConfigFileExists();
  const content = await fs.readFile(BACKUP_CONFIG_FILE, 'utf-8');
  const lines = parseEnvLines(content);

  upsertEnvValue(lines, 'BACKUP_AUTOMATION_ENABLED', enabled ? 'true' : 'false');
  upsertEnvValue(lines, 'BACKUP_CRON_SCHEDULE', schedule);
  upsertEnvValue(lines, 'MARIADB_RETENTION_DAYS', String(mariadbRetentionDays));
  upsertEnvValue(lines, 'MONGODB_RETENTION_DAYS', String(mongodbRetentionDays));

  await fs.writeFile(BACKUP_CONFIG_FILE, `${lines.join('\n').trimEnd()}\n`, 'utf-8');

  await execFileAsync('bash', [INSTALL_CRON_SCRIPT], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BACKUP_CONFIG: BACKUP_CONFIG_FILE,
    },
  });

  return getBackupAutomationConfig();
}

export default {
  getBackupAutomationConfig,
  updateBackupAutomationConfig,
};
