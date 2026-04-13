/**
 * Travel Agent Routes
 * 
 * This module defines the routes and role-based access control
 * for the "Agencia de viajes" functionalities
 */

import express from "express";
import travelAgentController from "../controllers/travelAgentController.js";
import { validateId, validateInputs } from "../middleware/validation.js";
import { authenticateToken, authorizeRole, validateSocietyAccess } from "../middleware/auth.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.use((req, res, next) => {
  next();
});

// Attend a travel request by request ID
router.route("/attend-travel-request/:request_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Agencia de viajes']), validateSocietyAccess('request'), validateId, validateInputs, travelAgentController.attendTravelRequest);

// Complete service assignment and route to Accounts Payable for quoting
router.route("/complete-service-assignment/:request_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Agencia de viajes']), validateSocietyAccess('request'), validateId, validateInputs, travelAgentController.completeServiceAssignment);

export default router;
