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
  const costCenters = await Promise.all([
    prisma.costCenter.create({ data: { cost_center_name: 'CC-001' } }),
    prisma.costCenter.create({ data: { cost_center_name: 'CC-002' } }),
    prisma.costCenter.create({ data: { cost_center_name: 'CC-003' } }),
    prisma.costCenter.create({ data: { cost_center_name: 'CC-004' } }),
    prisma.costCenter.create({ data: { cost_center_name: 'CC-005' } }),
    prisma.costCenter.create({ data: { cost_center_name: 'CC-006' } }),
  ]);
  console.log(`Created ${costCenters.length} cost centers`);

  // Departments
  console.log('Creating Departments...');
  const departments = await Promise.all([
    prisma.department.create({ data: { department_name: 'Finanzas', cost_center_id: costCenters[0].cost_center_id, active: true } }),
    prisma.department.create({ data: { department_name: 'Recursos Humanos', cost_center_id: costCenters[1].cost_center_id, active: true } }),
    prisma.department.create({ data: { department_name: 'Tecnología', cost_center_id: costCenters[2].cost_center_id, active: true } }),
    prisma.department.create({ data: { department_name: 'Marketing', cost_center_id: costCenters[3].cost_center_id, active: true } }),
    prisma.department.create({ data: { department_name: 'Operaciones', cost_center_id: costCenters[4].cost_center_id, active: false } }),
    prisma.department.create({ data: { department_name: 'Admin', cost_center_id: costCenters[5].cost_center_id, active: true } }),
  ]);
  console.log(`Created ${departments.length} departments`);

  // Countries
  console.log('Creating Countries...');
  const countries = await Promise.all([
    prisma.country.create({ data: { country_name: 'México' } }),
    prisma.country.create({ data: { country_name: 'Estados Unidos' } }),
    prisma.country.create({ data: { country_name: 'Canadá' } }),
    prisma.country.create({ data: { country_name: 'Brásil' } }),
    prisma.country.create({ data: { country_name: 'Argentina' } }),
    prisma.country.create({ data: { country_name: 'Chile' } }),
    prisma.country.create({ data: { country_name: 'Colombia' } }),
    prisma.country.create({ data: { country_name: 'España' } }),
    prisma.country.create({ data: { country_name: 'Francia' } }),
    prisma.country.create({ data: { country_name: 'Reino Unido' } }),
    prisma.country.create({ data: { country_name: 'Alemania' } }),
    prisma.country.create({ data: { country_name: 'Italia' } }),
    prisma.country.create({ data: { country_name: 'Japón' } }),
    prisma.country.create({ data: { country_name: 'China' } }),
    prisma.country.create({ data: { country_name: 'India' } }),
  ]);
  console.log(`Created ${countries.length} countries`);

  // Cities
  console.log('Creating Cities...');
  const cities = await Promise.all([
    prisma.city.create({ data: { city_name: 'CDMX' } }),
    prisma.city.create({ data: { city_name: 'Guadalajara' } }),
    prisma.city.create({ data: { city_name: 'Monterrey' } }),
    prisma.city.create({ data: { city_name: 'Cancún' } }),
    prisma.city.create({ data: { city_name: 'Mérida' } }),
    prisma.city.create({ data: { city_name: 'Nueva York' } }),
    prisma.city.create({ data: { city_name: 'Los Ángeles' } }),
    prisma.city.create({ data: { city_name: 'San Francisco' } }),
    prisma.city.create({ data: { city_name: 'Chicago' } }),
    prisma.city.create({ data: { city_name: 'Las Vegas' } }),
    prisma.city.create({ data: { city_name: 'Toronto' } }),
    prisma.city.create({ data: { city_name: 'Vancouver' } }),
    prisma.city.create({ data: { city_name: 'Rio de Janeiro' } }),
    prisma.city.create({ data: { city_name: 'Sao Paulo' } }),
    prisma.city.create({ data: { city_name: 'Buenos Aires' } }),
    prisma.city.create({ data: { city_name: 'Cordoba' } }),
    prisma.city.create({ data: { city_name: 'Santiago' } }),
    prisma.city.create({ data: { city_name: 'Valparaíso' } }),
    prisma.city.create({ data: { city_name: 'Bogotá' } }),
    prisma.city.create({ data: { city_name: 'Madrid' } }),
    prisma.city.create({ data: { city_name: 'Barcelona' } }),
  ]);
  console.log(`Created ${cities.length} cities`);

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