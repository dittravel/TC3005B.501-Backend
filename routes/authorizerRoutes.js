/**
 * Authorizer Routes
 * 
 * This module defines the routes for hierarchical authorization workflows.
 * Authorization is role-less: any user can authorize requests assigned to them.
 * Access control is enforced at the service layer via assigned_to validation.
 */

import express from "express";
import authorizerController from "../controllers/authorizerController.js";
import { validateId, validateInputs } from "../middleware/validation.js";
import { authenticateToken } from "../middleware/auth.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.use((req, res, next) => {
  next();
});

// Get pending requests assigned to current user
router.route("/get-pending-requests/:user_id/:n")
  .get(generalRateLimiter, authenticateToken, validateId, validateInputs, authorizerController.getPendingRequests);

// Get alerts for current user (legacy method for notifications)
router.route("/get-alerts/:user_id/:status/:n")
  .get(generalRateLimiter, authenticateToken, validateId, validateInputs, authorizerController.getAlerts);

// Authorize (approve) a travel request assigned to current user
router.route("/authorize-travel-request/:request_id/:user_id")
  .put(generalRateLimiter, authenticateToken, validateId, validateInputs, authorizerController.authorizeTravelRequest);

// Decline a travel request assigned to current user
router.route("/decline-travel-request/:request_id/:user_id")
  .put(generalRateLimiter, authenticateToken, validateId, validateInputs, authorizerController.declineTravelRequest);

export default router;
