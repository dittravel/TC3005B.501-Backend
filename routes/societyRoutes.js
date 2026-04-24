/**
 * Society Routes
 *
 * Endpoints for managing societies (individual companies).
 */

import express from 'express';
import * as societyController from '../controllers/societyController.js';
import { authenticateToken, authorizePermission } from '../middleware/auth.js';
import { validateId, validateInputs } from '../middleware/validation.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

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
    authorizePermission(['societies:view', 'users:view', 'users:create', 'users:edit'], { mode: 'any' }),
    societyController.getSocieties
  )
  .post(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['societies:create']),
    validateInputs,
    societyController.createSociety
  );

router.route('/:society_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['societies:view', 'users:view', 'users:create', 'users:edit'], { mode: 'any' }),
    validateId,
    validateInputs,
    societyController.getSocietyById
  )
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['societies:edit']),
    validateId,
    validateInputs,
    societyController.updateSociety
  )
  .delete(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['societies:delete']),
    validateId,
    validateInputs,
    societyController.deleteSociety
  );

export default router;
