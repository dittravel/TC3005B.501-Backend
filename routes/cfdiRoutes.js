/**
 * CFDI Routes
 *
 * Defines the routes for CFDI validation in the travel request system.
 * All routes require a valid JWT token and either the "Solicitante" or "Autorizador" role.
 *
 * Available endpoints:
 *   POST /api/cfdi/validate - Validate a CFDI by uploading an XML file.
 */

import express from 'express';
import multer from 'multer';
import { generalRateLimiter } from '../middleware/rateLimiters.js';
import { authenticateToken, authorizePermission } from '../middleware/auth.js';
import { validateCFDIController } from '../controllers/cfdiController.js';

const router = express.Router();

// Use in-memory storage so the XML buffer is available in req.files
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/cfdi/validate
 *
 * Validates a CFDI XML file against the SAT through the ValidaCFDI API.
 * Requires authentication and the "Solicitante" or "Autorizador" role.
 *
 * Request: multipart/form-data with field "xml" containing the XML file.
 * Response: JSON with cfdiData (extracted fields) and validationResult (SAT status).
 */
router.post(
  '/validate',
  generalRateLimiter,
  authenticateToken,
  authorizePermission(['receipts:create', 'receipts:edit'], { mode: 'any' }),
  upload.fields([{ name: 'xml', maxCount: 1 }]),
  validateCFDIController
);

export default router;
