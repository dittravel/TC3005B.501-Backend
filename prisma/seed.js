/**
 * Empty Seed
 *
 * Seeds the canonical reference data required by the application and creates
 * a single admin account with username "admin" and password "admin123".
 */

import { pathToFileURL } from 'node:url';
import { prisma } from '../lib/prisma.js';
import { seedAdminAccount, seedReferenceData, seedSuperAdminAccount } from './seedShared.js';

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

const CITY_CATALOG = [
  { city_name: 'CDMX',          iata_code: 'MEX' },
  { city_name: 'Guadalajara',   iata_code: 'GDL' },
  { city_name: 'Monterrey',     iata_code: 'MTY' },
  { city_name: 'Cancún',        iata_code: 'CUN' },
  { city_name: 'Mérida',        iata_code: 'MID' },
  { city_name: 'Nueva York',    iata_code: 'JFK' },
  { city_name: 'Los Ángeles',   iata_code: 'LAX' },
  { city_name: 'San Francisco', iata_code: 'SFO' },
  { city_name: 'Chicago',       iata_code: 'ORD' },
  { city_name: 'Las Vegas',     iata_code: 'LAS' },
  { city_name: 'Toronto',       iata_code: 'YYZ' },
  { city_name: 'Vancouver',     iata_code: 'YVR' },
  { city_name: 'Rio de Janeiro',iata_code: 'GIG' },
  { city_name: 'Sao Paulo',     iata_code: 'GRU' },
  { city_name: 'Buenos Aires',  iata_code: 'EZE' },
  { city_name: 'Cordoba',       iata_code: 'COR' },
  { city_name: 'Santiago',      iata_code: 'SCL' },
  { city_name: 'Valparaíso',    iata_code: 'SCL' },
  { city_name: 'Bogotá',        iata_code: 'BOG' },
  { city_name: 'Barranquilla',  iata_code: 'BAQ' },
  { city_name: 'Madrid',        iata_code: 'MAD' },
  { city_name: 'Barcelona',     iata_code: 'BCN' },
  { city_name: 'Paris',         iata_code: 'CDG' },
  { city_name: 'Lyon',          iata_code: 'LYS' },
  { city_name: 'Londres',       iata_code: 'LHR' },
  { city_name: 'Manchester',    iata_code: 'MAN' },
  { city_name: 'Berlín',        iata_code: 'BER' },
  { city_name: 'Munich',        iata_code: 'MUC' },
  { city_name: 'Roma',          iata_code: 'FCO' },
  { city_name: 'Venecia',       iata_code: 'VCE' },
  { city_name: 'Tokyo',         iata_code: 'NRT' },
  { city_name: 'Kyoto',         iata_code: 'ITM' },
  { city_name: 'Pekín',         iata_code: 'PEK' },
  { city_name: 'Hong Kong',     iata_code: 'HKG' },
  { city_name: 'Bombay',        iata_code: 'BOM' },
  { city_name: 'Nueva Delhi',   iata_code: 'DEL' },
];

async function seedDefaultSocietyGroupAndSociety() {
  // Create default SocietyGroup
  const existingGroup = await prisma.societyGroup.findFirst({
    where: { is_default: true },
    select: { id: true },
  });

  let defaultSocietyGroupId;
  if (existingGroup) {
    defaultSocietyGroupId = existingGroup.id;
  } else {
    const group = await prisma.societyGroup.create({
      data: { description: 'Default', is_default: true },
    });
    defaultSocietyGroupId = group.id;
  }

  // Create default Society
  const existingSociety = await prisma.society.findFirst({
    where: {
      is_default: true,
      society_group_id: defaultSocietyGroupId
    },
    select: { id: true },
  });

  if (!existingSociety) {
    await prisma.society.create({
      data: {
        description: 'Default',
        local_currency: 'MXN',
        society_group_id: defaultSocietyGroupId,
        is_default: true,
      },
    });
  }

  return defaultSocietyGroupId;
}

async function seedDefaultAuthorizationRule(defaultSocietyGroupId) {
  const existingDefault = await prisma.authorizationRule.findFirst({
    where: { is_default: true },
    select: { rule_id: true },
  });

  if (existingDefault) {
    return;
  }

  // Get the default society ID
  const defaultSociety = await prisma.society.findFirst({
    where: { is_default: true },
    select: { id: true },
  });

  if (!defaultSociety) {
    throw new Error('Default society not found');
  }

  await prisma.authorizationRule.create({
    data: {
      rule_name: 'Regla predeterminada',
      is_default: true,
      num_levels: 2,
      automatic: true,
      travel_type: 'Todos',
      society_id: defaultSociety.id,
    },
  });
}

async function seedDefaultRefundPolicy(defaultSocietyGroupId) {
  const existingDefault = await prisma.refundPolicy.findFirst({
    where: { is_default: true },
    select: { policy_id: true },
  });

  if (existingDefault) {
    return;
  }

  // Get the default society ID
  const defaultSociety = await prisma.society.findFirst({
    where: { is_default: true },
    select: { id: true },
  });

  if (!defaultSociety) {
    throw new Error('Default society not found');
  }

  await prisma.refundPolicy.create({
    data: {
      policy_name: 'Política por Defecto',
      min_amount: 10,
      max_amount: 5000,
      submission_deadline_days: 30,
      society_id: defaultSociety.id,
      is_default: true,
      active: true,
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

async function seedCityCatalog() {
  for (const city of CITY_CATALOG) {
    await prisma.city.upsert({
      where: { city_name: city.city_name },
      create: { city_name: city.city_name, iata_code: city.iata_code },
      update: { iata_code: city.iata_code },
    });
  }
}

export async function seedEmptyDatabase() {
  console.log('Creating base Prisma data and admin account...');
  const defaultSocietyGroupId = await seedDefaultSocietyGroupAndSociety();
  await seedReferenceData(prisma, defaultSocietyGroupId);
  await seedCityCatalog();
  await seedDefaultAuthorizationRule(defaultSocietyGroupId);
  await seedDefaultRefundPolicy(defaultSocietyGroupId);
  await seedCurrencyCatalog();
  await seedAdminAccount(prisma, defaultSocietyGroupId);
  await seedSuperAdminAccount(prisma, defaultSocietyGroupId);
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
