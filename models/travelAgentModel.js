/**
 * TravelAgent Model
 * 
 * This model handles database operations related to travel agents,
 * specifically for attending to travel requests and checking
 * the existence of requests in the database.
 */

import pool from "../database/config/db.js";

const TravelAgent = {
  // Update request status to receipt validation
  async attendTravelRequest(requestId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.query(
        "UPDATE `Request` SET request_status_id = 5 WHERE request_id = ?",
        [requestId],
      );
      return result.affectedRows > 0;

    } catch (error) {
      console.error("Error updating travel request status:", error);
      throw error;

    } finally {
      if (conn) {
        conn.release();
      }
    }
  },
  
  // Check if request exists in the database
  async requestExists(requestId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        "SELECT request_id FROM `Request` WHERE request_id = ?",
        [requestId],
      );
      return rows.length > 0;

    } catch (error) {
      console.error("Error checking if request exists:", error);
      throw error;
      
    } finally {
      if (conn) {
        conn.release();
      }
    }
  },

  /**
   * Get request with all relevant details
   * @param {number} request_id - The ID of the travel request
   * @returns {object} Request object with details
   */
  async getRequestWithDetails(request_id) {
    let conn;
    const query = `
      SELECT 
        r.request_id,
        r.user_id,
        r.request_status_id,
        r.assigned_to,
        r.authorization_level,
        r.requested_fee,
        r.notes,
        r.creation_date,
        r.last_mod_date
      FROM Request r
      WHERE r.request_id = ? AND r.active = true
    `;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [request_id]);
      return rows.length > 0 ? rows[0] : null;

    } catch (error) {
      console.error('Error getting request with details:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },

  /**
   * Get user with department information
   * @param {number} user_id - The ID of the user
   * @returns {object} User object with department_id
   */
  async getUserWithDepartment(user_id) {
    let conn;
    const query = `
      SELECT 
        user_id,
        user_name,
        department_id,
        role_id
      FROM User
      WHERE user_id = ? AND active = true
    `;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [user_id]);
      return rows.length > 0 ? rows[0] : null;

    } catch (error) {
      console.error('Error getting user with department:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },

  /**
   * Get a random Accounts Payable user from a department
   * @param {number} dept_id - The department ID
   * @returns {object} A user object with user_id and user_name, or null if none found
   */
  async getRandomAccountsPayable(dept_id) {
    let conn;
    const query = `
      SELECT 
        user_id,
        user_name
      FROM User
      WHERE department_id = ? AND role_id = (
        SELECT role_id FROM Role WHERE role_name = 'Cuentas por pagar'
      )
      ORDER BY RAND()
      LIMIT 1
    `;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [dept_id]);
      return rows.length > 0 ? rows[0] : null;

    } catch (error) {
      console.error('Error getting random accounts payable user:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },

  /**
   * Update request status and assigned user
   * @param {number} request_id - The ID of the travel request
   * @param {number} assigned_to - The user ID to assign to
   * @param {number} status_id - The new status ID
   */
  async updateRequestRouting(request_id, assigned_to, status_id) {
    let conn;
    const query = `
      UPDATE Request
      SET assigned_to = ?, request_status_id = ?
      WHERE request_id = ?
    `;

    try {
      conn = await pool.getConnection();
      const result = await conn.query(query, [assigned_to, status_id, request_id]);
      return result;

    } catch (error) {
      console.error('Error updating request routing:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },
};

export default TravelAgent;
