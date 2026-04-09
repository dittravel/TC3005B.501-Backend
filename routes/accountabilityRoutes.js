/**
 * Accountability Routes
 * 
 * This module defines the routes for handling the export
 * related to the accountability dta.
 */

import express from "express";
import { exportById, exportByDateRange } from "../controllers/accountabilityController.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js"; // For validating permissions


const router = express.Router();

// Export by ID (one request at a time)
router.route('/:request_id')
  .get(
    generalRateLimiter, 
    //authenticateToken, 
    //authorizeRole(['Cuentas por pagar', 'Autorizador', 'Admin']), 
    exportById
);

// Export by date range
router.route('/')
  .get(
    generalRateLimiter, 
    //authenticateToken, 
    //authorizeRole(['Cuentas por pagar', 'Autorizador', 'Admin']), 
    exportByDateRange
);


// Example for accessing by ID https://localhost:3000/api/accounting/export/5
/* Examples for accessing by dates
 * GET /api/accounting/export?date_from=2025-01-01&date_to=2025-03-31 
 * GET /api/accounting/export?date_from=2025-06-01                     
 * GET /api/accounting/export?date_to=2025-12-31 
*/

export default router;
