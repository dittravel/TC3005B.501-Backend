/**
 * Request Service
 * 
 * Centralized business logic for travel request operations.
 */

import { prisma } from "../lib/prisma.js";
import RequestModel from "../models/requestModel.js";

const RequestService = {
  /**
   * Update request with field updates.
   * Only updates the fields specified in the updates object.
   * @param {number} requestId - The ID of the travel request
   * @param {Object} updates - Object containing fields to update
   * @param {Object} options - Additional options
   * @param {Object} options.connection - Optional database connection (for transactions)
   * 
   * @example
   * // Update only status
   * await RequestService.updateRequest(123, { status_id: 5 });
   * 
   * // Update status and assign back to applicant
   * await RequestService.updateRequest(123, { status_id: 5, assigned_to: userId });
   * 
   * // Update with connection (transaction)
   * await RequestService.updateRequest(123, { status_id: 7 }, { connection: conn });
   * 
   * @returns {Promise<Object>} Result object with affectedRows
   * @throws {Error} If updates object is empty or database error occurs
   */
  async updateRequest(requestId, updates = {}, options = {}) {
    // Validate that at least one field is being updated
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error("No fields to update provided");
    }

    // Whitelist of allowed fields and map them to Prisma fields
    const allowedFields = {
      status_id: 'request_status_id',
      assigned_to: 'assigned_to',
      imposed_fee: 'imposed_fee',
      notes: 'notes',
      authorization_level: 'authorization_level',
      requested_fee: 'requested_fee',
    };

    const data = {};

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields[key]) {
        throw new Error(`Field "${key}" is not allowed for update`);
      }

      data[allowedFields[key]] = value;
    }

    data.last_mod_date = new Date();

    try {
      const runUpdate = (tx) =>
        tx.request.updateMany({
          where: { request_id: Number(requestId) },
          data,
        });

      const result = options.connection
        ? await runUpdate(options.connection)
        : await runUpdate(prisma);

      return {
        affectedRows: result.affectedRows,
        message: `Request ${requestId} updated successfully`
      };

    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    }
  },

  /**
   * Get request status name
   * @param {number} requestId - The ID of the travel request
   * @param {Object} options - Additional options
   * @param {Object} options.connection - Optional database connection
   * @returns {Promise<string>} The request status name (e.g., "Revisión", "Finalizado")
   * @throws {Error} If request not found or database error occurs
   */
  async getRequestStatusName(requestId, options = {}) {
    try {
      const runQuery = (tx) =>
        tx.request.findUnique({
          where: { request_id: Number(requestId) },
          select: {
            Request_status: {
              select: {
                status: true,
              },
            },
          },
        });

      const row = options.connection
        ? await runQuery(options.connection)
        : await runQuery(prisma);

      if (!row) {
        throw new Error(`Request ${requestId} not found`);
      }

      return row.Request_status?.status || null;

    } catch (error) {
      console.error('Error getting request status:', error);
      throw error;
    }
  },

  /**
   * Get requests visible to a user (requester OR assignee) with filtering and sorting
   * @param {number} userId - User ID making the request
   * @param {number} societyId - User's society ID for access control
   * @param {Object} rawFilters - Raw query filters from request: { status, sort }
   * @returns {Promise<Array>} Formatted requests array
   * @throws {Error} If userId or societyId missing or database error
   */
  async getUserRequests(userId, societyId, rawFilters = {}) {
    if (!userId || !societyId) {
      throw new Error('userId and societyId are required');
    }

    const filters = normalizeRequestFilters(rawFilters);

    try {
      return await RequestModel.getUserRequests(userId, societyId, filters);
    } catch (error) {
      console.error('Error in getUserRequests service:', error);
      throw error;
    }
  },
};

/**
 * Normalize and validate filter parameters from query string
 * @param {Object} rawFilters - Raw filters object
 * @returns {Object} Normalized { status, sort }
 */
function normalizeRequestFilters({ status, sort } = {}) {
  return {
    status: typeof status === 'string' ? status.trim() || null : null,
    sort: sort === 'asc' ? 'asc' : 'desc',
  };
}

/**
 * Deactivate (delete) a draft request by ID.
 * @param {number} requestId - The ID of the request to delete
 * @returns {Promise<void>}
 * @throws {Error} If request not found, not a draft, or database error occurs
 */
RequestService.deleteDraftRequest = async (requestId) => {
  try {
    const result = await prisma.request.updateMany({
      where: {
        request_id: Number(requestId),
        Request_status: {
          status: 'Borrador',
        },
      },
      data: {
        active: false,
      },
    });

    if (result.count === 0) {
      throw new Error('Draft request not found or cannot be deleted');
    }

  } catch (error) {
    console.error('Error deleting draft request:', error);
    throw error;
  }
};

export default RequestService;
