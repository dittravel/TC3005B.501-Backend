/**
 * Refund Policy Routes
 * 
 * Endpoints for managing refund policies
 */

import express from 'express';
import RefundPolicyController from '../controllers/refundPolicyController.js';
import { generalRateLimiter } from "../middleware/rateLimiters.js";
import { authenticateToken, authorizePermission } from '../middleware/auth.js';

const router = express.Router();

// GET all policies for society group
router.get('/', generalRateLimiter, authenticateToken, authorizePermission(['refund_policies:manage']), RefundPolicyController.getPolicyList);

// GET specific policy
router.get('/:policy_id', generalRateLimiter, authenticateToken, authorizePermission(['refund_policies:manage']), RefundPolicyController.getPolicyById);

// POST create new policy (admin only)
router.post('/', generalRateLimiter, authenticateToken, authorizePermission(['refund_policies:manage']), RefundPolicyController.createPolicy);

// PUT update policy (admin only)
router.put('/:policy_id', generalRateLimiter, authenticateToken, authorizePermission(['refund_policies:manage']), RefundPolicyController.updatePolicy);

// DELETE deactivate policy (admin only)
router.delete('/:policy_id', generalRateLimiter, authenticateToken, authorizePermission(['refund_policies:manage']), RefundPolicyController.deactivatePolicy);

export default router;
