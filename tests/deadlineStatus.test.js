import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReimbursementPolicyService } from '../services/reimbursementPolicyService.js';

// Shared policy stub — a single rule with 5-day submission window for Hospedaje
const basePolicy = {
  policy_id: 1,
  policy_code: 'POL-TEST',
  policy_name: 'Test Policy',
  assignments: [{ department_id: 10, active: true }],
  rules: [
    {
      rule_id: 1,
      receipt_type_id: 2,
      receipt_type_name: 'Hospedaje',
      trip_scope: 'NACIONAL',
      max_amount_mxn: 5000,
      submission_deadline_days: 5,
      requires_xml: false,
      allow_foreign_without_xml: false,
      refundable: true,
      active: true,
    },
  ],
};

function buildRequestContext(routeEndingDate) {
  return {
    request: { request_id: 1, user_id: 1, creation_date: '2026-01-01', department_id: 10 },
    routes: [
      {
        route_id: 1,
        origin_country: 'México',
        destination_country: 'México',
        ending_date: routeEndingDate,
      },
    ],
    receipts: [],
  };
}

function buildServiceWithPolicy(routeEndingDate, policy = basePolicy) {
  return buildReimbursementPolicyService({
    policyModel: {
      async getRequestEvaluationContext() {
        return buildRequestContext(routeEndingDate);
      },
      async getActivePolicyByDepartment() {
        return policy;
      },
    },
    seriesResolver: () => null,
    exchangeRateResolver: async () => null,
  });
}

test('getRequestDeadlineStatus — within deadline returns is_within_deadline true', async () => {
  // Route ended today — deadline is today + 5 days, so still open
  const today = new Date().toISOString().split('T')[0];
  const service = buildServiceWithPolicy(today);

  const status = await service.getRequestDeadlineStatus(1);

  assert.equal(status.policy_configured, true);
  assert.equal(status.is_within_deadline, true);
  assert.equal(status.trip_scope, 'NACIONAL');
  assert.equal(status.per_rule_deadlines.length, 1);
  assert.equal(status.per_rule_deadlines[0].receipt_type_id, 2);
  assert.ok(status.per_rule_deadlines[0].days_remaining >= 0);
  assert.equal(status.per_rule_deadlines[0].is_within_deadline, true);
});

test('getRequestDeadlineStatus — expired deadline returns is_within_deadline false', async () => {
  // Route ended 10 days ago — 5-day window closed 5 days ago
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const service = buildServiceWithPolicy(tenDaysAgo);

  const status = await service.getRequestDeadlineStatus(1);

  assert.equal(status.policy_configured, true);
  assert.equal(status.is_within_deadline, false);
  assert.ok(status.per_rule_deadlines[0].days_remaining < 0);
  assert.equal(status.per_rule_deadlines[0].is_within_deadline, false);
});

test('getRequestDeadlineStatus — exactly on deadline day is still within deadline', async () => {
  // Route ended 5 days ago — today is the last allowed day
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const service = buildServiceWithPolicy(fiveDaysAgo);

  const status = await service.getRequestDeadlineStatus(1);

  assert.equal(status.is_within_deadline, true);
  assert.ok(status.per_rule_deadlines[0].days_remaining >= 0);
});

test('getRequestDeadlineStatus — no active policy returns policy_configured false and allows submission', async () => {
  const service = buildReimbursementPolicyService({
    policyModel: {
      async getRequestEvaluationContext() {
        return buildRequestContext(new Date().toISOString().split('T')[0]);
      },
      async getActivePolicyByDepartment() {
        return null; // No active policy
      },
    },
    seriesResolver: () => null,
    exchangeRateResolver: async () => null,
  });

  const status = await service.getRequestDeadlineStatus(1);

  assert.equal(status.policy_configured, false);
  assert.equal(status.is_within_deadline, true);
});

test('getRequestDeadlineStatus — multi-route trip uses latest ending_date for deadline', async () => {
  // Three routes: ended 8, 3, and 1 day(s) ago. Latest is 1 day ago.
  // With a 5-day window the deadline is 1 day ago + 5 = 4 days from now → still open.
  // If the code wrongly used the earliest route (8 days ago), deadline would be expired.
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const service = buildReimbursementPolicyService({
    policyModel: {
      async getRequestEvaluationContext() {
        return {
          request: { request_id: 1, user_id: 1, creation_date: '2026-01-01', department_id: 10 },
          routes: [
            { route_id: 1, origin_country: 'México', destination_country: 'México', ending_date: daysAgo(8) },
            { route_id: 2, origin_country: 'México', destination_country: 'México', ending_date: daysAgo(3) },
            { route_id: 3, origin_country: 'México', destination_country: 'México', ending_date: daysAgo(1) },
          ],
          receipts: [],
        };
      },
      async getActivePolicyByDepartment() { return basePolicy; },
    },
    seriesResolver: () => null,
    exchangeRateResolver: async () => null,
  });

  const status = await service.getRequestDeadlineStatus(1);

  // Latest route ended 1 day ago + 5-day window = 4 days remaining → open
  assert.equal(status.is_within_deadline, true);
  assert.ok(status.per_rule_deadlines[0].days_remaining > 0);
});

test('getRequestDeadlineStatus — rule without deadline_days is excluded from per_rule_deadlines', async () => {
  const policyNoDeadline = {
    ...basePolicy,
    rules: [{ ...basePolicy.rules[0], submission_deadline_days: null }],
  };
  const service = buildServiceWithPolicy(new Date().toISOString().split('T')[0], policyNoDeadline);

  const status = await service.getRequestDeadlineStatus(1);

  assert.equal(status.policy_configured, true);
  assert.equal(status.per_rule_deadlines.length, 0);
  assert.equal(status.is_within_deadline, true); // No rules with deadlines = open
});
