import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MAX_MIGRATE_DEPLOY_ATTEMPTS = 30;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    shell: false,
    ...options,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result;
}

function getLatestMigrationName() {
  const migrationsDir = path.resolve(process.cwd(), 'prisma/migrations');
  const migrationNames = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (migrationNames.length === 0) {
    throw new Error('No Prisma migrations found to baseline');
  }

  return migrationNames[migrationNames.length - 1];
}

function exitWithResult(result) {
  process.exit(result.status ?? 1);
}

function extractFailedMigrationName(output) {
  const quotedMatch = output.match(/The `([^`]+)` migration started/);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = output.match(/The\s+([^\s]+)\s+migration started/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return null;
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function recoverFromP3005() {
  console.log('Detected a non-empty legacy schema (P3005), baselining the latest Prisma migration once...');
  const latestMigrationName = getLatestMigrationName();
  const resolveResult = run('pnpm', ['exec', 'prisma', 'migrate', 'resolve', '--applied', latestMigrationName]);
  if (resolveResult.status !== 0) {
    exitWithResult(resolveResult);
  }
}

function recoverFromP3009(output) {
  const failedMigrationName = extractFailedMigrationName(output);
  if (!failedMigrationName) {
    console.error('Detected P3009 but could not determine the failed migration name from output.');
    return false;
  }

  console.log(`Detected failed Prisma migration ${failedMigrationName} (P3009), marking it as rolled back...`);
  const resolveRolledBackResult = run('pnpm', [
    'exec',
    'prisma',
    'migrate',
    'resolve',
    '--rolled-back',
    failedMigrationName,
  ]);

  if (resolveRolledBackResult.status !== 0) {
    exitWithResult(resolveRolledBackResult);
  }

  return true;
}

function ensureMigrationsApplied() {
  for (let attempt = 1; attempt <= MAX_MIGRATE_DEPLOY_ATTEMPTS; attempt += 1) {
    const deployResult = run('pnpm', ['prisma:migrate:deploy']);

    if (deployResult.status === 0) {
      return;
    }

    const output = `${deployResult.stdout || ''}\n${deployResult.stderr || ''}`;

    if (output.includes('P3005')) {
      recoverFromP3005();
    } else if (output.includes('P3009')) {
      const recovered = recoverFromP3009(output);
      if (!recovered) {
        exitWithResult(deployResult);
      }
    } else {
      exitWithResult(deployResult);
    }

    if (attempt < MAX_MIGRATE_DEPLOY_ATTEMPTS) {
      console.log(`Retrying prisma migrate deploy (${attempt + 1}/${MAX_MIGRATE_DEPLOY_ATTEMPTS})...`);
      sleepMs(1000);
    }
  }

  console.error(`Unable to apply Prisma migrations after ${MAX_MIGRATE_DEPLOY_ATTEMPTS} attempts.`);
  process.exit(1);
}

function main() {
  const generateResult = run('pnpm', ['prisma:generate']);
  if (generateResult.status !== 0) {
    exitWithResult(generateResult);
  }

  ensureMigrationsApplied();

  const serverResult = run('node', ['index.js']);
  exitWithResult(serverResult);
}

main();