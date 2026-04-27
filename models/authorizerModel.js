/**
 * Authorizer Model
 * 
 * This model provides functions for authorizers to manage travel requests,
 * including retrieving alerts, getting user roles, authorizing or declining
 * travel requests.
 */

import { prisma } from '../lib/prisma.js';

const Authorizer = {
  /**
   * Get pending requests assigned to a user
   * @param {number} user_id - The ID of the user
   * @param {number} limit - Optional limit for number of results (0 = no limit)
   * @returns {Array} Array of pending requests assigned to the user
   */
  async getPendingRequests(user_id, limit = 0) {
    // Get pending requests assigned to a user, with related info
    const requests = await prisma.request.findMany({
      where: {
        assigned_to: user_id,
        active: true,
      },
      include: {
        requester: { select: { user_name: true } },
        Request_status: { select: { status: true } },
        Route_Request: {
          include: {
            Route: {
              include: {
                destinationCountry: { select: { country_name: true } },
              },
            },
          },
        }
      },
      orderBy: { creation_date: 'asc' },
      ...(limit > 0 ? { take: limit } : {}),
    });

    // Aggregate beginning/ending dates and destination_country
    return requests.map(r => {
      const allRoutes = r.Route_Request?.map(rr => rr.Route).filter(route => !!route) || [];
      const beginning_date = allRoutes.length > 0 ? allRoutes.reduce((min, route) => route.beginning_date && (!min || route.beginning_date < min) ? route.beginning_date : min, null) : null;
      const ending_date = allRoutes.length > 0 ? allRoutes.reduce((max, route) => route.ending_date && (!max || route.ending_date > max) ? route.ending_date : max, null) : null;
      const destination_country = allRoutes.length > 0 && allRoutes[0].destinationCountry ? allRoutes[0].destinationCountry.country_name : null;
      return {
        request_id: r.request_id,
        user_id: r.user_id,
        requester_name: r.requester?.user_name ?? null,
        request_status_id: r.request_status_id,
        request_status: r.Request_status?.status ?? null,
        assigned_to: r.assigned_to,
        authorization_level: r.authorization_level,
        requested_fee: r.requested_fee,
        notes: r.notes,
        creation_date: r.creation_date,
        last_mod_date: r.last_mod_date,
        destination_country,
        beginning_date,
        ending_date,
      };
    });
  },

  // getAlerts: fetches alerts from the Alert table, including the real message and request info
  async getAlerts(user_id, status_id = null, n = 0) {
    // Fetch alerts related to requests assigned to the user
    const alerts = await prisma.alert.findMany({
      where: {
        Request: {
          assigned_to: user_id,
          active: true,
          ...(status_id ? { request_status_id: status_id } : {}),
        },
      },
      include: {
        AlertMessage: true,
        Request: {
          select: {
            request_id: true,
            creation_date: true,
            requester: { select: { user_name: true } },
          },
        },
      },
      orderBy: { alert_date: 'desc' },
      ...(n > 0 ? { take: n } : {}),
    });
    return alerts.map(a => ({
      alert_id: a.alert_id,
      request_id: a.request_id,
      user_name: a.Request?.requester?.user_name ?? null,
      message_text: a.AlertMessage?.message_text ?? null,
      alert_date: a.alert_date ? a.alert_date.toISOString().slice(0, 10) : null,
      alert_time: a.alert_date ? a.alert_date.toISOString().slice(11, 19) : null,
    }));
  },
  
  // Get user role by user ID
  async getUserRole(user_id) {
    const user = await prisma.user.findUnique({
      where: { user_id },
      select: { role_id: true },
    });
    return user ? user.role_id : null;
  },
  
  async authorizeTravelRequest(request_id, status_id) {
    return prisma.request.updateMany({
      where: { request_id },
      data: { request_status_id: status_id },
    });
  },
  
  // Decline a travel request
  async declineTravelRequest(request_id, connection = null) {
    await prisma.request.updateMany({
      where: { request_id },
      data: { request_status_id: 9 },
    });
    return true;
  },

  // Get request details with assigned_to user
  async getRequestWithDetails(request_id) {
    return prisma.request.findUnique({
      where: { request_id },
      select: {
        request_id: true,
        user_id: true,
        request_status_id: true,
        assigned_to: true,
        authorization_level: true,
        authorization_rule_id: true,
        notes: true,
        requested_fee: true,
        imposed_fee: true,
        request_days: true,
        creation_date: true,
        last_mod_date: true,
        active: true,
      },
    });
  },

  // Get user with boss_id
  async getUserWithBoss(user_id) {
    return prisma.user.findUnique({
      where: { user_id },
      select: {
        user_id: true,
        role_id: true,
        department_id: true,
        boss_id: true,
        user_name: true,
        society_id: true,
      },
    });
  },

  // Update request routing
  async updateRequestRouting(request_id, assigned_to, authorization_level, status_id = null, connection = null) {
    // Update request routing, optionally status
    const data = { assigned_to, authorization_level };
    if (status_id !== null) {
      data.request_status_id = status_id;
    }
    return prisma.request.updateMany({
      where: { request_id },
      data,
    });
  },

  /**
   * Check if a travel request requires travel agency services (flights or hotels)
   * @param {number} request_id - The ID of the travel request
   * @returns {boolean} true if any route needs flight or hotel, false otherwise
   */
  async requiresTravelAgencyServices(request_id) {
    // Check if any route for this request needs plane or hotel
    const count = await prisma.route_Request.count({
      where: {
        request_id,
        Route: {
          OR: [
            { plane_needed: true },
            { hotel_needed: true },
          ],
        },
      },
    });
    return count > 0;
  },
};

export default Authorizer;
