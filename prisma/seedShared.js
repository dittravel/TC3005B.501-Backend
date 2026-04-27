import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

export const ADMIN_USER_NAME = 'admin';
export const ADMIN_PASSWORD = 'admin123';
export const ADMIN_EMAIL = 'admin@cocoscheme.com';
export const ADMIN_WORKSTATION = 'ADMIN-WS';
export const SUPERADMIN_USER_NAME = 'superadmin';
export const SUPERADMIN_PASSWORD = '123';
export const SUPERADMIN_EMAIL = 'superadmin@cocoscheme.com';
export const SUPERADMIN_WORKSTATION = 'SUPERADMIN-WS';
export const ADMIN_DEPARTMENT_NAME = 'Admin';
export const ADMIN_COST_CENTER_NAME = 'CC-ADMIN';

const AES_SECRET_KEY = process.env.AES_SECRET_KEY;

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

export async function seedReferenceData(prisma, defaultSocietyGroupId) {
  await upsertOrderedRecords(prisma.role, [
    { role_name: 'Solicitante' },
    { role_name: 'Agencia de viajes' },
    { role_name: 'Cuentas por pagar' },
    { role_name: 'Autorizador' },
    { role_name: 'Administrador' },
    { role_name: 'Superadministrador' },
  ], (item) => ({
    where: { role_name_society_group_id: { role_name: item.role_name, society_group_id: defaultSocietyGroupId } },
    create: {
      role_name: item.role_name,
      society_group_id: defaultSocietyGroupId,
      is_default: item.role_name === 'Solicitante',
      is_system: item.role_name === 'Superadministrador',
    },
    update: {
      role_name: item.role_name,
      society_group_id: defaultSocietyGroupId,
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
    { permission_key: 'users:view', permission_name: 'Ver usuario', module: 'users', action: 'view', description: 'View user profiles and list' },
    { permission_key: 'users:create', permission_name: 'Crear usuario', module: 'users', action: 'create', description: 'Create new user accounts' },
    { permission_key: 'users:edit', permission_name: 'Editar usuario', module: 'users', action: 'edit', description: 'Modify existing user data' },
    { permission_key: 'users:delete', permission_name: 'Eliminar usuario', module: 'users', action: 'delete', description: 'Deactivate or remove users' },
    { permission_key: 'societies:view', permission_name: 'Ver sociedad', module: 'societies', action: 'view', description: 'View societies and their details' },
    { permission_key: 'societies:create', permission_name: 'Crear sociedad', module: 'societies', action: 'create', description: 'Create new societies' },
    { permission_key: 'societies:edit', permission_name: 'Editar sociedad', module: 'societies', action: 'edit', description: 'Modify existing societies' },
    { permission_key: 'societies:delete', permission_name: 'Eliminar sociedad', module: 'societies', action: 'delete', description: 'Delete societies' },
    { permission_key: 'society_groups:view', permission_name: 'Ver grupo de sociedad', module: 'society_groups', action: 'view', description: 'View society groups and their details' },
    { permission_key: 'society_groups:create', permission_name: 'Crear grupo de sociedad', module: 'society_groups', action: 'create', description: 'Create new society groups' },
    { permission_key: 'society_groups:edit', permission_name: 'Editar grupo de sociedad', module: 'society_groups', action: 'edit', description: 'Modify existing society groups' },
    { permission_key: 'society_groups:delete', permission_name: 'Eliminar grupo de sociedad', module: 'society_groups', action: 'delete', description: 'Delete society groups' },
    { permission_key: 'travel:view', permission_name: 'Ver solicitud', module: 'travel_requests', action: 'view', description: 'View travel requests' },
    { permission_key: 'travel:create', permission_name: 'Crear solicitud', module: 'travel_requests', action: 'create', description: 'Submit new travel requests' },
    { permission_key: 'travel:edit', permission_name: 'Editar solicitud', module: 'travel_requests', action: 'edit', description: 'Modify pending travel requests' },
    { permission_key: 'travel:delete', permission_name: 'Eliminar solicitud', module: 'travel_requests', action: 'delete', description: 'Remove travel requests' },
    { permission_key: 'travel:approve', permission_name: 'Aprobar/Rechazar solicitud', module: 'travel_requests', action: 'approve_reject', description: 'Approve or reject travel requests' },
    { permission_key: 'travel:def_amount', permission_name: 'Definir monto a autorizar', module: 'travel_requests', action: 'define_amount', description: 'Set the authorized monetary amount' },
    { permission_key: 'travel:view_flights', permission_name: 'Ver opciones de vuelos', module: 'travel_requests', action: 'view_flights', description: 'View available flight options' },
    { permission_key: 'travel:view_hotels', permission_name: 'Ver opciones de hoteles', module: 'travel_requests', action: 'view_hotels', description: 'View available hotel options' },
    { permission_key: 'travel:finalize', permission_name: 'Finalizar viaje', module: 'travel_requests', action: 'finalize', description: 'Mark a trip as completed' },
    { permission_key: 'travel:cancel', permission_name: 'Cancelar viaje', module: 'travel_requests', action: 'cancel', description: 'Cancel an approved trip' },
    { permission_key: 'travel:reject', permission_name: 'Rechazar viaje', module: 'travel_requests', action: 'reject', description: 'Reject a travel request' },
    { permission_key: 'receipts:view', permission_name: 'Ver comprobantes', module: 'receipts', action: 'view', description: 'View expense receipts' },
    { permission_key: 'receipts:create', permission_name: 'Crear comprobantes', module: 'receipts', action: 'create', description: 'Upload new receipts' },
    { permission_key: 'receipts:edit', permission_name: 'Editar comprobantes', module: 'receipts', action: 'edit', description: 'Modify submitted receipts' },
    { permission_key: 'receipts:delete', permission_name: 'Eliminar comprobantes', module: 'receipts', action: 'delete', description: 'Remove receipts' },
    { permission_key: 'receipts:approve', permission_name: 'Aprobar/Rechazar comprobantes', module: 'receipts', action: 'approve_reject', description: 'Approve or reject expense receipts' },
    { permission_key: 'refunds:request', permission_name: 'Solicitar reembolso', module: 'refunds', action: 'request', description: 'Submit a refund request' },
    { permission_key: 'refunds:budget', permission_name: 'Asignar presupuesto impuesto', module: 'refunds', action: 'assign_budget', description: 'Assign tax budget to a refund' },
    { permission_key: 'refunds:approve', permission_name: 'Aprobar/Rechazar reembolso', module: 'refunds', action: 'approve_reject', description: 'Approve or reject refund requests' },
    { permission_key: 'system:audit_log', permission_name: 'Ver bitácora', module: 'system', action: 'audit_log', description: 'Access the system audit log of critical actions' },
    { permission_key: 'system:import_data', permission_name: 'Importar datos', module: 'system', action: 'import_data', description: 'Import organizational data from files' },
    { permission_key: 'system:export_accounting', permission_name: 'Exportar datos contables', module: 'system', action: 'export_accounting', description: 'Export accounting and travel expense data' },
    { permission_key: 'superadmin:manage_groups', permission_name: 'Administrar grupos de sociedades', module: 'superadmin', action: 'manage_groups', description: 'Create, update and delete society groups and bootstrap tenant data' },
    { permission_key: 'superadmin:manage_master_admins', permission_name: 'Administrar administradores maestros', module: 'superadmin', action: 'manage_master_admins', description: 'Manage top-level superadmin users' },
    { permission_key: 'superadmin:view_group_audit_log', permission_name: 'Ver bitácora por grupo', module: 'superadmin', action: 'view_group_audit_log', description: 'Read audit logs filtered by society group' },
  ];

  await upsertOrderedRecords(prisma.permission, permissions, (item) => ({
    where: { permission_key_society_group_id: { permission_key: item.permission_key, society_group_id: defaultSocietyGroupId } },
    create: { ...item, society_group_id: defaultSocietyGroupId },
    update: { ...item, society_group_id: defaultSocietyGroupId },
  }));

  // Ensure system roles keep an exact, segmented baseline on every seed run.
  const defaultRolePermissions = {
    'Solicitante': [
      'travel:view',
      'travel:create',
      'travel:edit',
      'travel:view_flights',
      'travel:view_hotels',
      'receipts:create',
      'receipts:edit',
      'refunds:request',
    ],
    'Agencia de viajes': [
      'travel:view',
      'travel:edit',
      'travel:approve',
      'travel:view_flights',
      'travel:view_hotels',
      'travel:finalize',
      'travel:cancel',
    ],
    'Cuentas por pagar': [
      'travel:view',
      'receipts:view',
      'receipts:create',
      'receipts:edit',
      'receipts:delete',
      'receipts:approve',
      'refunds:request',
      'refunds:approve',
    ],
    'Autorizador': [
      'users:view',
      'travel:view',
      'travel:create',
      'travel:edit',
      'travel:delete',
      'travel:approve',
      'travel:def_amount',
      'travel:finalize',
      'travel:cancel',
      'travel:reject',
      'receipts:view',
      'receipts:create',
      'receipts:edit',
      'receipts:approve',
      'refunds:request',
      'refunds:approve',
    ],
    'Administrador': [
      'users:view',
      'users:create',
      'users:edit',
      'users:delete',
      'travel:def_amount',
      'system:audit_log',
      'system:import_data',
      'system:export_accounting',
    ],
    'Superadministrador': [
      'superadmin:manage_groups',
      'superadmin:manage_master_admins',
      'superadmin:view_group_audit_log',
    ],
  };

  const roles = await prisma.role.findMany({
    where: {
      society_group_id: defaultSocietyGroupId,
      role_name: { in: Object.keys(defaultRolePermissions) },
    },
    select: { role_id: true, role_name: true },
  });

  const roleByName = new Map(roles.map((role) => [role.role_name, role.role_id]));

  const permissionRows = await prisma.permission.findMany({
    where: {
      society_group_id: defaultSocietyGroupId,
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
          society_group_id: defaultSocietyGroupId,
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
}

export async function seedAdminAccount(prisma, defaultSocietyGroupId) {
  const adminRole = await prisma.role.findUnique({
    where: {
      role_name_society_group_id: {
        role_name: 'Administrador',
        society_group_id: defaultSocietyGroupId
      }
    }
  });
  if (!adminRole) {
    throw new Error('Administrator role must exist before seeding the admin account');
  }

  // Get the default society
  const defaultSociety = await prisma.society.findFirst({
    where: {
      is_default: true,
      society_group_id: defaultSocietyGroupId
    },
    select: { id: true }
  });

  if (!defaultSociety) {
    throw new Error('Default society must exist before seeding the admin account');
  }

  const costCenter = await prisma.costCenter.upsert({
    where: { cost_center_name_society_group_id: { cost_center_name: ADMIN_COST_CENTER_NAME, society_group_id: defaultSocietyGroupId } },
    create: { cost_center_name: ADMIN_COST_CENTER_NAME, society_group_id: defaultSocietyGroupId },
    update: { cost_center_name: ADMIN_COST_CENTER_NAME, society_group_id: defaultSocietyGroupId },
  });

  const department = await prisma.department.upsert({
    where: { department_name_society_group_id: { department_name: ADMIN_DEPARTMENT_NAME, society_group_id: defaultSocietyGroupId } },
    create: {
      department_name: ADMIN_DEPARTMENT_NAME,
      cost_center_id: costCenter.cost_center_id,
      society_group_id: defaultSocietyGroupId,
      active: true,
    },
    update: {
      cost_center_id: costCenter.cost_center_id,
      society_group_id: defaultSocietyGroupId,
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
      Society: { connect: { id: defaultSociety.id } },
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

export async function seedSuperAdminAccount(prisma, defaultSocietyGroupId) {
  const superAdminRole = await prisma.role.findUnique({
    where: {
      role_name_society_group_id: {
        role_name: 'Superadministrador',
        society_group_id: defaultSocietyGroupId,
      },
    },
  });

  if (!superAdminRole) {
    throw new Error('Superadministrator role must exist before seeding the superadmin account');
  }

  const defaultSociety = await prisma.society.findFirst({
    where: {
      is_default: true,
      society_group_id: defaultSocietyGroupId,
    },
    select: { id: true },
  });

  if (!defaultSociety) {
    throw new Error('Default society must exist before seeding the superadmin account');
  }

  const costCenter = await prisma.costCenter.upsert({
    where: { cost_center_name_society_group_id: { cost_center_name: ADMIN_COST_CENTER_NAME, society_group_id: defaultSocietyGroupId } },
    create: { cost_center_name: ADMIN_COST_CENTER_NAME, society_group_id: defaultSocietyGroupId },
    update: { cost_center_name: ADMIN_COST_CENTER_NAME, society_group_id: defaultSocietyGroupId },
  });

  const department = await prisma.department.upsert({
    where: { department_name_society_group_id: { department_name: ADMIN_DEPARTMENT_NAME, society_group_id: defaultSocietyGroupId } },
    create: {
      department_name: ADMIN_DEPARTMENT_NAME,
      cost_center_id: costCenter.cost_center_id,
      society_group_id: defaultSocietyGroupId,
      active: true,
    },
    update: {
      cost_center_id: costCenter.cost_center_id,
      society_group_id: defaultSocietyGroupId,
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
      Society: { connect: { id: defaultSociety.id } },
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

