/**
 * Dummy Data Seed
 *
 * Seeds the shared base data and then adds the dummy dataset used for local
 * development and testing.
 */

import { pathToFileURL } from 'node:url';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { seedEmptyDatabase } from './seed.js';
import {
  ADMIN_COST_CENTER_NAME,
  ADMIN_DEPARTMENT_NAME,
  encryptSeedValue,
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
  'Paris',
  'Lyon',
  'Londres',
  'Manchester',
  'Berlín',
  'Munich',
  'Roma',
  'Venecia',
  'Tokyo',
  'Kyoto',
  'Pekín',
  'Hong Kong',
  'Bombay',
  'Nueva Delhi',
];

const DUMMY_USERS = [
  {
    role_name: 'Autorizador',
    department_name: 'Finanzas',
    user_name: 'laura.flores',
    password: '123',
    workstation: 'WS104',
    email: 'laura.flores@empresa.com',
    phone_number: '555-1004',
    boss_user_name: null,
  },
  {
    role_name: 'Autorizador',
    department_name: 'Finanzas',
    user_name: 'diego.hernandez',
    password: '123',
    workstation: 'WS105',
    email: 'diego.hernandez@empresa.com',
    phone_number: '555-1005',
    boss_user_name: 'laura.flores',
  },
  {
    role_name: 'Solicitante',
    department_name: 'Finanzas',
    user_name: 'andres.gomez',
    password: '123',
    workstation: 'WS101',
    email: 'andres.gomez@empresa.com',
    phone_number: '555-1001',
    boss_user_name: 'diego.hernandez',
  },
  {
    role_name: 'Agencia de viajes',
    department_name: 'Finanzas',
    user_name: 'paula.martinez',
    password: '123',
    workstation: 'WS102',
    email: 'paula.martinez@empresa.com',
    phone_number: '555-1002',
    boss_user_name: null,
  },
  {
    role_name: 'Cuentas por pagar',
    department_name: 'Finanzas',
    user_name: 'carlos.ramos',
    password: '123',
    workstation: 'WS103',
    email: 'carlos.ramos@empresa.com',
    phone_number: '555-1003',
    boss_user_name: null,
  },
  {
    role_name: 'Administrador',
    department_name: 'Admin',
    user_name: 'admin',
    password: '123',
    workstation: 'WS000',
    email: 'admin@empresa.com',
    phone_number: '555-0000',
    boss_user_name: null,
  },
];

const ACCOUNTS = [
  { account_code: '1000', account_name: 'Caja',          account_type: 'Activo' },
  { account_code: '1001', account_name: 'Bancos',        account_type: 'Activo' },
  { account_code: '2000', account_name: 'Proveedores',   account_type: 'Pasivo' },
  { account_code: '3000', account_name: 'Gastos de Viaje',       account_type: 'Gasto' },
  { account_code: '3001', account_name: 'Gastos de Alimentación', account_type: 'Gasto' },
  { account_code: '3002', account_name: 'Gastos de Transporte',  account_type: 'Gasto' },
];

const RECEIPT_TYPES = [
  { receipt_type_name: 'Hotel' },
  { receipt_type_name: 'Alimentos' },
  { receipt_type_name: 'Taxi' },
  { receipt_type_name: 'Hospedaje' },
];

const TAXES = [
  { tax_code: 'IVA16',  tax_name: 'IVA 16%',          tax_rate: 0.1600 },
  { tax_code: 'EXENTO', tax_name: 'Exento de Impuestos', tax_rate: 0.0000 },
];

// Mapeo de Receipt Type → Account Code
const RECEIPT_TYPE_TO_ACCOUNT = {
  'Hotel':      '3000',   // Gastos de Viaje
  'Alimentos':  '3001',   // Gastos de Alimentación
  'Taxi':       '3002',   // Gastos de Transporte
  'Hospedaje':  '3000',   // Gastos de Viaje
};


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
  console.log('Creating hardcoded dummy users...');

  for (const userData of DUMMY_USERS) {

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

    await prisma.user.upsert({
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
    });
  }

  for (const userData of DUMMY_USERS) {
    if (!userData.boss_user_name) {
      continue;
    }

    const boss = await prisma.user.findUnique({
      where: { user_name: userData.boss_user_name },
      select: { user_id: true },
    });

    if (!boss) {
      throw new Error(`Missing boss reference ${userData.boss_user_name} for user ${userData.user_name}`);
    }

    await prisma.user.update({
      where: { user_name: userData.user_name },
      data: { boss_id: boss.user_id },
    });
  }

  console.log(`Created or updated ${DUMMY_USERS.length} dummy users`);
}

async function seedDummyTravelFixtures() {
  const hasRequests = await prisma.request.count();
  if (hasRequests > 0) {
    console.log('Skipping dummy travel fixtures because requests already exist');
    return;
  }

  const requester = await prisma.user.findUnique({
    where: { user_name: 'andres.gomez' },
    select: { user_id: true },
  });
  const authorizer = await prisma.user.findUnique({
    where: { user_name: 'diego.hernandez' },
    select: { user_id: true },
  });
  const agency = await prisma.user.findUnique({
    where: { user_name: 'paula.martinez' },
    select: { user_id: true },
  });
  const accountsPayable = await prisma.user.findUnique({
    where: { user_name: 'carlos.ramos' },
    select: { user_id: true },
  });

  if (!requester || !authorizer || !agency || !accountsPayable) {
    console.warn('Skipping dummy travel fixtures because required users are missing');
    return;
  }

  const statusNames = [
    'Borrador',
    'Revision',
    'Cotizacion del Viaje',
    'Atencion Agencia de Viajes',
    'Comprobacion gastos del viaje',
    'Validacion de comprobantes',
    'Finalizado',
    'Cancelado',
    'Rechazado',
  ];

  const statuses = await prisma.request_status.findMany({
    select: { request_status_id: true, status: true },
  });

  const statusMap = new Map(statuses.map((s) => [s.status.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), s.request_status_id]));

  for (const requiredStatus of statusNames) {
    if (!statusMap.has(requiredStatus)) {
      console.warn(`Skipping dummy travel fixtures because status is missing: ${requiredStatus}`);
      return;
    }
  }

  const requestsData = [
    { notes: 'Solicito viaticos para viaje a conferencia en Barcelona.', requested_fee: 1500.0, imposed_fee: null, request_days: 3.0, status: 'Borrador', assigned_to: null },
    { notes: 'Reembolso por gastos medicos durante viaje.', requested_fee: 800.0, imposed_fee: null, request_days: 1.0, status: 'Revision', assigned_to: authorizer.user_id },
    { notes: 'Solicitud de apoyo economico para capacitacion online.', requested_fee: 500.0, imposed_fee: null, request_days: 0.0, status: 'Cotizacion del Viaje', assigned_to: accountsPayable.user_id },
    { notes: 'Viaticos para taller de liderazgo en Madrid.', requested_fee: 1200.0, imposed_fee: null, request_days: 2.0, status: 'Atencion Agencia de Viajes', assigned_to: agency.user_id },
    { notes: 'Reembolso de transporte.', requested_fee: 300.0, imposed_fee: 250.0, request_days: 0.5, status: 'Comprobacion gastos del viaje', assigned_to: accountsPayable.user_id },
    { notes: 'Apoyo para participacion en congreso internacional.', requested_fee: 2000.0, imposed_fee: 1800.0, request_days: 4.0, status: 'Validacion de comprobantes', assigned_to: accountsPayable.user_id },
    { notes: 'Gastos operativos extraordinarios.', requested_fee: 650.0, imposed_fee: 600.0, request_days: 0.0, status: 'Finalizado', assigned_to: accountsPayable.user_id },
    { notes: 'Viaje urgente por representacion institucional.', requested_fee: 1750.0, imposed_fee: 1500.0, request_days: 3.5, status: 'Cancelado', assigned_to: accountsPayable.user_id },
    { notes: 'Solicito anticipo para mision tecnica en el extranjero.', requested_fee: 2200.0, imposed_fee: 2000.0, request_days: 5.0, status: 'Rechazado', assigned_to: accountsPayable.user_id },
  ];

  const createdRequests = [];
  for (const requestData of requestsData) {
    const request = await prisma.request.create({
      data: {
        user_id: requester.user_id,
        request_status_id: statusMap.get(requestData.status),
        assigned_to: requestData.assigned_to,
        authorization_level: requestData.assigned_to ? 1 : 0,
        notes: requestData.notes,
        requested_fee: requestData.requested_fee,
        imposed_fee: requestData.imposed_fee,
        request_days: requestData.request_days,
        active: true,
      },
      select: { request_id: true },
    });
    createdRequests.push(request.request_id);
  }

  const cityMap = new Map((await prisma.city.findMany({ select: { city_id: true, city_name: true } })).map((c) => [c.city_name, c.city_id]));
  const countryMap = new Map((await prisma.country.findMany({ select: { country_id: true, country_name: true } })).map((c) => [c.country_name, c.country_id]));

  const routesData = [
    { fromCountry: 'Mexico', fromCity: 'CDMX', toCountry: 'Mexico', toCity: 'Guadalajara', date: '2025-05-01', begin: '08:00:00', end: '11:00:00', plane_needed: true, hotel_needed: false },
    { fromCountry: 'Mexico', fromCity: 'Monterrey', toCountry: 'Mexico', toCity: 'Merida', date: '2025-05-02', begin: '10:30:00', end: '14:30:00', plane_needed: true, hotel_needed: true },
    { fromCountry: 'Mexico', fromCity: 'Guadalajara', toCountry: 'Mexico', toCity: 'CDMX', date: '2025-05-03', begin: '12:00:00', end: '15:00:00', plane_needed: false, hotel_needed: true },
    { fromCountry: 'Mexico', fromCity: 'Monterrey', toCountry: 'Mexico', toCity: 'Guadalajara', date: '2025-05-04', begin: '06:00:00', end: '09:00:00', plane_needed: true, hotel_needed: false },
    { fromCountry: 'Mexico', fromCity: 'CDMX', toCountry: 'Estados Unidos', toCity: 'Nueva York', date: '2025-05-05', begin: '14:00:00', end: '18:00:00', plane_needed: true, hotel_needed: true },
    { fromCountry: 'Estados Unidos', fromCity: 'Nueva York', toCountry: 'Mexico', toCity: 'CDMX', date: '2025-05-06', begin: '11:00:00', end: '13:00:00', plane_needed: false, hotel_needed: false },
    { fromCountry: 'Mexico', fromCity: 'CDMX', toCountry: 'Espana', toCity: 'Madrid', date: '2025-05-07', begin: '09:30:00', end: '12:30:00', plane_needed: true, hotel_needed: false },
    { fromCountry: 'Reino Unido', fromCity: 'Londres', toCountry: 'Estados Unidos', toCity: 'Los Angeles', date: '2025-05-08', begin: '15:00:00', end: '18:30:00', plane_needed: true, hotel_needed: true },
    { fromCountry: 'Mexico', fromCity: 'CDMX', toCountry: 'Espana', toCity: 'Madrid', date: '2025-05-09', begin: '08:00:00', end: '11:15:00', plane_needed: true, hotel_needed: true },
  ];

  const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedCityMap = new Map([...cityMap.entries()].map(([name, id]) => [normalize(name), id]));
  const normalizedCountryMap = new Map([...countryMap.entries()].map(([name, id]) => [normalize(name), id]));

  const routeIds = [];
  for (let i = 0; i < routesData.length; i++) {
    const routeData = routesData[i];
    const originCountryId = normalizedCountryMap.get(normalize(routeData.fromCountry));
    const destinationCountryId = normalizedCountryMap.get(normalize(routeData.toCountry));
    const originCityId = normalizedCityMap.get(normalize(routeData.fromCity));
    const destinationCityId = normalizedCityMap.get(normalize(routeData.toCity));

    if (!originCountryId || !destinationCountryId || !originCityId || !destinationCityId) {
      console.warn(`Skipping route fixture ${i + 1} because locations are missing`);
      continue;
    }

    const route = await prisma.route.create({
      data: {
        id_origin_country: originCountryId,
        id_origin_city: originCityId,
        id_destination_country: destinationCountryId,
        id_destination_city: destinationCityId,
        router_index: 0,
        plane_needed: routeData.plane_needed,
        hotel_needed: routeData.hotel_needed,
        beginning_date: new Date(routeData.date),
        beginning_time: new Date(`1970-01-01T${routeData.begin}Z`),
        ending_date: new Date(routeData.date),
        ending_time: new Date(`1970-01-01T${routeData.end}Z`),
      },
      select: { route_id: true },
    });

    routeIds.push(route.route_id);
  }

  const pairCount = Math.min(createdRequests.length, routeIds.length);
  for (let i = 0; i < pairCount; i++) {
    await prisma.route_Request.create({
      data: {
        request_id: createdRequests[i],
        route_id: routeIds[i],
      },
    });
  }

  const hospedajeType = await prisma.receipt_Type.findUnique({
    where: { receipt_type_name: 'Hospedaje' },
    select: { receipt_type_id: true },
  });

  if (hospedajeType && createdRequests.length > 0) {
    await prisma.receipt.create({
      data: {
        receipt_type_id: hospedajeType.receipt_type_id,
        request_id: createdRequests[0],
        validation: 'Pendiente',
        amount: 300.0,
        validation_date: new Date('2025-04-19T09:00:00'),
      },
    });
  }

  const existingRule = await prisma.authorizationRule.findFirst({
    where: { rule_name: 'Viajes internacionales cortos' },
    select: { rule_id: true },
  });

  if (!existingRule) {
    const rule = await prisma.authorizationRule.create({
      data: {
        rule_name: 'Viajes internacionales cortos',
        is_default: false,
        num_levels: 3,
        automatic: true,
        travel_type: 'Internacional',
        min_duration: 0,
        max_duration: 5,
        min_amount: 0,
        max_amount: 5000.0,
      },
    });

    await prisma.authorizationRuleLevel.createMany({
      data: [
        { rule_id: rule.rule_id, level_number: 1, level_type: 'Jefe', superior_level_number: null },
        { rule_id: rule.rule_id, level_number: 2, level_type: 'Aleatorio', superior_level_number: 1 },
      ],
    });
  }
}

async function seedDummyAccountability() {
  console.log('Creating dummy accountability data...');

  try {
    for (const account of ACCOUNTS) {
      await prisma.account.upsert({
        where: { account_code: account.account_code },
        create: account,
        update: account,
      });
    }

    for (const receiptType of RECEIPT_TYPES) {
      await prisma.receipt_Type.upsert({
        where: { receipt_type_name: receiptType.receipt_type_name },
        create: receiptType,
        update: receiptType,
      });
    }

    for (const [typeName, accountCode] of Object.entries(RECEIPT_TYPE_TO_ACCOUNT)) {
      const receiptType = await prisma.receipt_Type.findUnique({
        where: { receipt_type_name: typeName },
        select: { receipt_type_id: true },
      });

      const account = await prisma.account.findUnique({
        where: { account_code: accountCode },
        select: { account_id: true },
      });

      if (!receiptType || !account) {
        continue;
      }

      await prisma.receiptType_Account.upsert({
        where: {
          receipt_type_id_account_id: {
            receipt_type_id: receiptType.receipt_type_id,
            account_id: account.account_id,
          },
        },
        create: {
          receipt_type_id: receiptType.receipt_type_id,
          account_id: account.account_id,
          is_default: true,
        },
        update: {},
      });
    }

    for (const tax of TAXES) {
      await prisma.tax.upsert({
        where: { tax_code: tax.tax_code },
        create: tax,
        update: tax,
      });
    }

  } catch (error) {
    console.error('Error en seedDummyAccountability:', error.message);
  }
}

async function seedDummyLocationsAndUsers() {
  await seedDummyCostCenters();
  await seedDummyDepartments();
  await seedDummyCountries();
  await seedDummyCities();
  await seedDummyUsers();
  await seedDummyTravelFixtures();
  await seedDummyAccountability();
}

async function main() {
  console.log('Starting dummy Prisma seed...');

  try {
    await seedEmptyDatabase();
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
