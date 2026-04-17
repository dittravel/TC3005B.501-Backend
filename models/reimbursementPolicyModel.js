/**
 * Reimbursement Policy Model
 *
 * Data access layer for reimbursement policies, assignments, and rules.
 * It also provides the request context needed to evaluate reimbursements.
 */

import { prisma } from '../lib/prisma.js';

const OPEN_ENDED_DATE = '9999-12-31';

function normalizePolicyRow(row) {
  if (!row) {
    return null;
  }

  return {
    policy_id: row.policy_id,
    policy_code: row.policy_code,
    policy_name: row.policy_name,
    description: row.description,
    base_currency: row.base_currency,
    effective_from: row.effective_from,
    effective_to: row.effective_to,
    active: Boolean(row.active),
    created_by: row.created_by,
    creation_date: row.creation_date,
    last_mod_date: row.last_mod_date,
  };
}

async function insertAssignments(tx, policyId, assignments) {
  if (!assignments?.length) {
    return;
  }

  await tx.reimbursement_Policy_Assignment.createMany({
    data: assignments.map((assignment) => ({
      policy_id: policyId,
      department_id: assignment.department_id ?? null,
      active: assignment.active,
    })),
  });
}

async function insertRules(tx, policyId, rules) {
  if (!rules?.length) {
    return;
  }

  await tx.reimbursement_Policy_Rule.createMany({
    data: rules.map((rule) => ({
      policy_id: policyId,
      receipt_type_id: rule.receipt_type_id,
      trip_scope: rule.trip_scope,
      max_amount_mxn: rule.max_amount_mxn,
      submission_deadline_days: rule.submission_deadline_days,
      requires_xml: rule.requires_xml,
      allow_foreign_without_xml: rule.allow_foreign_without_xml,
      refundable: rule.refundable,
      active: rule.active,
    })),
  });
}

const ReimbursementPolicyModel = {
  async getPolicyList() {
    const policies = await prisma.reimbursement_Policy.findMany({
      orderBy: [
        { active: 'desc' },
        { effective_from: 'desc' },
        { policy_name: 'asc' },
      ],
      include: {
        Reimbursement_Policy_Assignment: true,
        Reimbursement_Policy_Rule: true,
      },
    });

    return policies.map((row) => ({
      policy_id: row.policy_id,
      policy_code: row.policy_code,
      policy_name: row.policy_name,
      base_currency: row.base_currency,
      effective_from: row.effective_from,
      effective_to: row.effective_to,
      active: Boolean(row.active),
      assignment_count: row.Reimbursement_Policy_Assignment.filter((a) => a.active).length,
      rule_count: row.Reimbursement_Policy_Rule.filter((r) => r.active).length,
    }));
  },

  async getPolicyById(policyId) {
    const policy = await prisma.reimbursement_Policy.findUnique({
      where: { policy_id: policyId },
      include: {
        Reimbursement_Policy_Assignment: {
          include: {
            Department: true,
          },
          orderBy: [{ department_id: 'asc' }],
        },
        Reimbursement_Policy_Rule: {
          include: {
            Receipt_Type: true,
          },
          orderBy: [
            { receipt_type_id: 'asc' },
            { trip_scope: 'asc' },
          ],
        },
      },
    });

    if (!policy) return null;

    return {
      ...normalizePolicyRow(policy),
      assignments: policy.Reimbursement_Policy_Assignment.map((a) => ({
        assignment_id: a.assignment_id,
        department_id: a.department_id,
        department_name: a.Department?.department_name ?? null,
        active: Boolean(a.active),
        creation_date: a.creation_date,
      })),
      rules: policy.Reimbursement_Policy_Rule.map((r) => ({
        rule_id: r.rule_id,
        receipt_type_id: r.receipt_type_id,
        receipt_type_name: r.Receipt_Type?.receipt_type_name ?? null,
        trip_scope: r.trip_scope,
        max_amount_mxn: Number(r.max_amount_mxn),
        submission_deadline_days: r.submission_deadline_days,
        requires_xml: Boolean(r.requires_xml),
        allow_foreign_without_xml: Boolean(r.allow_foreign_without_xml),
        refundable: Boolean(r.refundable),
        active: Boolean(r.active),
        creation_date: r.creation_date,
        last_mod_date: r.last_mod_date,
      })),
    };
  },

  async createPolicyGraph(policyData, createdBy) {
    const created = await prisma.$transaction(async (tx) => {
      const policy = await tx.reimbursement_Policy.create({
        data: {
          policy_code: policyData.policy_code,
          policy_name: policyData.policy_name,
          description: policyData.description,
          base_currency: policyData.base_currency,
          effective_from: policyData.effective_from,
          effective_to: policyData.effective_to,
          active: policyData.active,
          created_by: createdBy,
        },
      });

      await insertAssignments(tx, policy.policy_id, policyData.assignments);
      await insertRules(tx, policy.policy_id, policyData.rules);

      return policy;
    });

    return this.getPolicyById(created.policy_id);
  },

  async updatePolicyGraph(policyId, policyData) {
    await prisma.$transaction(async (tx) => {
      await tx.reimbursement_Policy.update({
        where: { policy_id: policyId },
        data: {
          policy_code: policyData.policy_code,
          policy_name: policyData.policy_name,
          description: policyData.description,
          base_currency: policyData.base_currency,
          effective_from: policyData.effective_from,
          effective_to: policyData.effective_to,
          active: policyData.active,
        },
      });

      await tx.reimbursement_Policy_Assignment.deleteMany({
        where: { policy_id: policyId },
      });

      await tx.reimbursement_Policy_Rule.deleteMany({
        where: { policy_id: policyId },
      });

      await insertAssignments(tx, policyId, policyData.assignments);
      await insertRules(tx, policyId, policyData.rules);
    });

    return this.getPolicyById(policyId);
  },

  async deactivatePolicy(policyId) {
    const result = await prisma.reimbursement_Policy.updateMany({
      where: { policy_id: policyId },
      data: { active: false },
    });

    return result.count > 0;
  },

  async findAssignmentConflict(departmentId, effectiveFrom, effectiveTo, excludePolicyId = null) {
    const overlapUpper = effectiveTo || OPEN_ENDED_DATE;
    const conflict = await prisma.reimbursement_Policy_Assignment.findFirst({
      where: {
        active: true,
        department_id: departmentId,
        Reimbursement_Policy: {
          active: true,
          policy_id: { not: excludePolicyId || 0 },
          effective_from: { lte: new Date(overlapUpper) },
          OR: [
            { effective_to: null },
            { effective_to: { gte: new Date(effectiveFrom) } },
          ],
        },
      },
      include: {
        Reimbursement_Policy: {
          select: {
            policy_id: true,
            policy_code: true,
            policy_name: true,
          },
        },
      },
    });

    if (!conflict) return null;

    return {
      policy_id: conflict.Reimbursement_Policy.policy_id,
      policy_code: conflict.Reimbursement_Policy.policy_code,
      policy_name: conflict.Reimbursement_Policy.policy_name,
      department_id: conflict.department_id,
    };
  },

  async findReceiptTypeById(receiptTypeId) {
    const row = await prisma.receipt_Type.findUnique({
      where: { receipt_type_id: receiptTypeId },
      select: {
        receipt_type_id: true,
        receipt_type_name: true,
      },
    });

    return row || null;
  },

  async findDepartmentById(departmentId) {
    const row = await prisma.department.findUnique({
      where: { department_id: departmentId },
      select: {
        department_id: true,
        department_name: true,
      },
    });

    return row || null;
  },

  async getActivePolicyByDepartment(departmentId, referenceDate) {
    const ref = new Date(referenceDate);
    const baseWhere = {
      active: true,
      Reimbursement_Policy: {
        active: true,
        effective_from: { lte: ref },
        OR: [{ effective_to: null }, { effective_to: { gte: ref } }],
      },
    };

    let assignment = await prisma.reimbursement_Policy_Assignment.findFirst({
      where: {
        ...baseWhere,
        department_id: departmentId,
      },
      orderBy: [
        { Reimbursement_Policy: { effective_from: 'desc' } },
        { Reimbursement_Policy: { policy_id: 'desc' } },
      ],
      include: {
        Reimbursement_Policy: {
          select: {
            policy_id: true,
          },
        },
      },
    });

    if (!assignment) {
      assignment = await prisma.reimbursement_Policy_Assignment.findFirst({
        where: {
          ...baseWhere,
          department_id: null,
        },
        orderBy: [
          { Reimbursement_Policy: { effective_from: 'desc' } },
          { Reimbursement_Policy: { policy_id: 'desc' } },
        ],
        include: {
          Reimbursement_Policy: {
            select: {
              policy_id: true,
            },
          },
        },
      });
    }

    if (!assignment) return null;
    return this.getPolicyById(assignment.Reimbursement_Policy.policy_id);
  },

  async getRequestEvaluationContext(requestId) {
    const request = await prisma.request.findUnique({
      where: { request_id: requestId },
      select: {
        request_id: true,
        user_id: true,
        society_id: true,
        creation_date: true,
        requester: {
          select: { department_id: true },
        },
        Society: {
          select: { local_currency: true },
        },
      },
    });
    if (!request) return null;

    const routeRequests = await prisma.route_Request.findMany({
      where: { request_id: requestId },
      orderBy: [
        { Route: { router_index: 'asc' } },
        { Route: { route_id: 'asc' } },
      ],
      select: {
        Route: {
          select: {
            route_id: true,
            ending_date: true,
            originCountry: { select: { country_name: true } },
            destinationCountry: { select: { country_name: true } },
          },
        },
      },
    });

    const routes = routeRequests.map((row) => ({
      route_id: row.Route?.route_id,
      origin_country: row.Route?.originCountry?.country_name,
      destination_country: row.Route?.destinationCountry?.country_name,
      ending_date: row.Route?.ending_date,
    }));

    const receipts = await prisma.receipt.findMany({
      where: { request_id: requestId },
      orderBy: { receipt_id: 'asc' },
      select: {
        receipt_id: true,
        receipt_type_id: true,
        Receipt_Type: { select: { receipt_type_name: true } },
        route_id: true,
        validation: true,
        amount: true,
        currency: true,
        refund: true,
        submission_date: true,
        receipt_date: true,
        xml_file_id: true,
        xml_file_name: true,
        xml_uuid: true,
        Route: { select: { ending_date: true } },
      },
    });

    const maxEnding = routes.reduce((max, route) => {
      if (route.ending_date && (!max || route.ending_date > max)) return route.ending_date;
      return max;
    }, null);

    return {
      request: {
        request_id: request.request_id,
        user_id: request.user_id,
        society_id: request.society_id,
        local_currency: request.Society?.local_currency,
        creation_date: request.creation_date,
        department_id: request.requester?.department_id,
      },
      routes,
      receipts: receipts.map((receipt) => ({
        receipt_id: receipt.receipt_id,
        receipt_type_id: receipt.receipt_type_id,
        receipt_type_name: receipt.Receipt_Type?.receipt_type_name ?? null,
        route_id: receipt.route_id,
        validation: receipt.validation,
        amount: Number(receipt.amount),
        currency: receipt.currency,
        refund: Boolean(receipt.refund),
        submission_date: receipt.submission_date,
        receipt_date: receipt.receipt_date,
        xml_file_id: receipt.xml_file_id,
        xml_file_name: receipt.xml_file_name,
        xml_uuid: receipt.xml_uuid,
        reference_end_date: receipt.Route?.ending_date || maxEnding,
      })),
    };
  },
};

export default ReimbursementPolicyModel;
