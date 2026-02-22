/**
 * Accounts Payable Routes
 * 
 * This module defines the routes and role-based access control
 * for the "Cuentas por pagar" functionalities
 */

import express from "express";
import { validateId, validateInputs } from "../middleware/validation.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";
import AccountsPayableController from "../controllers/accountsPayableController.js";

const router = express.Router();

router.use((req, res, next) => {
    next();
});

// Get pending travel request by request ID
router.route("/attend-travel-request/:request_id")
    .put(generalRateLimiter, authenticateToken, authorizeRole(['Cuentas por pagar']), validateId, validateInputs, AccountsPayableController.attendTravelRequest);

// Validate expense receipts for a travel request by request ID
router.route("/validate-receipts/:request_id")
    .put(generalRateLimiter, authenticateToken, authorizeRole(['Cuentas por pagar']), validateId, validateInputs, AccountsPayableController.validateReceiptsHandler);

// Validate a single receipt by receipt ID
router.route("/validate-receipt/:receipt_id")
    .put(generalRateLimiter, authenticateToken, authorizeRole(['Cuentas por pagar']), validateId, validateInputs, AccountsPayableController.validateReceipt);

// Get expense validations for a travel request by request ID
router.route("/get-expense-validations/:request_id")
    .get(generalRateLimiter, authenticateToken, authorizeRole(['Cuentas por pagar', 'Solicitante', 'N1', 'N2']), validateId, validateInputs, AccountsPayableController.getExpenseValidations);

export default router;
