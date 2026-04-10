/**
 * Empty Seed
 *
 * Seeds the canonical reference data required by the application and creates
 * a single admin account with username "admin" and password "admin123".
 */

import { pathToFileURL } from 'node:url';
import { prisma } from '../lib/prisma.js';
import { seedAdminAccount, seedReferenceData } from './seedShared.js';

const CURRENCY_CATALOG = [
  { currency_code: 'MXN', currency_name: 'Peso Mexicano', country: 'Mexico', banxico_series_id: null, frequency: 'daily' },
  { currency_code: 'USD', currency_name: 'Dolar Estadounidense', country: 'Estados Unidos', banxico_series_id: 'SF43718', frequency: 'daily' },
  { currency_code: 'EUR', currency_name: 'Euro', country: 'Union Monetaria Europea', banxico_series_id: 'SF46410', frequency: 'daily' },
  { currency_code: 'CAD', currency_name: 'Dolar Canadiense', country: 'Canada', banxico_series_id: 'SF60632', frequency: 'daily' },
  { currency_code: 'JPY', currency_name: 'Yen Japones', country: 'Japon', banxico_series_id: 'SF46406', frequency: 'daily' },
  { currency_code: 'GBP', currency_name: 'Libra Esterlina', country: 'Gran Bretana', banxico_series_id: 'SF57815', frequency: 'monthly' },
  { currency_code: 'CHF', currency_name: 'Franco Suizo', country: 'Suiza', banxico_series_id: 'SF57905', frequency: 'monthly' },
  { currency_code: 'CNY', currency_name: 'Yuan Chino Continental', country: 'China', banxico_series_id: 'SF57773', frequency: 'monthly' },
  { currency_code: 'AUD', currency_name: 'Dolar Australiano', country: 'Australia', banxico_series_id: 'SF57753', frequency: 'monthly' },
  { currency_code: 'BRL', currency_name: 'Real Brasileno', country: 'Brasil', banxico_series_id: 'SF57765', frequency: 'monthly' },
  { currency_code: 'ARS', currency_name: 'Peso Argentino', country: 'Argentina', banxico_series_id: 'SF57731', frequency: 'monthly' },
  { currency_code: 'CLP', currency_name: 'Peso Chileno', country: 'Chile', banxico_series_id: 'SF57751', frequency: 'monthly' },
  { currency_code: 'COP', currency_name: 'Peso Colombiano', country: 'Colombia', banxico_series_id: 'SF57775', frequency: 'monthly' },
  { currency_code: 'PEN', currency_name: 'Sol Peruano', country: 'Peru', banxico_series_id: 'SF57875', frequency: 'monthly' },
  { currency_code: 'INR', currency_name: 'Rupia India', country: 'India', banxico_series_id: 'SF57829', frequency: 'monthly' },
];

async function seedDefaultAuthorizationRule() {
  const existingDefault = await prisma.authorizationRule.findFirst({
    where: { is_default: true },
    select: { rule_id: true },
  });

  if (existingDefault) {
    return;
  }

  const rule = await prisma.authorizationRule.create({
    data: {
      rule_name: 'Regla predeterminada',
      is_default: true,
      num_levels: 2,
      automatic: true,
      travel_type: 'Todos',
    },
  });
}

async function seedCurrencyCatalog() {
  for (const currency of CURRENCY_CATALOG) {
    await prisma.currency.upsert({
      where: { currency_code: currency.currency_code },
      create: currency,
      update: {
        currency_name: currency.currency_name,
        country: currency.country,
        banxico_series_id: currency.banxico_series_id,
        frequency: currency.frequency,
        active: true,
      },
    });
  }
}

export async function seedEmptyDatabase() {
  console.log('Creating base Prisma data and admin account...');
  await seedReferenceData(prisma);
  await seedDefaultAuthorizationRule();
  await seedCurrencyCatalog();
  await seedAdminAccount(prisma);
  console.log('Base Prisma data created');
}

export const seedPrepopulate = seedEmptyDatabase;

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
