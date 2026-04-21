/**
 * Accountability Routes
 * 
 * This module defines the routes for handling the export
 * related to the accountability dta.
 */

import express from "express";
import { exportAllPolicies } from "../controllers/accountabilityController.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";
import { authenticateToken, authorizeRole, validateSocietyAccess } from "../middleware/auth.js"; // For validating permissions


const router = express.Router();

// Export accountability
router.route('/')
  .get(
    generalRateLimiter,
    exportAllPolicies
);

/*
// Export by ID (one request at a time)
router.route('/:request_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Administrador']),
    validateSocietyAccess('request'),
    exportById
);
*/


/* Example for accessing by ID 
 * https://localhost:3000/api/accounting/export/
*/

export default router;
