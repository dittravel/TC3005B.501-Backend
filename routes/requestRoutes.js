/**
 * Request Routes
 *
 * Endpoints for travel request operations.
 */

import express from 'express';
import * as requestController from '../controllers/requestController.js';
import { validateId, validateInputs } from '../middleware/validation.js';
import { authenticateToken, authorizePermission, validateSocietyAccess } from '../middleware/auth.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/:user_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['travel:view', 'travel:approve', 'receipts:approve', 'travel:view_flights', 'travel:view_hotels'], { mode: 'any', allowAdminByRole: true }),
    validateSocietyAccess('user'),
    validateId,
    validateInputs,
    requestController.getUserRequests
  );

router.route('/delete-draft/:request_id')
  .delete(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['travel:delete']),
    validateSocietyAccess('request'),
    validateId,
    validateInputs,
    requestController.deleteDraftRequest
  );

export default router;
