/**
 * Reimbursement Policy Service
 *
 * Coordinates policy validation, policy resolution, and request evaluation.
 */

import ReimbursementPolicyModel from '../models/reimbursementPolicyModel.js';
import { getSeriesByCurrency } from './exchangeRateCatalog.js';
import { getExchangeRate } from './exchangeRateService.js';

const MEXICO_COUNTRY_NAME = 'México';
const BLOCKING_VIOLATIONS = new Set([
  'NO_APPLICABLE_POLICY_RULE',
  'NOT_REFUNDABLE',
  'MISSING_CURRENCY',
  'UNSUPPORTED_CURRENCY',
  'EXCHANGE_RATE_UNAVAILABLE',
  'DEADLINE_EXCEEDED',
  'XML_REQUIRED',
]);

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatDateOnly(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().split('T')[0];
}

function addDays(value, days) {
  if (value === null || value === undefined || days === null || days === undefined) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + Number(days));
  return date;
}

function deriveTripScope(routes) {
  if (!Array.isArray(routes) || routes.length === 0) {
    return 'NACIONAL';
  }

  const hasForeignRoute = routes.some((route) =>
    route.origin_country !== MEXICO_COUNTRY_NAME || route.destination_country !== MEXICO_COUNTRY_NAME
  );

  return hasForeignRoute ? 'INTERNACIONAL' : 'NACIONAL';
}

function normalizeAssignments(assignments) {
  return assignments.map((assignment) => ({
    department_id:
      assignment.department_id === null || assignment.department_id === undefined
        ? null
        : Number(assignment.department_id),
    active: assignment.active === undefined ? true : Boolean(assignment.active),
  }));
}

function normalizeRules(rules) {
  return rules.map((rule) => ({
    receipt_type_id: Number(rule.receipt_type_id),
    trip_scope: String(rule.trip_scope).toUpperCase(),
    max_amount_mxn: roundMoney(rule.max_amount_mxn),
    submission_deadline_days:
      rule.submission_deadline_days === null || rule.submission_deadline_days === undefined
        ? null
        : Number(rule.submission_deadline_days),
    requires_xml: Boolean(rule.requires_xml),
    allow_foreign_without_xml: Boolean(rule.allow_foreign_without_xml),
    refundable: Boolean(rule.refundable),
    active: rule.active === undefined ? true : Boolean(rule.active),
  }));
}

function normalizePolicyPayload(payload) {
  return {
    policy_code: String(payload.policy_code).trim().toUpperCase(),
    policy_name: String(payload.policy_name).trim(),
    description: payload.description ? String(payload.description).trim() : null,
    base_currency: payload.base_currency ? String(payload.base_currency).trim().toUpperCase() : 'MXN',
    effective_from: formatDateOnly(payload.effective_from),
    effective_to: payload.effective_to ? formatDateOnly(payload.effective_to) : null,
    active: payload.active === undefined ? true : Boolean(payload.active),
    assignments: normalizeAssignments(payload.assignments || []),
    rules: normalizeRules(payload.rules || []),
  };
}

async function validateDepartments(policyModel, assignments) {
  for (const assignment of assignments) {
    if (assignment.department_id === null) {
      continue;
    }

    const department = await policyModel.findDepartmentById(assignment.department_id);
    if (!department) {
      throw createHttpError(400, `Department ${assignment.department_id} does not exist`);
    }
  }
}

async function validateReceiptTypes(policyModel, rules) {
  for (const rule of rules) {
    const receiptType = await policyModel.findReceiptTypeById(rule.receipt_type_id);
    if (!receiptType) {
      throw createHttpError(400, `Receipt type ${rule.receipt_type_id} does not exist`);
    }
  }
}

async function validateAssignmentConflicts(policyModel, policyData, excludePolicyId = null) {
  if (!policyData.active) {
    return;
  }

  for (const assignment of policyData.assignments) {
    const conflict = await policyModel.findAssignmentConflict(
      assignment.department_id,
      policyData.effective_from,
      policyData.effective_to,
      excludePolicyId
    );

    if (conflict) {
      const scopeLabel = assignment.department_id === null ? 'global fallback' : `department ${assignment.department_id}`;
      throw createHttpError(
        409,
        `Policy assignment conflict for ${scopeLabel} with policy ${conflict.policy_code}`
      );
    }
  }
}

async function validateNormalizedPolicyData(policyModel, policyData, excludePolicyId = null) {
  if (!policyData.effective_from) {
    throw createHttpError(400, 'effective_from is required');
  }

  if (policyData.effective_to && policyData.effective_to < policyData.effective_from) {
    throw createHttpError(400, 'effective_to cannot be before effective_from');
  }

  if (!Array.isArray(policyData.assignments) || policyData.assignments.length === 0) {
    throw createHttpError(400, 'At least one assignment is required');
  }

  if (!Array.isArray(policyData.rules) || policyData.rules.length === 0) {
    throw createHttpError(400, 'At least one rule is required');
  }

  const assignmentKeys = new Set();
  for (const assignment of policyData.assignments) {
    const key = assignment.department_id === null ? 'GLOBAL' : `DEPT:${assignment.department_id}`;
    if (assignmentKeys.has(key)) {
      throw createHttpError(400, `Duplicate assignment detected for ${key}`);
    }
    assignmentKeys.add(key);
  }

  const ruleKeys = new Set();
  for (const rule of policyData.rules) {
    const key = `${rule.receipt_type_id}:${rule.trip_scope}`;
    if (ruleKeys.has(key)) {
      throw createHttpError(400, `Duplicate rule detected for receipt type ${rule.receipt_type_id} and scope ${rule.trip_scope}`);
    }

    ruleKeys.add(key);
  }

  await validateDepartments(policyModel, policyData.assignments);
  await validateReceiptTypes(policyModel, policyData.rules);
  await validateAssignmentConflicts(policyModel, policyData, excludePolicyId);
}

function getRuleForReceipt(rules, receiptTypeId, tripScope) {
  return (
    rules.find((rule) => rule.receipt_type_id === receiptTypeId && rule.trip_scope === tripScope) ||
    rules.find((rule) => rule.receipt_type_id === receiptTypeId && rule.trip_scope === 'TODOS') ||
    null
  );
}

async function getConversionData(currency, conversionCache, seriesResolver, exchangeRateResolver) {
  const normalizedCurrency = currency ? String(currency).trim().toUpperCase() : null;

  if (!normalizedCurrency) {
    return {
      ok: false,
      violation: 'MISSING_CURRENCY',
      detail: 'Receipt currency is required to evaluate reimbursement',
    };
  }

  if (normalizedCurrency === 'MXN') {
    return {
      ok: true,
      currency: normalizedCurrency,
      rate: 1,
      source: 'base',
      series_id: null,
      timestamp: null,
    };
  }

  if (!conversionCache.has(normalizedCurrency)) {
    conversionCache.set(
      normalizedCurrency,
      (async () => {
        const series = await seriesResolver(normalizedCurrency);
        if (!series || !series.id) {
          return {
            ok: false,
            violation: 'UNSUPPORTED_CURRENCY',
            detail: `Currency ${normalizedCurrency} is not configured in the Banxico catalog`,
          };
        }

        try {
          const rateData = await exchangeRateResolver(series.id);
          return {
            ok: true,
            currency: normalizedCurrency,
            rate: Number(rateData.rate),
            source: rateData.source,
            series_id: series.id,
            timestamp: rateData.timestamp || null,
          };
        } catch (error) {
          return {
            ok: false,
            violation: 'EXCHANGE_RATE_UNAVAILABLE',
            detail: error.message,
          };
        }
      })()
    );
  }

  return conversionCache.get(normalizedCurrency);
}

function evaluateXmlRequirement(receipt, rule, tripScope) {
  if (!rule.requires_xml) {
    return null;
  }

  const hasXml = Boolean(receipt.xml_file_id || receipt.xml_uuid || receipt.xml_file_name);
  if (hasXml) {
    return null;
  }

  const normalizedCurrency = receipt.currency ? String(receipt.currency).trim().toUpperCase() : null;
  const canSkipXml =
    tripScope === 'INTERNACIONAL' &&
    normalizedCurrency !== 'MXN' &&
    rule.allow_foreign_without_xml;

  return canSkipXml ? null : 'XML_REQUIRED';
}

function evaluateDeadline(receipt, rule) {
  if (rule.submission_deadline_days === null || rule.submission_deadline_days === undefined) {
    return null;
  }

  const deadline = addDays(receipt.reference_end_date, rule.submission_deadline_days);
  if (!deadline || !receipt.submission_date) {
    return null;
  }

  const submissionDateOnly = formatDateOnly(receipt.submission_date);
  const deadlineDateOnly = formatDateOnly(deadline);

  if (!submissionDateOnly || !deadlineDateOnly) {
    return null;
  }

  return submissionDateOnly > deadlineDateOnly ? 'DEADLINE_EXCEEDED' : null;
}

function summarizeOriginalAmounts(receipts) {
  const originalAmountsByCurrency = {};

  for (const receipt of receipts) {
    const currency = receipt.currency ? String(receipt.currency).trim().toUpperCase() : 'UNKNOWN';
    originalAmountsByCurrency[currency] = roundMoney(
      (originalAmountsByCurrency[currency] || 0) + Number(receipt.amount || 0)
    );
  }

  return originalAmountsByCurrency;
}

function serializeRule(rule) {
  if (!rule) {
    return null;
  }

  return {
    rule_id: rule.rule_id,
    receipt_type_id: rule.receipt_type_id,
    receipt_type_name: rule.receipt_type_name,
    trip_scope: rule.trip_scope,
    max_amount_mxn: rule.max_amount_mxn,
    submission_deadline_days: rule.submission_deadline_days,
    requires_xml: rule.requires_xml,
    allow_foreign_without_xml: rule.allow_foreign_without_xml,
    refundable: rule.refundable,
  };
}

function buildReimbursementPolicyService({
  policyModel = ReimbursementPolicyModel,
  seriesResolver = getSeriesByCurrency,
  exchangeRateResolver = getExchangeRate,
} = {}) {
  return {
    async getPolicyList() {
      return policyModel.getPolicyList();
    },

    async getPolicyById(policyId) {
      const policy = await policyModel.getPolicyById(policyId);
      if (!policy) {
        throw createHttpError(404, 'Policy not found');
      }

      return policy;
    },

    async createPolicy(payload, actorUserId) {
      const policyData = normalizePolicyPayload(payload);
      await validateNormalizedPolicyData(policyModel, policyData);

      try {
        return await policyModel.createPolicyGraph(policyData, actorUserId);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw createHttpError(409, 'Policy code already exists');
        }

        throw error;
      }
    },

    async updatePolicy(policyId, payload) {
      const existingPolicy = await policyModel.getPolicyById(policyId);
      if (!existingPolicy) {
        throw createHttpError(404, 'Policy not found');
      }

      const policyData = normalizePolicyPayload(payload);
      await validateNormalizedPolicyData(policyModel, policyData, policyId);

      try {
        return await policyModel.updatePolicyGraph(policyId, policyData);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw createHttpError(409, 'Policy code already exists');
        }

        throw error;
      }
    },

    async deactivatePolicy(policyId) {
      const existingPolicy = await policyModel.getPolicyById(policyId);
      if (!existingPolicy) {
        throw createHttpError(404, 'Policy not found');
      }

      await policyModel.deactivatePolicy(policyId);

      return {
        policy_id: policyId,
        active: false,
      };
    },

    async getActivePolicy(departmentId, referenceDate = null) {
      const department = await policyModel.findDepartmentById(departmentId);
      if (!department) {
        throw createHttpError(404, 'Department not found');
      }

      const resolvedReferenceDate = formatDateOnly(referenceDate || new Date());
      if (!resolvedReferenceDate) {
        throw createHttpError(400, 'reference_date must be a valid date');
      }

      const policy = await policyModel.getActivePolicyByDepartment(
        departmentId,
        resolvedReferenceDate
      );

      if (!policy) {
        throw createHttpError(404, 'No active reimbursement policy found for the department');
      }

      return {
        ...policy,
        policy_reference_date: resolvedReferenceDate,
        resolution_scope: policy.assignments.some((assignment) => assignment.department_id === departmentId)
          ? 'DEPARTMENT'
          : 'GLOBAL',
      };
    },

    async evaluateRequest(requestId, actor) {
      const evaluationContext = await policyModel.getRequestEvaluationContext(requestId);
      if (!evaluationContext) {
        throw createHttpError(404, 'Travel request not found');
      }

      if (actor.role === 'Solicitante' && Number(actor.user_id) !== Number(evaluationContext.request.user_id)) {
        throw createHttpError(403, 'Applicants can only evaluate their own requests');
      }

      const policyReferenceDate = formatDateOnly(evaluationContext.request.creation_date);
      const policy = await policyModel.getActivePolicyByDepartment(
        evaluationContext.request.department_id,
        policyReferenceDate
      );

      if (!policy) {
        throw createHttpError(404, 'No active reimbursement policy found for the request department');
      }

      const tripScope = deriveTripScope(evaluationContext.routes);
      const conversionCache = new Map();
      const evaluatedReceipts = [];

      for (const receipt of evaluationContext.receipts) {
        const rule = getRuleForReceipt(policy.rules, receipt.receipt_type_id, tripScope);
        const violations = [];

        if (!rule) {
          evaluatedReceipts.push({
            receipt_id: receipt.receipt_id,
            receipt_type_id: receipt.receipt_type_id,
            receipt_type_name: receipt.receipt_type_name,
            route_id: receipt.route_id,
            amount: roundMoney(receipt.amount),
            currency: receipt.currency,
            amount_mxn: null,
            rule: null,
            evaluation_status: 'REJECTED',
            violations: ['NO_APPLICABLE_POLICY_RULE'],
            reimbursable_mxn: 0,
            non_reimbursable_mxn: null,
          });
          continue;
        }

        const conversion = await getConversionData(
          receipt.currency,
          conversionCache,
          seriesResolver,
          exchangeRateResolver
        );

        if (!conversion.ok) {
          evaluatedReceipts.push({
            receipt_id: receipt.receipt_id,
            receipt_type_id: receipt.receipt_type_id,
            receipt_type_name: receipt.receipt_type_name,
            route_id: receipt.route_id,
            amount: roundMoney(receipt.amount),
            currency: receipt.currency,
            amount_mxn: null,
            rule: serializeRule(rule),
            evaluation_status: 'REJECTED',
            violations: [conversion.violation],
            reimbursable_mxn: 0,
            non_reimbursable_mxn: null,
            exchange_rate: null,
            conversion_source: null,
            conversion_detail: conversion.detail,
          });
          continue;
        }

        const amountMxn = roundMoney(receipt.amount * conversion.rate);

        if (!receipt.refund || !rule.refundable) {
          violations.push('NOT_REFUNDABLE');
        }

        const deadlineViolation = evaluateDeadline(receipt, rule);
        if (deadlineViolation) {
          violations.push(deadlineViolation);
        }

        const xmlViolation = evaluateXmlRequirement(receipt, rule, tripScope);
        if (xmlViolation) {
          violations.push(xmlViolation);
        }

        if (amountMxn > rule.max_amount_mxn) {
          violations.push('AMOUNT_EXCEEDS_POLICY_CAP');
        }

        const hasBlockingViolation = violations.some((violation) => BLOCKING_VIOLATIONS.has(violation));
        const reimbursableAmount = hasBlockingViolation
          ? 0
          : roundMoney(Math.min(amountMxn, rule.max_amount_mxn));

        evaluatedReceipts.push({
          receipt_id: receipt.receipt_id,
          receipt_type_id: receipt.receipt_type_id,
          receipt_type_name: receipt.receipt_type_name,
          route_id: receipt.route_id,
          amount: roundMoney(receipt.amount),
          currency: receipt.currency ? String(receipt.currency).trim().toUpperCase() : null,
          amount_mxn: amountMxn,
          rule: serializeRule(rule),
          evaluation_status: hasBlockingViolation ? 'REJECTED' : violations.length > 0 ? 'WARNING' : 'OK',
          violations,
          reimbursable_mxn: reimbursableAmount,
          non_reimbursable_mxn: roundMoney(amountMxn - reimbursableAmount),
          exchange_rate: conversion.rate,
          conversion_source: conversion.source,
          conversion_series_id: conversion.series_id,
        });
      }

      const originalAmountsByCurrency = summarizeOriginalAmounts(evaluatedReceipts);

      return {
        request_id: evaluationContext.request.request_id,
        policy: {
          policy_id: policy.policy_id,
          policy_code: policy.policy_code,
          policy_name: policy.policy_name,
          policy_reference_date: policyReferenceDate,
        },
        trip_scope: tripScope,
        summary: {
          total_receipts: evaluatedReceipts.length,
          total_original_amount: roundMoney(
            evaluatedReceipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0)
          ),
          original_amounts_by_currency: originalAmountsByCurrency,
          total_mxn: roundMoney(
            evaluatedReceipts.reduce((sum, receipt) => sum + Number(receipt.amount_mxn || 0), 0)
          ),
          total_reimbursable_mxn: roundMoney(
            evaluatedReceipts.reduce((sum, receipt) => sum + Number(receipt.reimbursable_mxn || 0), 0)
          ),
          total_non_reimbursable_mxn: roundMoney(
            evaluatedReceipts.reduce((sum, receipt) => sum + Number(receipt.non_reimbursable_mxn || 0), 0)
          ),
          has_blocking_violations: evaluatedReceipts.some(
            (receipt) => receipt.evaluation_status === 'REJECTED'
          ),
        },
        receipts: evaluatedReceipts,
      };
    },
  };
}

const ReimbursementPolicyService = buildReimbursementPolicyService();

export { buildReimbursementPolicyService };
export default ReimbursementPolicyService;
