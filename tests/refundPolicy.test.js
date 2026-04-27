/**
 * Refund Policy Tests
 *
 * Keeps the fixture self-contained and skips cleanly when the local MariaDB
 * connection is unavailable.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../lib/prisma.js';

const runId = Date.now();
const shortId = String(runId).slice(-6);

const fixtureIds = {
  societyGroupId: null,
  societyId: null,
  refundPolicyId: null,
  roleId: null,
  userId: null,
  receiptTypeId: null,
  requestStatusId: null,
  requestId: null,
};

const databaseCheck = await (async () => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    return { available: true, reason: '' };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
})();

const refundPolicyTest = databaseCheck.available ? test : test.skip;

refundPolicyTest('Refund policy limits can be represented on receipts with a self-contained fixture', async () => {
  const receiptAmounts = [50, 2500, 6000];

  try {
    const societyGroup = await prisma.societyGroup.create({
      data: {
        description: `Test Group ${runId}`,
        is_default: false,
      },
    });
    fixtureIds.societyGroupId = societyGroup.id;

    const society = await prisma.society.create({
      data: {
        description: `TS${shortId}`,
        local_currency: 'MXN',
        society_group_id: societyGroup.id,
        is_default: false,
      },
    });
    fixtureIds.societyId = society.id;

    const refundPolicy = await prisma.refundPolicy.create({
      data: {
        policy_name: `Refund Policy ${runId}`,
        min_amount: 100,
        max_amount: 5000,
        submission_deadline_days: 30,
        society_group_id: societyGroup.id,
        is_default: false,
        active: true,
      },
    });
    fixtureIds.refundPolicyId = refundPolicy.policy_id;

    assert.equal(refundPolicy.min_amount, 100);
    assert.equal(refundPolicy.max_amount, 5000);
    assert.equal(refundPolicy.submission_deadline_days, 30);

    const role = await prisma.role.create({
      data: {
        role_name: `Rol Test ${runId}`,
        society_group_id: societyGroup.id,
        active: true,
        is_default: false,
        is_system: false,
      },
    });
    fixtureIds.roleId = role.role_id;

    const user = await prisma.user.create({
      data: {
        user_name: `testuser_${runId}`,
        email: `test_${runId}@test.local`,
        password: 'hashedpassword123',
        society_id: society.id,
        role_id: role.role_id,
      },
    });
    fixtureIds.userId = user.user_id;

    const receiptType = await prisma.receipt_Type.create({
      data: {
        receipt_type_name: `TP-${shortId}`,
      },
    });
    fixtureIds.receiptTypeId = receiptType.receipt_type_id;

    const requestStatus = await prisma.request_status.create({
      data: {
        status: `TEST_STATUS_${runId}`,
        is_exported: false,
      },
    });
    fixtureIds.requestStatusId = requestStatus.request_status_id;

    const request = await prisma.request.create({
      data: {
        user_id: user.user_id,
        request_status_id: requestStatus.request_status_id,
        society_id: society.id,
        notes: 'Solicitud de prueba',
        requested_fee: 0,
        currency: 'MXN',
      },
    });
    fixtureIds.requestId = request.request_id;

    for (const amount of receiptAmounts) {
      const exceedsPolicyLimit = amount < refundPolicy.min_amount || amount > refundPolicy.max_amount;

      const receipt = await prisma.receipt.create({
        data: {
          receipt_type_id: receiptType.receipt_type_id,
          request_id: request.request_id,
          amount,
          currency: 'MXN',
          society_id: society.id,
          exceeds_policy_limit: exceedsPolicyLimit,
        },
      });

      assert.ok(receipt.receipt_id);
      assert.equal(receipt.exceeds_policy_limit, exceedsPolicyLimit);
    }

    const receipts = await prisma.receipt.findMany({
      where: { request_id: request.request_id },
      orderBy: { amount: 'asc' },
    });

    assert.equal(receipts.length, 3);
    assert.deepEqual(
      receipts.map((receipt) => ({ amount: receipt.amount, exceeds: receipt.exceeds_policy_limit })),
      [
        { amount: 50, exceeds: true },
        { amount: 2500, exceeds: false },
        { amount: 6000, exceeds: true },
      ]
    );
  } finally {
    if (fixtureIds.requestId) {
      await prisma.receipt.deleteMany({ where: { request_id: fixtureIds.requestId } });
      await prisma.alert.deleteMany({ where: { request_id: fixtureIds.requestId } });
      await prisma.refund.deleteMany({ where: { request_id: fixtureIds.requestId } });
      await prisma.route_Request.deleteMany({ where: { request_id: fixtureIds.requestId } });
      await prisma.policyExport.deleteMany({ where: { request_id: fixtureIds.requestId } });
      await prisma.request.deleteMany({ where: { request_id: fixtureIds.requestId } });
    }

    if (fixtureIds.userId) {
      await prisma.user.deleteMany({ where: { user_id: fixtureIds.userId } });
    }

    if (fixtureIds.roleId) {
      await prisma.role.deleteMany({ where: { role_id: fixtureIds.roleId } });
    }

    if (fixtureIds.refundPolicyId) {
      await prisma.refundPolicy.deleteMany({ where: { policy_id: fixtureIds.refundPolicyId } });
    }

    if (fixtureIds.requestStatusId) {
      await prisma.request_status.deleteMany({ where: { request_status_id: fixtureIds.requestStatusId } });
    }

    if (fixtureIds.receiptTypeId) {
      await prisma.receipt_Type.deleteMany({ where: { receipt_type_id: fixtureIds.receiptTypeId } });
    }

    if (fixtureIds.societyId) {
      await prisma.society.deleteMany({ where: { id: fixtureIds.societyId } });
    }

    if (fixtureIds.societyGroupId) {
      await prisma.societyGroup.deleteMany({ where: { id: fixtureIds.societyGroupId } });
    }
  }
});

test('Disconnect from database', async () => {
  await prisma.$disconnect();
});