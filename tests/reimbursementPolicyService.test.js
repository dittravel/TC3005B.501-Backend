import assert from 'node:assert/strict';
import test, { after } from 'node:test';

import pool from '../database/config/db.js';
import { buildReimbursementPolicyService } from '../services/reimbursementPolicyService.js';

after(async () => {
  await pool.end();
});

function createRule(overrides = {}) {
  return {
    rule_id: 10,
    receipt_type_id: 1,
    receipt_type_name: 'Hospedaje',
    trip_scope: 'NACIONAL',
    max_amount_mxn: 2000,
    submission_deadline_days: null,
    requires_xml: false,
    allow_foreign_without_xml: true,
    refundable: true,
    ...overrides,
  };
}

function createPolicy(overrides = {}) {
  return {
    policy_id: 3,
    policy_code: 'DITTA_GENERAL_2026',
    policy_name: 'Politica general 2026',
    assignments: [{ department_id: 7 }],
    rules: [createRule()],
    ...overrides,
  };
}

function createEvaluationContext(overrides = {}) {
  return {
    request: {
      request_id: 52,
      user_id: 5,
      creation_date: '2026-03-15T00:00:00.000Z',
      department_id: 7,
    },
    routes: [
      {
        route_id: 24,
        origin_country: 'México',
        destination_country: 'México',
        ending_date: '2026-03-10',
      },
    ],
    receipts: [
      {
        receipt_id: 91,
        receipt_type_id: 1,
        receipt_type_name: 'Hospedaje',
        route_id: 24,
        validation: 0,
        amount: 1500,
        currency: 'MXN',
        refund: true,
        submission_date: '2026-03-12',
        xml_file_id: null,
        xml_file_name: null,
        xml_uuid: null,
        reference_end_date: '2026-03-10',
      },
    ],
    ...overrides,
  };
}

function createModel(overrides = {}) {
  return {
    async getPolicyList() {
      throw new Error('Unexpected getPolicyList call');
    },
    async getPolicyById() {
      throw new Error('Unexpected getPolicyById call');
    },
    async createPolicyGraph() {
      throw new Error('Unexpected createPolicyGraph call');
    },
    async updatePolicyGraph() {
      throw new Error('Unexpected updatePolicyGraph call');
    },
    async deactivatePolicy() {
      throw new Error('Unexpected deactivatePolicy call');
    },
    async findAssignmentConflict() {
      return null;
    },
    async findReceiptTypeById() {
      return { receipt_type_id: 1, receipt_type_name: 'Hospedaje' };
    },
    async findDepartmentById(departmentId) {
      return { department_id: departmentId, department_name: 'Consultoria' };
    },
    async getActivePolicyByDepartment() {
      return createPolicy();
    },
    async getRequestEvaluationContext() {
      return createEvaluationContext();
    },
    ...overrides,
  };
}

test('getActivePolicy resolves department-scoped assignments', async () => {
  const service = buildReimbursementPolicyService({
    policyModel: createModel({
      async getActivePolicyByDepartment(departmentId, referenceDate) {
        assert.equal(departmentId, 7);
        assert.equal(referenceDate, '2026-03-20');
        return createPolicy({
          assignments: [
            { department_id: 7 },
            { department_id: null },
          ],
        });
      },
    }),
  });

  const result = await service.getActivePolicy(7, '2026-03-20');

  assert.equal(result.policy_reference_date, '2026-03-20');
  assert.equal(result.resolution_scope, 'DEPARTMENT');
  assert.equal(result.policy_code, 'DITTA_GENERAL_2026');
});

test('evaluateRequest blocks applicants from evaluating another user request', async () => {
  const service = buildReimbursementPolicyService({
    policyModel: createModel(),
  });

  await assert.rejects(
    service.evaluateRequest(52, { role: 'Solicitante', user_id: 999 }),
    (error) => {
      assert.equal(error.status, 403);
      assert.equal(error.message, 'Applicants can only evaluate their own requests');
      return true;
    }
  );
});

test('evaluateRequest rejects receipts with missing currency', async () => {
  const service = buildReimbursementPolicyService({
    policyModel: createModel({
      async getRequestEvaluationContext() {
        return createEvaluationContext({
          receipts: [
            {
              ...createEvaluationContext().receipts[0],
              currency: null,
            },
          ],
        });
      },
    }),
  });

  const result = await service.evaluateRequest(52, { role: 'Administrador', user_id: 1 });
  const [receipt] = result.receipts;

  assert.equal(receipt.evaluation_status, 'REJECTED');
  assert.deepEqual(receipt.violations, ['MISSING_CURRENCY']);
  assert.equal(receipt.amount_mxn, null);
  assert.equal(result.summary.has_blocking_violations, true);
});

test('evaluateRequest caps reimbursable amount when policy cap is exceeded', async () => {
  const service = buildReimbursementPolicyService({
    policyModel: createModel({
      async getActivePolicyByDepartment() {
        return createPolicy({
          rules: [
            createRule({
              max_amount_mxn: 1000,
            }),
          ],
        });
      },
    }),
  });

  const result = await service.evaluateRequest(52, { role: 'Administrador', user_id: 1 });
  const [receipt] = result.receipts;

  assert.equal(receipt.evaluation_status, 'WARNING');
  assert.deepEqual(receipt.violations, ['AMOUNT_EXCEEDS_POLICY_CAP']);
  assert.equal(receipt.reimbursable_mxn, 1000);
  assert.equal(receipt.non_reimbursable_mxn, 500);
  assert.equal(result.summary.has_blocking_violations, false);
});

test('evaluateRequest allows submissions through the full deadline day', async () => {
  const service = buildReimbursementPolicyService({
    policyModel: createModel({
      async getActivePolicyByDepartment() {
        return createPolicy({
          rules: [
            createRule({
              submission_deadline_days: 2,
            }),
          ],
        });
      },
      async getRequestEvaluationContext() {
        return createEvaluationContext({
          receipts: [
            {
              ...createEvaluationContext().receipts[0],
              submission_date: '2026-03-12T23:59:59.000Z',
              reference_end_date: '2026-03-10',
            },
          ],
        });
      },
    }),
  });

  const result = await service.evaluateRequest(52, { role: 'Administrador', user_id: 1 });
  const [receipt] = result.receipts;

  assert.equal(receipt.evaluation_status, 'OK');
  assert.deepEqual(receipt.violations, []);
});

test('evaluateRequest allows foreign receipts without XML for international trips and reuses conversion lookups', async () => {
  let seriesLookupCount = 0;
  let exchangeLookupCount = 0;

  const service = buildReimbursementPolicyService({
    policyModel: createModel({
      async getActivePolicyByDepartment() {
        return createPolicy({
          rules: [
            createRule({
              trip_scope: 'INTERNACIONAL',
              max_amount_mxn: 1000,
              requires_xml: true,
              allow_foreign_without_xml: true,
            }),
          ],
        });
      },
      async getRequestEvaluationContext() {
        return createEvaluationContext({
          routes: [
            {
              route_id: 24,
              origin_country: 'México',
              destination_country: 'Estados Unidos',
              ending_date: '2026-03-10',
            },
          ],
          receipts: [
            {
              ...createEvaluationContext().receipts[0],
              amount: 20,
              currency: 'USD',
            },
            {
              ...createEvaluationContext().receipts[0],
              receipt_id: 92,
              amount: 10,
              currency: 'USD',
            },
          ],
        });
      },
    }),
    seriesResolver: async (currency) => {
      seriesLookupCount += 1;
      assert.equal(currency, 'USD');
      return { id: 'SF43718' };
    },
    exchangeRateResolver: async (seriesId) => {
      exchangeLookupCount += 1;
      assert.equal(seriesId, 'SF43718');
      return { rate: 20, source: 'test-rate', timestamp: 1711497600000 };
    },
  });

  const result = await service.evaluateRequest(52, { role: 'Administrador', user_id: 1 });

  assert.equal(result.trip_scope, 'INTERNACIONAL');
  assert.equal(seriesLookupCount, 1);
  assert.equal(exchangeLookupCount, 1);
  assert.equal(result.summary.total_mxn, 600);
  assert.equal(result.summary.total_reimbursable_mxn, 600);
  assert.deepEqual(result.receipts.map((receipt) => receipt.evaluation_status), ['OK', 'OK']);
  assert.ok(result.receipts.every((receipt) => !receipt.violations.includes('XML_REQUIRED')));
});
