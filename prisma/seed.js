/**
 * Default Seed
 * 
 * This script will populate the database with default values
 * To run it, use the command: "npm run prisma:seed"
 */

import { prisma } from '../lib/prisma.js';

export async function seedPrepopulate() {
  console.log('Creating prepopulate data...');

  // User roles
  console.log('Creating roles...');
  await Promise.all([
    prisma.role.create({ data: { role_name: 'Solicitante' } }),
    prisma.role.create({ data: { role_name: 'Agencia de viajes' } }),
    prisma.role.create({ data: { role_name: 'Cuentas por pagar' } }),
    prisma.role.create({ data: { role_name: 'Autorizador' } }),
    prisma.role.create({ data: { role_name: 'Administrador' } }),
  ]);
  console.log('Roles created');

  // Alert messages
  console.log('Creating alert messages...');
  await prisma.alertMessage.create({ data: { message_text: 'Se ha abierto una solicitud.' } });
  await prisma.alertMessage.create({ data: { message_text: 'Se requiere tu revisión.' } });
  await prisma.alertMessage.create({ data: { message_text: 'La solicitud está lista para generar su cotización de viaje.' } });
  await prisma.alertMessage.create({ data: { message_text: 'Se deben asignar los servicios del viaje para la solicitud.' } });
  await prisma.alertMessage.create({ data: { message_text: 'Se requiere validar comprobantes de los gastos del viaje.' } });
  await prisma.alertMessage.create({ data: { message_text: 'Los comprobantes están listos para validación.' } });
  await prisma.alertMessage.create({ data: { message_text: 'La solicitud ha sido finalizada exitosamente.' } });
  await prisma.alertMessage.create({ data: { message_text: 'La solicitud ha sido cancelada.' } });
  await prisma.alertMessage.create({ data: { message_text: 'La solicitud ha sido rechazada.' } });
  console.log('Alert messages created');

  // Request statuses
  console.log('Creating request statuses...');
  await prisma.request_status.create({ data: { status: 'Borrador' } });
  await prisma.request_status.create({ data: { status: 'Revisión' } });
  await prisma.request_status.create({ data: { status: 'Cotización del Viaje' } });
  await prisma.request_status.create({ data: { status: 'Atención Agencia de Viajes' } });
  await prisma.request_status.create({ data: { status: 'Comprobación gastos del viaje' } });
  await prisma.request_status.create({ data: { status: 'Validación de comprobantes' } });
  await prisma.request_status.create({ data: { status: 'Finalizado' } });
  await prisma.request_status.create({ data: { status: 'Cancelado' } });
  await prisma.request_status.create({ data: { status: 'Rechazado' } });
  console.log('Request statuses created');

  // Receipt types
  console.log('Creating receipt types...');
  await Promise.all([
    prisma.receipt_Type.create({ data: { receipt_type_name: 'Hospedaje' } }),
    prisma.receipt_Type.create({ data: { receipt_type_name: 'Comida' } }),
    prisma.receipt_Type.create({ data: { receipt_type_name: 'Transporte' } }),
    prisma.receipt_Type.create({ data: { receipt_type_name: 'Caseta' } }),
    prisma.receipt_Type.create({ data: { receipt_type_name: 'Autobús' } }),
    prisma.receipt_Type.create({ data: { receipt_type_name: 'Vuelo' } }),
    prisma.receipt_Type.create({ data: { receipt_type_name: 'Otro' } }),
  ]);
  console.log('Receipt types created');

  // Permissions
  console.log('Creating permissions...');
  const permissions = [
    { permission_key: 'users:view', permission_name: 'Ver usuario', module: 'users', action: 'view', description: 'View user profiles and list' },
    { permission_key: 'users:create', permission_name: 'Crear usuario', module: 'users', action: 'create', description: 'Create new user accounts' },
    { permission_key: 'users:edit', permission_name: 'Editar usuario', module: 'users', action: 'edit', description: 'Modify existing user data' },
    { permission_key: 'users:delete', permission_name: 'Eliminar usuario', module: 'users', action: 'delete', description: 'Deactivate or remove users' },
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
  ];

  for (const perm of permissions) {
    await prisma.permission.create({ data: perm });
  }
  console.log('Permissions created');

  // Permisos de reembolsos
  const refundPermissions = [
    { permission_key: 'refunds:request', permission_name: 'Solicitar reembolso', module: 'refunds', action: 'request', description: 'Submit a refund request' },
    { permission_key: 'refunds:budget', permission_name: 'Asignar presupuesto impuesto', module: 'refunds', action: 'assign_budget', description: 'Assign tax budget to a refund' },
    { permission_key: 'refunds:approve', permission_name: 'Aprobar/Rechazar reembolso', module: 'refunds', action: 'approve_reject', description: 'Approve or reject refund requests' },
    { permission_key: 'refunds:override', permission_name: 'Hacer override a reglas', module: 'refunds', action: 'override_rules', description: 'Bypass business rules for refunds' },
  ];
  for (const perm of refundPermissions) {
    await prisma.permission.create({ data: perm });
  }
  console.log('Refund permissions created');

  // Reglas de autorización
  console.log('Creando regla de autorización predeterminada...');
  const rule = await prisma.authorizationRule.create({
    data: {
      rule_name: 'Regla predeterminada',
      is_default: true,
      num_levels: 3,
      automatic: false,
      travel_type: 'Todos',
    },
  });
  await prisma.authorizationRuleLevel.createMany({
    data: [
      { rule_id: rule.rule_id, level_number: 1, level_type: 'Jefe', superior_level_number: null },
      { rule_id: rule.rule_id, level_number: 2, level_type: 'Aleatorio', superior_level_number: null },
      { rule_id: rule.rule_id, level_number: 3, level_type: 'Nivel_Superior', superior_level_number: 1 },
    ],
  });
  console.log('Regla y niveles de autorización creados');

  // Catálogo de monedas
  console.log('Creando catálogo de monedas...');
  const currencies = [
    { currency_code: 'MXN', currency_name: 'Peso Mexicano', country: 'México', banxico_series_id: null, frequency: 'daily' },
    { currency_code: 'USD', currency_name: 'Dólar Estadounidense', country: 'Estados Unidos', banxico_series_id: 'SF43718', frequency: 'daily' },
    { currency_code: 'EUR', currency_name: 'Euro', country: 'Unión Monetaria Europea', banxico_series_id: 'SF46410', frequency: 'daily' },
    { currency_code: 'CAD', currency_name: 'Dólar Canadiense', country: 'Canadá', banxico_series_id: 'SF60632', frequency: 'daily' },
    { currency_code: 'JPY', currency_name: 'Yen Japonés', country: 'Japón', banxico_series_id: 'SF46406', frequency: 'daily' },
    { currency_code: 'PHP', currency_name: 'Peso Filipino', country: 'Filipinas', banxico_series_id: 'SF57811', frequency: 'monthly' },
    { currency_code: 'GTQ', currency_name: 'Quetzal Guatemalteco', country: 'Guatemala', banxico_series_id: 'SF57817', frequency: 'monthly' },
    { currency_code: 'HTG', currency_name: 'Gourde Haitiano', country: 'Haití', banxico_series_id: 'SF57823', frequency: 'monthly' },
    { currency_code: 'NIC', currency_name: 'Córdoba Nicaragüense', country: 'Nicaragua', banxico_series_id: 'SF57859', frequency: 'monthly' },
    { currency_code: 'PAB', currency_name: 'Balboa Panameño', country: 'Panamá', banxico_series_id: 'SF57871', frequency: 'monthly' },
    { currency_code: 'BZD', currency_name: 'Dólar de Belice', country: 'Belice', banxico_series_id: 'SF57761', frequency: 'monthly' },
    { currency_code: 'SVC', currency_name: 'Colón Salvadoreño', country: 'El Salvador', banxico_series_id: 'SF57793', frequency: 'monthly' },
    { currency_code: 'CRC', currency_name: 'Colón Costarricense', country: 'Costa Rica', banxico_series_id: 'SF57781', frequency: 'monthly' },
    { currency_code: 'ARS', currency_name: 'Peso Argentino', country: 'Argentina', banxico_series_id: 'SF57731', frequency: 'monthly' },
    { currency_code: 'BOB', currency_name: 'Boliviano', country: 'Bolivia', banxico_series_id: 'SF57763', frequency: 'monthly' },
    { currency_code: 'BRL', currency_name: 'Real Brasileño', country: 'Brasil', banxico_series_id: 'SF57765', frequency: 'monthly' },
    { currency_code: 'CLP', currency_name: 'Peso Chileno', country: 'Chile', banxico_series_id: 'SF57751', frequency: 'monthly' },
    { currency_code: 'COP', currency_name: 'Peso Colombiano', country: 'Colombia', banxico_series_id: 'SF57775', frequency: 'monthly' },
    { currency_code: 'PEN', currency_name: 'Sol Peruano', country: 'Perú', banxico_series_id: 'SF57875', frequency: 'monthly' },
    { currency_code: 'PYG', currency_name: 'Guaraní Paraguayo', country: 'Paraguay', banxico_series_id: 'SF57873', frequency: 'monthly' },
    { currency_code: 'UYP', currency_name: 'Peso Uruguayo', country: 'Uruguay', banxico_series_id: 'SF57921', frequency: 'monthly' },
    { currency_code: 'VES', currency_name: 'Bolívar Digital Venezolano', country: 'Venezuela', banxico_series_id: 'SF57925', frequency: 'monthly' },
    { currency_code: 'BSD', currency_name: 'Dólar Bahameño', country: 'Bahamas', banxico_series_id: 'SF57755', frequency: 'monthly' },
    { currency_code: 'BBD', currency_name: 'Dólar de Barbados', country: 'Barbados', banxico_series_id: 'SF57759', frequency: 'monthly' },
    { currency_code: 'CUP', currency_name: 'Peso Cubano', country: 'Cuba', banxico_series_id: 'SF57785', frequency: 'monthly' },
    { currency_code: 'JMD', currency_name: 'Dólar Jamaicano', country: 'Jamaica', banxico_series_id: 'SF57837', frequency: 'monthly' },
    { currency_code: 'TTD', currency_name: 'Dólar de Trinidad y Tobago', country: 'Trinidad y Tobago', banxico_series_id: 'SF57915', frequency: 'monthly' },
    { currency_code: 'GYD', currency_name: 'Dólar Guyanés', country: 'Guyana', banxico_series_id: 'SF57819', frequency: 'monthly' },
    { currency_code: 'GBP', currency_name: 'Libra Esterlina', country: 'Gran Bretaña', banxico_series_id: 'SF57815', frequency: 'monthly' },
    { currency_code: 'CHF', currency_name: 'Franco Suizo', country: 'Suiza', banxico_series_id: 'SF57905', frequency: 'monthly' },
    { currency_code: 'DKK', currency_name: 'Corona Danesa', country: 'Dinamarca', banxico_series_id: 'SF57789', frequency: 'monthly' },
    { currency_code: 'NOK', currency_name: 'Corona Noruega', country: 'Noruega', banxico_series_id: 'SF57863', frequency: 'monthly' },
    { currency_code: 'SEK', currency_name: 'Corona Sueca', country: 'Suecia', banxico_series_id: 'SF57903', frequency: 'monthly' },
    { currency_code: 'HUF', currency_name: 'Forinto Húngaro', country: 'Hungría', banxico_series_id: 'SF57827', frequency: 'monthly' },
    { currency_code: 'CZK', currency_name: 'Corona Checa', country: 'República Checa', banxico_series_id: 'SF57881', frequency: 'monthly' },
    { currency_code: 'PLN', currency_name: 'Esloti Polaco', country: 'Polonia', banxico_series_id: 'SF57877', frequency: 'monthly' },
    { currency_code: 'RON', currency_name: 'Leu Rumano', country: 'Rumanía', banxico_series_id: 'SF57893', frequency: 'monthly' },
    { currency_code: 'TRY', currency_name: 'Lira Turca', country: 'Turquía', banxico_series_id: 'SF57917', frequency: 'monthly' },
    { currency_code: 'RUB', currency_name: 'Rublo Ruso', country: 'Federación Rusa', banxico_series_id: 'SF57807', frequency: 'monthly' },
    { currency_code: 'UAH', currency_name: 'Grivna Ucraniana', country: 'Ucrania', banxico_series_id: 'SF57919', frequency: 'monthly' },
    { currency_code: 'XDR', currency_name: 'Derechos Especiales de Giro', country: 'FMI', banxico_series_id: 'SF57787', frequency: 'monthly' },
    { currency_code: 'CNY', currency_name: 'Yuan Chino Continental', country: 'China', banxico_series_id: 'SF57773', frequency: 'monthly' },
    { currency_code: 'CNH', currency_name: 'Yuan Chino Offshore', country: 'China', banxico_series_id: 'SF229267', frequency: 'monthly' },
    { currency_code: 'KRW', currency_name: 'Won Surcoreano', country: 'Corea del Sur', banxico_series_id: 'SF57783', frequency: 'monthly' },
    { currency_code: 'TWD', currency_name: 'Nuevo Dólar Taiwanés', country: 'Taiwán', banxico_series_id: 'SF57911', frequency: 'monthly' },
    { currency_code: 'IDR', currency_name: 'Rupia Indonesia', country: 'Indonesia', banxico_series_id: 'SF57831', frequency: 'monthly' },
    { currency_code: 'INR', currency_name: 'Rupia India', country: 'India', banxico_series_id: 'SF57829', frequency: 'monthly' },
    { currency_code: 'MYR', currency_name: 'Ringgit Malayo', country: 'Malasia', banxico_series_id: 'SF57847', frequency: 'monthly' },
    { currency_code: 'SGD', currency_name: 'Dólar de Singapur', country: 'Singapur', banxico_series_id: 'SF57897', frequency: 'monthly' },
    { currency_code: 'THB', currency_name: 'Baht Tailandés', country: 'Tailandia', banxico_series_id: 'SF57909', frequency: 'monthly' },
    { currency_code: 'VND', currency_name: 'Dong Vietnamita', country: 'Vietnam', banxico_series_id: 'SF57927', frequency: 'monthly' },
    { currency_code: 'KWD', currency_name: 'Dinar Kuwaití', country: 'Kuwait', banxico_series_id: 'SF57845', frequency: 'monthly' },
    { currency_code: 'SAR', currency_name: 'Riyal Saudí', country: 'Arabia Saudita', banxico_series_id: 'SF57747', frequency: 'monthly' },
    { currency_code: 'AED', currency_name: 'Dírham Emiratí', country: 'Emiratos Árabes Unidos', banxico_series_id: 'SF57795', frequency: 'monthly' },
    { currency_code: 'ILS', currency_name: 'Séquel Israelí', country: 'Israel', banxico_series_id: 'SF57835', frequency: 'monthly' },
    { currency_code: 'IQD', currency_name: 'Dinar Iraquí', country: 'Irak', banxico_series_id: 'SF57833', frequency: 'monthly' },
    { currency_code: 'MAD', currency_name: 'Dírham Marroquí', country: 'Marruecos', banxico_series_id: 'SF57855', frequency: 'monthly' },
    { currency_code: 'EGP', currency_name: 'Libra Egipcia', country: 'Egipto', banxico_series_id: 'SF57791', frequency: 'monthly' },
    { currency_code: 'DZD', currency_name: 'Dinar Argelino', country: 'Argelia', banxico_series_id: 'SF57749', frequency: 'monthly' },
    { currency_code: 'KES', currency_name: 'Chelín Keniano', country: 'Kenia', banxico_series_id: 'SF57841', frequency: 'monthly' },
    { currency_code: 'NGN', currency_name: 'Naira Nigeriana', country: 'Nigeria', banxico_series_id: 'SF57861', frequency: 'monthly' },
    { currency_code: 'ZAR', currency_name: 'Rand Sudafricano', country: 'Sudáfrica', banxico_series_id: 'SF57883', frequency: 'monthly' },
    { currency_code: 'AUD', currency_name: 'Dólar Australiano', country: 'Australia', banxico_series_id: 'SF57753', frequency: 'monthly' },
    { currency_code: 'NZD', currency_name: 'Dólar Neozelandés', country: 'Nueva Zelanda', banxico_series_id: 'SF57867', frequency: 'monthly' },
    { currency_code: 'FJD', currency_name: 'Dólar Fiyiano', country: 'Fiyi', banxico_series_id: 'SF57809', frequency: 'monthly' },
  ];
  await prisma.currency.createMany({ data: currencies, skipDuplicates: true });
  console.log('Catálogo de monedas creado');
}

async function main() {
  console.log('Starting seed (clean database with prepopulate data)...');
  try {
    await seedPrepopulate();
    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
