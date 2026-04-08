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
    let conn;

    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const result = await conn.query(
        `INSERT INTO Reimbursement_Policy (
           policy_code,
           policy_name,
           description,
           base_currency,
           effective_from,
           effective_to,
           active,
           created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          policyData.policy_code,
          policyData.policy_name,
          policyData.description,
          policyData.base_currency,
          policyData.effective_from,
          policyData.effective_to,
          policyData.active,
          createdBy,
        ]
      );

      const policyId = typeof result.insertId === 'bigint'
        ? Number(result.insertId)
        : result.insertId;
      await insertAssignments(conn, policyId, policyData.assignments);
      await insertRules(conn, policyId, policyData.rules);

      await conn.commit();
      return this.getPolicyById(policyId);
    } catch (error) {
      if (conn) await conn.rollback();
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  async updatePolicyGraph(policyId, policyData) {
    let conn;

    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      await conn.query(
        `UPDATE Reimbursement_Policy
         SET
           policy_code = ?,
           policy_name = ?,
           description = ?,
           base_currency = ?,
           effective_from = ?,
           effective_to = ?,
           active = ?
         WHERE policy_id = ?`,
        [
          policyData.policy_code,
          policyData.policy_name,
          policyData.description,
          policyData.base_currency,
          policyData.effective_from,
          policyData.effective_to,
          policyData.active,
          policyId,
        ]
      );

      await conn.query(
        `DELETE FROM Reimbursement_Policy_Assignment
         WHERE policy_id = ?`,
        [policyId]
      );

      await conn.query(
        `DELETE FROM Reimbursement_Policy_Rule
         WHERE policy_id = ?`,
        [policyId]
      );

      await insertAssignments(conn, policyId, policyData.assignments);
      await insertRules(conn, policyId, policyData.rules);

      await conn.commit();
      return this.getPolicyById(policyId);
    } catch (error) {
      if (conn) await conn.rollback();
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  async deactivatePolicy(policyId) {
    let conn;

    try {
      conn = await pool.getConnection();
      const result = await conn.query(
        `UPDATE Reimbursement_Policy
         SET active = FALSE
         WHERE policy_id = ?`,
        [policyId]
      );

      return result.affectedRows > 0;
    } finally {
      if (conn) conn.release();
    }
  },

  async findAssignmentConflict(departmentId, effectiveFrom, effectiveTo, excludePolicyId = null) {
    let conn;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT
           rp.policy_id,
           rp.policy_code,
           rp.policy_name,
           rpa.department_id
         FROM Reimbursement_Policy rp
         INNER JOIN Reimbursement_Policy_Assignment rpa
           ON rpa.policy_id = rp.policy_id
         WHERE rp.active = TRUE
           AND rpa.active = TRUE
           AND rpa.department_id <=> ?
           AND rp.policy_id <> ?
           AND rp.effective_from <= ?
           AND COALESCE(rp.effective_to, ?) >= ?
         LIMIT 1`,
        [
          departmentId,
          excludePolicyId || 0,
          effectiveTo || OPEN_ENDED_DATE,
          OPEN_ENDED_DATE,
          effectiveFrom,
        ]
      );

      return rows[0] || null;
    } finally {
      if (conn) conn.release();
    }
  },

  async findReceiptTypeById(receiptTypeId) {
    let conn;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT receipt_type_id, receipt_type_name
         FROM Receipt_Type
         WHERE receipt_type_id = ?`,
        [receiptTypeId]
      );

      return rows[0] || null;
    } finally {
      if (conn) conn.release();
    }
  },

  async findDepartmentById(departmentId) {
    let conn;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT department_id, department_name
         FROM Department
         WHERE department_id = ?`,
        [departmentId]
      );

      return rows[0] || null;
    } finally {
      if (conn) conn.release();
    }
  },

  async getActivePolicyByDepartment(departmentId, referenceDate) {
    let conn;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT rp.policy_id
         FROM Reimbursement_Policy rp
         INNER JOIN Reimbursement_Policy_Assignment rpa
           ON rpa.policy_id = rp.policy_id
         WHERE rp.active = TRUE
           AND rpa.active = TRUE
           AND (rpa.department_id = ? OR rpa.department_id IS NULL)
           AND rp.effective_from <= ?
           AND COALESCE(rp.effective_to, ?) >= ?
         ORDER BY
           CASE WHEN rpa.department_id = ? THEN 0 ELSE 1 END,
           rp.effective_from DESC,
           rp.policy_id DESC
         LIMIT 1`,
        [
          departmentId,
          referenceDate,
          OPEN_ENDED_DATE,
          referenceDate,
          departmentId,
        ]
      );

      if (!rows[0]) {
        return null;
      }

      return this.getPolicyById(rows[0].policy_id);
    } finally {
      if (conn) conn.release();
    }
  },

  async getRequestEvaluationContext(requestId) {
    let conn;

    try {
      conn = await pool.getConnection();
      const requestRows = await conn.query(
        `SELECT
           r.request_id,
           r.user_id,
           r.creation_date,
           u.department_id
         FROM Request r
         INNER JOIN User u
           ON u.user_id = r.user_id
         WHERE r.request_id = ?`,
        [requestId]
      );

      const request = requestRows[0];
      if (!request) {
        return null;
      }

      const routeRows = await conn.query(
        `SELECT
           ro.route_id,
           origin_country.country_name AS origin_country,
           destination_country.country_name AS destination_country,
           ro.ending_date
         FROM Route_Request rr
         INNER JOIN Route ro
           ON ro.route_id = rr.route_id
         LEFT JOIN Country origin_country
           ON origin_country.country_id = ro.id_origin_country
         LEFT JOIN Country destination_country
           ON destination_country.country_id = ro.id_destination_country
         WHERE rr.request_id = ?
         ORDER BY ro.router_index ASC, ro.route_id ASC`,
        [requestId]
      );

      const receiptRows = await conn.query(
        `SELECT
           rec.receipt_id,
           rec.receipt_type_id,
           rt.receipt_type_name,
           rec.route_id,
           rec.validation,
           rec.amount,
           rec.currency,
           rec.refund,
           rec.submission_date,
           rec.xml_file_id,
           rec.xml_file_name,
           rec.xml_uuid,
           route.ending_date AS route_ending_date,
           request_dates.max_ending_date
         FROM Receipt rec
         INNER JOIN Receipt_Type rt
           ON rt.receipt_type_id = rec.receipt_type_id
         LEFT JOIN Route route
           ON route.route_id = rec.route_id
         LEFT JOIN (
           SELECT
             rr.request_id,
             MAX(ro.ending_date) AS max_ending_date
           FROM Route_Request rr
           INNER JOIN Route ro
             ON ro.route_id = rr.route_id
           GROUP BY rr.request_id
         ) request_dates
           ON request_dates.request_id = rec.request_id
         WHERE rec.request_id = ?
         ORDER BY rec.receipt_id ASC`,
        [requestId]
      );

      return {
        request,
        routes: routeRows,
        receipts: receiptRows.map((receipt) => ({
          receipt_id: receipt.receipt_id,
          receipt_type_id: receipt.receipt_type_id,
          receipt_type_name: receipt.receipt_type_name,
          route_id: receipt.route_id,
          validation: receipt.validation,
          amount: Number(receipt.amount),
          currency: receipt.currency,
          refund: Boolean(receipt.refund),
          submission_date: receipt.submission_date,
          xml_file_id: receipt.xml_file_id,
          xml_file_name: receipt.xml_file_name,
          xml_uuid: receipt.xml_uuid,
          reference_end_date: receipt.route_ending_date || receipt.max_ending_date,
        })),
      };
    } finally {
      if (conn) conn.release();
    }
  },
};

export default ReimbursementPolicyModel;
