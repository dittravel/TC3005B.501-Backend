/**
 * Dummy Data Seed
 *
 * Seeds the base data and then adds the dummy dataset used for local
 * development and testing.
 */

import { pathToFileURL } from 'node:url';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { seedBaseData } from './seed.js';
import {
  encryptSeedValue,
  seedReferenceData,
} from './seedShared.js';
import {
  COST_CENTERS,
  DEPARTMENTS,
  USERS,
  SOCIETY_GROUPS,
  SOCIETIES,
  DOCUMENT_TYPES,
  RECEIPTS,
  REQUESTS,
  ROUTES,
  ACCOUNTS,
  RECEIPT_TYPE_TO_ACCOUNT,
} from './dummyData.js';

/**
 * Create or update cost centers for all societies
 * @param {Array} societies - List of societies to create cost centers for
 * @returns {Promise<void>}
 * @throws Will throw an error if there is an issue creating or updating cost centers.
 */
async function seedDummyCostCenters(societies) {
  console.log('Creating dummy cost centers...');

  // Create cost centers for each society
  for (const society of societies) {
    for (const cost_center of COST_CENTERS) {
      await prisma.costCenter.upsert({
        where: {
          cost_center_name_society_id: {
            cost_center_name: cost_center.cost_center_name,
            society_id: society.id
          }
        },
        create: {
          cost_center_name: cost_center.cost_center_name,
          cost_center_code: cost_center.cost_center_code,
          society_id: society.id
        },
        update: {
          cost_center_name: cost_center.cost_center_name,
          cost_center_code: cost_center.cost_center_code,
          society_id: society.id
        },
      });
    }
  }
}

/**
 * Create or update departments for all societies
 * @param {Array} societies - List of societies to create departments for
 * @returns {Promise<void>}
 * @throws Will throw an error if there is an issue creating or updating departments.
 */
async function seedDummyDepartments(societies) {
  console.log('Creating dummy departments...');

  // Create departments for each society
  for (const society of societies) {
    for (const department of DEPARTMENTS) {
      // Find the cost center for this department and society
      const costCenter = await prisma.costCenter.findUnique({
        where: {
          cost_center_name_society_id: {
            cost_center_name: department.costCenter,
            society_id: society.id
          }
        },
        select: {
          cost_center_id: true
        },
      });

      if (!costCenter) {
        throw new Error(`Missing cost center ${department.costCenter}`);
      }

      // Upsert the department with the correct cost center and society
      await prisma.department.upsert({
        where: {
          department_name_society_id: {
            department_name: department.name,
            society_id: society.id
          }
        },
        create: {
          department_name: department.name,
          cost_center_id: costCenter.cost_center_id,
          society_id: society.id,
          active: department.active,
        },
        update: {
          cost_center_id: costCenter.cost_center_id,
          society_id: society.id,
          active: department.active,
        },
      });
    }
  }
}

/**
 * Create or update dummy users
 * @returns {Promise<void>}
 * @throws Will throw an error if there is an issue creating or updating users.
 */
async function seedDummyUsers() {
  console.log('Creating dummy users...');

  for (const userData of USERS) {
    // Find the role of the user
    const role = await prisma.role.findUnique({
      where: {
        role_name_society_id: {
          role_name: userData.role_name,
          society_id: userData.society_id
        }
      },
      select: {
        role_id: true
      },
    });

    // Find the department of the user
    const department = await prisma.department.findUnique({
      where: {
        department_name_society_id: {
          department_name: userData.department_name,
          society_id: userData.society_id
        }
      },
      select: {
        department_id: true
      },
    });

    if (!role || !department) {
      throw new Error(`Missing role or department for user ${userData.user_name}`);
    }

    // Encrypt the password and sensitive data before storing
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const encryptedEmail = encryptSeedValue(userData.email);
    const encryptedPhoneNumber = userData.phone_number ? encryptSeedValue(userData.phone_number) : null;

    // Upsert the user with the correct role, department, and encrypted data
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

  // Update boss relationships after all users have been created
  for (const userData of USERS) {
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

  console.log(`Created or updated ${USERS.length} dummy users`);
}

/**
 * Create dummy accounts and receipt type to account mappings for all societies
 * @param {Array} societies - List of societies to create accounts for
 */
async function seedDummyAccountability(societies) {
  console.log('Creating dummy accounting data...');

  // Create accounts for each society
  for (const account of ACCOUNTS) {
    for (const society of societies) {
      await prisma.account.upsert({
        where: { account_code: account.account_code },
        create: {
          account_code: account.account_code,
          account_name: account.account_name,
          account_type: account.account_type,
          society_id: society.id,
        },
        update: {
          account_name: account.account_name,
          account_type: account.account_type,
          society_id: society.id,
        },
      });
    }
  }

  // Map receipt types to accounts
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
}

/**
 * Create dummy travel requests, routes, and receipts
 */
async function seedDummyRequests() {
  // Get the users needed for the requests
  const applicant = await prisma.user.findUnique({
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

  if (!applicant || !authorizer || !agency || !accountsPayable) {
    console.warn('Skipping dummy travel fixtures because required users are missing');
    return;
  }

  // Get all statuses for requests
  const statuses = await prisma.request_status.findMany({
    select: {
      request_status_id: true,
      status: true,
    },
  });

  const statusMap = new Map(statuses.map((s) => [s.status, s.request_status_id]));

  // Create or update document types
  for (const document of DOCUMENT_TYPES) {
    await prisma.document.upsert({
      where: { document_id: document.document_id },
      create: document,
      update: document,
    });
  }

  // Create requests
  const createdRequests = [];
  for (const requestData of REQUESTS) {
    // Resolve assigned_to_username to user_id
    let assignedToId = null;
    if (requestData.assigned_to_username) {
      const assignedUser = await prisma.user.findUnique({
        where: { user_name: requestData.assigned_to_username },
        select: { user_id: true },
      });
      if (assignedUser) {
        assignedToId = assignedUser.user_id;
      }
    }

    const request = await prisma.request.create({
      data: {
        user_id: applicant.user_id,
        request_status_id: statusMap.get(requestData.status),
        assigned_to: assignedToId,
        authorization_level: assignedToId ? 1 : 0,
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

  // Map cities and countries for route creation
  const cityMap = new Map((await prisma.city.findMany({ select: { city_id: true, city_name: true } })).map((c) => [c.city_name, c.city_id]));
  const countryMap = new Map((await prisma.country.findMany({ select: { country_id: true, country_name: true } })).map((c) => [c.country_name, c.country_id]));

  // For each route, find the corresponding city and country IDs and create the route
  // then link it to the corresponding request. 
  const routeIds = [];
  for (let i = 0; i < ROUTES.length; i++) {
    const routeData = ROUTES[i];
    const originCountryId = countryMap.get(routeData.fromCountry);
    const destinationCountryId = countryMap.get(routeData.toCountry);
    const originCityId = cityMap.get(routeData.fromCity);
    const destinationCityId = cityMap.get(routeData.toCity);

    if (!originCountryId || !destinationCountryId || !originCityId || !destinationCityId) {
      console.warn(`Skipping route fixture ${i + 1} because locations are missing`);
      continue;
    }

    // Create the route
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

  // Link routes to requests (assuming a 1:1 relationship for simplicity)
  const pairCount = Math.min(createdRequests.length, routeIds.length);
  
  for (let i = 0; i < pairCount; i++) {
    await prisma.route_Request.create({
      data: {
        request_id: createdRequests[i],
        route_id: routeIds[i],
      },
    });
  }

  // Create receipts linked to requests and routes
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

  for (const dummyReceipt of RECEIPTS) {
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
        exch_rate: dummyReceipt.exch_rate,
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
        society_id: 1,
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


/**
 * Create or update society groups
 * @returns {Promise<void>}
 * @throws Will throw an error if there is an issue creating or updating society groups.
 */
async function seedDummySocietyGroups() {
  console.log('Creating dummy society groups...');
  for (const group of SOCIETY_GROUPS) {
    await prisma.societyGroup.upsert({
      where: { id: group.id },
      create: { id: group.id, description: group.description },
      update: { description: group.description },
    });
  }
  console.log(`Created ${SOCIETY_GROUPS.length} dummy society groups`);
}

/**
 * Create or update societies
 * @returns {Promise<void>}
 * @throws Will throw an error if there is an issue creating or updating societies.
 */
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
  console.log(`Created ${SOCIETIES.length} dummy societies`);
}

/**
 * Create base data for each society
 * @returns {Promise<void>}
 * @throws Will throw an error if there is an issue creating the base data.
 */
async function seedReferenceDataForDummySocieties() {
  console.log('Creating base data for dummy societies...');

  const societies = await prisma.society.findMany({
    select: { id: true },
  });

  for (const society of societies) {
    await seedReferenceData(prisma, society.id);
  }

  console.log(`Created base data for ${societies.length} societies`);
}

/**
 * Seed the database with dummy data
 * @returns {Promise<void>} Resolves when seeding is complete.
 * @throws Will throw an error if there is an issue during the seeding process.
 */
async function seedDummyData() {
  await seedDummySocietyGroups();
  await seedDummySocieties();
  await seedReferenceDataForDummySocieties();

  // Get all societies to link with cost centers, departments, and users
  const societies = await prisma.society.findMany({
    select: { id: true },
  });

  await seedDummyCostCenters(societies);
  await seedDummyDepartments(societies);
  await seedDummyAccountability(societies);
  await seedDummyUsers();
  await seedDummyRequests();
}

// Main function to run the seed
async function main() {
  console.log('Starting dummy data seed...');

  try {
    await seedBaseData();
    await seedDummyData();

    console.log('\nSeed with dummy data completed successfully!');
  } catch (error) {
    console.error('Error during dummy seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Check if the script is being run directly and execute the main function if so
const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
