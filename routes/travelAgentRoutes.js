/**
 * Travel Agent Routes
 *
 * This module defines the routes and role-based access control
 * for the "Agencia de viajes" functionalities
 */

import express from "express";
import travelAgentController from "../controllers/travelAgentController.js";
import { validateId, validateInputs, validateFlightSearch, validateHotelSearch, validateRouteFeeUpdate } from "../middleware/validation.js";
import { authenticateToken, authorizeRole, validateSocietyAccess } from "../middleware/auth.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";

// Import multer for file uploads
// Ref: https://www.npmjs.com/package/multer
// It adds a files property to the request object, which contains the uploaded files
import multer from 'multer';
const upload = multer();

const router = express.Router();

router.use((req, res, next) => {
  next();
});

// Attend a travel request by request ID
router
  .route("/attend-travel-request/:request_id")
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(["Agencia de viajes"]),
    validateSocietyAccess("request"),
    validateId,
    validateInputs,
    travelAgentController.attendTravelRequest,
  );

// Complete service assignment and route to Accounts Payable for quoting
router
  .route("/complete-service-assignment/:request_id")
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(["Agencia de viajes"]),
    validateSocietyAccess("request"),
    validateId,
    validateInputs,
    travelAgentController.completeServiceAssignment,
  );

/**
 * Search available flight offers in Duffel
 * POST /api/travel-agent/flights/search
 */
router
  .route("/flights/search")
  .post(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(["Agencia de viajes"]),
    validateFlightSearch,
    validateInputs,
    travelAgentController.searchFlightOffers,
  );

/**
 * Search available hotel options in SerpApi (Google Hotels)
 * POST /api/travel-agent/hotels/search
 */
router
  .route("/hotels/search")
  .post(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(["Agencia de viajes"]),
    validateHotelSearch,
    validateInputs,
    travelAgentController.searchHotelOffers,
  );

// Persist selected flight/hotel fees for a specific route
router.route('/route-fees/:route_id')
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Agencia de viajes']),
    validateRouteFeeUpdate,
    validateInputs,
    travelAgentController.updateRouteFees
  );

router.route("/create-reservation-file").post(
  generalRateLimiter,
  authenticateToken,
  authorizeRole(["Agencia de viajes"]),
  upload.fields([
    { name: "flightPdf", maxCount: 1 }, // Allow one single file
    { name: "hotelPdf", maxCount: 1 }, // Allow one single file

  ]),
  travelAgentController.createReservationWithFilesHandler,
);

export default router;
