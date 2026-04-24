/**
* Society Group Routes
*
* Endpoints for managing society groups (multitenancy)
*/

import express from 'express';
import * as societyGroupController from '../controllers/societyGroupController.js';
import { authenticateToken, authorizePermission, requireDefaultAdmin } from '../middleware/auth.js';
import { validateId, validateInputs } from '../middleware/validation.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['society_groups:view', 'societies:create', 'societies:edit'], { mode: 'any' }),
    societyGroupController.getSocietyGroups
  )
  .post(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['society_groups:create']),
    requireDefaultAdmin,
    validateInputs,
    societyGroupController.createSocietyGroup
  );

router.route('/:group_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['society_groups:view', 'societies:create', 'societies:edit'], { mode: 'any' }),
    validateId,
    validateInputs,
    societyGroupController.getSocietyGroupById
  )
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['society_groups:edit']),
    requireDefaultAdmin,
    validateId,
    validateInputs,
    societyGroupController.updateSocietyGroup
  )
  .delete(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['society_groups:delete']),
    requireDefaultAdmin,
    validateId,
    validateInputs,
    societyGroupController.deleteSocietyGroup
  );

export default router;
