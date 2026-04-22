/**
 * Refund Policy Routes
 * 
 * Endpoints for managing refund policies
 */

import express from 'express';
import RefundPolicyController from '../controllers/refundPolicyController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// GET all policies for society group
router.get('/', authenticateToken, RefundPolicyController.getPolicyList);

// GET specific policy
router.get('/:policy_id', authenticateToken, RefundPolicyController.getPolicyById);

// POST create new policy (admin only)
router.post('/', authenticateToken, authorizeRole(['Administrador']), RefundPolicyController.createPolicy);

// PUT update policy (admin only)
router.put('/:policy_id', authenticateToken, authorizeRole(['Administrador']), RefundPolicyController.updatePolicy);

// DELETE deactivate policy (admin only)
router.delete('/:policy_id', authenticateToken, authorizeRole(['Administrador']), RefundPolicyController.deactivatePolicy);

export default router;
