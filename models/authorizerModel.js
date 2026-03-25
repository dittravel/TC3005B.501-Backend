/**
 * Authorizer Model
 * 
 * This model provides functions for authorizers to manage travel requests,
 * including retrieving alerts, getting user roles, authorizing or declining
 * travel requests.
 */

import pool from '../database/config/db.js';

const Authorizer = {
  /**
   * Get pending requests assigned to a user
   * @param {number} user_id - The ID of the user
   * @param {number} limit - Optional limit for number of results (0 = no limit)
   * @returns {Array} Array of pending requests assigned to the user
   */
  async getPendingRequests(user_id, limit = 0) {
    let conn;
    let query = `
      SELECT 
        r.request_id,
        r.user_id,
        u.user_name AS requester_name,
        r.request_status_id,
        rs.status AS request_status,
        r.assigned_to,
        r.authorization_level,
        r.requested_fee,
        r.notes,
        r.creation_date,
        r.last_mod_date,
        c.country_name AS destination_country,
        MIN(ro.beginning_date) AS beginning_date,
        MAX(ro.ending_date) AS ending_date
      FROM Request r
      INNER JOIN User u ON r.user_id = u.user_id
      INNER JOIN Request_status rs ON r.request_status_id = rs.request_status_id
      LEFT JOIN Route_Request rr ON r.request_id = rr.request_id
      LEFT JOIN Route ro ON rr.route_id = ro.route_id
      LEFT JOIN Country c ON ro.id_destination_country = c.country_id
      WHERE r.assigned_to = ? AND r.active = true
      GROUP BY r.request_id, u.user_id, u.user_name, r.request_status_id, rs.status, c.country_name
      ORDER BY r.creation_date ASC
    `;

    if (limit > 0) {
      query += ` LIMIT ?`;
    }

    try {
      conn = await pool.getConnection();
      const params = limit > 0 ? [user_id, limit] : [user_id];
      const rows = await conn.query(query, params);
      return rows;

    } catch (error) {
      console.error('Error getting pending requests:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },

  // Legacy getAlerts method - kept for backward compatibility but uses new hierarchical logic
  async getAlerts(user_id, status_id, n) {
    let conn;
    const query = `
      SELECT 
        Request.request_id,
        User.user_name,
        Request.request_id as alert_id,
        Request_status.status as message_text,
        DATE(Request.creation_date) AS alert_date,
        TIME(Request.creation_date) AS alert_time
      FROM Request
      INNER JOIN User ON Request.user_id = User.user_id
      INNER JOIN Request_status ON Request.request_status_id = Request_status.request_status_id
      WHERE Request.assigned_to = ? AND Request.active = true
      ORDER BY Request.creation_date DESC
      ${n > 0 ? 'LIMIT ?' : ''}
    `;

    try {
      conn = await pool.getConnection();
      const params = n > 0 ? [user_id, n] : [user_id];
      const rows = await conn.query(query, params);
      return rows;

    } catch (error) {
      console.error('Error getting alerts:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },
  
  // Get user role by user ID
  async getUserRole(user_id) {
    let conn;
    const query = `
      SELECT role_id FROM User WHERE user_id = ?
    `;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [user_id]);
      if (rows.length > 0) {
        return rows[0].role_id;
      } else {
        return null;
      }

    } catch (error) {
      console.error('Error getting user role:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },
  
  async authorizeTravelRequest(request_id, status_id) {
    let conn;
    const query = `
      UPDATE Request
      SET request_status_id = ?
      WHERE request_id = ?
    `;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [status_id, request_id]);
      return rows;

    } catch (error) {
      console.error('Error getting completed requests:', error);
      throw error;

    } finally {
      if (conn) {
        conn.release();
      }
    }
  },
  
  // Decline a travel request
  async declineTravelRequest(request_id) {
    let conn;
    const query = `
      UPDATE Request
      SET request_status_id = 10
      WHERE request_id = ?
    `;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [request_id]);
      return true;

    } catch (error) {
      console.error('Error getting completed requests:', error);
      throw error;
      
    } finally {
      if (conn) {
        conn.release();
      }
    }
  },

  // Get request details with assigned_to user
  async getRequestWithDetails(request_id) {
    let conn;
    const query = `
      SELECT 
        request_id,
        user_id,
        request_status_id,
        assigned_to,
        authorization_level,
        notes,
        requested_fee,
        imposed_fee,
        request_days,
        creation_date,
        last_mod_date,
        active
      FROM Request
      WHERE request_id = ?
    `;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [request_id]);
      return rows.length > 0 ? rows[0] : null;

    } catch (error) {
      console.error('Error getting request details:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },

  // Get user with boss_id
  async getUserWithBoss(user_id) {
    let conn;
    const query = `
      SELECT 
        user_id,
        role_id,
        department_id,
        boss_id,
        user_name
      FROM User
      WHERE user_id = ?
    `;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [user_id]);
      return rows.length > 0 ? rows[0] : null;

    } catch (error) {
      console.error('Error getting user with boss:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },

  // Get random travel agent from department
  async getRandomTravelAgent(dept_id) {
    let conn;
    const query = `
      SELECT 
        user_id,
        user_name
      FROM User
      WHERE department_id = ? AND role_id = (
        SELECT role_id FROM Role WHERE role_name = 'Agencia de viajes'
      )
      ORDER BY RAND()
      LIMIT 1
    `;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [dept_id]);
      return rows.length > 0 ? rows[0] : null;

    } catch (error) {
      console.error('Error getting random travel agent:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },

  /**
   * Get a random Accounts Payable user from the department
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

  // Update request routing
  async updateRequestRouting(request_id, assigned_to, authorization_level, status_id = null) {
    let conn;
    let query;
    let params;

    if (status_id !== null) {
      query = `
        UPDATE Request
        SET assigned_to = ?, authorization_level = ?, request_status_id = ?
        WHERE request_id = ?
      `;
      params = [assigned_to, authorization_level, status_id, request_id];
    } else {
      query = `
        UPDATE Request
        SET assigned_to = ?, authorization_level = ?
        WHERE request_id = ?
      `;
      params = [assigned_to, authorization_level, request_id];
    }

    try {
      conn = await pool.getConnection();
      const result = await conn.query(query, params);
      return result;

    } catch (error) {
      console.error('Error updating request routing:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },

  /**
   * Check if a travel request requires travel agency services (flights or hotels)
   * @param {number} request_id - The ID of the travel request
   * @returns {boolean} true if any route needs flight or hotel, false otherwise
   */
  async requiresTravelAgencyServices(request_id) {
    let conn;
    const query = `
      SELECT COUNT(*) as services_needed
      FROM Route_Request rr
      INNER JOIN Route r ON rr.route_id = r.route_id
      WHERE rr.request_id = ? AND (r.plane_needed = true OR r.hotel_needed = true)
    `;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [request_id]);
      
      // If any route needs plane or hotel, return true
      return rows.length > 0 && rows[0].services_needed > 0;

    } catch (error) {
      console.error('Error checking if trip requires travel agency services:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },
};

export default Authorizer;