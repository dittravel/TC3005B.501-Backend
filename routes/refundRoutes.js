/**
 * Refund Routes
 *
 * Routes for managing and retrieving refunds
 */

import express from "express";
import refundController from "../controllers/refundController.js";
import { validateId, validateInputs } from "../middleware/validation.js";
import { authenticateToken, authorizePermission, validateSocietyAccess } from "../middleware/auth.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// Get refunds for a user by user ID
router.route("/user/:user_id")
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['refunds:request', 'refunds:approve'], { mode: 'any' }),
    validateSocietyAccess('user'),
    validateId,
    validateInputs,
    refundController.getUserRefunds
  );

export default router;
