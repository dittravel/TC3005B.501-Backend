/**
 * Authorizer Service
 * 
 * This service contains the business logic for handling
 * authorizer-related operations with hierarchical authorization routing.
 * 
 * Workflow:
 * 1. Solicitante creates request -> assigned_to = boss_id, authorization_level = 0
 * 2. Boss approves:
 *    - If boss has boss_id: escalate to boss, increment authorization_level
 *    - If boss has no boss_id: increment authorization_level, assigned_to stays same
 * 3. When authorization_level >= AUTHORIZATION_LEVELS:
 *    - If trip requires flights or hotels: route to Travel Agent (status 5)
 *    - Otherwise: route to Accounts Payable for quotation (status 4)
 */

import Authorizer from "../models/authorizerModel.js";
import { AUTHORIZATION_LEVELS } from "../config/constants.js";

/**
 * Authorizes a travel request with hierarchical routing.
 * - If user has boss_id: escalate to boss, increment authorization_level
 * - If user has no boss_id: increment authorization_level
 * - If authorization_level >= AUTHORIZATION_LEVELS: route to Travel Agent and advance status
 * 
 * @param {number} request_id - The ID of the travel request to authorize
 * @param {number} user_id - The ID of the user authorizing the request
 * @returns {object} An object with authorization result
 * @throws Will throw an error if validation fails
 */
const authorizeRequest = async (request_id, user_id, options = {}) => {
  try {
    // Get request details
    const request = await Authorizer.getRequestWithDetails(request_id);
    if (!request) {
      throw { status: 404, message: "Request not found" };
    }

    // Current user must be the one assigned to this request
    if (request.assigned_to !== user_id) {
      throw { 
        status: 403, 
        message: "This request is assigned to another user." 
      };
    }

    // Get authorizer user with boss info
    const authorizerUser = await Authorizer.getUserWithBoss(user_id);
    if (!authorizerUser) {
      throw { status: 404, message: "Authorizer user not found" };
    }

    let new_assigned_to;
    let new_authorization_level;
    let new_status_id = request.request_status_id;

    // Hierarchical authorization logic

    // If user has a boss, check if he is an authorizer and escalate if so
    if (authorizerUser.boss_id) {
      // Check if boss is an authorizer
      const bossRole = await Authorizer.getUserRole(authorizerUser.boss_id);
      if (bossRole === 4) {
        new_assigned_to = authorizerUser.boss_id;
        new_authorization_level = request.authorization_level + 1;
        console.log(`Escalating to boss (user_id: ${authorizerUser.boss_id}), new authorization level: ${new_authorization_level}`);
      } else {
        // Consider all approvals done
        new_authorization_level = AUTHORIZATION_LEVELS;
        console.log(`Boss (user_id: ${authorizerUser.boss_id} - role: ${bossRole}) is not an authorizer, skipping escalation. Setting authorization level to max.`);
      }
    } else {
      // User has no boss: increment authorization level and mark all approvals as complete
      new_authorization_level = AUTHORIZATION_LEVELS;
      console.log(`User (user_id: ${user_id}) has no boss. Setting authorization level to max.`);
    }

    // Check if we've completed all authorization levels
    if (new_authorization_level >= AUTHORIZATION_LEVELS) {
      // All hierarchical approvals done, check if trip requires travel agency services
      const needsTravelAgent = await Authorizer.requiresTravelAgencyServices(request_id);
      
      if (needsTravelAgent) {
        // Trip requires flights or hotels: assign to Travel Agent
        const travelAgent = await Authorizer.getRandomTravelAgent(authorizerUser.department_id);
        if (!travelAgent) {
          throw { 
            status: 500, 
            message: "No Travel Agent available in this department" 
          };
        }
        new_assigned_to = travelAgent.user_id;
        new_status_id = 4; // Agency travel
      } else {
        // Trip doesn't require flights or hotels: assign to Accounts Payable
        const accountsPayable = await Authorizer.getRandomAccountsPayable(authorizerUser.department_id);
        if (!accountsPayable) {
          throw { 
            status: 500, 
            message: "No Accounts Payable user available in this department" 
          };
        }
        new_assigned_to = accountsPayable.user_id;
        new_status_id = 3; // Travel quote
      }
    }

    // Update request routing
    await Authorizer.updateRequestRouting(
      request_id, 
      new_assigned_to, 
      new_authorization_level, 
      new_status_id,
      options.connection
    );

    return {
      message: "Request authorized successfully",
      new_assigned_to: new_assigned_to,
      new_authorization_level: new_authorization_level,
      new_status: new_status_id,
      escalated_to_boss: authorizerUser.boss_id ? true : false,
      completed_all_authorizations: new_authorization_level >= AUTHORIZATION_LEVELS,
      status_advanced: true
    };

  } catch (err) {
    console.error("Error in authorizeRequest service:", err);
    throw err;
  }
};

/**
 * Declines a travel request.
 * Sets status to "Rechazado"
 * 
 * @param {number} request_id - The ID of the travel request to decline
 * @param {number} user_id - The ID of the user declining the request
 * @returns {object} An object with decline confirmation
 * @throws Will throw an error if validation fails
 */
const declineRequest = async (request_id, user_id, options = {}) => {
  try {
    // Get request details
    const request = await Authorizer.getRequestWithDetails(request_id);
    if (!request) {
      throw { status: 404, message: "Request not found" };
    }

    // Validate: current user must be the one assigned to this request
    if (request.assigned_to !== user_id) {
      throw { 
        status: 403, 
        message: "User is not authorized to decline this request" 
      };
    }

    // Decline the request (set to status 10: Rechazado)
    await Authorizer.declineTravelRequest(request_id, options.connection);

    return {
      message: "Request declined successfully",
      new_status: "Rechazado"
    };
  } catch (err) {
    console.error("Error in declineRequest service:", err);
    throw err;
  }
};

export default {
  authorizeRequest,
  declineRequest,
};
