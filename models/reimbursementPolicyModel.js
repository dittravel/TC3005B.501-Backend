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

function normalizeAssignmentRow(row) {
  return {
    assignment_id: row.assignment_id,
    department_id: row.department_id,
    department_name: row.department_name,
    active: Boolean(row.active),
    creation_date: row.creation_date,
  };
}

function normalizeRuleRow(row) {
  return {
    rule_id: row.rule_id,
    receipt_type_id: row.receipt_type_id,
    receipt_type_name: row.receipt_type_name,
    trip_scope: row.trip_scope,
    max_amount_mxn: Number(row.max_amount_mxn),
    submission_deadline_days: row.submission_deadline_days,
    requires_xml: Boolean(row.requires_xml),
    allow_foreign_without_xml: Boolean(row.allow_foreign_without_xml),
    refundable: Boolean(row.refundable),
    active: Boolean(row.active),
    creation_date: row.creation_date,
    last_mod_date: row.last_mod_date,
  };
}

async function insertAssignments(conn, policyId, assignments) {
  for (const assignment of assignments) {
    await conn.query(
      `INSERT INTO Reimbursement_Policy_Assignment (
         policy_id,
         department_id,
         active
       ) VALUES (?, ?, ?)`,
      [policyId, assignment.department_id, assignment.active]
    );
  }
}

async function insertRules(conn, policyId, rules) {
  for (const rule of rules) {
    await conn.query(
      `INSERT INTO Reimbursement_Policy_Rule (
         policy_id,
         receipt_type_id,
         trip_scope,
         max_amount_mxn,
         submission_deadline_days,
         requires_xml,
         allow_foreign_without_xml,
         refundable,
         active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        policyId,
        rule.receipt_type_id,
        rule.trip_scope,
        rule.max_amount_mxn,
        rule.submission_deadline_days,
        rule.requires_xml,
        rule.allow_foreign_without_xml,
        rule.refundable,
        rule.active,
      ]
    );
  }
}

const ReimbursementPolicyModel = {
  async getPolicyList() {
    // Get all policies with assignment and rule counts
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
      assignment_count: row.Reimbursement_Policy_Assignment.filter(a => a.active).length,
      rule_count: row.Reimbursement_Policy_Rule.filter(r => r.active).length,
    }));
  },

  async getPolicyById(policyId) {
    // Get a policy by ID with assignments and rules
    const policy = await prisma.reimbursement_Policy.findUnique({
      where: { policy_id: policyId },
      include: {
        Reimbursement_Policy_Assignment: {
          include: {
            department: true,
          },
          orderBy: [
            { department_id: 'asc' },
          ],
        },
        Reimbursement_Policy_Rule: {
          include: {
            receipt_type: true,
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
      assignments: policy.Reimbursement_Policy_Assignment.map(a => ({
        assignment_id: a.assignment_id,
        department_id: a.department_id,
        department_name: a.department?.department_name ?? null,
        active: Boolean(a.active),
        creation_date: a.creation_date,
      })),
      rules: policy.Reimbursement_Policy_Rule.map(r => ({
        rule_id: r.rule_id,
        receipt_type_id: r.receipt_type_id,
        receipt_type_name: r.receipt_type?.receipt_type_name ?? null,
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
    const createdPolicy = await prisma.reimbursement_Policy.create({
      data: {
        policy_code: policyData.policy_code,
        policy_name: policyData.policy_name,
        description: policyData.description,
        base_currency: policyData.base_currency,
        effective_from: policyData.effective_from,
        effective_to: policyData.effective_to,
        active: policyData.active,
        created_by: createdBy,
        Reimbursement_Policy_Assignment: {
          create: (policyData.assignments || []).map(a => ({
            department_id: a.department_id,
            active: a.active,
          }))
        },
        Reimbursement_Policy_Rule: {
          create: (policyData.rules || []).map(r => ({
            receipt_type_id: r.receipt_type_id,
            trip_scope: r.trip_scope,
            max_amount_mxn: r.max_amount_mxn,
            submission_deadline_days: r.submission_deadline_days,
            requires_xml: r.requires_xml,
            allow_foreign_without_xml: r.allow_foreign_without_xml,
            refundable: r.refundable,
            active: r.active,
          }))
        }
      },
      include: {
        Reimbursement_Policy_Assignment: true,
        Reimbursement_Policy_Rule: true
      }
    });
    return this.getPolicyById(createdPolicy.policy_id);
  },

  async updatePolicyGraph(policyId, policyData) {
    await prisma.reimbursement_Policy.update({
      where: { policy_id: policyId },
      data: {
        policy_code: policyData.policy_code,
        policy_name: policyData.policy_name,
        description: policyData.description,
        base_currency: policyData.base_currency,
        effective_from: policyData.effective_from,
        effective_to: policyData.effective_to,
        active: policyData.active,
      }
    });

    // Delete old assignments and rules
    await prisma.reimbursement_Policy_Assignment.deleteMany({ where: { policy_id: policyId } });
    await prisma.reimbursement_Policy_Rule.deleteMany({ where: { policy_id: policyId } });

    // Create new assignments and rules
    if (policyData.assignments && policyData.assignments.length > 0) {
      await prisma.reimbursement_Policy_Assignment.createMany({
        data: policyData.assignments.map(a => ({
          policy_id: policyId,
          department_id: a.department_id,
          active: a.active,
        }))
      });
    }
    if (policyData.rules && policyData.rules.length > 0) {
      await prisma.reimbursement_Policy_Rule.createMany({
        data: policyData.rules.map(r => ({
          policy_id: policyId,
          receipt_type_id: r.receipt_type_id,
          trip_scope: r.trip_scope,
          max_amount_mxn: r.max_amount_mxn,
          submission_deadline_days: r.submission_deadline_days,
          requires_xml: r.requires_xml,
          allow_foreign_without_xml: r.allow_foreign_without_xml,
          refundable: r.refundable,
          active: r.active,
        }))
      });
    }
    return this.getPolicyById(policyId);
  },

  async deactivatePolicy(policyId) {
    const result = await prisma.reimbursement_Policy.update({
      where: { policy_id: policyId },
      data: { active: false }
    });
    return !!result;
  },

  async findAssignmentConflict(departmentId, effectiveFrom, effectiveTo, excludePolicyId = null) {
    const conflict = await prisma.reimbursement_Policy.findFirst({
      where: {
        active: true,
        policy_id: { not: excludePolicyId || 0 },
        effective_from: { lte: effectiveTo || OPEN_ENDED_DATE },
        OR: [
          { effective_to: null },
          { effective_to: { gte: effectiveFrom } }
        ],
        Reimbursement_Policy_Assignment: {
          some: {
            active: true,
            department_id: departmentId
          }
        }
      },
      select: {
        policy_id: true,
        policy_code: true,
        policy_name: true,
        Reimbursement_Policy_Assignment: {
          where: { department_id: departmentId },
          select: { department_id: true }
        }
      }
    });
    if (!conflict) return null;
    return {
      policy_id: conflict.policy_id,
      policy_code: conflict.policy_code,
      policy_name: conflict.policy_name,
      department_id: conflict.Reimbursement_Policy_Assignment[0]?.department_id
    };
  },

  async findReceiptTypeById(receiptTypeId) {
    return await prisma.receipt_Type.findUnique({
      where: { receipt_type_id: receiptTypeId },
      select: {
        receipt_type_id: true,
        receipt_type_name: true
      }
    });
  },

  async findDepartmentById(departmentId) {
    return await prisma.department.findUnique({
      where: { department_id: departmentId },
      select: {
        department_id: true,
        department_name: true
      }
    });
  },

  async getActivePolicyByDepartment(departmentId, referenceDate) {
    // Ensure referenceDate is a Date object
    if (typeof referenceDate === 'string') {
      referenceDate = new Date(referenceDate);
    }
    const policy = await prisma.reimbursement_Policy.findFirst({
      where: {
        active: true,
        effective_from: { lte: referenceDate },
        OR: [
          { effective_to: null },
          { effective_to: { gte: referenceDate } }
        ],
        Reimbursement_Policy_Assignment: {
          some: {
            active: true,
            OR: [
              { department_id: departmentId },
              { department_id: null }
            ]
          }
        }
      },
      orderBy: [
        { Reimbursement_Policy_Assignment: { _count: 'desc' } }, // Prefer exact match
        { effective_from: 'desc' },
        { policy_id: 'desc' }
      ]
    });
    if (!policy) return null;
    return this.getPolicyById(policy.policy_id);
  },

  async getRequestEvaluationContext(requestId) {
    const request = await prisma.request.findUnique({
      where: { request_id: requestId },
      select: {
        request_id: true,
        user_id: true,
        creation_date: true,
        requester: {
          select: { department_id: true }
        }
      }
    });
    if (!request) return null;

    // Get all routes for this request, with country names and ending_date
    const routeRequests = await prisma.route_Request.findMany({
      where: { request_id: requestId },
      orderBy: [
        { Route: { router_index: 'asc' } },
        { Route: { route_id: 'asc' } }
      ],
      select: {
        Route: {
          select: {
            route_id: true,
            ending_date: true,
            originCountry: { select: { country_name: true } },
            destinationCountry: { select: { country_name: true } }
          }
        }
      }
    });
    const routes = routeRequests.map(rr => ({
      route_id: rr.Route?.route_id,
      origin_country: rr.Route?.originCountry?.country_name,
      destination_country: rr.Route?.destinationCountry?.country_name,
      ending_date: rr.Route?.ending_date
    }));

    // Get all receipts for this request, with type and route info
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
        xml_file_id: true,
        xml_file_name: true,
        xml_uuid: true,
        Route: { select: { ending_date: true } },
      }
    });
    // Get max ending_date for all routes in this request
    const maxEnding = routes.reduce((max, r) => {
      if (r.ending_date && (!max || r.ending_date > max)) return r.ending_date;
      return max;
    }, null);

    return {
      request: {
        request_id: request.request_id,
        user_id: request.user_id,
        creation_date: request.creation_date,
        department_id: request.requester?.department_id
      },
      routes,
      receipts: receipts.map(receipt => ({
        receipt_id: receipt.receipt_id,
        receipt_type_id: receipt.receipt_type_id,
        receipt_type_name: receipt.Receipt_Type?.receipt_type_name,
        route_id: receipt.route_id,
        validation: receipt.validation,
        amount: Number(receipt.amount),
        currency: receipt.currency,
        refund: Boolean(receipt.refund),
        submission_date: receipt.submission_date,
        xml_file_id: receipt.xml_file_id,
        xml_file_name: receipt.xml_file_name,
        xml_uuid: receipt.xml_uuid,
        reference_end_date: receipt.Route?.ending_date || maxEnding,
      }))
    };
  },
};

export default ReimbursementPolicyModel;
