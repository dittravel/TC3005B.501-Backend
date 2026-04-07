/**
 * CFDI Routes
 *
 * Defines the routes for CFDI validation in the travel request system.
 * All routes require a valid JWT token and the "Cuentas por pagar" role.
 *
 * Available endpoints:
 *   POST /api/cfdi/validate - Validate a CFDI by uploading an XML file.
 */

import express from 'express';
import multer from 'multer';
import { generalRateLimiter } from '../middleware/rateLimiters.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { validateCFDIController } from '../controllers/cfdiController.js';

const router = express.Router();

// Use in-memory storage so the XML buffer is available in req.files
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/cfdi/validate
 *
 * Validates a CFDI XML file against the SAT through the Finkok API.
 * Requires authentication and the "Cuentas por pagar" role.
 *
 * Request: multipart/form-data with field "xml" containing the XML file.
 * Response: JSON with cfdiData (extracted fields) and finkokResult (SAT status).
 */
router.post(
  '/validate',
  generalRateLimiter,
  authenticateToken,
  authorizeRole(['Cuentas por pagar']),
  upload.fields([{ name: 'xml', maxCount: 1 }]),
  validateCFDIController
);

export default router;
