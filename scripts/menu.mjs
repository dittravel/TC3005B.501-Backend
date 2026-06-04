#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const root = resolve(import.meta.dirname, '..');
const backupConfigPath = resolve(root, 'backup_scripts', 'backup.env');
const envPath = resolve(root, '.env');

const rl = createInterface({ input, output });

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const env = {};
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    value = value.replace(/^"|"$/g, '');
    env[key] = value;
  }
  return env;
}

function printContext() {
  const backupEnv = parseEnvFile(backupConfigPath);
  const appEnv = parseEnvFile(envPath);

  console.log('\n=== Dittravel Backend Menu ===');
  console.log(`Repo: ${root}`);
  console.log(`backup.env: ${existsSync(backupConfigPath) ? 'found' : 'missing'}`);
  if (existsSync(backupConfigPath)) {
    console.log(`BACKUP_ENVIRONMENT: ${backupEnv.BACKUP_ENVIRONMENT || '(not set)'}`);
    console.log(`MARIADB_SOURCE: ${backupEnv.MARIADB_SOURCE || '(not set)'} | MONGODB_SOURCE: ${backupEnv.MONGODB_SOURCE || '(not set)'}`);
    console.log(`MARIADB_RESTORE_SOURCE: ${backupEnv.MARIADB_RESTORE_SOURCE || '(not set)'} | MONGODB_RESTORE_SOURCE: ${backupEnv.MONGODB_RESTORE_SOURCE || '(not set)'}`);
    console.log(`BACKUP_LOG_FILE: ${backupEnv.BACKUP_LOG_FILE || '(not set)'}`);
  }
  if (existsSync(envPath)) {
    console.log(`NODE_ENV: ${appEnv.NODE_ENV || '(not set)'}`);
    console.log(`DB_HOST: ${appEnv.DB_HOST || '(not set)'} | MONGO_URI: ${appEnv.MONGO_URI || '(not set)'}`);
  }
}

function runPnpmScript(scriptName) {
  console.log(`\nRunning: pnpm run ${scriptName}\n`);
  const result = spawnSync('pnpm', ['run', scriptName], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  return result.status ?? 1;
}

function runShell(command) {
  console.log(`\nRunning: ${command}\n`);
  const result = spawnSync(command, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  return result.status ?? 1;
}

function printLastLogLines(lineCount = 60) {
  const backupEnv = parseEnvFile(backupConfigPath);
  const logPath = backupEnv.BACKUP_LOG_FILE || '/var/backups/dittravel/backup.log';

  if (!existsSync(logPath)) {
    console.log(`\nLog file not found: ${logPath}`);
    console.log('Tip: run a backup first or update BACKUP_LOG_FILE in backup.env.');
    return;
  }

  const content = readFileSync(logPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const slice = lines.slice(Math.max(0, lines.length - lineCount));
  console.log(`\n=== Last ${lineCount} lines from ${logPath} ===`);
  console.log(slice.join('\n'));
}

async function ask(prompt) {
  const answer = await rl.question(prompt);
  return answer.trim();
}

async function pause() {
  await ask('\nPress Enter to continue...');
}

async function chooseMode(scriptPrefix) {
  console.log('\nChoose target mode:');
  console.log('a) devLocal (native backend)');
  console.log('b) devDocker (backend + DB containers in this host)');
  console.log('c) serverDocker (backend-only container, remote DB)');
  console.log('d) serverDockerDB (DB-only host)');
  const m = (await ask('Mode [a/b/c/d]: ')).toLowerCase();

  const map = {
    a: 'devLocal',
    b: 'devDocker',
    c: 'serverDocker',
    d: 'serverDockerDB',
  };

  const mode = map[m];
  if (!mode) {
    console.log('Invalid mode.');
    return;
  }

  if (mode === 'serverDockerDB') {
    console.log('\nWarning: serverDockerDB is for the DB VM only.');
  }

  runPnpmScript(`${scriptPrefix}:${mode}`);
}

async function modeMenu() {
  while (true) {
    console.log('\n--- Mode Switching ---');
    console.log('1) Switch env only (env:*)');
    console.log('2) One-shot mode + compose up (up:*)');
    console.log('b) Back');

    const op = (await ask('Option: ')).toLowerCase();
    if (op === 'b') {
      return;
    }
    if (op === '1') {
      await chooseMode('env');
      await pause();
      continue;
    }
    if (op === '2') {
      await chooseMode('up');
      await pause();
      continue;
    }
    console.log('Invalid option.');
  }
}

async function backupMenu() {
  while (true) {
    console.log('\n--- Backups ---');
    console.log('1) Run backup all (MariaDB + MongoDB)');
    console.log('2) Run backup MariaDB only');
    console.log('3) Run backup MongoDB only');
    console.log('4) Install/update backup cron from backup.env');
    console.log('5) Show backup log (last 60 lines)');
    console.log('6) Show crontab');
    console.log('b) Back');

    const op = (await ask('Option: ')).toLowerCase();
    if (op === 'b') {
      return;
    }

    if (op === '1') runPnpmScript('backup:all');
    else if (op === '2') runPnpmScript('backup:mariadb');
    else if (op === '3') runPnpmScript('backup:mongodb');
    else if (op === '4') runPnpmScript('backup:cron:install');
    else if (op === '5') printLastLogLines(60);
    else if (op === '6') runShell('crontab -l');
    else console.log('Invalid option.');

    await pause();
  }
}

async function recoveryMenu() {
  while (true) {
    console.log('\n--- Recovery (CLI-only) ---');
    console.log('1) Restore all (MariaDB -> MongoDB)');
    console.log('2) Restore MariaDB only');
    console.log('3) Restore MongoDB only');
    console.log('b) Back');

    const op = (await ask('Option: ')).toLowerCase();
    if (op === 'b') {
      return;
    }

    if (op === '1' || op === '2' || op === '3') {
      const confirm = await ask('Type RESTORE to continue: ');
      if (confirm !== 'RESTORE') {
        console.log('Recovery cancelled.');
        await pause();
        continue;
      }
    }

    if (op === '1') runPnpmScript('restore:all');
    else if (op === '2') runPnpmScript('restore:mariadb');
    else if (op === '3') runPnpmScript('restore:mongodb');
    else console.log('Invalid option.');

    await pause();
  }
}

async function quickMenu() {
  while (true) {
    console.log('\n--- Quick Commands ---');
    console.log('1) docker compose ps');
    console.log('2) docker compose logs -f backend');
    console.log('3) Backend tests (pnpm test)');
    console.log('4) Prisma migrate deploy (local)');
    console.log('b) Back');

    const op = (await ask('Option: ')).toLowerCase();
    if (op === 'b') {
      return;
    }

    if (op === '1') runShell('docker compose ps');
    else if (op === '2') runShell('docker compose logs -f backend');
    else if (op === '3') runPnpmScript('test');
    else if (op === '4') runPnpmScript('prisma:migrate:deploy');
    else console.log('Invalid option.');

    await pause();
  }
}

function ensureBackupConfigExists() {
  if (existsSync(backupConfigPath)) {
    return;
  }

  const examplePath = resolve(root, 'backup_scripts', 'backup.env.example');
  if (existsSync(examplePath)) {
    copyFileSync(examplePath, backupConfigPath);
    console.log(`Created backup config from example: ${backupConfigPath}`);
  } else {
    console.log('backup.env.example not found. Could not create backup.env automatically.');
  }
}

async function setupBackendVmFlow() {
  console.log('\nApplying backend VM mode (serverDocker)...');
  runPnpmScript('up:serverDocker');

  const migrate = (await ask('Run Prisma migrate deploy now? [y/N]: ')).toLowerCase();
  if (migrate === 'y') {
    runShell('docker compose exec -T backend npx prisma migrate deploy');
  }

  console.log('\nBackend VM setup complete.');
  console.log('Next checks:');
  console.log('- docker compose ps');
  console.log('- docker compose logs -f backend');
}

async function setupDbVmFlow() {
  console.log('\nApplying DB VM mode (serverDockerDB)...');
  runPnpmScript('up:serverDockerDB');

  ensureBackupConfigExists();
  runShell('bash -lc "chmod +x backup_scripts/backup-mariadb.sh backup_scripts/mongodb_backup.sh backup_scripts/backup-all.sh backup_scripts/install-backup-cron.sh backup_scripts/restore-mariadb.sh backup_scripts/restore-mongodb.sh backup_scripts/restore-all.sh"');

  console.log('\nInstalling/updating backup cron automatically...');
  runPnpmScript('backup:cron:install');

  console.log('\nDB VM setup complete.');
  console.log('Next checks:');
  console.log('- docker compose ps');
  console.log('- crontab -l');
  console.log('- pnpm run backup:all');
}

async function setupMenu() {
  while (true) {
    console.log('\n--- Initial Setup Wizard (Flow B) ---');
    console.log('1) Bootstrap server dependencies (git, docker, node, pnpm)');
    console.log('2) Setup this machine as Backend VM (serverDocker)');
    console.log('3) Setup this machine as DB VM (serverDockerDB + backups)');
    console.log('4) Create backup.env from example (if missing)');
    console.log('b) Back');

    const op = (await ask('Option: ')).toLowerCase();
    if (op === 'b') {
      return;
    }

    if (op === '1') {
      runPnpmScript('bootstrap:server');
      await pause();
      continue;
    }

    if (op === '2') {
      await setupBackendVmFlow();
      await pause();
      continue;
    }

    if (op === '3') {
      await setupDbVmFlow();
      await pause();
      continue;
    }

    if (op === '4') {
      ensureBackupConfigExists();
      await pause();
      continue;
    }

    console.log('Invalid option.');
  }
}

async function main() {
  while (true) {
    printContext();
    console.log('\nMain Menu');
    console.log('0) Initial setup wizard (Flow B)');
    console.log('1) Mode switching');
    console.log('2) Backups');
    console.log('3) Recovery');
    console.log('4) Quick commands');
    console.log('q) Quit');

    const option = (await ask('Select option: ')).toLowerCase();

    if (option === 'q') {
      break;
    }
    if (option === '0') {
      await setupMenu();
      continue;
    }
    if (option === '1') {
      await modeMenu();
      continue;
    }
    if (option === '2') {
      await backupMenu();
      continue;
    }
    if (option === '3') {
      await recoveryMenu();
      continue;
    }
    if (option === '4') {
      await quickMenu();
      continue;
    }

    console.log('Invalid option.');
  }

  rl.close();
  console.log('\nBye.');
}

try {
  await main();
} catch (error) {
  console.error(error);
  rl.close();
  process.exit(1);
}
