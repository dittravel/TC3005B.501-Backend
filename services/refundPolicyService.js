/**
 * Refund Policy Service
 * 
 * Business logic for refund policies
 */

import RefundPolicyModel from "../models/refundPolicyModel.js";

const RefundPolicyService = {
  async getPolicyList(societyGroupId) {
    return RefundPolicyModel.getPolicyList(societyGroupId);
  },

  async getPolicyById(policyId) {
    return RefundPolicyModel.getPolicyById(policyId);
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

  async updatePolicy(policyId, policyData) {
    if (policyData.min_amount && policyData.max_amount) {
      if (policyData.min_amount >= policyData.max_amount) {
        throw new Error("min_amount must be less than max_amount");
      }
    }

    return RefundPolicyModel.updatePolicy(policyId, policyData);
  },

  async deactivatePolicy(policyId) {
    return RefundPolicyModel.deactivatePolicy(policyId);
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
  }
};

export default RefundPolicyService;
