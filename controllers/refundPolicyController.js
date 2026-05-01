/**
 * Refund Policy Controller
 * 
 * HTTP handlers for refund policies
 */

import RefundPolicyService from "../services/refundPolicyService.js";
import AuditLogService from "../services/auditLogService.js";

const RefundPolicyController = {
  async getPolicyList(req, res) {
    try {
      const societyGroupId = req.user.society_group_id;
      const societyId = req.user.society_id;
      const policies = await RefundPolicyService.getPolicyList(societyGroupId, societyId);
      res.status(200).json(policies);
    } catch (err) {
      console.error("Error in getPolicyList:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  async getPolicyById(req, res) {
    try {
      const policyId = req.params.policy_id;
      const policy = await RefundPolicyService.getPolicyById(policyId, req.user.society_group_id, req.user.society_id);

      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }

      res.status(200).json(policy);
    } catch (err) {
      console.error("Error in getPolicyById:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  async createPolicy(req, res) {
    try {
      const { policy_name, min_amount, max_amount, submission_deadline_days } = req.body;

      const policy = await RefundPolicyService.createPolicy({
        policy_name,
        min_amount,
        max_amount,
        submission_deadline_days,
        society_group_id: req.user.society_group_id,
        society_id: req.user.society_id,
      });

      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'POLICY_CREATED',
        entityType: 'RefundPolicy',
        entityId: policy.policy_id.toString(),
        metadata: {
          policy_name,
          min_amount,
          max_amount,
          submission_deadline_days
        }
      });

      res.status(201).json(policy);
    } catch (err) {
      console.error("Error in createPolicy:", err);
      res.status(400).json({ error: err.message });
    }
  },

  async updatePolicy(req, res) {
    try {
      const policyId = req.params.policy_id;
      const { policy_name, min_amount, max_amount, submission_deadline_days } = req.body;

      const policy = await RefundPolicyService.updatePolicy(policyId, {
        policy_name,
        min_amount,
        max_amount,
        submission_deadline_days,
      }, req.user.society_group_id, req.user.society_id);

      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'POLICY_UPDATED',
        entityType: 'RefundPolicy',
        entityId: policyId,
        metadata: {
          policy_name,
          min_amount,
          max_amount,
          submission_deadline_days
        }
      });

      res.status(200).json(policy);
    } catch (err) {
      console.error("Error in updatePolicy:", err);
      res.status(400).json({ error: err.message });
    }
  },

  async deactivatePolicy(req, res) {
    try {
      const policyId = req.params.policy_id;

      await RefundPolicyService.deactivatePolicy(policyId, req.user.society_group_id, req.user.society_id);

      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'POLICY_DEACTIVATED',
        entityType: 'RefundPolicy',
        entityId: policyId
      });

      res.status(200).json({ message: "Policy deactivated successfully" });
    } catch (err) {
      console.error("Error in deactivatePolicy:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

export default RefundPolicyController;
