/**
* Society Group Routes
*
* Endpoints for managing society groups (multitenancy)
*/

import express from 'express';
import * as societyGroupController from '../controllers/societyGroupController.js';
import { authenticateToken, authorizePermission, authorizeRole, requireDefaultAdmin } from '../middleware/auth.js';
import { validateId, validateInputs } from '../middleware/validation.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Superadministrador']),
    authorizePermission(['superadmin:manage_groups']),
    societyGroupController.getSocietyGroups
  )
  .post(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Superadministrador']),
    authorizePermission(['superadmin:manage_groups']),
    requireDefaultAdmin,
    validateInputs,
    societyGroupController.createSocietyGroup
  );

router.route('/:group_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Superadministrador']),
    authorizePermission(['superadmin:manage_groups']),
    validateId,
    validateInputs,
    societyGroupController.getSocietyGroupById
  )
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Superadministrador']),
    authorizePermission(['superadmin:manage_groups']),
    requireDefaultAdmin,
    validateId,
    validateInputs,
    societyGroupController.updateSocietyGroup
  )
  .delete(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Superadministrador']),
    authorizePermission(['superadmin:manage_groups']),
    requireDefaultAdmin,
    validateId,
    validateInputs,
    societyGroupController.deleteSocietyGroup
  );

router.route('/:group_id/societies/:society_id/transfer')
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Superadministrador']),
    authorizePermission(['superadmin:manage_groups']),
    requireDefaultAdmin,
    validateId,
    validateInputs,
    societyGroupController.transferSocietyToGroup
  );

export default router;
