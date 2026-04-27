/**
 * Refund Policy Model
 * 
 * Data access layer for refund policies
 */

import { prisma } from "../lib/prisma.js";

const RefundPolicyModel = {
  async getPolicyList(societyGroupId, _societyId = null) {
    return prisma.refundPolicy.findMany({
      where: { 
        society_group_id: societyGroupId,
        active: true
      },
      orderBy: { created_at: 'desc' }
    });
  },

  async getPolicyById(policyId, societyGroupId = null, _societyId = null) {
    const policy = await prisma.refundPolicy.findUnique({
      where: { policy_id: parseInt(policyId, 10) }
    });

    if (!policy) return null;

    if (societyGroupId && policy.society_group_id !== Number(societyGroupId)) {
      throw new Error('Unauthorized: Policy does not belong to your society group');
    }

    return policy;
  },

  async getActivePolicy(societyGroupId) {
    return prisma.refundPolicy.findFirst({
      where: {
        society_group_id: societyGroupId,
        active: true
      }
    });
  },

  async createPolicy(policyData) {
    return prisma.refundPolicy.create({
      data: {
        policy_name: policyData.policy_name,
        min_amount: policyData.min_amount,
        max_amount: policyData.max_amount,
        submission_deadline_days: policyData.submission_deadline_days,
        society_group_id: policyData.society_group_id,
        is_default: false,
        active: true
      }
    });
  },

  async updatePolicy(policyId, policyData, societyGroupId = null, _societyId = null) {
    const current = await prisma.refundPolicy.findUnique({
      where: { policy_id: parseInt(policyId, 10) },
      select: { policy_id: true, society_group_id: true },
    });

    if (!current) {
      throw new Error('Policy not found');
    }

    if (societyGroupId && current.society_group_id !== Number(societyGroupId)) {
      throw new Error('Unauthorized: Policy does not belong to your society group');
    }

    return prisma.refundPolicy.update({
      where: { policy_id: parseInt(policyId, 10) },
      data: {
        policy_name: policyData.policy_name,
        min_amount: policyData.min_amount,
        max_amount: policyData.max_amount,
        submission_deadline_days: policyData.submission_deadline_days
      }
    });
  },

  async deactivatePolicy(policyId, societyGroupId = null, _societyId = null) {
    const current = await prisma.refundPolicy.findUnique({
      where: { policy_id: parseInt(policyId, 10) },
      select: { policy_id: true, society_group_id: true },
    });

    if (!current) {
      throw new Error('Policy not found');
    }

    if (societyGroupId && current.society_group_id !== Number(societyGroupId)) {
      throw new Error('Unauthorized: Policy does not belong to your society group');
    }

    return prisma.refundPolicy.update({
      where: { policy_id: parseInt(policyId, 10) },
      data: { active: false }
    });
  }
};

export default RefundPolicyModel;
