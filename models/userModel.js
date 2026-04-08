/**
 * User Model
 * 
 * This model handles database operations related to users,
 * including fetching user data, travel requests, and wallet information.
 */

import pool from '../database/config/db.js';
import { prisma } from '../lib/prisma.js';

const User = {
  // Get all user data by ID
  async getUserData(userId) {
    // Busca el usuario y sus relaciones
    const user = await prisma.user.findUnique({
      where: { user_id: Number(userId) },
      include: {
        department: true,
        role: true,
        boss: true,
        substitute: true,
      },
    });
    if (!user) return null;

    return {
      user_id: user.user_id,
      user_name: user.user_name,
      email: user.email,
      phone_number: user.phone_number,
      workstation: user.workstation,
      department_name: user.department?.department_name ?? null,
      creation_date: user.creation_date,
      role_name: user.role?.role_name ?? null,
      boss_id: user.boss_id,
      out_of_office_start_date: user.out_of_office_start_date,
      out_of_office_end_date: user.out_of_office_end_date,
      substitute_id: user.substitute_id,
      boss_name: user.boss?.user_name ?? null,
      substitute_name: user.substitute?.user_name ?? null,
    };
  },

  // Get travel request details by request ID
  async getTravelRequestById(request_id) {
    let conn;
    const query = `
      SELECT 
        r.request_id,
        rs.status AS request_status,
        r.notes,
        r.requested_fee,
        r.imposed_fee,
        r.request_days,
        r.creation_date,
        u.user_name,
        u.email AS user_email,
        u.phone_number AS user_phone_number,

        ro.router_index,
        co1.country_name AS origin_country,
        ci1.city_name AS origin_city,
        co2.country_name AS destination_country,
        ci2.city_name AS destination_city,

        ro.beginning_date,
        ro.beginning_time,
        ro.ending_date,
        ro.ending_time,
        ro.hotel_needed,
        ro.plane_needed

      FROM Request r
      JOIN User u ON r.user_id = u.user_id
      JOIN Request_status rs ON r.request_status_id = rs.request_status_id
      LEFT JOIN Route_Request rr ON r.request_id = rr.request_id
      LEFT JOIN Route ro ON rr.route_id = ro.route_id
      LEFT JOIN Country co1 ON ro.id_origin_country = co1.country_id
      LEFT JOIN City ci1 ON ro.id_origin_city = ci1.city_id
      LEFT JOIN Country co2 ON ro.id_destination_country = co2.country_id
      LEFT JOIN City ci2 ON ro.id_destination_city = ci2.city_id
      WHERE r.request_id = ?
      ORDER BY ro.router_index ASC
    `;

    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [request_id]);
      return rows;

    } catch (error) {
      console.error('Error in getTravelRequestById:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },

  // Get travel requests by department and status, with optional limit
  async getTravelRequestsByUserStatus(userId, statusId, n) {
    const conn = await pool.getConnection();
    try {
      const baseQuery = `
        SELECT
          r.request_id,
          u.user_id,
          u.user_name AS requester_name,
          c.country_name AS destination_country,
          ro.beginning_date,
          ro.ending_date,
          rs.status AS request_status,
          assigned_user.user_name AS assigned_to_name
        FROM Request r
        JOIN User u ON r.user_id = u.user_id
        JOIN Request_status rs ON r.request_status_id = rs.request_status_id
        JOIN Route_Request rr ON r.request_id = rr.request_id
        JOIN Route ro ON rr.route_id = ro.route_id
        JOIN Country c ON ro.id_destination_country = c.country_id
        LEFT JOIN User assigned_user ON r.assigned_to = assigned_user.user_id
        WHERE r.assigned_to = ?
          AND r.request_status_id = ?
        GROUP BY r.request_id
        ORDER BY r.creation_date DESC
        ${n ? 'LIMIT ?' : ''}
      `;

      const params = n ? [userId, statusId, Number(n)] : [userId, statusId];
      const rows = await conn.query(baseQuery, params);
      return rows;

    } finally {
      conn.release();
    }
  },

  // Get user data by username
  async getUserUsername(username) {
    const connection = await pool.getConnection();
    try {
      const rows = await connection.query(
        `SELECT 
          u.user_name,
          u.user_id,
          u.department_id,
          u.password,
          u.active, 
          r.role_name 
        FROM User u
        JOIN Role r ON u.role_id = r.role_id
        WHERE u.user_name = ?`,
        [username]
      );

      return rows[0];

    } finally {
      connection.release();
    }
  },

  // Get user wallet information by user ID
  async getUserWallet(user_id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(`
        SELECT
          user_id,
          user_name,
          wallet
        FROM User
        WHERE user_id = ?`,
        [user_id]
      );
      return rows[0];

    } finally {
      if (conn) conn.release();
    }
  },

  // Get all active users in the same department and with the same role for substitution purposes
  async getUserDepartmentMembers(userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(`
        SELECT
          user_id,
          user_name
        FROM User
        WHERE department_id = (SELECT department_id FROM User WHERE user_id = ?)
          AND role_id = (SELECT role_id FROM User WHERE user_id = ?)
          AND active = 1
          AND user_id != ?`,
        [userId, userId, userId]
      );
      return rows;

    } finally {
      if (conn) conn.release();
    }
  },

  // Find an active user by decrypted email.
  // Emails are AES-256-CBC encrypted with a random IV so we cannot query by value —
  // we decrypt all active users in the application layer and match there.
  async getUserByEmail(plaintextEmail) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT user_id, user_name, email FROM User WHERE active = TRUE`
      );
      const { decrypt } = await import('../middleware/decryption.js');
      return rows.find(u => decrypt(u.email) === plaintextEmail) || null;
    } finally {
      if (conn) conn.release();
    }
  },

  // Store a password reset token and its expiry for a user
  async setPasswordResetToken(userId, token, expires) {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.query(
        `UPDATE User
         SET password_reset_token = ?, password_reset_expires = ?
         WHERE user_id = ?`,
        [token, expires, userId]
      );
    } finally {
      if (conn) conn.release();
    }
  },

  // Find a user whose reset token matches and has not expired
  async getUserByResetToken(token) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT user_id, user_name
         FROM User
         WHERE password_reset_token = ?
           AND password_reset_expires > NOW()
           AND active = TRUE`,
        [token]
      );
      return rows[0] || null;
    } finally {
      if (conn) conn.release();
    }
  },

  // Update a user's hashed password
  async updatePassword(userId, hashedPassword) {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.query(
        `UPDATE User SET password = ? WHERE user_id = ?`,
        [hashedPassword, userId]
      );
    } finally {
      if (conn) conn.release();
    }
  },

  // Clear the reset token after use or expiry
  async clearPasswordResetToken(userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.query(
        `UPDATE User
         SET password_reset_token = NULL, password_reset_expires = NULL
         WHERE user_id = ?`,
        [userId]
      );
    } finally {
      if (conn) conn.release();
    }
  },

  // Update out-of-office dates and substitute for a user
  async updateOutOfOffice(userId, fields) {
    let conn;
    try {
      conn = await pool.getConnection();
      const setClauses = [];
      const values = [];

      for (const field in fields) {
        if (fields.hasOwnProperty(field)) {
          setClauses.push(`${field} = ?`);
          values.push(fields[field]);
        }
      }

      if (setClauses.length === 0) {
        return { success: false, message: 'No fields to update' };
      }

      values.push(userId);
      const query = `
        UPDATE User
        SET ${setClauses.join(', ')}
        WHERE user_id = ?
      `;

      await conn.query(query, values);
      return { success: true, message: 'Out-of-office updated successfully' };

    } finally {
      if (conn) conn.release();
    }
  },

  // Helper function: Check if a user is out of office and return their effective ID (user_id or substitute_id)
  // Returns: user_id, substitute_id, or null if out-of-office with no substitute
  async getEffectiveUserId(user) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check if user is out of office today
    if (user.out_of_office_start_date && user.out_of_office_end_date) {
      // Convert dates to ISO string format (handles both Date objects and strings from DB)
      const startDate = user.out_of_office_start_date instanceof Date
        ? user.out_of_office_start_date.toISOString().split('T')[0]
        : String(user.out_of_office_start_date).split('T')[0];
      
      const endDate = user.out_of_office_end_date instanceof Date
        ? user.out_of_office_end_date.toISOString().split('T')[0]
        : String(user.out_of_office_end_date).split('T')[0];

      if (today >= startDate && today <= endDate) {
        // User is out of office today
        if (user.substitute_id) {
          console.log(`User ${user.user_id} is out of office. Using substitute ${user.substitute_id} instead.`);
          return user.substitute_id;
        } else {
          console.warn(`User ${user.user_id} is out of office but has no substitute assigned.`);
          return null;
        }
      }
    }

    // User is not out of office
    return user.user_id;
  },

  // Get the boss of a user, checking if they're out of office
  // If boss is out of office today, returns their substitute_id if available, otherwise null
  // If boss is available, returns their user_id
  async getBossId(userId) {
    try {
      const rows = await pool.query(
        `SELECT boss_id FROM User WHERE user_id = ?`,
        [userId]
      );
      
      if (rows.length === 0 || !rows[0].boss_id) {
        return null; // User has no boss
      }

      const bossId = rows[0].boss_id;
      
      // Get boss details including out-of-office info
      const bossRows = await pool.query(
        `SELECT user_id, out_of_office_start_date, out_of_office_end_date, substitute_id 
         FROM User 
         WHERE user_id = ?`,
        [bossId]
      );
      
      if (bossRows.length === 0) {
        return null; // Boss not found
      }

      // Use helper to check out-of-office status and return effective ID
      return await this.getEffectiveUserId(bossRows[0]);
    } catch (error) {
      console.error(`Error getting boss ID for user ${userId}:`, error);
      throw error;
    }
  },

  // Get a random user with a specific role from the same department
  // If the user is out of office today, returns their substitute with user_id and user_name if available, otherwise null
  async getRandomUserByRole(roleId, departmentId) {
    try {
      const rows = await pool.query(
        `SELECT user_id, user_name, out_of_office_start_date, out_of_office_end_date, substitute_id 
         FROM User 
         WHERE role_id = ? AND department_id = ? 
         ORDER BY RAND() LIMIT 1`,
        [roleId, departmentId]
      );
      
      if (rows.length === 0) {
        return null;
      }

      const user = rows[0];
      
      // Use helper to get effective user ID (considering out-of-office)
      const effectiveUserId = await this.getEffectiveUserId(user);
      
      if (!effectiveUserId) {
        return null;
      }

      // If the effective ID is the original user, return their info
      if (effectiveUserId === user.user_id) {
        return {
          user_id: user.user_id,
          user_name: user.user_name
        };
      } else {
        // Effective ID is the substitute, fetch their details
        const substituteRows = await pool.query(
          `SELECT user_id, user_name FROM User WHERE user_id = ?`,
          [effectiveUserId]
        );
        if (substituteRows.length > 0) {
          return {
            user_id: substituteRows[0].user_id,
            user_name: substituteRows[0].user_name
          };
        }
        return null;
      }
    } catch (error) {
      console.error(`Error getting random user with role ${roleId} in department ${departmentId}:`, error);
      throw error;
    }
  },
};

export default User;
