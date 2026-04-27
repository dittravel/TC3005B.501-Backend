/**
 * Refund Policy Service
 * 
 * Business logic for refund policies
 */

import RefundPolicyModel from "../models/refundPolicyModel.js";
import { prisma } from "../lib/prisma.js";

const RefundPolicyService = {
  async getPolicyList(societyGroupId, societyId = null) {
    return RefundPolicyModel.getPolicyList(societyGroupId, societyId);
  },

  async getPolicyById(policyId, societyGroupId = null, societyId = null) {
    return RefundPolicyModel.getPolicyById(policyId, societyGroupId, societyId);
  },

  async getActivePolicy(societyGroupId) {
    return RefundPolicyModel.getActivePolicy(societyGroupId);
  },

  async createPolicy(policyData) {
    if (!policyData.policy_name || !policyData.min_amount || !policyData.max_amount || !policyData.society_group_id) {
      throw new Error("Missing required fields: policy_name, min_amount, max_amount, society_group_id");
    }

    if (policyData.min_amount >= policyData.max_amount) {
      throw new Error("min_amount must be less than max_amount");
    }

    return RefundPolicyModel.createPolicy(policyData);
  },

  async updatePolicy(policyId, policyData, societyGroupId = null, societyId = null) {
    if (policyData.min_amount && policyData.max_amount) {
      if (policyData.min_amount >= policyData.max_amount) {
        throw new Error("min_amount must be less than max_amount");
      }
    }

    return RefundPolicyModel.updatePolicy(policyId, policyData, societyGroupId, societyId);
  },

  async deactivatePolicy(policyId, societyGroupId = null, societyId = null) {
    return RefundPolicyModel.deactivatePolicy(policyId, societyGroupId, societyId);
  },

  async validateReceiptAmount(receiptAmount, societyGroupId) {
    const policy = await this.getActivePolicy(societyGroupId);

    if (!policy) {
      return { valid: true, warning: null };
    }

    if (receiptAmount < policy.min_amount) {
      return { valid: false, warning: `Receipt amount is below minimum of $${policy.min_amount}` };
    }

    if (receiptAmount > policy.max_amount) {
      return { valid: false, warning: `Receipt amount exceeds maximum of $${policy.max_amount}` };
    }

    return { valid: true, warning: null };
  },

  async getRequestDeadlineStatus(requestId) {
    const request = await prisma.request.findUnique({
      where: { request_id: Number(requestId) },
      select: {
        request_id: true,
        creation_date: true,
        Society: {
          select: {
            society_group_id: true,
          },
        },
        Route_Request: {
          select: {
            Route: {
              select: {
                ending_date: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      const error = new Error('Request not found');
      error.status = 404;
      throw error;
    }

    const societyGroupId = request.Society?.society_group_id;
    if (!societyGroupId) {
      return {
        request_id: request.request_id,
        is_open: true,
        deadline_date: null,
        days_remaining: null,
        submission_deadline_days: null,
      };
    }

    const policy = await this.getActivePolicy(societyGroupId);
    const deadlineDays = policy?.submission_deadline_days;

    if (!deadlineDays || deadlineDays <= 0) {
      return {
        request_id: request.request_id,
        is_open: true,
        deadline_date: null,
        days_remaining: null,
        submission_deadline_days: deadlineDays ?? null,
      };
    }

    const endingDates = request.Route_Request
      .map((routeRequest) => routeRequest?.Route?.ending_date)
      .filter(Boolean);

    let referenceDate = new Date();
    if (endingDates.length > 0) {
      referenceDate = new Date(Math.max(...endingDates.map((date) => new Date(date).getTime())));
    } else if (request.creation_date) {
      referenceDate = new Date(request.creation_date);
    }

    const deadlineDate = new Date(referenceDate);
    deadlineDate.setDate(deadlineDate.getDate() + Number(deadlineDays));

    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / msPerDay);

    return {
      request_id: request.request_id,
      is_open: deadlineDate.getTime() >= now.getTime(),
      deadline_date: deadlineDate.toISOString(),
      days_remaining: daysRemaining,
      submission_deadline_days: Number(deadlineDays),
    };
  }
};

export default RefundPolicyService;
