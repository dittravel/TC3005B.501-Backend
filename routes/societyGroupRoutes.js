/**
* Society Group Routes
*
* Endpoints for managing society groups (multitenancy)
*/

import express from 'express';
import * as societyGroupController from '../controllers/societyGroupController.js';
import { authenticateToken, authorizeRole, requireDefaultAdmin } from '../middleware/auth.js';
import { validateId, validateInputs } from '../middleware/validation.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    societyGroupController.getSocietyGroups
  )
  .post(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    requireDefaultAdmin,
    validateInputs,
    societyGroupController.createSocietyGroup
  );

router.route('/:group_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    validateId,
    validateInputs,
    societyGroupController.getSocietyGroupById
  )
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    requireDefaultAdmin,
    validateId,
    validateInputs,
    societyGroupController.updateSocietyGroup
  )
  .delete(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    requireDefaultAdmin,
    validateId,
    validateInputs,
    societyGroupController.deleteSocietyGroup
  );

export default router;
