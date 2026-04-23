/**
 * Travel Agent Controller
 *
 * This module handles business logic and booking operations for the
 * "Agencia de viajes" role. It manages travel booking, reservation management,
 * hotel and flight arrangements, and communication with external travel providers
 * for approved business travel requests.
 *
 * Role-based access control ensures only authorized travel agency personnel
 * can access assigned travel requests and update booking information.
 */

import TravelAgent from "../models/travelAgentModel.js";
import TravelAgentService from "../services/travelAgentService.js";
import { searchFlights } from "../services/travelAgency/flightService.js";
import { searchHotels } from "../services/travelAgency/hotelService.js";
import { getUserById } from "../services/userService.js";
import { sendEmails } from "../services/email/emailService.js";

/**
 * Attend a travel request and update its status
 * Updates the travel request status when flight/hotel arrangements are needed.
 *
 * @param {Object} req - Express request object with request_id in params
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with updated status or error
 */
const attendTravelRequest = async (req, res) => {
  const requestId = req.params.request_id;
  
  try {
    // Verify the travel request exists and is in the correct status
    const exists = await TravelAgent.requestExists(requestId);
    if (!exists) {
      return res.status(404).json({ error: "Travel request not found" });
    }
    
    // Process travel arrangements and transition to next workflow stage
    const updated = await TravelAgent.attendTravelRequest(requestId);
    
    if (updated) {
      // Send email notifications
      await sendEmails(requestId);
      
      return res.status(200).json({
        message: "Travel request status updated successfully",
        requestId: requestId,
        newStatus: 5, // Status 5: Aplicant submits receipts
      });
    } else {
      return res
      .status(400)
      .json({ error: "Failed to update travel request status" });
    }
  } catch (err) {
    console.error("Error in attendTravelRequest controller:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Complete service assignment and route to Accounts Payable for quoting
 * Handles transition from status 4 (Atención Agencia) to status 5 (Cotización).
 *
 * @param {Object} req - Express request object with request_id in params and authenticated user
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with assignment details or error
 */
const completeServiceAssignment = async (req, res) => {
  const { request_id: requestId } = req.params;
  const userId = req.user?.user_id;

  try {
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await TravelAgentService.completeServiceAssignment(requestId, userId);

    // Send email notifications
    await sendEmails(requestId);
    
    return res.status(200).json({
      message: result.message,
      newAssignedTo: result.new_assigned_to,
      newAssignedToName: result.new_assigned_to_name,
      newStatusId: result.new_status_id,
      newStatusName: result.new_status_name
    });

  } catch (err) {
    console.error("Error in completeServiceAssignment controller:", err);
    
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    
    return res.status(status).json({ error: message });
  }
};

/**
 * Search available flight offers in Duffel (read-only, no booking)
 * Retrieves flight offers based on search parameters, using the authenticated user
 * as the passenger. Supports one-way and round-trip searches.
 *
 * @param {Object} req - Express request object with authenticated user and search params in body
 * @param {string} req.body.origin - IATA code for departure airport
 * @param {string} req.body.destination - IATA code for arrival airport
 * @param {string} req.body.departureDate - Departure date in YYYY-MM-DD format
 * @param {string} req.body.tripType - Trip type: 'one_way' or 'round'
 * @param {string} [req.body.returnDate] - Return date for round trips
 * @param {string} [req.body.cabinClass] - Cabin class preference (default: economy)
 * @param {number} [req.body.page=1] - Page number for pagination
 * @param {number} [req.body.pageSize] - Number of offers per page
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON with offers and search metadata or error
 */
const searchFlightOffers = async (req, res) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const {
      tripType,
      origin,
      destination,
      departureDate,
      returnDate,
      cabinClass,
      page,
      pageSize,
    } = req.body;

    const userData = await getUserById(userId);
    const passengerName = userData?.user_name || "Unknown passenger";

    const offersResult = await searchFlights({
      origin,
      destination,
      departureDate,
      returnDate,
      tripType,
      cabinClass,
      passengerName,
      page,
      pageSize
    });

    return res.status(200).json(offersResult);
  } catch (err) {
    console.error("Error in searchFlightOffers controller:", err);

    return res.status(500).json({
      error: "Failed to search flights",
      details: err?.message || "Unknown error"
    });
  }
};

/**
 * Search available hotel options in SerpApi (read-only, no booking)
 * Retrieves hotel options based on destination and stay dates.
 *
 * @param {Object} req - Express request object with authenticated user and search params in body
 * @param {string} req.body.checkInDate - Check-in date in YYYY-MM-DD format
 * @param {string} req.body.checkOutDate - Check-out date in YYYY-MM-DD format
 * @param {number} req.body.guests - Number of guests
 * @param {string} req.body.address - Destination or address text
 * @param {number} [req.body.page=1] - Internal page number
 * @param {number} [req.body.pageSize] - Number of hotels per page
 * @param {string} [req.body.nextPageToken] - SerpApi next page token
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON with hotels sorted by rating and price, or error
 */
const searchHotelOffers = async (req, res) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const {
      checkInDate,
      checkOutDate,
      guests,
      address,
      page,
      pageSize,
      nextPageToken,
    } = req.body;

    const hotelsResult = await searchHotels({
      checkInDate,
      checkOutDate,
      guests,
      address,
      page,
      pageSize,
      nextPageToken,
    });

    return res.status(200).json(hotelsResult);
  } catch (err) {
    console.error("Error in searchHotelOffers controller:", err);

    return res.status(500).json({
      error: "Failed to search hotels",
      details: err?.message || "Unknown error",
    });
  }
};

/**
 * Save selected flight/hotel fees into a specific route.
 * Allows updating either field independently.
 *
 * @param {Object} req - Express request object with route_id param and fee fields in body
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON with updated fee values or error
 */
const updateRouteFees = async (req, res) => {
  try {
    const { route_id: routeId } = req.params;
    const { flight_fee: flightFee, hotel_fee: hotelFee } = req.body;

    const updatedRoute = await TravelAgent.updateRouteFees(routeId, {
      flight_fee: flightFee,
      hotel_fee: hotelFee,
    });

    return res.status(200).json({
      message: 'Route fees updated successfully',
      route: updatedRoute,
    });
  } catch (err) {
    console.error('Error in updateRouteFees controller:', err);

    if (err?.code === 'P2025') {
      return res.status(404).json({ error: 'Route not found' });
    }

    return res.status(500).json({
      error: 'Failed to update route fees',
      details: err?.message || 'Unknown error',
    });
  }
};

// Export travel agent controller functions for router configuration
export default {
  attendTravelRequest,
  completeServiceAssignment,
  searchFlightOffers,
  searchHotelOffers,
  updateRouteFees,
};
