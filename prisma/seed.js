/**
 * Base Seed
 *
 * Seeds the canonical reference data required by the application and creates
 * a single admin account with username "admin" and password "admin123".
 */

import { pathToFileURL } from 'node:url';
import { prisma } from '../lib/prisma.js';
import {
  seedAdmin,
  seedReferenceData,
  seedSuperadmin,
  seedCurrencies,
  seedCountriesAndCities,
  seedReceiptTypes,
  seedTaxes,
} from './seedShared.js';

/**
 * Create default SocietyGroup and Society
 * @returns {Promise<number>} The ID of the default SocietyGroup created or found.
 * @throws Will throw an error if there is an issue creating or finding the default SocietyGroup or Society.
 */
async function seedDefaultSocietyGroupAndSociety() {
  // Create default society group
  const defaultGroup = await prisma.societyGroup.create({
    data: {
      description: 'Grupo Default',
      is_default: true
    },
  });

  // Create default society
  const defaultSociety = await prisma.society.create({
    data: {
      description: 'Sociedad Default',
      local_currency: 'MXN',
      society_group_id: defaultGroup.id,
      is_default: true,
    },
  });

  return {
    defaultSocietyGroupId: defaultGroup.id,
    defaultSocietyId: defaultSociety.id,
  }
}

/**
 * Create default authorization rule for the default society
 */
async function seedDefaultAuthRule(defaultSocietyId) {
  await prisma.authorizationRule.create({
    data: {
      rule_name: 'Regla por Defecto',
      is_default: true,
      num_levels: 2,
      automatic: true,
      travel_type: 'Todos',
      society_id: defaultSocietyId,
    },
  });
}

/**
 * Create default refund policy for the default society
 */
async function seedDefaultRefundPolicy(defaultSocietyId) {
  await prisma.refundPolicy.create({
    data: {
      policy_name: 'Política por Defecto',
      min_amount: 10,
      max_amount: 5000,
      submission_deadline_days: 30,
      society_id: defaultSocietyId,
      is_default: true,
      active: true,
    },
  });
}

/**
 * Seed the database with base data
 * @returns {Promise<void>} Resolves when seeding is complete.
 * @throws Will throw an error if there is an issue during the seeding process.
 */
export async function seedBaseData() {
  const {
    defaultSocietyGroupId,
    defaultSocietyId
  } = await seedDefaultSocietyGroupAndSociety();
  await seedReferenceData(prisma, defaultSocietyId);
  await seedCountriesAndCities(prisma);
  await seedDefaultAuthRule(defaultSocietyId);
  await seedDefaultRefundPolicy(defaultSocietyId);
  await seedCurrencies(prisma);
  await seedAdmin(prisma, defaultSocietyId);
  await seedSuperadmin(prisma, defaultSocietyId);
  await seedReceiptTypes(prisma);
  await seedTaxes(prisma);
}

// Main function to run the seed
async function main() {
  console.log('Starting base data seed...');
  try {
    await seedBaseData();
    console.log('\nBase data created successfully!');
  } catch (error) {
    console.error('Error during base seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Check if the script is being run directly and execute the main function if so
const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
