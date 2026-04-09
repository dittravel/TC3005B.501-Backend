/**
 * Accountability Model
 *
 * Handles the queries to the database for the 
 * accounting export of policies
 */

import pool from '../database/config/db.js';

const Accountability = {

  /**
   * Obtains the advance payment data of a travel request filtering by ID.
   * @param {number} request_id
   * @returns {Promise<Object>}
   **/
  async getAnticipoById(request_id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT
        r.request_id,
        r.requested_fee        AS amount,
        r.creation_date,
        r.notes,
    
        -- 'Solicitante' data
        u.user_id,
        u.user_name            AS traveler_name,
        u.email                AS traveler_email,

        -- 'Department' and 'Cost center' data
        d.department_name,
        cc.cost_center_id,
        cc.cost_center_name,

        -- Request status data
        rs.status              AS request_status

        FROM Request r
        INNER JOIN User u             ON u.user_id             = r.user_id
        INNER JOIN Department d       ON d.department_id       = u.department_id
        INNER JOIN CostCenter cc      ON cc.cost_center_id     = d.cost_center_id
        INNER JOIN Request_status rs  ON rs.request_status_id  = r.request_status_id

        WHERE r.request_id = ?
        AND r.active = 1
        `, [request_id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding the advance payment data:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  /**
   * Obtains the verified expenses (receipts) of a travel request filtering by ID.
   * @param {number} request_id
   * @returns {Promise<Array>}
   **/
  async getGastosById(request_id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT
        rec.receipt_id,
        rec.amount,
        rec.validation,
        rec.submission_date,
        rec.refund,
    
        -- Receipt type (hotel, alimento, taxi, etc.)
        rt.receipt_type_id,
        rt.receipt_type_name,
    
        -- Accounting account according to the expense type
        a.account_id,
        a.account_code,
        a.account_name,
        a.account_type,
    
        -- Tax
        -- tax.tax_code,
        -- tax.tax_rate,
    
        -- Dates
        ro.beginning_date,
        ro.ending_date
    
        FROM Receipt rec
        INNER JOIN Receipt_Type rt          ON rt.receipt_type_id  = rec.receipt_type_id
        INNER JOIN ReceiptType_Account rta  ON rta.receipt_type_id = rt.receipt_type_id
        INNER JOIN Account a                ON a.account_id        = rta.account_id
        INNER JOIN Route_Request rr         ON rr.request_id       = rec.request_id
        INNER JOIN Route ro                 ON ro.route_id         = rr.route_id
    
        WHERE rec.request_id = ?
        ORDER BY rec.receipt_id ASC
        `, [request_id]);
      return rows;
    } catch (error) {
      console.error('Error finding the advance payment data:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  /**
   * Obtains the accounting account by type.
   * @param {string} account_type
   * @returns {Promise<Object>}
   **/
  async getAccountByType(account_type) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT account_id, account_code, account_name, account_type
        FROM Account
        WHERE account_type = ?
        LIMIT 1`,
        [account_type]
      );
      return rows[0] || null;
    } catch (error) {
      console.error(`Error finding account type ${account_type}:`, error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  /**
   * Obtains all active travel requests within an optional date range.
   * @param {string|null} dateFrom  YYYY-MM-DD
   * @param {string|null} dateTo    YYYY-MM-DD
   * @returns {Promise<Array>}
   **/
  async getRequestsByDateRange(dateFrom = null, dateTo = null) {
    let conn;
    try {
      conn = await pool.getConnection();

      const filters = [];
      let dateFilter = '';

      if (dateFrom) {
        dateFilter += ' AND r.creation_date >= ?';
        filters.push(dateFrom);
      }
      if (dateTo) {
        dateFilter += ' AND r.creation_date <= ?';
        filters.push(dateTo + ' 23:59:59');
      }

      const rows = await conn.query(
        `SELECT
        r.request_id,
        r.requested_fee        AS amount,
        r.creation_date,
        r.notes,

        -- 'Solicitante' data
        u.user_id,
        u.user_name            AS traveler_name,
        u.email                AS traveler_email,

        -- 'Department' and 'Cost center' data
        d.department_name,
        cc.cost_center_id,
        cc.cost_center_name,

        -- Request status data
        rs.status              AS request_status

        FROM Request r
        INNER JOIN User u             ON u.user_id             = r.user_id
        INNER JOIN Department d       ON d.department_id       = u.department_id
        INNER JOIN CostCenter cc      ON cc.cost_center_id     = d.cost_center_id
        INNER JOIN Request_status rs  ON rs.request_status_id  = r.request_status_id

        WHERE r.active = 1
        ${dateFilter}
        ORDER BY r.creation_date ASC
        `,
        filters
      );
      return rows;
    } catch (error) {
      console.error('Error finding requests by date range:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

};

export default Accountability;