/**
 * Travel Agent Routes
 * 
 * This module defines the routes and role-based access control
 * for the "Agencia de viajes" functionalities
 */

import express from "express";
import travelAgentController from "../controllers/travelAgentController.js";
import { validateId, validateInputs, validateFlightSearch } from "../middleware/validation.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.use((req, res, next) => {
  next();
});

// Attend a travel request by request ID
router.route("/attend-travel-request/:request_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Agencia de viajes']), validateId, validateInputs, travelAgentController.attendTravelRequest);

// Complete service assignment and route to Accounts Payable for quoting
router.route("/complete-service-assignment/:request_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Agencia de viajes']), validateId, validateInputs, travelAgentController.completeServiceAssignment);

/**
 * Search available flight offers in Duffel
 * POST /api/travel-agent/flights/search
 *
 * Request body (camelCase):
 * {
 *   "origin": "MEX",
 *   "destination": "CUN",
 *   "departureDate": "2026-05-10",
 *   "tripType": "one_way" | "round",
 *   "returnDate": "2026-05-15" (required for round trips only),
 *   "cabinClass": "economy" | "premium_economy" | "business" | "first" (optional)
 * }
 *
 * Returns offers with search metadata and passenger information.
 * No booking is performed; results are for display purposes only.
 */
router.route("/flights/search")
  .post(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Agencia de viajes']),
    validateFlightSearch,
    validateInputs,
    travelAgentController.searchFlightOffers
  );

export default router;
