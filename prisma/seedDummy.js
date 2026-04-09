/**
 * Dummy Data Seed
 *
 * Seeds the shared base data and then adds the dummy dataset used for local
 * development and testing.
 */

import { pathToFileURL } from 'node:url';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import {
  ADMIN_COST_CENTER_NAME,
  ADMIN_DEPARTMENT_NAME,
  encryptSeedValue,
  loadDummyUsersFromCsv,
  seedAdminAccount,
  seedReferenceData,
} from './seedShared.js';

const COST_CENTER_NAMES = [
  'CC-001',
  'CC-002',
  'CC-003',
  'CC-004',
  'CC-005',
  'CC-006',
  ADMIN_COST_CENTER_NAME,
];

const DEPARTMENT_NAMES = [
  { name: 'Finanzas', costCenter: 'CC-001', active: true },
  { name: 'Recursos Humanos', costCenter: 'CC-002', active: true },
  { name: 'Tecnología', costCenter: 'CC-003', active: true },
  { name: 'Marketing', costCenter: 'CC-004', active: true },
  { name: 'Operaciones', costCenter: 'CC-005', active: false },
  { name: ADMIN_DEPARTMENT_NAME, costCenter: ADMIN_COST_CENTER_NAME, active: true },
];

const COUNTRIES = [
  'México',
  'Estados Unidos',
  'Canadá',
  'Brásil',
  'Argentina',
  'Chile',
  'Colombia',
  'España',
  'Francia',
  'Reino Unido',
  'Alemania',
  'Italia',
  'Japón',
  'China',
  'India',
];

const CITIES = [
  'CDMX',
  'Guadalajara',
  'Monterrey',
  'Cancún',
  'Mérida',
  'Nueva York',
  'Los Ángeles',
  'San Francisco',
  'Chicago',
  'Las Vegas',
  'Toronto',
  'Vancouver',
  'Rio de Janeiro',
  'Sao Paulo',
  'Buenos Aires',
  'Cordoba',
  'Santiago',
  'Valparaíso',
  'Bogotá',
  'Madrid',
  'Barcelona',
];

async function seedDummyCostCenters() {
  console.log('Creating dummy cost centers...');
  for (const cost_center_name of COST_CENTER_NAMES) {
    await prisma.costCenter.upsert({
      where: { cost_center_name },
      create: { cost_center_name },
      update: { cost_center_name },
    });
  }
}

async function seedDummyDepartments() {
  console.log('Creating dummy departments...');
  for (const department of DEPARTMENT_NAMES) {
    const costCenter = await prisma.costCenter.findUnique({
      where: { cost_center_name: department.costCenter },
      select: { cost_center_id: true },
    });

    if (!costCenter) {
      throw new Error(`Missing cost center ${department.costCenter}`);
    }

    await prisma.department.upsert({
      where: { department_name: department.name },
      create: {
        department_name: department.name,
        cost_center_id: costCenter.cost_center_id,
        active: department.active,
      },
      update: {
        cost_center_id: costCenter.cost_center_id,
        active: department.active,
      },
    });
  }
}

async function seedDummyCountries() {
  console.log('Creating dummy countries...');
  for (const country_name of COUNTRIES) {
    await prisma.country.upsert({
      where: { country_name },
      create: { country_name },
      update: { country_name },
    });
  }
}

async function seedDummyCities() {
  console.log('Creating dummy cities...');
  for (const city_name of CITIES) {
    await prisma.city.upsert({
      where: { city_name },
      create: { city_name },
      update: { city_name },
    });
  }
}

async function seedDummyUsers() {
  console.log('Creating dummy users from CSV...');
  const usersData = loadDummyUsersFromCsv();
  const rowToUserId = new Map();

  for (const [index, userData] of usersData.entries()) {

    const role = await prisma.role.findUnique({
      where: { role_name: userData.role_name },
      select: { role_id: true },
    });
    const department = await prisma.department.findUnique({
      where: { department_name: userData.department_name },
      select: { department_id: true },
    });

    if (!role || !department) {
      throw new Error(`Missing role or department for user ${userData.user_name}`);
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const encryptedEmail = encryptSeedValue(userData.email);
    const encryptedPhoneNumber = userData.phone_number ? encryptSeedValue(userData.phone_number) : null;

    const user = await prisma.user.upsert({
      where: { user_name: userData.user_name },
      create: {
        user_name: userData.user_name,
        password: hashedPassword,
        workstation: userData.workstation,
        email: encryptedEmail,
        phone_number: encryptedPhoneNumber,
        role_id: role.role_id,
        department_id: department.department_id,
        boss_id: null,
        active: true,
      },
      update: {
        password: hashedPassword,
        workstation: userData.workstation,
        email: encryptedEmail,
        phone_number: encryptedPhoneNumber,
        role_id: role.role_id,
        department_id: department.department_id,
        active: true,
      },
      select: {
        user_id: true,
      },
    });

    rowToUserId.set(index + 1, user.user_id);
  }

  for (const userData of usersData) {
    if (!userData.boss_id) {
      continue;
    }

    const bossUserId = rowToUserId.get(userData.boss_id);
    if (!bossUserId) {
      throw new Error(`Missing boss reference ${userData.boss_id} for user ${userData.user_name}`);
    }

    await prisma.user.update({
      where: { user_name: userData.user_name },
      data: { boss_id: bossUserId },
    });
  }

  console.log(`Created or updated ${usersData.length} dummy users`);
}

async function seedDummyLocationsAndUsers() {
  await seedDummyCostCenters();
  await seedDummyDepartments();
  await seedDummyCountries();
  await seedDummyCities();
  await seedDummyUsers();
}

async function main() {
  console.log('Starting dummy Prisma seed...');

  try {
    await seedReferenceData(prisma);
    await seedAdminAccount(prisma);
    await seedDummyLocationsAndUsers();

    console.log('\nSeed with dummy data completed successfully!');
  } catch (error) {
    console.error('Error during dummy seed:', error);
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
