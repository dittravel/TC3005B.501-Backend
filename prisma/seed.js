/**
 * Empty Seed
 *
 * Seeds the canonical reference data required by the application and creates
 * a single admin account with username "admin" and password "admin123".
 */

import { pathToFileURL } from 'node:url';
import { prisma } from '../lib/prisma.js';
import { seedAdminAccount, seedReferenceData } from './seedShared.js';

export async function seedEmptyDatabase() {
  console.log('Creating base Prisma data and admin account...');
  await seedReferenceData(prisma);
  await seedAdminAccount(prisma);
  console.log('Base Prisma data created');
}

async function main() {
  console.log('Starting empty Prisma seed...');
  try {
    await seedEmptyDatabase();
    console.log('\nEmpty seed completed successfully!');
  } catch (error) {
    console.error('Error during empty seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
