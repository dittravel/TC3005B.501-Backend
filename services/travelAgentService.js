/**
 * Travel Agent Service
 * 
 * This service handles travel agent operations including:
 * - Assigning travel services (flights, hotels, etc.)
 * - Routing completed quotes to Accounts Payable for pricing
 */

import TravelAgent from "../models/travelAgentModel.js";

/**
 * Completes travel service assignment and routes to Accounts Payable for quoting
 * - Verifies request is assigned to this user
 * - Changes status from 5 (Atención Agencia) to 4 (Cotización del Viaje)
 * - Assigns to Accounts Payable (Cuentas por Pagar) in same department
 * 
 * @param {number} request_id - The ID of the travel request
 * @param {number} user_id - The ID of the travel agent (must be assigned to request)
 * @returns {object} Confirmation of routing to Accounts Payable
 * @throws Will throw an error if validation fails
 */
const completeServiceAssignment = async (request_id, user_id) => {
  try {
    // Get request details
    const request = await TravelAgent.getRequestWithDetails(request_id);
    if (!request) {
      throw { status: 404, message: "Request not found" };
    }

    // Current user must be the travel agent assigned to this request
    if (request.assigned_to !== user_id) {
      throw { 
        status: 403, 
        message: "This request is not assigned to you" 
      };
    }

    // Verify request is in status 5 (Atención Agencia de Viajes)
    if (request.request_status_id !== 5) {
      throw { 
        status: 400, 
        message: "Request must be in 'Atención Agencia de Viajes' (status 5) to complete service assignment" 
      };
    }

    // Get travel agent user details to find their department
    const travelAgentUser = await TravelAgent.getUserWithDepartment(user_id);
    if (!travelAgentUser) {
      throw { status: 404, message: "Travel agent user not found" };
    }

    // Get Accounts Payable user from same department
    const accountsPayable = await TravelAgent.getRandomAccountsPayable(travelAgentUser.department_id);
    if (!accountsPayable) {
      throw { 
        status: 500, 
        message: "No Accounts Payable user available in this department" 
      };
    }

    // Update request: change status to 4 (Cotización del Viaje) and assign to Accounts Payable
    await TravelAgent.updateRequestRouting(request_id, accountsPayable.user_id, 4);

    return {
      message: "Service assignment completed and routed to Accounts Payable",
      new_assigned_to: accountsPayable.user_id,
      new_assigned_to_name: accountsPayable.user_name,
      new_status_id: 4,
      new_status_name: "Cotización del Viaje"
    };

  } catch (err) {
    console.error("Error in completeServiceAssignment service:", err);
    throw err;
  }
};

export default {
  completeServiceAssignment,
};