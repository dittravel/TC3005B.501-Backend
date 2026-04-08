/**
 * TravelAgent Model
 * 
 * This model handles database operations related to travel agents,
 * specifically for attending to travel requests and checking
 * the existence of requests in the database.
 */

import { prisma } from "../lib/prisma.js";


const TravelAgent = {
  // Update request status to receipt validation
  async attendTravelRequest(requestId) {
    try {
      const result = await prisma.request.updateMany({
        where: { request_id: requestId },
        data: { request_status_id: 5 },
      });
      return result.count > 0;
    } catch (error) {
      console.error("Error updating travel request status:", error);
      throw error;
    }
  },

  // Check if request exists in the database
  async requestExists(requestId) {
    try {
      const found = await prisma.request.findUnique({
        where: { request_id: requestId },
        select: { request_id: true },
      });
      return !!found;
    } catch (error) {
      console.error("Error checking if request exists:", error);
      throw error;
    }
  },

  // Get request with all relevant details
  async getRequestWithDetails(request_id) {
    try {
      const req = await prisma.request.findFirst({
        where: { request_id, active: true },
        select: {
          request_id: true,
          user_id: true,
          request_status_id: true,
          assigned_to: true,
          authorization_level: true,
          requested_fee: true,
          notes: true,
          creation_date: true,
          last_mod_date: true,
        },
      });
      return req || null;
    } catch (error) {
      console.error('Error getting request with details:', error);
      throw error;
    }
  },

  // Get user with department information
  async getUserWithDepartment(user_id) {
    try {
      const user = await prisma.user.findFirst({
        where: { user_id, active: true },
        select: {
          user_id: true,
          user_name: true,
          department_id: true,
          role_id: true,
        },
      });
      return user || null;
    } catch (error) {
      console.error('Error getting user with department:', error);
      throw error;
    }
  },

  // Update request status and assigned user
  async updateRequestRouting(request_id, assigned_to, status_id) {
    try {
      const result = await prisma.request.updateMany({
        where: { request_id },
        data: {
          assigned_to,
          request_status_id: status_id,
        },
      });
      return result;
    } catch (error) {
      console.error('Error updating request routing:', error);
      throw error;
    }
  },
};

export default TravelAgent;
