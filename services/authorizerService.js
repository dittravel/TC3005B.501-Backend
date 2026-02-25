/**
 * Authorizer Service
 * 
 * This service contains the business logic for handling
 * authorizer-related operations, such as authorizing and declining
 * travel requests based on user roles.
 */

import Authorizer from "../models/authorizerModel.js";

/**
 * Authorizes a travel request based on the user's role.
 * N1 (role_id 4) moves the request to "Segunda Revisión" (status_id 3).
 * N2 (role_id 5) moves the request to "Cotizacion de Viaje" (status_id 4).
 * 
 * @param {number} request_id - The ID of the travel request to authorize.
 * @param {number} user_id - The ID of the user authorizing the request.
 * @returns {object} An object containing the new status of the request.
 * @throws Will throw an error if the user is not found or not authorized.
 */
const authorizeRequest = async (request_id, user_id) => {
  try {
    const role_id = await Authorizer.getUserRole(user_id);
    if (!role_id) {
      throw { status: 404, message: "User not found" };
    }

    let new_status_id;
    if (role_id === 4) { // N1
      new_status_id = 3; // Primera Revisión
    } else if (role_id === 5) { // N2
      new_status_id = 4; // Segunda Revisión
    } else {
      throw { status: 400, message: "User role not authorized to approve request" };
    }

    await Authorizer.authorizeTravelRequest(request_id, new_status_id);

    return {
      new_status: role_id === 4 ? "Segunda Revisión" : "Cotizacion de Viaje"
    };

  } catch (err) {
    console.error("Error in authorizeRequest service:", err);
    throw err;
  }
};

/**
 * Declines a travel request based on the user's role.
 * Both N1 (role_id 4) and N2 (role_id 5) can decline requests,
 * which moves the request to "Rechazado" (status_id 5).
 * 
 * @param {number} request_id - The ID of the travel request to decline.
 * @param {number} user_id - The ID of the user declining the request.
 * @returns {object} An object containing a message and the new status of the request.
 * @throws Will throw an error if the user is not found or not authorized.
 */
const declineRequest = async (request_id, user_id) => {
  try {
    const role_id = await Authorizer.getUserRole(user_id);
    if (!role_id) {
      throw { status: 404, message: "User not found" };
    }

    if (![4, 5].includes(role_id)) {
      throw { status: 400, message: "User role not authorized to decline request" };
    }

    await Authorizer.declineTravelRequest(request_id);

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
