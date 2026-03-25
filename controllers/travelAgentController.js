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
import { sendMail } from "../services/email/mail.cjs";
import mailData from "../services/email/mailData.js";

// Process travel requests requiring hotel/flight arrangements
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
      // Notify applicant that travel arrangements are being processed
      const { user_email, user_name, request_id, status } = await mailData(requestId);
      await sendMail(user_email, user_name, request_id, status);
      
      return res.status(200).json({
        message: "Travel request status updated successfully",
        requestId: requestId,
        newStatus: 6, // Status 6: Travel Status Verification phase
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
 * Handles transition from status 5 (Atención Agencia) to status 4 (Cotización)
 */
const completeServiceAssignment = async (req, res) => {
  const { request_id } = req.params;
  const user_id = req.user?.user_id;

  try {
    if (!user_id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await TravelAgentService.completeServiceAssignment(request_id, user_id);
    
    return res.status(200).json({
      message: result.message,
      new_assigned_to: result.new_assigned_to,
      new_assigned_to_name: result.new_assigned_to_name,
      new_status_id: result.new_status_id,
      new_status_name: result.new_status_name,
    });

  } catch (err) {
    console.error("Error in completeServiceAssignment controller:", err);
    
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    
    return res.status(status).json({ error: message });
  }
};

// Export travel agent controller functions for router configuration
export default {
  attendTravelRequest,
  completeServiceAssignment,
};
