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
import { authenticateToken, authorizePermission, validateSocietyAccess } from "../middleware/auth.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.use((req, res, next) => {
  next();
});

// Get pending requests assigned to current user
router.route("/get-pending-requests/:user_id/:n")
  .get(generalRateLimiter, authenticateToken, authorizePermission(['travel:view']), validateSocietyAccess('user'), validateId, validateInputs, authorizerController.getPendingRequests);

// Get alerts for current user
router.route("/get-alerts/:user_id/:n")
  .get(generalRateLimiter, authenticateToken, authorizePermission(['travel:view']), validateSocietyAccess('user'), validateId, validateInputs, authorizerController.getAlerts);

// Authorize (approve) a travel request assigned to current user
router.route("/authorize-travel-request/:request_id/:user_id")
  .put(generalRateLimiter, authenticateToken, authorizePermission(['travel:approve']), validateSocietyAccess('request'), validateId, validateInputs, authorizerController.authorizeTravelRequest);

// Decline a travel request assigned to current user
router.route("/decline-travel-request/:request_id/:user_id")
  .put(generalRateLimiter, authenticateToken, authorizePermission(['travel:approve', 'travel:reject'], { mode: 'any' }), validateSocietyAccess('request'), validateId, validateInputs, authorizerController.declineTravelRequest);

export default router;
