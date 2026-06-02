#!/usr/bin/env node
/**
 * One-shot launcher: ensures .env exists, then delegates to switch-env.sh which
 * patches .env, regenerates docker-compose.yml, and runs `docker compose up -d`.
 *
 * Usage:
 *   node scripts/up.mjs <devLocal|devDocker|serverDocker|serverDockerDB>
 *
 * Cross-platform: locates bash via PATH (Linux/macOS native, Windows Git Bash / WSL).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MODES = ['devLocal', 'devDocker', 'serverDocker', 'serverDockerDB'];
const mode = process.argv[2];

if (!MODES.includes(mode)) {
  console.error(`Usage: node scripts/up.mjs <${MODES.join('|')}>`);
  process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
const envPath = resolve(root, '.env');

if (!existsSync(envPath)) {
  const example = mode === 'devLocal' ? '.env.local.example' : '.env.docker.example';
  const examplePath = resolve(root, example);
  if (!existsSync(examplePath)) {
    console.error(`No .env and no ${example} to bootstrap from.`);
    process.exit(1);
  }
  copyFileSync(examplePath, envPath);
  console.log(`Bootstrapped .env from ${example}. Fill in secrets before running again if needed.`);
}

const result = spawnSync('bash', ['switch-env.sh', mode], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error('Failed to invoke bash. On Windows install Git Bash or WSL.');
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
