/**
 * Reimbursement Policy Routes
 *
 * Administrative endpoints for reimbursement policy management plus
 * request evaluation for supported roles.
 */

import express from 'express';
import * as reimbursementPolicyController from '../controllers/reimbursementPolicyController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import {
  validateId,
  validateInputs,
  validateReimbursementPolicyPayload,
} from '../middleware/validation.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/get-policy-list')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    reimbursementPolicyController.getPolicyList
  );

router.route('/get-policy/:policy_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    validateId,
    validateInputs,
    reimbursementPolicyController.getPolicyById
  );

router.route('/create-policy')
  .post(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    validateReimbursementPolicyPayload,
    validateInputs,
    reimbursementPolicyController.createPolicy
  );

router.route('/update-policy/:policy_id')
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    validateId,
    validateReimbursementPolicyPayload,
    validateInputs,
    reimbursementPolicyController.updatePolicy
  );

router.route('/deactivate-policy/:policy_id')
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    validateId,
    validateInputs,
    reimbursementPolicyController.deactivatePolicy
  );

router.route('/get-active-policy/:department_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    validateId,
    validateInputs,
    reimbursementPolicyController.getActivePolicy
  );

router.route('/evaluate-request/:request_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Solicitante', 'Cuentas por pagar', 'Administrador']),
    validateId,
    validateInputs,
    reimbursementPolicyController.evaluateRequest
  );

export default router;
