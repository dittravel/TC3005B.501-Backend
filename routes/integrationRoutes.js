/**
 * Integration Routes
 *
 * Endpoints for internal system integrations.
 */

import express from 'express';
import * as integrationController from '../controllers/integrationController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { validateERPEmployeeQuery, validateInputs } from '../middleware/validation.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/erp/employees')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    validateERPEmployeeQuery,
    validateInputs,
    integrationController.getERPEmployees
  );

export default router;
