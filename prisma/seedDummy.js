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
    society_id: 1,
    supplier: 20000000008,
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
    society_id: 1,
    supplier: 20000000009,
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
    society_id: 1,
    supplier: 20000000013,
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
    society_id: 1,
    supplier: 20000000010,
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
    society_id: 1,
    supplier: 20000000011,
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
    society_id: 1,
    supplier: 20000000012,
  },
  // Tec society group users (society_id: 3 = Tec Servicios)
  {
    role_name: 'Administrador',
    department_name: 'Admin',
    user_name: 'admin.tec',
    password: '123',
    workstation: 'WS000',
    email: 'admin@tec.com',
    phone_number: '555-0000',
    boss_user_name: null,
    society_id: 3,
    supplier: 20000000014,
  },
  {
    role_name: 'Autorizador',
    department_name: 'Finanzas',
    user_name: 'maria.santos',
    password: '123',
    workstation: 'WS204',
    email: 'maria.santos@tec.com',
    phone_number: '555-2004',
    boss_user_name: null,
    society_id: 3,
    supplier: 20000000015,
  },
  {
    role_name: 'Autorizador',
    department_name: 'Finanzas',
    user_name: 'juan.torres',
    password: '123',
    workstation: 'WS205',
    email: 'juan.torres@tec.com',
    phone_number: '555-2005',
    boss_user_name: 'maria.santos',
    society_id: 3,
    supplier: 20000000016,
  },
  {
    role_name: 'Solicitante',
    department_name: 'Finanzas',
    user_name: 'carlos.silva',
    password: '123',
    workstation: 'WS201',
    email: 'carlos.silva@tec.com',
    phone_number: '555-2001',
    boss_user_name: 'juan.torres',
    society_id: 3,
    supplier: 20000000017,
  },
  {
    role_name: 'Agencia de viajes',
    department_name: 'Finanzas',
    user_name: 'lucia.moreno',
    password: '123',
    workstation: 'WS202',
    email: 'lucia.moreno@tec.com',
    phone_number: '555-2002',
    boss_user_name: null,
    society_id: 3,
    supplier: 20000000018,
  },
  {
    role_name: 'Cuentas por pagar',
    department_name: 'Finanzas',
    user_name: 'fernando.rojas',
    password: '123',
    workstation: 'WS203',
    email: 'fernando.rojas@tec.com',
    phone_number: '555-2003',
    boss_user_name: null,
    society_id: 3,
    supplier: 20000000019,
  },
];

const ACCOUNTS = [
  { account_code: '1000', account_name: 'Anticipo', account_type: 'Activo' },
  { account_code: '1001', account_name: 'Cuenta x pagar Empleado', account_type: 'Pasivo' },
  { account_code: '1002', account_name: 'Gasto de Viaje', account_type: 'Activo', cost_center_id: 3 },
  { account_code: '1003', account_name: 'Iva Acreditable  ', account_type: 'Pasivo' },
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

const RECEIPT_TYPE_TO_ACCOUNT = {
  Hotel: '1002',
  Alimentos: '1002',
  Taxi: '1002',
  Hospedaje: '1002',
};

const SOCIETY_GROUPS = [
  { id: 1, description: 'Ditta Consulting' },
  { id: 2, description: 'Tec' },
]

const SOCIETIES = [
  { id: 1, description: 'Ditta Servicios', local_currency: 'MXN', society_group_id: 1 },
  { id: 2, description: 'Ditta Gestión', local_currency: 'MXN', society_group_id: 1 },
  { id: 3, description: 'Tec Servicios', local_currency: 'USD', society_group_id: 2 },
  { id: 4, description: 'Tec Gestión', local_currency: 'USD', society_group_id: 2 },
]

const DOCUMENT_TYPES = [
  {document_id: 'AV', description: 'Anticipo de Viaje'},
  {document_id: 'GV', description: 'Gasto de Viaje'},
];

const DUMMY_RECEIPTS = [
  {
    requestIndex: 0,
    routeIndex: 0,                  
    receipt_type_name: 'Hotel',
    amount: 1250.00,
    currency: 'MXN',
    refund: true,
    submission_date: '2025-05-10T14:30:00',
    validation: 'Aprobado',
    validation_date: '2025-05-12T10:15:00',
    description: 'Hospedaje Hotel Majestic Barcelona 3 noches',
    receipt_number: 'FAC-2025-78412',
    supplier_name: 'Hotel Majestic SA de CV',
    pdf_file_name: 'hotel_majestic_78412.pdf',
    xml_file_name: 'CFDI_Hotel_78412.xml',
    xml_uuid: 'E5345672-0AF6-4746-87F5-5EFE0409B9D3',
    xml_rfc_emisor: 'HMA050612P76',
    xml_rfc_receptor: 'DITT010101000', 
    xml_nombre_emisor: 'Hotel Majestic SA de CV',
    xml_fecha: '2025-05-08T18:45:00',
    xml_total: 1250.00,
    xml_subtotal: 1033.06,
    xml_impuestos: 216.94,
    xml_moneda: 'MXN',
  },

  {
    requestIndex: 1,
    routeIndex: 0,
    receipt_type_name: 'Alimentos',
    amount: 285.50,
    currency: 'USD',
    refund: true,
    submission_date: '2025-05-10T15:00:00',
    validation: 'Aprobado',
    validation_date: '2025-05-12T10:20:00',
    description: 'Comidas durante conferencia en Barcelona',
    receipt_number: 'TKT-45892',
    supplier_name: 'Restaurante La Fonda',
    pdf_file_name: 'alimentos_fonda_45892.pdf',
    xml_file_name: 'CFDI_Alimentos_45892.xml',
    xml_uuid: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890',
    xml_rfc_emisor: 'FON070415K32',
    xml_rfc_receptor: 'DITT010101000',
    xml_nombre_emisor: 'Restaurante La Fonda SA',
    xml_fecha: '2025-05-09T13:20:00',
    xml_total: 285.50,
    xml_subtotal: 235.95,
    xml_impuestos: 49.55,
    xml_moneda: 'USD',
  },

  {
    requestIndex: 2,
    routeIndex: 0,
    receipt_type_name: 'Taxi',
    amount: 420.75,
    currency: 'MXN',
    refund: true,
    submission_date: '2025-05-10T15:10:00',
    validation: 'Aprobado',
    validation_date: '2025-05-12T10:25:00',
    description: 'Traslado aeropuerto - hotel Barcelona',
    receipt_number: 'TAXI-33901',
    supplier_name: 'Taxi Oficial Barcelona',
    pdf_file_name: 'taxi_barcelona_33901.pdf',
    xml_file_name: null,
    xml_uuid: null,
    xml_rfc_emisor: null,
    xml_rfc_receptor: null,
    xml_nombre_emisor: null,
    xml_fecha: null,
    xml_total: 420.75,
    xml_subtotal: 347.73,
    xml_impuestos: 73.02,
    xml_moneda: null,
  },

  {
    requestIndex: 3,
    routeIndex: null,         
    receipt_type_name: 'Taxi',
    amount: 320.00,
    currency: 'MXN',
    refund: true,
    submission_date: '2025-04-16T09:45:00',
    validation: 'Aprobado',
    validation_date: '2025-04-18T11:30:00',
    description: 'Traslados locales CDMX',
    receipt_number: 'APP-20250415-784',
    supplier_name: 'Uber México',
    pdf_file_name: 'uber_20250415.pdf',
    xml_file_name: 'CFDI_Uber_784.xml',
    xml_uuid: 'F9A8B7C6-D5E4-3210-9876-543210FEDCBA',
    xml_rfc_emisor: 'UBE180101ABC',
    xml_rfc_receptor: 'DITT010101000',
    xml_nombre_emisor: 'Uber Technologies de México SA de CV',
    xml_fecha: '2025-04-15T17:30:00',
    xml_total: 320.00,
    xml_subtotal: 264.46,
    xml_impuestos: 55.54,
    xml_moneda: 'MXN',
  },

  {
    requestIndex: 4,
    routeIndex: null,
    receipt_type_name: 'Hospedaje',
    amount: 890.00,
    currency: 'MXN',
    refund: true,
    submission_date: '2025-04-11T12:00:00',
    validation: 'Aprobado',
    validation_date: '2025-04-13T09:00:00',
    description: 'Noche de hotel por emergencia médica',
    receipt_number: 'HOSP-2025-11234',
    supplier_name: 'Hospital HMG',
    pdf_file_name: 'hospital_hmg_11234.pdf',
    xml_file_name: 'CFDI_HMG_11234.xml',
    xml_uuid: '12345678-90AB-CDEF-1234-567890ABCDEF',
    xml_rfc_emisor: 'HMG050101P89',
    xml_rfc_receptor: 'DITT010101000',
    xml_nombre_emisor: 'Hospital HMG SA de CV',
    xml_fecha: '2025-04-10T20:15:00',
    xml_total: 890.00,
    xml_subtotal: 735.54,
    xml_impuestos: 154.46,
    xml_moneda: 'MXN',
  },

  {
    requestIndex: 5,
    routeIndex: 0,
    receipt_type_name: 'Alimentos',
    amount: 420.75,
    currency: 'USD',
    refund: true,
    submission_date: '2025-05-13T16:20:00',
    validation: 'Pendiente',
    validation_date: null,
    description: 'Desayuno y comida en congreso internacional',
    receipt_number: 'FAC-55678',
    supplier_name: 'Centro de Convenciones Madrid',
    pdf_file_name: 'alimentos_congreso_55678.pdf',
    xml_file_name: 'CFDI_Alimentos_55678.xml',
    xml_uuid: '98765432-1A2B-3C4D-5E6F-7A8B9C0D1E2F',
    xml_rfc_emisor: 'CCM120101ABC',
    xml_rfc_receptor: 'DITT010101000',
    xml_nombre_emisor: 'Centro de Convenciones SA',
    xml_fecha: '2025-05-12T14:00:00',
    xml_total: 420.75,
    xml_subtotal: 347.73,
    xml_impuestos: 73.02,
    xml_moneda: 'USD',
  },
];

async function seedDummyCostCenters() {
  console.log('Creating dummy cost centers...');

  // Get all society groups
  const societyGroups = await prisma.societyGroup.findMany({
    select: { id: true },
  });

  // Create cost centers for each society group
  for (const societyGroup of societyGroups) {
    for (const cost_center_name of COST_CENTER_NAMES) {
      await prisma.costCenter.upsert({
        where: { cost_center_name_society_group_id: { cost_center_name, society_group_id: societyGroup.id } },
        create: { cost_center_name, society_group_id: societyGroup.id },
        update: { cost_center_name, society_group_id: societyGroup.id },
      });
    }
  }
}

async function seedDummyDepartments() {
  console.log('Creating dummy departments...');

  // Get all society groups
  const societyGroups = await prisma.societyGroup.findMany({
    select: { id: true },
  });

  // Create departments for each society group
  for (const societyGroup of societyGroups) {
    for (const department of DEPARTMENT_NAMES) {
      const costCenter = await prisma.costCenter.findUnique({
        where: { cost_center_name_society_group_id: { cost_center_name: department.costCenter, society_group_id: societyGroup.id } },
        select: { cost_center_id: true },
      });

      if (!costCenter) {
        throw new Error(`Missing cost center ${department.costCenter}`);
      }

      await prisma.department.upsert({
        where: { department_name_society_group_id: { department_name: department.name, society_group_id: societyGroup.id } },
        create: {
          department_name: department.name,
          cost_center_id: costCenter.cost_center_id,
          society_group_id: societyGroup.id,
          active: department.active,
        },
        update: {
          cost_center_id: costCenter.cost_center_id,
          society_group_id: societyGroup.id,
          active: department.active,
        },
      });
    }
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
    // Find the society_group_id based on the user's society_id
    const society = await prisma.society.findUnique({
      where: { id: userData.society_id },
      select: { society_group_id: true },
    });

    const societyGroupId = society?.society_group_id || 1;

    const role = await prisma.role.findUnique({
      where: { role_name_society_group_id: { role_name: userData.role_name, society_group_id: societyGroupId } },
      select: { role_id: true },
    });
    const department = await prisma.department.findUnique({
      where: { department_name_society_group_id: { department_name: userData.department_name, society_group_id: societyGroupId } },
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
        society_id: userData.society_id,
        supplier: userData.supplier,
      },
      update: {
        password: hashedPassword,
        workstation: userData.workstation,
        email: encryptedEmail,
        phone_number: encryptedPhoneNumber,
        role_id: role.role_id,
        department_id: department.department_id,
        active: true,
        society_id: userData.society_id,
        supplier: userData.supplier,
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

  for (const document of DOCUMENT_TYPES) {
    await prisma.document.upsert({
      where: { document_id: document.document_id },
      create: document,
      update: document,
    });
  }

const requestsData = [
  { notes: 'Solicito viaticos para viaje a conferencia en Barcelona.', requested_fee: 1500.0, imposed_fee: null, request_days: 3.0, status: 'Finalizado', assigned_to: null, document_id: 'AV', authorization_rule_id: 1 },
  { notes: 'Reembolso por gastos medicos durante viaje.', requested_fee: 800.0, imposed_fee: 0, request_days: 1.0, status: 'Revision', assigned_to: authorizer.user_id, document_id: 'GV', authorization_rule_id: 1 },
  { notes: 'Solicitud de apoyo economico para capacitacion online.', requested_fee: 500.0, imposed_fee: null, request_days: 0.0, status: 'Cotizacion del Viaje', assigned_to: accountsPayable.user_id, document_id: 'AV', authorization_rule_id: 1 },
  { notes: 'Viaticos para taller de liderazgo en Madrid.', requested_fee: 1200.0, imposed_fee: null, request_days: 2.0, status: 'Atencion Agencia de Viajes', assigned_to: agency.user_id, document_id: 'AV', authorization_rule_id: 1 },
  { notes: 'Reembolso de transporte.', requested_fee: 300.0, imposed_fee: 250.0, request_days: 0.5, status: 'Comprobacion gastos del viaje', assigned_to: accountsPayable.user_id, document_id: 'GV', authorization_rule_id: 1 },
  { notes: 'Apoyo para participacion en congreso internacional.', requested_fee: 2000.0, imposed_fee: 1800.0, request_days: 4.0, status: 'Validacion de comprobantes', assigned_to: accountsPayable.user_id, document_id: 'AV', authorization_rule_id: 1 },
  { notes: 'Gastos operativos extraordinarios.', requested_fee: 650.0, imposed_fee: 600.0, request_days: 0.0, status: 'Finalizado', assigned_to: accountsPayable.user_id, document_id: 'GV', authorization_rule_id: 1 },
  { notes: 'Viaje urgente por representacion institucional.', requested_fee: 1750.0, imposed_fee: 1500.0, request_days: 3.5, status: 'Cancelado', assigned_to: accountsPayable.user_id, document_id: 'AV', authorization_rule_id: 1 },
  { notes: 'Solicito anticipo para mision tecnica en el extranjero.', requested_fee: 2200.0, imposed_fee: 2000.0, request_days: 5.0, status: 'Finalizado', assigned_to: accountsPayable.user_id, document_id: 'AV', authorization_rule_id: 1 },
];

  const createdRequests = [];
  for (const requestData of requestsData) {
    const request = await prisma.request.create({
      data: {
        user_id: requester.user_id,
        request_status_id: statusMap.get(requestData.status),
        assigned_to: requestData.assigned_to,
        authorization_level: requestData.assigned_to ? 1 : 0,
        authorization_rule_id: requestData.authorization_rule_id,
        society_id: 1,
        notes: requestData.notes,
        requested_fee: requestData.requested_fee,
        imposed_fee: requestData.imposed_fee,
        request_days: requestData.request_days,
        document_id: requestData.document_id,
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

    const receiptTypeMap = new Map(
    (
      await prisma.receipt_Type.findMany({
        select: {
          receipt_type_id: true,
          receipt_type_name: true,
        },
      })
    ).map((type) => [type.receipt_type_name, type.receipt_type_id])
  );

  const routeRequestMap = new Map();

  const routeRequestRelations = await prisma.route_Request.findMany({
    select: {
      request_id: true,
      route_id: true,
    },
  });

  for (const relation of routeRequestRelations) {
    if (!routeRequestMap.has(relation.request_id)) {
      routeRequestMap.set(relation.request_id, []);
    }
    routeRequestMap.get(relation.request_id).push(relation.route_id);
  }

  for (const dummyReceipt of DUMMY_RECEIPTS) {
    const requestId = createdRequests[dummyReceipt.requestIndex];

    if (!requestId) {
      console.warn(
        `Skipping receipt because requestIndex ${dummyReceipt.requestIndex} does not exist`
      );
      continue;
    }

    const receiptTypeId = receiptTypeMap.get(
      dummyReceipt.receipt_type_name
    );

    if (!receiptTypeId) {
      console.warn(
        `Skipping receipt because receipt type ${dummyReceipt.receipt_type_name} does not exist`
      );
      continue;
    }

    let routeId = null;

    if (dummyReceipt.routeIndex !== null) {
      const requestRoutes = routeRequestMap.get(requestId) || [];
      routeId = requestRoutes[dummyReceipt.routeIndex] || null;
    }

    await prisma.receipt.create({
      data: {
        Receipt_Type: {
          connect: { receipt_type_id: receiptTypeId },
        },
        Request: {
          connect: { request_id: requestId },
        },
        Route: routeId
          ? {
              connect: { route_id: routeId },
            }
          : undefined,
        Society: {
          connect: { id: 1 },
        },

        validation: dummyReceipt.validation,
        validation_date: dummyReceipt.validation_date
          ? new Date(dummyReceipt.validation_date)
          : null,
        amount: dummyReceipt.amount,
        currency: dummyReceipt.currency,
        refund: dummyReceipt.refund,
        submission_date: dummyReceipt.submission_date
          ? new Date(dummyReceipt.submission_date)
          : null,
        pdf_file_name: dummyReceipt.pdf_file_name,
        xml_file_name: dummyReceipt.xml_file_name,
        xml_uuid: dummyReceipt.xml_uuid,
        xml_rfc_emisor: dummyReceipt.xml_rfc_emisor,
        xml_rfc_receptor: dummyReceipt.xml_rfc_receptor,
        xml_nombre_emisor: dummyReceipt.xml_nombre_emisor,
        xml_fecha: dummyReceipt.xml_fecha
          ? new Date(dummyReceipt.xml_fecha)
          : null,
        xml_total: dummyReceipt.xml_total,
        xml_subtotal: dummyReceipt.xml_subtotal,
        xml_impuestos: dummyReceipt.xml_impuestos,
        xml_moneda: dummyReceipt.xml_moneda,
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
        society_group_id: 1,
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

async function seedDummySocietyGroups() {
  console.log('Creating dummy society groups...');
  for (const group of SOCIETY_GROUPS) {
    await prisma.societyGroup.upsert({
      where: { id: group.id },
      create: { id: group.id, description: group.description },
      update: { description: group.description },
    });
  }
  console.log(`Created or updated ${SOCIETY_GROUPS.length} dummy society groups`);
}

async function seedDummySocieties() {
  console.log('Creating dummy societies...');
  for (const society of SOCIETIES) {
    await prisma.society.upsert({
      where: { id: society.id },
      create: {
        id: society.id,
        description: society.description,
        local_currency: society.local_currency,
        society_group_id: society.society_group_id
      },
      update: {
        description: society.description,
        local_currency: society.local_currency,
        society_group_id: society.society_group_id
      },
    });
  }
  console.log(`Created or updated ${SOCIETIES.length} dummy societies`);
}

async function seedDummyRoles() {
  console.log('Creating dummy roles for society groups...');
  const ROLE_NAMES = [
    'Solicitante',
    'Agencia de viajes',
    'Cuentas por pagar',
    'Autorizador',
    'Administrador',
  ];

  // Get all society groups except 'Default'
  const societyGroups = await prisma.societyGroup.findMany({
    where: { description: { not: 'Default' } },
    select: { id: true, description: true },
  });

  // Create roles for each society group
  for (const societyGroup of societyGroups) {
    for (const role_name of ROLE_NAMES) {
      await prisma.role.upsert({
        where: { role_name_society_group_id: { role_name, society_group_id: societyGroup.id } },
        create: { role_name, society_group_id: societyGroup.id },
        update: { role_name, society_group_id: societyGroup.id },
      });
    }
  }
  console.log('Created roles for all society groups');
}

async function seedDummyLocationsAndUsers() {
  await seedDummySocietyGroups();
  await seedDummySocieties();
  await seedDummyRoles();
  await seedDummyCostCenters();
  await seedDummyDepartments();
  await seedDummyCountries();
  await seedDummyCities();
  await seedDummyUsers();
  await seedDummyAccountability();
  await seedDummyTravelFixtures();
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
