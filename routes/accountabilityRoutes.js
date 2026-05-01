/**
 * Accountability Routes
 * 
 * This module defines the routes for handling the export
 * related to the accountability dta.
 */

import express from "express";
import { exportAllPolicies } from "../controllers/accountabilityController.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";
import { authenticateToken, authorizePermission, validateSocietyAccess } from "../middleware/auth.js"; // For validating permissions


const router = express.Router();

// Export accountability
router.route('/')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['system:export_accounting']),
    validateSocietyAccess('request'),
    exportAllPolicies
);

/* Example for accessing by ID 
 * https://localhost:3000/api/accounting/export/
*/

export default router;
