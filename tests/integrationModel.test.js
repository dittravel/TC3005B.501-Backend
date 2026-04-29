import assert from 'node:assert/strict';
import test, { after } from 'node:test';

import { prisma } from '../lib/prisma.js';
import { buildIntegrationModel } from '../models/integrationModel.js';

after(async () => {
  await prisma.$disconnect();
});

const databaseCheck = await (async () => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    return { available: true };
  } catch {
    return { available: false };
  }
})();

const integrationTest = databaseCheck.available ? test : test.skip;

integrationTest('getERPEmployees falls back to null reports_to when boss_id is missing in the schema', async () => {
  // Create test data
  const role = await prisma.role.create({
    data: {
      role_name: 'Test Role',
    },
  });

  const costCenter = await prisma.costCenter.create({
    data: {
      cost_center_code: 1001,
      cost_center_name: 'TEST-CC',
    },
  });

  const department = await prisma.department.create({
    data: {
      department_name: 'Test Department',
      cost_center_id: costCenter.cost_center_id,
    },
  });

  const testUser = await prisma.user.create({
    data: {
      user_name: 'test_admin',
      email: 'test@example.com',
      password: 'hashed_password_test',
      phone_number: '1234567890',
      workstation: 'TEST-WS',
      active: true,
      role_id: role.role_id,
      department_id: department.department_id,
      // boss_id is intentionally null to test fallback
    },
  });

  const model = buildIntegrationModel();

  const result = await model.getERPEmployees({
    updated_since: null,
    department_id: null,
    active_only: true,
    limit: 50,
    offset: 0,
  });

  // Verify the test user is in the results
  const foundUser = result.rows.find(u => u.user_id === testUser.user_id);

  assert.ok(foundUser, 'Test user should be in results');
  assert.equal(foundUser.boss_id, null, 'boss_id should be null');
  assert.equal(foundUser.role_name, 'Test Role', 'role_name should be populated');
  assert.equal(foundUser.department_name, 'Test Department', 'department_name should be populated');

  // Cleanup
  await prisma.user.delete({ where: { user_id: testUser.user_id } });
  await prisma.department.delete({ where: { department_id: department.department_id } });
  await prisma.costCenter.delete({ where: { cost_center_id: costCenter.cost_center_id } });
  await prisma.role.delete({ where: { role_id: role.role_id } });
});
