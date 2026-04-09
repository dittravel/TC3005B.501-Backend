/**
 * Dummy Data Seed
 * 
 * This script will populate the database with dummy data for testing.
 * It includes all the prepopulate data from seed.js and dummy entries.
 * To run it, use the command: "npm run prisma:seed:dummy"
 */

import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const AES_SECRET_KEY = process.env.AES_SECRET_KEY;

// Encryption function for sensitive data (email, phone_number)
const encrypt = (data) => {
  const IV = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), IV);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return IV.toString('hex') + encrypted;
};

async function seedDummyData() {
  console.log('\nAdding dummy data...');


  // Cost Centers
  console.log('Creating Cost Centers...');
  const costCenters = await prisma.costCenter.createMany({
    data: [
      { cost_center_name: 'CC-001' },
      { cost_center_name: 'CC-002' },
      { cost_center_name: 'CC-003' },
      { cost_center_name: 'CC-004' },
      { cost_center_name: 'CC-005' },
      { cost_center_name: 'CC-006' },
    ],
  });
  console.log(`Created ${costCenters.count} cost centers`);

  // Countries
  console.log('Creating Countries...');
  const countries = await prisma.country.createMany({
    data: [
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
    ],
  });
  console.log(`Created ${countries.count} countries`);

  // Cities
  console.log('Creating Cities...');
  const cities = await prisma.city.createMany({
    data: [
      { city_name: 'CDMX' },
      { city_name: 'Guadalajara' },
      { city_name: 'Monterrey' },
      { city_name: 'Cancún' },
      { city_name: 'Mérida' },
      { city_name: 'Nueva York' },
      { city_name: 'Los Ángeles' },
      { city_name: 'San Francisco' },
      { city_name: 'Chicago' },
      { city_name: 'Las Vegas' },
      { city_name: 'Toronto' },
      { city_name: 'Vancouver' },
      { city_name: 'Rio de Janeiro' },
      { city_name: 'Sao Paulo' },
      { city_name: 'Buenos Aires' },
      { city_name: 'Cordoba' },
      { city_name: 'Santiago' },
      { city_name: 'Valparaíso' },
      { city_name: 'Bogotá' },
      { city_name: 'Madrid' },
      { city_name: 'Barcelona' },
      { city_name: 'Paris' },
      { city_name: 'Lyon' },
      { city_name: 'Londres' },
      { city_name: 'Manchester' },
      { city_name: 'Berlín' },
      { city_name: 'Munich' },
      { city_name: 'Roma' },
      { city_name: 'Venecia' },
      { city_name: 'Tokyo' },
      { city_name: 'Kyoto' },
      { city_name: 'Pekín' },
      { city_name: 'Hong Kong' },
      { city_name: 'Bombay' },
      { city_name: 'Nueva Delhi' },
    ],
  });
  console.log(`Created ${cities.count} cities`);

  // Departments
  console.log('Creating Departments...');
  const departments = await prisma.department.createMany({
    data: [
      { department_name: 'Finanzas', cost_center_id: 1, active: true },
      { department_name: 'Recursos Humanos', cost_center_id: 2, active: true },
      { department_name: 'Tecnología', cost_center_id: 3, active: true },
      { department_name: 'Marketing', cost_center_id: 4, active: true },
      { department_name: 'Operaciones', cost_center_id: 5, active: false },
      { department_name: 'Admin', cost_center_id: 6, active: true },
    ],
  });
  console.log(`Created ${departments.count} departments`);

  // Users
  console.log('Creating Users with hashed passwords...');
  const usersData = [
    { role_name: 'Autorizador', department_name: 'Finanzas', user_name: 'laura.flores', password: '123', workstation: 'WS104', email: 'laura.flores@empresa.com', phone_number: '555-1004', boss_id: null },
    { role_name: 'Autorizador', department_name: 'Finanzas', user_name: 'diego.hernandez', password: '123', workstation: 'WS105', email: 'diego.hernandez@empresa.com', phone_number: '555-1005', boss_id: 1 },
    { role_name: 'Solicitante', department_name: 'Finanzas', user_name: 'andres.gomez', password: '123', workstation: 'WS101', email: 'andres.gomez@empresa.com', phone_number: '555-1001', boss_id: 2 },
    { role_name: 'Agencia de viajes', department_name: 'Finanzas', user_name: 'paula.martinez', password: '123', workstation: 'WS102', email: 'paula.martinez@empresa.com', phone_number: '555-1002', boss_id: null },
    { role_name: 'Cuentas por pagar', department_name: 'Finanzas', user_name: 'carlos.ramos', password: '123', workstation: 'WS103', email: 'carlos.ramos@empresa.com', phone_number: '555-1003', boss_id: null },
    { role_name: 'Administrador', department_name: 'Admin', user_name: 'admin', password: '123', workstation: 'WS000', email: 'admin@empresa.com', phone_number: '555-0000', boss_id: null },
  ];

  let usersCreated = 0;
  for (let i = 0; i < usersData.length; i++) {
    const userData = usersData[i];
    const role = await prisma.role.findFirst({ where: { role_name: userData.role_name } });
    const department = await prisma.department.findFirst({ where: { department_name: userData.department_name } });

    if (!role || !department) {
      console.warn(`Skipping user ${userData.user_name}: role or department not found`);
      continue;
    }

    try {
      // Create user with hashed password and encrypted email/phone
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const encryptedEmail = encrypt(userData.email);
      const encryptedPhoneNumber = encrypt(userData.phone_number);
      await prisma.user.create({
        data: {
          user_name: userData.user_name,
          email: encryptedEmail,
          password: hashedPassword,
          phone_number: encryptedPhoneNumber || null,
          workstation: userData.workstation || null,
          role_id: role.role_id,
          department_id: department.department_id,
          boss_id: userData.boss_id ? userData.boss_id : null,
          active: true,
        },
      });
      usersCreated++;
    } catch (error) {
      console.warn(`Failed to create user ${userData.user_name}:`, error.message);
    }
  }
  console.log(`Created ${usersCreated} users with hashed passwords`);

  // Requests (one per status for comprehensive testing)
  console.log('Creating Requests...');
  await prisma.request.createMany({
    data: [
      { user_id: 3, request_status_id: 1, assigned_to: null, authorization_level: 0, notes: 'Solicito viáticos para viaje a conferencia en Barcelona.', requested_fee: 1500.00, imposed_fee: null, request_days: 3.0, active: true },
      { user_id: 3, request_status_id: 2, assigned_to: 2, authorization_level: 1, notes: 'Reembolso por gastos médicos durante viaje.', requested_fee: 800.00, imposed_fee: null, request_days: 1.0, active: true },
      { user_id: 3, request_status_id: 3, assigned_to: 5, authorization_level: 2, notes: 'Solicitud de apoyo económico para capacitación online.', requested_fee: 500.00, imposed_fee: null, request_days: 0.0, active: true },
      { user_id: 3, request_status_id: 4, assigned_to: 4, authorization_level: 2, notes: 'Viáticos para taller de liderazgo en Madrid.', requested_fee: 1200.00, imposed_fee: null, request_days: 2.0, active: true },
      { user_id: 3, request_status_id: 5, assigned_to: 5, authorization_level: 2, notes: 'Reembolso de transporte.', requested_fee: 300.00, imposed_fee: 250.00, request_days: 0.5, active: true },
      { user_id: 3, request_status_id: 6, assigned_to: 5, authorization_level: 2, notes: 'Apoyo para participación en congreso internacional.', requested_fee: 2000.00, imposed_fee: 1800.00, request_days: 4.0, active: true },
      { user_id: 3, request_status_id: 7, assigned_to: 5, authorization_level: 2, notes: 'Gastos operativos extraordinarios.', requested_fee: 650.00, imposed_fee: 600.00, request_days: 0.0, active: true },
      { user_id: 3, request_status_id: 8, assigned_to: 5, authorization_level: 2, notes: 'Viaje urgente por representación institucional.', requested_fee: 1750.00, imposed_fee: 1500.00, request_days: 3.5, active: true },
      { user_id: 3, request_status_id: 9, assigned_to: 5, authorization_level: 2, notes: 'Solicito anticipo para misión técnica en el extranjero.', requested_fee: 2200.00, imposed_fee: 2000.00, request_days: 5.0, active: true },
    ],
  });
  console.log('Created Requests');

  // Routes (subset for demonstration, add more as needed)
  console.log('Creating Routes...');
  await prisma.route.createMany({
    data: [
      { id_origin_country: 1, id_origin_city: 1, id_destination_country: 1, id_destination_city: 2, router_index: 0, plane_needed: true, hotel_needed: false, beginning_date: new Date('2025-05-01'), beginning_time: new Date('1970-01-01T08:00:00Z'), ending_date: new Date('2025-05-01'), ending_time: new Date('1970-01-01T11:00:00Z') },
      { id_origin_country: 1, id_origin_city: 3, id_destination_country: 1, id_destination_city: 5, router_index: 0, plane_needed: true, hotel_needed: true, beginning_date: new Date('2025-05-02'), beginning_time: new Date('1970-01-01T10:30:00Z'), ending_date: new Date('2025-05-02'), ending_time: new Date('1970-01-01T14:30:00Z') },
      { id_origin_country: 1, id_origin_city: 2, id_destination_country: 1, id_destination_city: 1, router_index: 0, plane_needed: false, hotel_needed: true, beginning_date: new Date('2025-05-03'), beginning_time: new Date('1970-01-01T12:00:00Z'), ending_date: new Date('2025-05-03'), ending_time: new Date('1970-01-01T15:00:00Z') },
      { id_origin_country: 1, id_origin_city: 3, id_destination_country: 1, id_destination_city: 2, router_index: 0, plane_needed: true, hotel_needed: false, beginning_date: new Date('2025-05-04'), beginning_time: new Date('1970-01-01T06:00:00Z'), ending_date: new Date('2025-05-04'), ending_time: new Date('1970-01-01T09:00:00Z') },
      { id_origin_country: 1, id_origin_city: 1, id_destination_country: 2, id_destination_city: 1, router_index: 0, plane_needed: true, hotel_needed: true, beginning_date: new Date('2025-05-05'), beginning_time: new Date('1970-01-01T14:00:00Z'), ending_date: new Date('2025-05-05'), ending_time: new Date('1970-01-01T18:00:00Z') },
      { id_origin_country: 2, id_origin_city: 1, id_destination_country: 1, id_destination_city: 1, router_index: 0, plane_needed: false, hotel_needed: false, beginning_date: new Date('2025-05-06'), beginning_time: new Date('1970-01-01T11:00:00Z'), ending_date: new Date('2025-05-06'), ending_time: new Date('1970-01-01T13:00:00Z') },
      { id_origin_country: 1, id_origin_city: 1, id_destination_country: 8, id_destination_city: 10, router_index: 0, plane_needed: true, hotel_needed: false, beginning_date: new Date('2025-05-07'), beginning_time: new Date('1970-01-01T09:30:00Z'), ending_date: new Date('2025-05-07'), ending_time: new Date('1970-01-01T12:30:00Z') },
      { id_origin_country: 10, id_origin_city: 20, id_destination_country: 2, id_destination_city: 7, router_index: 0, plane_needed: true, hotel_needed: true, beginning_date: new Date('2025-05-08'), beginning_time: new Date('1970-01-01T15:00:00Z'), ending_date: new Date('2025-05-08'), ending_time: new Date('1970-01-01T18:30:00Z') },
      { id_origin_country: 1, id_origin_city: 1, id_destination_country: 8, id_destination_city: 10, router_index: 0, plane_needed: true, hotel_needed: true, beginning_date: new Date('2025-05-09'), beginning_time: new Date('1970-01-01T08:00:00Z'), ending_date: new Date('2025-05-09'), ending_time: new Date('1970-01-01T11:15:00Z') },
    ],
  });
  console.log('Created Routes');

  // Route_Request
  console.log('Creating Route_Request...');
  await prisma.route_Request.createMany({
    data: [
      { request_id: 1, route_id: 1 },
      { request_id: 2, route_id: 2 },
      { request_id: 3, route_id: 3 },
      { request_id: 4, route_id: 4 },
      { request_id: 5, route_id: 5 },
      { request_id: 6, route_id: 6 },
      { request_id: 7, route_id: 7 },
      { request_id: 8, route_id: 8 },
      { request_id: 9, route_id: 9 },
    ],
  });
  console.log('Created Route_Request');

  // Receipt
  console.log('Creating Receipts...');
  await prisma.receipt.create({
    data: {
      receipt_type_id: 1,
      request_id: 1,
      validation: 'Pendiente',
      amount: 300.00,
      validation_date: new Date('2025-04-19T09:00:00'),
    },
  });
  console.log('Created Receipts');

  // AuthorizationRule
  console.log('Creating AuthorizationRule...');
  await prisma.authorizationRule.create({
    data: {
      rule_name: 'Viajes internacionales cortos',
      is_default: false,
      num_levels: 3,
      automatic: true,
      travel_type: 'Internacional',
      min_duration: 0,
      max_duration: 5,
      min_amount: 0,
      max_amount: 5000.00,
    },
  });
  console.log('Created AuthorizationRule');

  // AuthorizationRuleLevel
  console.log('Creating AuthorizationRuleLevel...');
  await prisma.authorizationRuleLevel.createMany({
    data: [
      { rule_id: 2, level_number: 1, level_type: 'Jefe', superior_level_number: null },
      { rule_id: 2, level_number: 2, level_type: 'Aleatorio', superior_level_number: 1 },
    ],
  });
  console.log('Created AuthorizationRuleLevel');
}

async function main() {
  console.log('Starting seed with dummy data...');

  try {
    // prisma migrate reset (via package.json) already ran seed.js (seedPrepopulate)
    // Now add dummy data on top
    console.log('\nAdding dummy data on top of prepopulated data...');
    await seedDummyData();
    
    console.log('\nSeed with dummy data completed successfully!');
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