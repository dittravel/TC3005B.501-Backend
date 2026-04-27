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
router.get('/', generalRateLimiter, authenticateToken, authorizePermission(['travel:def_amount']), RefundPolicyController.getPolicyList);

// GET specific policy
router.get('/:policy_id', generalRateLimiter, authenticateToken, authorizePermission(['travel:def_amount']), RefundPolicyController.getPolicyById);

// POST create new policy (admin only)
router.post('/', generalRateLimiter, authenticateToken, authorizePermission(['travel:def_amount']), RefundPolicyController.createPolicy);

// PUT update policy (admin only)
router.put('/:policy_id', generalRateLimiter, authenticateToken, authorizePermission(['travel:def_amount']), RefundPolicyController.updatePolicy);

// DELETE deactivate policy (admin only)
router.delete('/:policy_id', generalRateLimiter, authenticateToken, authorizePermission(['travel:def_amount']), RefundPolicyController.deactivatePolicy);

export default router;
