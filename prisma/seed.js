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
  await Promise.all([
    prisma.alertMessage.create({ data: { message_text: 'Se ha abierto una solicitud.' } }),
    prisma.alertMessage.create({ data: { message_text: 'Se requiere tu revisión.' } }),
    prisma.alertMessage.create({ data: { message_text: 'La solicitud está lista para generar su cotización de viaje.' } }),
    prisma.alertMessage.create({ data: { message_text: 'Se deben asignar los servicios del viaje para la solicitud.' } }),
    prisma.alertMessage.create({ data: { message_text: 'Se requiere validar comprobantes de los gastos del viaje.' } }),
    prisma.alertMessage.create({ data: { message_text: 'Los comprobantes están listos para validación.' } }),
    prisma.alertMessage.create({ data: { message_text: 'La solicitud ha sido finalizada exitosamente.' } }),
    prisma.alertMessage.create({ data: { message_text: 'La solicitud ha sido cancelada.' } }),
    prisma.alertMessage.create({ data: { message_text: 'La solicitud ha sido rechazada.' } }),
  ]);
  console.log('Alert messages created');

  // Request statuses
  console.log('Creating request statuses...');
  await Promise.all([
    prisma.request_status.create({ data: { status: 'Borrador' } }),
    prisma.request_status.create({ data: { status: 'Revisión' } }),
    prisma.request_status.create({ data: { status: 'Cotización del Viaje' } }),
    prisma.request_status.create({ data: { status: 'Atención Agencia de Viajes' } }),
    prisma.request_status.create({ data: { status: 'Comprobación gastos del viaje' } }),
    prisma.request_status.create({ data: { status: 'Validación de comprobantes' } }),
    prisma.request_status.create({ data: { status: 'Finalizado' } }),
    prisma.request_status.create({ data: { status: 'Cancelado' } }),
    prisma.request_status.create({ data: { status: 'Rechazado' } }),
  ]);
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
