<<<<<<< Updated upstream
/*
 * Authorizer Routes
 *
=======
/**
 * Authorizer Routes
 * 
>>>>>>> Stashed changes
 * This module defines the routes and role-based access control
 * for the "Autorizador" functionalities
 */

import express from "express";
import authorizerController from "../controllers/authorizerController.js";
import { validateId, validateInputs, validateDeptStatus } from "../middleware/validation.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.use((req, res, next) => {
    next();
});

// Get alerts for pending travel requests by department ID, status ID, and number of alerts
router.route("/get-alerts/:dept_id/:status_id/:n")
    .get(generalRateLimiter, authenticateToken, authorizeRole(['N1', 'N2']), validateDeptStatus, validateInputs, authorizerController.getAlerts);

// Get pending travel requests for a department by request ID and user ID
router.route("/authorize-travel-request/:request_id/:user_id")
    .put(generalRateLimiter, authenticateToken, authorizeRole(['N1', 'N2']), validateId, validateInputs, authorizerController.authorizeTravelRequest);

// Decline a travel request by request ID and user ID
router.route("/decline-travel-request/:request_id/:user_id")
    .put(generalRateLimiter, authenticateToken, authorizeRole(['N1', 'N2']), validateId, validateInputs, authorizerController.declineTravelRequest);

export default router;
