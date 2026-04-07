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
import AuditLogService from "../services/auditLogService.js";
import pool from "../database/config/db.js";
import { sendEmails } from "../services/email/emailService.js";

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
  const requestId = Number(req.params.request_id);
  const actorUserId = Number(req.user.user_id);
  let connection;

  try {
    // Authorize request through service layer
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const result = await authorizerServices.authorizeRequest(requestId, actorUserId, { connection });
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'REQUEST_AUTHORIZED',
      entityType: 'Request',
      entityId: requestId,
      metadata: {
        new_assigned_to: result.new_assigned_to,
        new_authorization_level: result.new_authorization_level,
        new_status: result.new_status,
        completed_all_authorizations: result.completed_all_authorizations,
      },
    }, { connection });
    await connection.commit();
    try {
      // Send email notifications
      await sendEmails(requestId);
    } catch (mailError) {
      console.error("Failed to send request authorization email:", mailError);
    }
    return res.status(200).json({
      message: "Request status updated successfully",
      new_status: result.new_status
    });
  } catch (err) {
    if (connection) await connection.rollback();
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Unexpected error in authorizeTravelRequest controller:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) connection.release();
  }
};

// Decline travel request and send notification email
const declineTravelRequest = async (req, res) => {
  const requestId = Number(req.params.request_id);
  const actorUserId = Number(req.user.user_id);
  let connection;

  try {
    // Decline request through service layer
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const result = await authorizerServices.declineRequest(requestId, actorUserId, { connection });
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'REQUEST_DECLINED',
      entityType: 'Request',
      entityId: requestId,
      metadata: {
        new_status: result.new_status,
      },
    }, { connection });
    await connection.commit();
    try {
      // Send email notifications
      await sendEmails(requestId);
    } catch (mailError) {
      console.error("Failed to send request decline email:", mailError);
    }
    return res.status(200).json(result); 
  } catch (err) {
    if (connection) await connection.rollback();
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Unexpected error in declineTravelRequest controller:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) connection.release();
  }
};

export default {
  getPendingRequests,
  getAlerts,
  authorizeTravelRequest,
  declineTravelRequest,
};
