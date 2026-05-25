/**
 * Request Model
 *
 * Data access layer for requests
 */

import { prisma } from '../lib/prisma.js';

const formatRouteDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return null;
  return d.toISOString().split('T')[0];
};

const RequestModel = {
  /**
   * Get requests visible to a user (requester OR assignee)
   * @param {number} userId - User ID
   * @param {number} societyId - Society ID for access control
   * @param {Object} filters - Optional filters: { status, sort, assignedOnly }
   * @returns {Promise<Array>} Formatted requests array
   */
  async getUserRequests(userId, societyId, { status, sort = 'desc', assignedOnly = false } = {}) {
    const requests = await prisma.request.findMany({
      where: {
        ...(assignedOnly
          ? { assigned_to: Number(userId) }
          : { user_id: Number(userId) }
        ),
        society_id: Number(societyId),
        OR: [
          { active: true },
          { Request_status: { is: { status: 'Rechazado' } } },
          { Request_status: { is: { status: 'Cancelado' } } },
        ],
        ...(status ? { Request_status: { is: { status } } } : {}),
      },
      orderBy: { creation_date: sort },
      select: {
        request_id: true,
        assigned_to: true,
        notes: true,
        requested_fee: true,
        imposed_fee: true,
        currency: true,
        request_days: true,
        creation_date: true,
        authorization_level: true,
        Request_status: {
          select: { status: true }
        },
        AuthorizationRule: {
          select: { num_levels: true }
        },
        assignedUser: {
          select: { user_name: true }
        },
        Route_Request: {
          include: {
            Route: {
              select: {
                route_id: true,
                beginning_date: true,
                ending_date: true,
                originCountry: { select: { country_name: true } },
                originCity: { select: { city_name: true } },
                destinationCountry: { select: { country_name: true } },
                destinationCity: { select: { city_name: true } },
              }
            }
          }
        }
      }
    });

    return requests.map(req => ({
      request_id: req.request_id,
      request_status: req.Request_status?.status || 'Unknown',
      notes: req.notes || '',
      requested_fee: req.requested_fee || 0,
      imposed_fee: req.imposed_fee || 0,
      currency: req.currency || 'MXN',
      request_days: req.request_days || 0,
      creation_date: req.creation_date,
      authorization_level: req.authorization_level ?? 0,
      authorization_levels_total: req.AuthorizationRule?.num_levels ?? null,
      assigned_to_name: req.assignedUser?.user_name || undefined,
      routes: req.Route_Request.map(rr => ({
        route_id: rr.Route.route_id,
        origin_country: rr.Route.originCountry?.country_name || '',
        origin_city: rr.Route.originCity?.city_name || '',
        destination_country: rr.Route.destinationCountry?.country_name || '',
        destination_city: rr.Route.destinationCity?.city_name || '',
        beginning_date: formatRouteDate(rr.Route.beginning_date),
        ending_date: formatRouteDate(rr.Route.ending_date),
      }))
    }));
  }
};

export default RequestModel;
