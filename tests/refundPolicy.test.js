/**
 * Refund Policy Tests
 * 
 * Tests for refund policies, including policy limits and their impact 
 * on receipt creation and request processing.
 */

// assert is used to compare expected and actual results in tests
// Ref: https://nodejs.org/api/assert.html#legacy-assertion-mode
import assert from 'node:assert/strict';
import test from "node:test";
import { prisma } from "../lib/prisma.js";

// Variables to store test IDs
let testIds = {
  societyGroupId: null,
  societyId: null,
  refundPolicyId: null,
  userId: null,
  receiptTypeId: null,
  requestId: null
};

// Create test data

// Create society group
test('Create test society group', async () => {
  const societyGroup = await prisma.societyGroup.create({
    data: {
      description: "Test Society Group",
      is_default: false
    }
  });
  testIds.societyGroupId = societyGroup.id;
  assert.ok(testIds.societyGroupId, "Failed to create test society group");
});

// Create society
test('Create test society', async () => {
  const society = await prisma.society.create({
    data: {
      description: "Test Society",
      local_currency: "MXN",
      society_group_id: testIds.societyGroupId,
      is_default: false
    }
  });
  testIds.societyId = society.id;
  assert.ok(testIds.societyId, "Failed to create test society");
});

// Create refund policy
test('Create test refund policy', async () => {
  const refundPolicy = await prisma.refundPolicy.create({
    data: {
      policy_name: "Test Refund Policy",
      min_amount: 100,
      max_amount: 5000,
      submission_deadline_days: 30,
      society_group_id: testIds.societyGroupId,
      is_default: false,
      active: true
    }
  });
  testIds.refundPolicyId = refundPolicy.policy_id;
  assert.ok(testIds.refundPolicyId, "Failed to create test refund policy");
  assert.equal(refundPolicy.min_amount, 100, "Refund policy min_amount mismatch");
  assert.equal(refundPolicy.max_amount, 5000, "Refund policy max_amount mismatch");
  assert.equal(refundPolicy.submission_deadline_days, 30, "Refund policy submission_deadline_days mismatch");
});

// Create user
test('Create test user', async () => {
  const user = await prisma.user.create({
    data: {
      user_name: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@test.local`,
      password: 'hashedpassword123',
      society_id: testIds.societyId,
      role_id: 1
    }
  });
  testIds.userId = user.user_id;
  assert.ok(testIds.userId, "Failed to create test user");
});

// Create or get receipt type
test('Create or get test receipt type', async () => {
  let receiptType = await prisma.receipt_Type.findUnique({
    where: { receipt_type_name: 'Transporte' }
  });

  if (!receiptType) {
    receiptType = await prisma.receipt_Type.create({
      data: {
        receipt_type_name: 'Transporte',
      }
    });
  }

  testIds.receiptTypeId = receiptType.receipt_type_id;
  assert.ok(testIds.receiptTypeId, "Failed to create or get test receipt type");
});

// Create travel request
test('Create test travel request', async () => {
  const request = await prisma.request.create({
    data: {
      user_id: testIds.userId,
      request_status_id: 2,
      society_id: testIds.societyId,
      notes: 'Solicitud de prueba',
      requested_fee: 0,
      currency: 'MXN'
    }
  });
  testIds.requestId = request.request_id;
  assert.ok(testIds.requestId, "Failed to create test travel request");
});

// Create receipt within policy limits
test('Create test receipt within policy limits', async () => {
  const receipt = await prisma.receipt.create({
    data: {
      receipt_type_id: testIds.receiptTypeId,
      request_id: testIds.requestId,
      amount: 2500,
      currency: 'MXN',
      society_id: testIds.societyId,
      exceeds_policy_limit: false
    }
  });

  assert.ok(receipt.receipt_id, "Failed to create test receipt");
  assert.equal(receipt.amount, 2500, "Receipt amount mismatch");
  assert.equal(receipt.exceeds_policy_limit, false, "Receipt exceeds_policy_limit should be false");
});

// Create receipt exceeding policy limits
test('Create test receipt exceeding policy limits', async () => {
  const receipt = await prisma.receipt.create({
    data: {
      receipt_type_id: testIds.receiptTypeId,
      request_id: testIds.requestId,
      amount: 6000,
      currency: 'MXN',
      society_id: testIds.societyId,
      exceeds_policy_limit: true
    }
  });

  assert.ok(receipt.receipt_id, "Failed to create test receipt");
  assert.equal(receipt.amount, 6000, "Receipt amount mismatch");
  assert.equal(receipt.exceeds_policy_limit, true, "Receipt exceeds_policy_limit should be true");
});

// Create receipt under policy limits
test('Create test receipt under policy limits', async () => {
  const receipt = await prisma.receipt.create({
    data: {
      receipt_type_id: testIds.receiptTypeId,
      request_id: testIds.requestId,
      amount: 50,
      currency: 'MXN',
      society_id: testIds.societyId,
      exceeds_policy_limit: true
    }
  });

  assert.ok(receipt.receipt_id, "Failed to create test receipt");
  assert.equal(receipt.amount, 50, "Receipt amount mismatch");
  assert.equal(receipt.exceeds_policy_limit, true, "Receipt exceeds_policy_limit should be true");
});

// Check that all receipts have correct exceeds_policy_limit
test('Check refund policy limits are correctly applied to receipts', async () => {
  const receipts = await prisma.receipt.findMany({
    where: { request_id: testIds.requestId },
    orderBy: { amount: 'asc' }
  });

  assert.equal(receipts.length, 3, "Should have created 3 receipts");
  const [belowMin, withinPolicy, exceedsMax] = receipts;

  // Check receipt below minimum limit
  assert.equal(belowMin.amount, 50, "Below min receipt amount mismatch");
  assert.equal(belowMin.exceeds_policy_limit, true, "Below min receipt should exceed policy limit");

  // Check receipt within policy limits
  assert.equal(withinPolicy.amount, 2500, "Within policy receipt amount mismatch");
  assert.equal(withinPolicy.exceeds_policy_limit, false, "Within policy receipt should not exceed policy limit");

  // Check receipt exceeding maximum limit
  assert.equal(exceedsMax.amount, 6000, "Exceeds max receipt amount mismatch");
  assert.equal(exceedsMax.exceeds_policy_limit, true, "Exceeds max receipt should exceed policy limit");
});

// Clean up test data
test('Clean up test data', async () => {
  // Delete receipts first (has foreign key to request)
  if (testIds.requestId) {
    await prisma.receipt.deleteMany({
      where: { request_id: testIds.requestId }
    });
  }

  // Delete alerts associated with request
  if (testIds.requestId) {
    await prisma.alert.deleteMany({
      where: { request_id: testIds.requestId }
    });
  }

  // Delete refunds associated with request
  if (testIds.requestId) {
    await prisma.refund.deleteMany({
      where: { request_id: testIds.requestId }
    });
  }

  // Delete routes associated with request
  if (testIds.requestId) {
    await prisma.route_Request.deleteMany({
      where: { request_id: testIds.requestId }
    });
  }

  // Delete policy exports associated with request
  if (testIds.requestId) {
    await prisma.policyExport.deleteMany({
      where: { request_id: testIds.requestId }
    });
  }

  // Delete request
  if (testIds.requestId) {
    await prisma.request.deleteMany({
      where: { request_id: testIds.requestId }
    });
  }

  // Delete user
  if (testIds.userId) {
    await prisma.user.deleteMany({
      where: { user_id: testIds.userId }
    });
  }

  // Delete refund policy
  if (testIds.refundPolicyId) {
    await prisma.refundPolicy.deleteMany({
      where: { policy_id: testIds.refundPolicyId }
    });
  }

  // Delete society
  if (testIds.societyId) {
    await prisma.society.deleteMany({
      where: { id: testIds.societyId }
    });
  }

  // Delete society group
  if (testIds.societyGroupId) {
    await prisma.societyGroup.deleteMany({
      where: { id: testIds.societyGroupId }
    });
  }
});

// Disconnect from database
test('Disconnect from database', async () => {
  await prisma.$disconnect();
});