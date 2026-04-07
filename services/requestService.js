/**
 * Request Service
 * 
 * Centralized business logic for travel request operations.
 */

import pool from "../database/config/db.js";

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
    const { connection } = options;
    
    // Validate that at least one field is being updated
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error("No fields to update provided");
    }

    // Whitelist of allowed fields to prevent SQL injection
    const allowedFields = {
      status_id: 'request_status_id',
      assigned_to: 'assigned_to',
      imposed_fee: 'imposed_fee',
      notes: 'notes',
      authorization_level: 'authorization_level',
      requested_fee: 'requested_fee',
    };

    // Build the SET clause dynamically
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields[key]) {
        throw new Error(`Field "${key}" is not allowed for update`);
      }

      updateFields.push(`${allowedFields[key]} = ?`);
      values.push(value);
    }

    // Add last_mod_date to track updates
    updateFields.push('last_mod_date = CURRENT_TIMESTAMP');

    const query = `
      UPDATE Request
      SET ${updateFields.join(', ')}
      WHERE request_id = ?
    `;

    values.push(requestId);

    let conn = null;
    try {
      conn = connection || (await pool.getConnection());
      const result = await conn.query(query, values);

      return {
        affectedRows: result.affectedRows,
        message: `Request ${requestId} updated successfully`
      };

    } catch (error) {
      console.error('Error updating request:', error);
      throw error;

    } finally {
      // Only release connection if we created it (not provided in options)
      if (!connection && conn) {
        conn.release();
      }
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
    const { connection } = options;

    const query = `
      SELECT rs.status
      FROM Request r
      JOIN Request_status rs ON r.request_status_id = rs.request_status_id
      WHERE r.request_id = ?
    `;

    let conn = null;
    try {
      conn = connection || (await pool.getConnection());
      const rows = await conn.query(query, [requestId]);

      if (!rows || rows.length === 0) {
        throw new Error(`Request ${requestId} not found`);
      }

      return rows[0].status;

    } catch (error) {
      console.error('Error getting request status:', error);
      throw error;

    } finally {
      // Only release connection if we created it (not provided in options)
      if (!connection && conn) {
        conn.release();
      }
    }
  },
};

export default RequestService;
