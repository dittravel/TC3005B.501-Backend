import fs from 'node:fs';
import path from 'node:path';

const mode = process.argv[2];
const root = process.cwd();
const envPath = path.join(root, '.env');

const sourceByMode = {
  local: '.env.local',
  docker: '.env.docker',
};

if (!mode || !sourceByMode[mode]) {
  console.error('Usage: node scripts/switch-env.js <local|docker>');
  process.exit(1);
}

const sourcePath = path.join(root, sourceByMode[mode]);
if (!fs.existsSync(sourcePath)) {
  console.error(`Missing source profile: ${sourceByMode[mode]}`);
  process.exit(1);
}

fs.copyFileSync(sourcePath, envPath);
console.log(`Activated ${mode} profile from ${sourceByMode[mode]}`);
console.log('Profile copied into .env successfully.');
