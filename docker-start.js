import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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

function ensureMigrationsApplied() {
  const deployResult = run('pnpm', ['prisma:migrate:deploy']);

  if (deployResult.status === 0) {
    return;
  }

  const output = `${deployResult.stdout || ''}\n${deployResult.stderr || ''}`;
  if (!output.includes('P3005')) {
    exitWithResult(deployResult);
  }

  console.log('Detected a non-empty legacy schema, baselining the latest Prisma migration once...');
  const latestMigrationName = getLatestMigrationName();
  const resolveResult = run('pnpm', ['exec', 'prisma', 'migrate', 'resolve', '--applied', latestMigrationName]);
  if (resolveResult.status !== 0) {
    exitWithResult(resolveResult);
  }

  const secondDeployResult = run('pnpm', ['prisma:migrate:deploy']);
  if (secondDeployResult.status !== 0) {
    exitWithResult(secondDeployResult);
  }
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