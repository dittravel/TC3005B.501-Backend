/**
 * Authorizer Service
 * 
 * This service contains the business logic for handling
 * authorizer-related operations with rule-based authorization routing.
 * 
 * Workflow:
 * 1. Solicitante creates request -> gets authorization_rule_id, assigned_to based on rule level 1
 * 2. Authorizer approves:
 *    - Next approver determined by rule level and configuration
 *    - If level is "Jefe": escalate to direct boss
 *    - If level is "Aleatorio": random authorizer from department
 *    - If level is "Nivel Superior": N levels up the hierarchy (or highest available)
 * 3. When authorization_level >= rule.num_levels:
 *    - If trip requires flights or hotels: route to Travel Agent (status 5)
 *    - Otherwise: route to Accounts Payable for quotation (status 4)
 */

import Authorizer from "../models/authorizerModel.js";
import User from "../models/userModel.js";
import AuthorizationRuleService from "./authorizationRuleService.js";

const TRAVEL_AGENT_PERMISSIONS = ['travel:view_flights', 'travel:view_hotels'];
const ACCOUNTS_PAYABLE_PERMISSIONS = ['receipts:approve'];

/**
 * Authorizes a travel request based on the associated authorization rule.
 * - Fetches the rule and current level configuration
 * - Determines next approver based on rule level type (Jefe, Aleatorio, Nivel Superior)
 * - Routes to Travel Agent or Accounts Payable when all levels complete
 * 
 * @param {number} request_id - The ID of the travel request to authorize
 * @param {number} user_id - The ID of the user authorizing the request
 * @returns {object} An object with authorization result
 * @throws Will throw an error if validation fails
 */
const authorizeRequest = async (request_id, user_id, options = {}) => {
  try {
    // Get request details including authorization rule
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

    // Get authorization rule for this request
    let authorizationRule = null;
    if (request.authorization_rule_id) {
      authorizationRule = await AuthorizationRuleService.getRuleById(request.authorization_rule_id);
    }

    // If no rule found, throw error
    if (!authorizationRule) {
      throw { 
        status: 400, 
        message: "No authorization rule associated with this request" 
      };
    }

    // Get authorizer user with boss info
    const authorizerUser = await Authorizer.getUserWithBoss(user_id);
    if (!authorizerUser) {
      throw { status: 404, message: "Authorizer user not found" };
    }

    let new_assigned_to = null;
    let new_authorization_level = request.authorization_level + 1;
    let new_status_id = request.request_status_id;

    // Get the requester info (original applicant)
    const requesterUser = await Authorizer.getUserWithBoss(request.user_id);
    if (!requesterUser) {
      throw { status: 404, message: "Requester user not found" };
    }

    // Check if we've completed all authorization levels
    if (AuthorizationRuleService.isAuthorizationComplete(new_authorization_level, authorizationRule.num_levels)) {
      // All rules-based approvals done, check if trip requires travel agency services
      const needsTravelAgent = await Authorizer.requiresTravelAgencyServices(request_id);
      
      if (needsTravelAgent) {
        // Trip requires flights or hotels: assign to Travel Agent
        const travelAgent = await User.getRandomUserByPermissions(TRAVEL_AGENT_PERMISSIONS, requesterUser.department_id, requesterUser.society_group_id);
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
        const accountsPayable = await User.getRandomUserByPermissions(ACCOUNTS_PAYABLE_PERMISSIONS, requesterUser.department_id, requesterUser.society_group_id);
        if (!accountsPayable) {
          throw { 
            status: 500, 
            message: "No Accounts Payable user available in this department" 
          };
        }
        new_assigned_to = accountsPayable.user_id;
        new_status_id = 3; // Travel quote
      }
    } else {
      // Handle automatic rules (without specific levels defined)
      if (authorizationRule.automatic) {
        // Automatic rule: escalate through hierarchy (direct boss)
        const bossId = await User.getBossId(request.assigned_to);
        if (bossId) {
          // Escalate to boss only if they can approve requests
          const bossCanApprove = await User.userHasAnyPermission(
            bossId,
            ['travel:approve', 'travel:reject'],
            requesterUser.society_group_id,
          );

          if (bossCanApprove) {
            new_assigned_to = bossId;
            console.log(`Automatic rule: Escalating to boss (user_id: ${bossId}), new authorization level: ${new_authorization_level}`);
          } else {
            // Boss cannot approve, route to next step (Travel Agent or Accounts Payable)
            const needsTravelAgent = await Authorizer.requiresTravelAgencyServices(request_id);
            if (needsTravelAgent) {
              const travelAgent = await User.getRandomUserByPermissions(TRAVEL_AGENT_PERMISSIONS, requesterUser.department_id, requesterUser.society_group_id);
              new_assigned_to = travelAgent ? travelAgent.user_id : null;
              new_status_id = 4;
            } else {
              const accountsPayable = await User.getRandomUserByPermissions(ACCOUNTS_PAYABLE_PERMISSIONS, requesterUser.department_id, requesterUser.society_group_id);
              new_assigned_to = accountsPayable ? accountsPayable.user_id : null;
              new_status_id = 3;
            }
          }
        } else {
          // No boss found, route to Travel Agent or Accounts Payable
          const needsTravelAgent = await Authorizer.requiresTravelAgencyServices(request_id);
          if (needsTravelAgent) {
            const travelAgent = await User.getRandomUserByPermissions(TRAVEL_AGENT_PERMISSIONS, requesterUser.department_id, requesterUser.society_group_id);
            new_assigned_to = travelAgent ? travelAgent.user_id : null;
            new_status_id = 4;
          } else {
            const accountsPayable = await User.getRandomUserByPermissions(ACCOUNTS_PAYABLE_PERMISSIONS, requesterUser.department_id, requesterUser.society_group_id);
            new_assigned_to = accountsPayable ? accountsPayable.user_id : null;
            new_status_id = 3;
          }
        }
      } else {
        // Rule has specific levels defined
        // new_authorization_level is 1-indexed (1, 2, 3...) but we need the NEXT level
        // AuthorizationRuleLevel.level_number is also 1-indexed
        const nextLevelNumber = new_authorization_level + 1;
        const nextRuleLevel = authorizationRule.levels.find(level => level.level_number === nextLevelNumber);
        
        if (!nextRuleLevel) {
          throw {
            status: 500,
            message: `Rule level ${nextLevelNumber} not found in authorization rule`
          };
        }

        // Determine next approver based on rule level type
        new_assigned_to = await AuthorizationRuleService.getNextApproverForRuleLevel(
          nextRuleLevel,
          request.user_id, // requester (original applicant)
          requesterUser.department_id,
          requesterUser.society_group_id
        );

        if (!new_assigned_to) {
          throw {
            status: 500,
            message: `Could not determine next approver for rule level ${new_authorization_level}`
          };
        }

        console.log(`Escalating to next level approver (user_id: ${new_assigned_to}), new authorization level: ${new_authorization_level}`);
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
      completed_all_authorizations: AuthorizationRuleService.isAuthorizationComplete(new_authorization_level, authorizationRule.num_levels),
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
