<<<<<<< Updated upstream
/*
Travel Agent Controller
Miguel Soria 26/04/25
Manages parameters and checks for Travel Agent endpoints
*/
=======
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

>>>>>>> Stashed changes
import TravelAgent from "../models/travelAgentModel.js";
import { Mail } from "../services/email/mail.cjs";
import mailData from "../services/email/mailData.js";

const attendTravelRequest = async (req, res) => {
<<<<<<< Updated upstream
    const requestId = req.params.request_id;

    try {
        // Check if request exists
        const exists = await TravelAgent.requestExists(requestId);
        if (!exists) {
            return res.status(404).json({ error: "Travel request not found" });
        }

        // Update request status to 5
        const updated = await TravelAgent.attendTravelRequest(requestId);

        if (updated) {
            const { user_email, user_name, request_id, status } = await mailData(requestId);
            await Mail(user_email, user_name, request_id, status);
            return res.status(200).json({
                message: "Travel request status updated successfully",
                requestId: requestId,
                newStatus: 6, // Comprobación Estado de Viaje
            });
        } else {
            return res
                .status(400)
                .json({ error: "Failed to update travel request status" });
        }
    } catch (err) {
        console.error("Error in attendTravelRequest controller:", err);
        res.status(500).json({ error: "Internal Server Error" });
=======
  const requestId = req.params.request_id;
  
  try {
    // Verify the travel request exists and is in the correct status
    const exists = await TravelAgent.requestExists(requestId);
    if (!exists) {
      return res.status(404).json({ error: "Travel request not found" });
>>>>>>> Stashed changes
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

// exports for the router
export default {
  attendTravelRequest,
};
