/**
 * Seed Shared
 * 
 * Provides functions and reference data constants for seeding the database
 * with base data such as currencies, cities, countries, receipt types, taxes,
 * and admin/superadmin accounts.
 */

import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

// Currencies
export const CURRENCIES = [
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

// Cities
export const CITIES = [
  { city_name: 'CDMX',          iata_code: 'MEX', country_name: 'México' },
  { city_name: 'Guadalajara',   iata_code: 'GDL', country_name: 'México' },
  { city_name: 'Monterrey',     iata_code: 'MTY', country_name: 'México' },
  { city_name: 'Cancún',        iata_code: 'CUN', country_name: 'México' },
  { city_name: 'Mérida',        iata_code: 'MID', country_name: 'México' },
  { city_name: 'Nueva York',    iata_code: 'JFK', country_name: 'Estados Unidos' },
  { city_name: 'Los Ángeles',   iata_code: 'LAX', country_name: 'Estados Unidos' },
  { city_name: 'San Francisco', iata_code: 'SFO', country_name: 'Estados Unidos' },
  { city_name: 'Chicago',       iata_code: 'ORD', country_name: 'Estados Unidos' },
  { city_name: 'Las Vegas',     iata_code: 'LAS', country_name: 'Estados Unidos' },
  { city_name: 'Toronto',       iata_code: 'YYZ', country_name: 'Canadá' },
  { city_name: 'Vancouver',     iata_code: 'YVR', country_name: 'Canadá' },
  { city_name: 'Rio de Janeiro',iata_code: 'GIG', country_name: 'Brásil' },
  { city_name: 'Sao Paulo',     iata_code: 'GRU', country_name: 'Brásil' },
  { city_name: 'Buenos Aires',  iata_code: 'EZE', country_name: 'Argentina' },
  { city_name: 'Cordoba',       iata_code: 'COR', country_name: 'Argentina' },
  { city_name: 'Santiago',      iata_code: 'SCL', country_name: 'Chile' },
  { city_name: 'Valparaíso',    iata_code: 'SCL', country_name: 'Chile' },
  { city_name: 'Bogotá',        iata_code: 'BOG', country_name: 'Colombia' },
  { city_name: 'Barranquilla',  iata_code: 'BAQ', country_name: 'Colombia' },
  { city_name: 'Madrid',        iata_code: 'MAD', country_name: 'España' },
  { city_name: 'Barcelona',     iata_code: 'BCN', country_name: 'España' },
  { city_name: 'Paris',         iata_code: 'CDG', country_name: 'Francia' },
  { city_name: 'Lyon',          iata_code: 'LYS', country_name: 'Francia' },
  { city_name: 'Londres',       iata_code: 'LHR', country_name: 'Reino Unido' },
  { city_name: 'Manchester',    iata_code: 'MAN', country_name: 'Reino Unido' },
  { city_name: 'Berlín',        iata_code: 'BER', country_name: 'Alemania' },
  { city_name: 'Munich',        iata_code: 'MUC', country_name: 'Alemania' },
  { city_name: 'Roma',          iata_code: 'FCO', country_name: 'Italia' },
  { city_name: 'Venecia',       iata_code: 'VCE', country_name: 'Italia' },
  { city_name: 'Tokyo',         iata_code: 'NRT', country_name: 'Japón' },
  { city_name: 'Kyoto',         iata_code: 'ITM', country_name: 'Japón' },
  { city_name: 'Pekín',         iata_code: 'PEK', country_name: 'China' },
  { city_name: 'Hong Kong',     iata_code: 'HKG', country_name: 'China' },
  { city_name: 'Bombay',        iata_code: 'BOM', country_name: 'India' },
  { city_name: 'Nueva Delhi',   iata_code: 'DEL', country_name: 'India' },
];

// Countries
export const COUNTRIES = [
  { country_name: 'México' },
  { country_name: 'Estados Unidos' },
  { country_name: 'Canadá' },
  { country_name: 'Brásil' },
  { country_name: 'Argentina' },
  { country_name: 'Chile' },
  { country_name: 'Colombia' },
  { country_name: 'España' },
  { country_name: 'Francia' },
  { country_name: 'Reino Unido' },
  { country_name: 'Alemania' },
  { country_name: 'Italia' },
  { country_name: 'Japón' },
  { country_name: 'China' },
  { country_name: 'India' },
];

// Receipt types
export const RECEIPT_TYPES = [
  { receipt_type_name: 'Hospedaje' },
  { receipt_type_name: 'Comida' },
  { receipt_type_name: 'Transporte' },
  { receipt_type_name: 'Caseta' },
  { receipt_type_name: 'Autobús' },
  { receipt_type_name: 'Vuelo' },
  { receipt_type_name: 'Otro' },
];

// Taxes
export const TAXES = [
  { tax_code: 'IVA16',  tax_name: 'IVA 16%',          tax_rate: 0.1600 },
  { tax_code: 'EXENTO', tax_name: 'Exento de Impuestos', tax_rate: 0.0000 },
];

// Admin user
export const ADMIN_USER_NAME = 'admin';
export const ADMIN_PASSWORD = '123';
export const ADMIN_EMAIL = 'admin@empresa.local';
export const ADMIN_WORKSTATION = 'ADMIN-WS';
export const ADMIN_DEPARTMENT_NAME = 'Admin';
export const ADMIN_COST_CENTER_NAME = 'CC-ADMIN';

// Superadmin user
export const SUPERADMIN_USER_NAME = 'superadmin';
export const SUPERADMIN_PASSWORD = '123';
export const SUPERADMIN_EMAIL = 'superadmin@empresa.local';
export const SUPERADMIN_WORKSTATION = 'SUPERADMIN-WS';


const AES_SECRET_KEY = process.env.AES_SECRET_KEY;

/**
 * Encrypt a value using AES-256-CBC with a random IV.
 * @param {string} value The plaintext value to encrypt.
 * @return {string} The encrypted value, encoded as iv:encryptedData in base64.
 */
export const encryptSeedValue = (value) => {
  if (!AES_SECRET_KEY) {
    throw new Error('AES_SECRET_KEY is required for seed encryption');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), iv);
  let encrypted = cipher.update(value, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('hex') + encrypted;
};

/**
 * Helper function to upsert records in a specific order, ensuring that dependencies are respected.
 * @param {object} prismaModel The Prisma model to operate on (e.g., prisma.role).
 * @param {Array} items The array of items to upsert.
 * @param {function} mapData A function that takes an item and returns an object with 
 * 'where', 'create', and 'update' properties for the upsert operation.
 * @returns {Promise<void>}
 */
async function upsertOrderedRecords(prismaModel, items, mapData) {
  for (const item of items) {
    const data = mapData(item);
    await prismaModel.upsert({
      where: data.where,
      create: data.create,
      update: data.update,
    });
  }
}

/**
 * Seeds reference data such as roles, permissions, request statuses, receipt types, and default rules/policies.
 * This function is used to populate new societies with base data
 * @param {object} prisma The Prisma client instance to use for database operations.
 * @param {number} defaultSocietyId The ID of the default society to associate the seeded data with.
 */
export async function seedReferenceData(prisma, defaultSocietyId) {
  // Check if reference data already exists for the default society to avoid duplicates
  await upsertOrderedRecords(prisma.role, [
    { role_name: 'Solicitante' },
    { role_name: 'Agencia de viajes' },
    { role_name: 'Cuentas por pagar' },
    { role_name: 'Autorizador' },
    { role_name: 'Administrador' },
    { role_name: 'Superadministrador' },
  ], (item) => ({
    where: { role_name_society_id: { role_name: item.role_name, society_id: defaultSocietyId } },
    create: {
      role_name: item.role_name,
      society_id: defaultSocietyId,
      is_default: item.role_name === 'Solicitante',
      is_system: item.role_name === 'Superadministrador',
    },
    update: {
      role_name: item.role_name,
      society_id: defaultSocietyId,
      is_default: item.role_name === 'Solicitante',
      is_system: item.role_name === 'Superadministrador',
    },
  }));

  const alertMessages = [
    'Se ha abierto una solicitud.',
    'Se requiere tu revisión.',
    'La solicitud está lista para generar su cotización de viaje.',
    'Se deben asignar los servicios del viaje para la solicitud.',
    'Se requiere validar comprobantes de los gastos del viaje.',
    'Los comprobantes están listos para validación.',
    'La solicitud ha sido finalizada exitosamente.',
    'La solicitud ha sido cancelada.',
    'La solicitud ha sido rechazada.',
  ];

  if (await prisma.alertMessage.count() === 0) {
    for (const message_text of alertMessages) {
      await prisma.alertMessage.create({ data: { message_text } });
    }
  }

  await upsertOrderedRecords(prisma.request_status, [
    { status: 'Borrador' },
    { status: 'Revisión' },
    { status: 'Cotización del Viaje' },
    { status: 'Atención Agencia de Viajes' },
    { status: 'Comprobación gastos del viaje' },
    { status: 'Validación de comprobantes' },
    { status: 'Finalizado' },
    { status: 'Cancelado' },
    { status: 'Rechazado' },
  ], (item) => ({
    where: { status: item.status },
    create: { status: item.status },
    update: { status: item.status },
  }));

  await upsertOrderedRecords(prisma.receipt_Type, [
    { receipt_type_name: 'Hospedaje' },
    { receipt_type_name: 'Comida' },
    { receipt_type_name: 'Transporte' },
    { receipt_type_name: 'Caseta' },
    { receipt_type_name: 'Autobús' },
    { receipt_type_name: 'Vuelo' },
    { receipt_type_name: 'Otro' },
  ], (item) => ({
    where: { receipt_type_name: item.receipt_type_name },
    create: { receipt_type_name: item.receipt_type_name },
    update: { receipt_type_name: item.receipt_type_name },
  }));

  const permissions = [
    // Users
    { permission_key: 'users:view', permission_name: 'Ver usuario', module: 'users', action: 'view', description: 'View user profiles and list' },
    { permission_key: 'users:create', permission_name: 'Crear usuario', module: 'users', action: 'create', description: 'Create new user accounts' },
    { permission_key: 'users:edit', permission_name: 'Editar usuario', module: 'users', action: 'edit', description: 'Modify existing user data' },
    { permission_key: 'users:delete', permission_name: 'Eliminar usuario', module: 'users', action: 'delete', description: 'Deactivate or remove users' },
    // Societies
    { permission_key: 'societies:view', permission_name: 'Ver sociedad', module: 'societies', action: 'view', description: 'View societies and their details' },
    { permission_key: 'societies:create', permission_name: 'Crear sociedad', module: 'societies', action: 'create', description: 'Create new societies' },
    { permission_key: 'societies:edit', permission_name: 'Editar sociedad', module: 'societies', action: 'edit', description: 'Modify existing societies' },
    { permission_key: 'societies:delete', permission_name: 'Eliminar sociedad', module: 'societies', action: 'delete', description: 'Delete societies' },
    // Requests
    { permission_key: 'travel:view', permission_name: 'Ver solicitud', module: 'travel_requests', action: 'view', description: 'View travel requests' },
    { permission_key: 'travel:create', permission_name: 'Crear solicitud', module: 'travel_requests', action: 'create', description: 'Submit new travel requests' },
    { permission_key: 'travel:edit', permission_name: 'Editar solicitud', module: 'travel_requests', action: 'edit', description: 'Modify pending travel requests' },
    { permission_key: 'travel:delete', permission_name: 'Eliminar solicitud', module: 'travel_requests', action: 'delete', description: 'Remove travel requests' },
    { permission_key: 'travel:finalize', permission_name: 'Finalizar viaje', module: 'travel_requests', action: 'finalize', description: 'Mark a trip as completed' },
    { permission_key: 'travel:cancel', permission_name: 'Cancelar viaje', module: 'travel_requests', action: 'cancel', description: 'Cancel an approved trip' },
    // Authorization
    { permission_key: 'travel:approve', permission_name: 'Aprobar/Rechazar solicitud', module: 'travel_requests', action: 'approve_reject', description: 'Approve or reject travel requests' },
    { permission_key: 'travel:reject', permission_name: 'Rechazar viaje', module: 'travel_requests', action: 'reject', description: 'Reject a travel request' },
    // Imposed fee
    { permission_key: 'travel:def_amount', permission_name: 'Definir monto a autorizar', module: 'travel_requests', action: 'define_amount', description: 'Set the authorized monetary amount' },
    // Travel services
    { permission_key: 'travel:view_flights', permission_name: 'Ver opciones de vuelos', module: 'travel_requests', action: 'view_flights', description: 'View available flight options' },
    { permission_key: 'travel:view_hotels', permission_name: 'Ver opciones de hoteles', module: 'travel_requests', action: 'view_hotels', description: 'View available hotel options' },
    // Receipts
    { permission_key: 'receipts:view', permission_name: 'Ver comprobantes', module: 'receipts', action: 'view', description: 'View expense receipts' },
    { permission_key: 'receipts:create', permission_name: 'Crear comprobantes', module: 'receipts', action: 'create', description: 'Upload new receipts' },
    { permission_key: 'receipts:edit', permission_name: 'Editar comprobantes', module: 'receipts', action: 'edit', description: 'Modify submitted receipts' },
    { permission_key: 'receipts:delete', permission_name: 'Eliminar comprobantes', module: 'receipts', action: 'delete', description: 'Remove receipts' },
    // Approve/Reject receipts
    { permission_key: 'receipts:approve', permission_name: 'Aprobar/Rechazar comprobantes', module: 'receipts', action: 'approve_reject', description: 'Approve or reject expense receipts' },
    // Refunds
    { permission_key: 'refunds:create', permission_name: 'Crear reembolso', module: 'refunds', action: 'create', description: 'Create and manage refunds' },
    // System
    { permission_key: 'system:audit_log', permission_name: 'Bitácora', module: 'system', action: 'audit_log', description: 'Access the system audit log of critical actions' },
    { permission_key: 'system:import_data', permission_name: 'Importar datos', module: 'system', action: 'import_data', description: 'Import organizational data from files' },
    { permission_key: 'system:export_accounting', permission_name: 'Exportar datos contables', module: 'system', action: 'export_accounting', description: 'Export accounting and travel expense data' },
    { permission_key: 'roles:manage', permission_name: 'Administrar roles', module: 'roles', action: 'manage', description: 'Create, update and delete roles and permissions' },
    { permission_key: 'auth_rules:manage', permission_name: 'Administrar reglas de autorización', module: 'auth_rules', action: 'manage', description: 'Create, update and delete authorization rules' },
    { permission_key: 'refund_policies:manage', permission_name: 'Administrar políticas de reembolso', module: 'refund_policies', action: 'manage', description: 'Create, update and delete refund policies' },
    { permission_key: 'superadmin:manage_groups', permission_name: 'Administrar grupos de sociedades', module: 'superadmin', action: 'manage_groups', description: 'Create, update and delete society groups and bootstrap tenant data' },
    { permission_key: 'superadmin:manage_master_admins', permission_name: 'Administrar administradores maestros', module: 'superadmin', action: 'manage_master_admins', description: 'Manage top-level superadmin users' },
    { permission_key: 'superadmin:view_group_audit_log', permission_name: 'Ver bitácora por grupo', module: 'superadmin', action: 'view_group_audit_log', description: 'Read audit logs filtered by society group' },
  ];

  await upsertOrderedRecords(prisma.permission, permissions, (item) => ({
    where: { permission_key_society_id: { permission_key: item.permission_key, society_id: defaultSocietyId } },
    create: { ...item, society_id: defaultSocietyId },
    update: { ...item, society_id: defaultSocietyId },
  }));

  // Ensure system roles keep an exact, segmented baseline on every seed run.
  const defaultRolePermissions = {
    'Solicitante': [
      // Requests
      'travel:view',
      'travel:create',
      'travel:edit',
      'travel:delete',
      // Receipts
      'receipts:view',
      'receipts:create',
      'receipts:edit',
    ],
    'Agencia de viajes': [
      // Requests
      'travel:view',
      'travel:edit',
      // Travel services
      'travel:view_flights',
      'travel:view_hotels',
    ],
    'Cuentas por pagar': [
      // Requests
      'travel:view',
      'travel:edit',
      'travel:def_amount',
      // Receipts
      'receipts:view',
      'receipts:edit',
      'receipts:approve',
      // Refunds
      'refunds:create',
    ],
    'Autorizador': [
      // Requests
      'travel:view',
      'travel:create',
      'travel:edit',
      'travel:delete',
      // Approvals
      'travel:approve',
      'travel:reject',
      // Receipts
      'receipts:view',
      'receipts:create',
      'receipts:edit',
    ],
    'Administrador': [
      // Users
      'users:view',
      'users:create',
      'users:edit',
      'users:delete',
      // Roles
      'roles:manage',
      // System
      'system:import_data',
      'system:export_accounting',
      'system:audit_log',
      // Configuration
      'auth_rules:manage',
      'refund_policies:manage',
    ],
    'Superadministrador': [
      // Society groups
      'superadmin:manage_groups',
      // Superadmins
      'superadmin:manage_master_admins',
      // Audit logs
      'superadmin:view_group_audit_log',
    ],
  };

  const roles = await prisma.role.findMany({
    where: {
      society_id: defaultSocietyId,
      role_name: { in: Object.keys(defaultRolePermissions) },
    },
    select: { role_id: true, role_name: true },
  });

  const roleByName = new Map(roles.map((role) => [role.role_name, role.role_id]));

  const permissionRows = await prisma.permission.findMany({
    where: {
      society_id: defaultSocietyId,
      permission_key: { in: permissions.map((permission) => permission.permission_key) },
    },
    select: { permission_id: true, permission_key: true },
  });

  const permissionByKey = new Map(permissionRows.map((permission) => [permission.permission_key, permission.permission_id]));

  for (const [roleName, permissionKeys] of Object.entries(defaultRolePermissions)) {
    const roleId = roleByName.get(roleName);
    if (!roleId) continue;

    const allowedPermissionKeys = new Set(permissionKeys);
    await prisma.role_Permission.deleteMany({
      where: {
        role_id: roleId,
        Permission: {
          permission_key: {
            notIn: Array.from(allowedPermissionKeys),
          },
          society_id: defaultSocietyId,
        },
      },
    });

    const rolePermissionRows = permissionKeys
      .map((permissionKey) => permissionByKey.get(permissionKey))
      .filter(Boolean)
      .map((permissionId) => ({ role_id: roleId, permission_id: permissionId }));

    if (rolePermissionRows.length === 0) continue;

    await prisma.role_Permission.createMany({
      data: rolePermissionRows,
      skipDuplicates: true,
    });
  }

  // Get society name for default record names
  const society = await prisma.society.findUnique({
    where: { id: defaultSocietyId },
    select: { description: true },
  });

  const societyName = society?.description || `Sociedad ${defaultSocietyId}`;

  // Create default authorization rule
  const existingRule = await prisma.authorizationRule.findFirst({
    where: {
      society_id: defaultSocietyId,
      is_default: true,
    },
  });

  if (!existingRule) {
    await prisma.authorizationRule.create({
      data: {
        rule_name: `Regla Defecto ${societyName}`,
        is_default: true,
        num_levels: 1,
        automatic: true,
        travel_type: 'Todos',
        society_id: defaultSocietyId,
      },
    });
  }

  // Create default refund policy
  const existingPolicy = await prisma.refundPolicy.findFirst({
    where: {
      society_id: defaultSocietyId,
      is_default: true,
    },
  });

  if (!existingPolicy) {
    await prisma.refundPolicy.create({
      data: {
        policy_name: `Política Defecto ${societyName}`,
        min_amount: 0,
        max_amount: 100000,
        submission_deadline_days: 30,
        society_id: defaultSocietyId,
        is_default: true,
        active: true,
      },
    });
  }
}

/**
 * Creates or updates the default administrator account for the society
 * @param {object} prisma The Prisma client instance to use for database operations.
 * @param {number} defaultSocietyId The ID of the default society to associate the admin account with.
 * @throws Will throw an error if the required administrator role does not exist.
 */
export async function seedAdmin(prisma, defaultSocietyId) {
  const adminRole = await prisma.role.findUnique({
    where: {
      role_name_society_id: {
        role_name: 'Administrador',
        society_id: defaultSocietyId
      }
    }
  });
  if (!adminRole) {
    throw new Error('Administrator role must exist before seeding the admin account');
  }

  const costCenter = await prisma.costCenter.upsert({
    where: { cost_center_name_society_id: { cost_center_name: ADMIN_COST_CENTER_NAME, society_id: defaultSocietyId } },
    create: { cost_center_name: ADMIN_COST_CENTER_NAME, society_id: defaultSocietyId, cost_center_code: 101 },
    update: { cost_center_name: ADMIN_COST_CENTER_NAME, society_id: defaultSocietyId, cost_center_code: 101 },
  });

  const department = await prisma.department.upsert({
    where: { department_name_society_id: { department_name: ADMIN_DEPARTMENT_NAME, society_id: defaultSocietyId } },
    create: {
      department_name: ADMIN_DEPARTMENT_NAME,
      cost_center_id: costCenter.cost_center_id,
      society_id: defaultSocietyId,
      active: true,
    },
    update: {
      cost_center_id: costCenter.cost_center_id,
      society_id: defaultSocietyId,
      active: true,
    },
  });

  const password = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const email = encryptSeedValue(ADMIN_EMAIL);

  await prisma.user.upsert({
    where: { user_name: ADMIN_USER_NAME },
    create: {
      role: { connect: { role_id: adminRole.role_id } },
      department: { connect: { department_id: department.department_id } },
      Society: { connect: { id: defaultSocietyId } },
      user_name: ADMIN_USER_NAME,
      password,
      workstation: ADMIN_WORKSTATION,
      email,
      phone_number: null,
      active: true,
    },
    update: {
      role: { connect: { role_id: adminRole.role_id } },
      department: { connect: { department_id: department.department_id } },
      password,
      workstation: ADMIN_WORKSTATION,
      email,
      phone_number: null,
      active: true,
    },
  });
}

/**
 * Creates or updates the default super administrator account for the society, 
 * which has permissions to manage society groups and master admins.
 * @param {object} prisma The Prisma client instance to use for database operations.
 * @param {number} defaultSocietyId The ID of the default society to associate the superadmin account with.
 * @throws Will throw an error if the required super administrator role does not exist.
 */
export async function seedSuperadmin(prisma, defaultSocietyId) {
  const superAdminRole = await prisma.role.findUnique({
    where: {
      role_name_society_id: {
        role_name: 'Superadministrador',
        society_id: defaultSocietyId,
      },
    },
  });

  if (!superAdminRole) {
    throw new Error('Superadministrator role must exist before seeding the superadmin account');
  }

  const costCenter = await prisma.costCenter.upsert({
    where: { cost_center_name_society_id: { cost_center_name: ADMIN_COST_CENTER_NAME, society_id: defaultSocietyId } },
    create: { cost_center_name: ADMIN_COST_CENTER_NAME, cost_center_code: 101, society_id: defaultSocietyId },
    update: { cost_center_name: ADMIN_COST_CENTER_NAME, cost_center_code: 101, society_id: defaultSocietyId },
  });

  const department = await prisma.department.upsert({
    where: { department_name_society_id: { department_name: ADMIN_DEPARTMENT_NAME, society_id: defaultSocietyId } },
    create: {
      department_name: ADMIN_DEPARTMENT_NAME,
      cost_center_id: costCenter.cost_center_id,
      society_id: defaultSocietyId,
      active: true,
    },
    update: {
      cost_center_id: costCenter.cost_center_id,
      society_id: defaultSocietyId,
      active: true,
    },
  });

  const password = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
  const email = encryptSeedValue(SUPERADMIN_EMAIL);

  await prisma.user.upsert({
    where: { user_name: SUPERADMIN_USER_NAME },
    create: {
      role: { connect: { role_id: superAdminRole.role_id } },
      department: { connect: { department_id: department.department_id } },
      Society: { connect: { id: defaultSocietyId } },
      user_name: SUPERADMIN_USER_NAME,
      password,
      workstation: SUPERADMIN_WORKSTATION,
      email,
      phone_number: null,
      active: true,
    },
    update: {
      role: { connect: { role_id: superAdminRole.role_id } },
      department: { connect: { department_id: department.department_id } },
      password,
      workstation: SUPERADMIN_WORKSTATION,
      email,
      phone_number: null,
      active: true,
    },
  });
}

// Reusable seeding functions for shared catalogs

// Create or update currencies
export async function seedCurrencies(prisma) {
  for (const currency of CURRENCIES) {
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

// Create or update countries and cities
// Ensures that countries are created before cities to maintain references
export async function seedCountriesAndCities(prisma) {
  // First create all countries from the catalog
  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { country_name: country.country_name },
      create: { country_name: country.country_name },
      update: { country_name: country.country_name },
    });
  }

  // Get all countries for mapping
  const countries = await prisma.country.findMany({
    select: { country_id: true, country_name: true },
  });
  const countryMap = new Map(countries.map((c) => [c.country_name, c.country_id]));

  // Create cities with their country relationships
  for (const city of CITIES) {
    const country_id = countryMap.get(city.country_name) || null;

    await prisma.city.upsert({
      where: { city_name: city.city_name },
      create: {
        city_name: city.city_name,
        iata_code: city.iata_code,
        country_id,
      },
      update: {
        iata_code: city.iata_code,
        country_id,
      },
    });
  }
}

// Create or update receipt types
export async function seedReceiptTypes(prisma) {
  for (const receiptType of RECEIPT_TYPES) {
    await prisma.receipt_Type.upsert({
      where: { receipt_type_name: receiptType.receipt_type_name },
      create: { receipt_type_name: receiptType.receipt_type_name },
      update: { receipt_type_name: receiptType.receipt_type_name },
    });
  }
}

// Create or update taxes
export async function seedTaxes(prisma) {
  for (const tax of TAXES) {
    await prisma.tax.upsert({
      where: { tax_code: tax.tax_code },
      create: tax,
      update: {
        tax_name: tax.tax_name,
        tax_rate: tax.tax_rate,
      },
    });
  }
}