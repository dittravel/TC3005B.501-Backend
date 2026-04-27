/**
 * Request Routes
 *
 * Endpoints for travel request operations.
 */

import express from 'express';
import * as requestController from '../controllers/requestController.js';
import { validateId, validateInputs } from '../middleware/validation.js';
import { authenticateToken, authorizeRole, validateSocietyAccess } from '../middleware/auth.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/:user_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Solicitante', 'Autorizador', 'Cuentas por pagar', 'Agencia de viajes', 'Administrador']),
    validateSocietyAccess('user'),
    validateId,
    validateInputs,
    requestController.getUserRequests
  );

router.route('/delete-draft/:request_id')
  .delete(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Solicitante', 'Autorizador']),
    validateSocietyAccess('request'),
    validateId,
    validateInputs,
    requestController.deleteDraftRequest
  );

export default router;
