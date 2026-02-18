import pool from "../../database/config/db.js";
import { decrypt } from '../../middleware/decryption.js';

/**
 * Fetch mail details for a travel request to send notification emails.
 * @param {number} requestId - The ID of the travel request
 * @returns {Promise<Object>} Object containing user_email, user_name, request_id, and status
 * @throws {Error} If database query fails
 */
const getMailDetails = async (requestId) => {
  let conn;
  const query = `
    SELECT user_email,
      user_name,
      request_id,
      status
    FROM RequestWithRouteDetails
    WHERE request_id = ?
  `;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(query, [requestId]);
    return {
      user_email: decrypt(rows[0].user_email),
      user_name: rows[0].user_name,
      request_id: rows[0].request_id,
      status: rows[0].status
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