/**
 * Fetches mail details for a travel request to send notification emails.
 * Returns data for both the applicant and the assigned_to user.
 */

import pool from "../../database/config/db.js";

/**
 * Fetch mail details for a travel request to send notification emails.
 * @param {number} requestId - The ID of the travel request
 * @returns {Promise<Object>} Object containing applicant and assigned_to user data
 * @throws {Error} If database query fails
 */
const getMailDetails = async (requestId) => {
  let conn;
  const query = `
    SELECT 
      user_id,
      assigned_to
    FROM Request
    WHERE request_id = ?
  `;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(query, [requestId]);

    if (!rows || rows.length === 0) {
      throw new Error('Request not found');
    }

    return {
      applicantId: rows[0].user_id,
      assignedToId: rows[0].assigned_to,
    };
  } catch (error) {
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

export default getMailDetails;