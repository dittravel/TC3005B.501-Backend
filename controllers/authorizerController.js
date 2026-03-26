/**
 * Authorizer Controller
 * 
 * This module handles business logic and approval workflows for travel requests
 * in a hierarchical authorization system. Users can authorize requests assigned
 * to them through the boss_id chain.
 * 
 * Authorization control is based on assigned_to matching, not on role.
 * Any user can be an authorizer if a request is assigned to them.
 */
import Authorizer from "../models/authorizerModel.js";
import authorizerServices from "../services/authorizerService.js";
import { sendMail } from "../services/email/mail.cjs";
import mailData from "../services/email/mailData.js"

// Get pending requests assigned to user
const getPendingRequests = async (req, res) => {
  const user_id = Number(req.params.user_id);
  const limit = Number(req.params.n) || 0;
  
  try {
    const pendingRequests = await Authorizer.getPendingRequests(user_id, limit);
    if (!pendingRequests || pendingRequests.length === 0) {
      return res.status(200).json([]);
    }
    return res.status(200).json(pendingRequests);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    return res.status(400).json({ error: "Bad Request" });
  }
}

// Get alerts for user
const getAlerts = async (req, res) => {
  const user_id = Number(req.params.user_id);
  const limit = Number(req.params.n) || 0;
  
  try {
    const alerts = await Authorizer.getAlerts(user_id, null, limit);
    return res.status(200).json(alerts);
  } catch (error) {
    return res.status(400).json({ error: "Bad Request" });
  }
}

// Approve travel request and send notification email
const authorizeTravelRequest = async (req, res) => {
  const { request_id, user_id } = req.params;

  try {
    // Authorize request through service layer
    const { new_status } = await authorizerServices.authorizeRequest(Number(request_id), Number(user_id));
    
    // Send email notification to applicant
    const { user_email, user_name, requestId, status } = await mailData(request_id);
    await sendMail(user_email, user_name, request_id, status);
    return res.status(200).json({
      message: "Request status updated successfully",
      new_status
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Unexpected error in authorizeTravelRequest controller:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Decline travel request and send notification email
const declineTravelRequest = async (req, res) => {
  const { request_id, user_id } = req.params;

  try {
    // Decline request through service layer
    const result = await authorizerServices.declineRequest(Number(request_id), Number(user_id));
    
    // Send email notification to applicant
    const { user_email, user_name, requestId, status } = await mailData(request_id);
    await sendMail(user_email, user_name, request_id, status);
    return res.status(200).json(result); 
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Unexpected error in declineTravelRequest controller:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default {
  getPendingRequests,
  getAlerts,
  authorizeTravelRequest,
  declineTravelRequest,
};
