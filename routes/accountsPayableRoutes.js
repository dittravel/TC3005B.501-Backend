/**
 * Accounts Payable Routes
 * 
 * This module defines the routes and role-based access control
 * for the "Cuentas por pagar" functionalities
 */

import express from "express";
import { validateId, validateInputs, validateReceiptSearchQuery } from "../middleware/validation.js";
import { authenticateToken, authorizePermission, validateSocietyAccess } from "../middleware/auth.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";
import AccountsPayableController from "../controllers/accountsPayableController.js";

const router = express.Router();

router.use((req, res, next) => {
  next();
});

// Get pending travel request by request ID
router.route("/attend-travel-request/:request_id")
  .put(generalRateLimiter, authenticateToken, authorizePermission(['receipts:approve']), validateSocietyAccess('request'), validateId, validateInputs, AccountsPayableController.attendTravelRequest);

// Validate expense receipts for a travel request by request ID
router.route("/validate-receipts/:request_id")
  .put(generalRateLimiter, authenticateToken, authorizePermission(['receipts:approve']), validateSocietyAccess('request'), validateId, validateInputs, AccountsPayableController.validateReceiptsHandler);

// Validate a single receipt by receipt ID
router.route("/validate-receipt/:receipt_id")
  .put(generalRateLimiter, authenticateToken, authorizePermission(['receipts:approve']), validateSocietyAccess('receipt'), validateId, validateInputs, AccountsPayableController.validateReceipt);

// Get expense validations for a travel request by request ID
router.route("/get-expense-validations/:request_id")
  .get(generalRateLimiter, authenticateToken, authorizePermission(['receipts:view'], { mode: 'any' }), validateSocietyAccess('request'), validateId, validateInputs, AccountsPayableController.getExpenseValidations);

// Search receipts across all requests by user_id, date range, and/or validation status
router.route("/search-receipts")
  .get(generalRateLimiter, authenticateToken, authorizePermission(['receipts:view']), validateReceiptSearchQuery, validateInputs, AccountsPayableController.searchReceipts);

export default router;
