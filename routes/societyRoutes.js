/**
 * Society Routes
 *
 * Endpoints for managing societies (individual companies).
 */

import express from 'express';
import * as societyController from '../controllers/societyController.js';
import { authenticateToken, authorizePermission, authorizeRole } from '../middleware/auth.js';
import { validateId, validateInputs } from '../middleware/validation.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/current')
  .get(
    generalRateLimiter,
    authenticateToken,
    societyController.getCurrentUserSociety
  );

router.route('/name/:society_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    validateId,
    societyController.getSocietyName
  );

router.route('/')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['superadmin:manage_groups', 'societies:view'], { mode: 'any' }),
    societyController.getSocieties
  )
  .post(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['superadmin:manage_groups', 'societies:create'], { mode: 'any' }),
    validateInputs,
    societyController.createSociety
  );

router.route('/:society_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['superadmin:manage_groups', 'societies:view'], { mode: 'any' }),
    validateId,
    validateInputs,
    societyController.getSocietyById
  )
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['superadmin:manage_groups', 'societies:edit'], { mode: 'any' }),
    validateId,
    validateInputs,
    societyController.updateSociety
  )
  .delete(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['superadmin:manage_groups', 'societies:delete'], { mode: 'any' }),
    validateId,
    validateInputs,
    societyController.deleteSociety
  );

export default router;
