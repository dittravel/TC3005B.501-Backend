/**
 * Reimbursement Policy Controller
 *
 * HTTP handlers for reimbursement policy administration and evaluation.
 */

import ReimbursementPolicyService from '../services/reimbursementPolicyService.js';

export async function getPolicyList(req, res) {
  try {
    const policies = await ReimbursementPolicyService.getPolicyList();
    return res.status(200).json(policies);
  } catch (error) {
    console.error('Error getting reimbursement policy list:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPolicyById(req, res) {
  try {
    const policy = await ReimbursementPolicyService.getPolicyById(Number(req.params.policy_id));
    return res.status(200).json(policy);
  } catch (error) {
    console.error('Error getting reimbursement policy:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function createPolicy(req, res) {
  try {
    const policy = await ReimbursementPolicyService.createPolicy(req.body, req.user.user_id);
    return res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating reimbursement policy:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function updatePolicy(req, res) {
  try {
    const policy = await ReimbursementPolicyService.updatePolicy(Number(req.params.policy_id), req.body);
    return res.status(200).json(policy);
  } catch (error) {
    console.error('Error updating reimbursement policy:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deactivatePolicy(req, res) {
  try {
    const result = await ReimbursementPolicyService.deactivatePolicy(Number(req.params.policy_id));
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error deactivating reimbursement policy:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getActivePolicy(req, res) {
  try {
    const policy = await ReimbursementPolicyService.getActivePolicy(
      Number(req.params.department_id),
      req.query.reference_date
    );
    return res.status(200).json(policy);
  } catch (error) {
    console.error('Error resolving active reimbursement policy:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function evaluateRequest(req, res) {
  try {
    const evaluation = await ReimbursementPolicyService.evaluateRequest(
      Number(req.params.request_id),
      req.user
    );
    return res.status(200).json(evaluation);
  } catch (error) {
    console.error('Error evaluating request reimbursement policy:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export default {
  getPolicyList,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deactivatePolicy,
  getActivePolicy,
  evaluateRequest,
};
