/**
  * Accounts Payable Model
  * 
  * This module defines the data access layer for accounts payable operations,
  * including updating travel request statuses, validating receipts, and
  * retrieving expense validations.
  */

import pool from "../database/config/db.js";

const AccountsPayable = {
  // Update request status to Atención Agencia de Viajes
  async attendTravelRequest(requestId, imposedFee, new_status, connection = null) {
    let conn;
    try {
      conn = connection || (await pool.getConnection());
      const result = await conn.query(
        `UPDATE Request SET request_status_id = ?, imposed_fee = ? 
        WHERE request_id = ?`,
        [new_status, imposedFee, requestId],
      );
      
      return result.affectedRows > 0;

    } catch (error) {
      console.error("Error updating travel request status:", error);
      throw error;

    } finally {
      if (!connection && conn) {
        conn.release();
      }
    }
  },
  
  // Check if request exists in the database and return its details
  async requestExists(requestId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT
          request_id,
          request_status_id,
          user_id,
          hotel_needed_list,
          plane_needed_list 
        FROM RequestWithRouteDetails WHERE request_id = ?`,
        [requestId],
      );
      return rows[0];

    } catch (error) {
      console.error("Error checking if request exists:", error);
      throw error;

    } finally {
      if (conn) {
        conn.release();
      }
    }
  },
  
  // Get the validation status of all receipts associated with a request
  async getReceiptStatusesForRequest(requestId) {
    let conn;
    const query = `
      SELECT validation FROM Receipt
      WHERE request_id = ?
    `;
    
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(query, [requestId]);
      return rows.map(r => r.validation);

    } catch (error) {
      console.error('Error fetching receipt statuses:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },
  
  async updateRequestStatus(requestId, statusId, connection = null) {
    let conn;
    const query = `
      UPDATE Request
      SET request_status_id = ?
      WHERE request_id = ?
    `;
    
    try {
      conn = connection || (await pool.getConnection());
      await conn.query(query, [statusId, requestId]);

    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;

    } finally {
      if (!connection && conn) conn.release();
    }
  },
  
  // Check if a receipt exists in the database and return its details
  async receiptExists(receiptId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        "SELECT receipt_id, request_id, validation FROM `Receipt` WHERE receipt_id = ?",
        [receiptId],
      );
      return rows[0];

    } catch (error) {
      console.error("Error checking if receipt exists:", error);
      throw error;

    } finally {
      if (conn) {
        conn.release();
      }
    }
  },
  
  // Accept or Reject a Travel Request
  async validateReceipt(requestId, approval, connection = null) {
    let conn;
    try {
      conn = connection || (await pool.getConnection());
      const result = await conn.query(
        `UPDATE Receipt
        SET validation = ? WHERE receipt_id = ?`,
        [approval, requestId],
      );
      return result.affectedRows > 0;

    } catch (error) {
      console.error("Error updating receipt status:", error);
      throw error;

    } finally {
      if (!connection && conn) {
        conn.release();
      }
    }
  },
  
  // Search receipts across all requests with optional filters
  async searchReceipts({ userId, startDate, endDate, validation, limit = 50, offset = 0 } = {}) {
    let conn;
    try {
      conn = await pool.getConnection();

      const conditions = [];
      const params = [];

      if (userId) {
        conditions.push('req.user_id = ?');
        params.push(userId);
      }
      if (startDate) {
        conditions.push('rec.submission_date >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('rec.submission_date <= ?');
        params.push(endDate);
      }
      if (validation) {
        conditions.push('rec.validation = ?');
        params.push(validation);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const rows = await conn.query(
        `SELECT
           rec.receipt_id,
           rec.request_id,
           rec.route_id,
           rec.validation,
           rec.amount,
           rec.currency,
           rec.submission_date,
           rt.receipt_type_name,
           rec.pdf_file_id,
           rec.pdf_file_name,
           rec.xml_file_id,
           rec.xml_file_name,
           u.user_id,
           u.user_name
         FROM Receipt rec
         JOIN Receipt_Type rt ON rec.receipt_type_id = rt.receipt_type_id
         JOIN Request req ON req.request_id = rec.request_id
         JOIN User u ON u.user_id = req.user_id
         ${whereClause}
         ORDER BY rec.submission_date ASC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const [{ total_count }] = await conn.query(
        `SELECT COUNT(*) AS total_count
         FROM Receipt rec
         JOIN Request req ON req.request_id = rec.request_id
         ${whereClause}`,
        params
      );

      return {
        total_count: Number(total_count),
        limit,
        offset,
        receipts: rows.map(row => ({
          receipt_id: row.receipt_id,
          request_id: row.request_id,
          route_id: row.route_id,
          receipt_type_name: row.receipt_type_name,
          amount: row.amount,
          currency: row.currency,
          validation: row.validation,
          submission_date: row.submission_date,
          applicant_user_id: row.user_id,
          applicant_user_name: row.user_name,
          pdf_id: row.pdf_file_id,
          pdf_name: row.pdf_file_name,
          xml_id: row.xml_file_id,
          xml_name: row.xml_file_name,
        })),
      };
    } catch (error) {
      console.error('Error searching receipts:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  // Get the validation status of all receipts associated with a request
  async getExpenseValidations(requestId) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      let query;
      
      query = `
        SELECT
          r.receipt_id,
          r.request_id,
          r.route_id,
          r.validation,
          r.amount,
          r.currency,
          r.submission_date,
          rt.receipt_type_name,
          r.pdf_file_id,
          r.pdf_file_name,
          r.xml_file_id,
          r.xml_file_name
        FROM
          Receipt r
        JOIN
          Receipt_Type rt ON r.receipt_type_id = rt.receipt_type_id
        WHERE
          r.request_id = ?
      `;
      
      // Execute the query with the requestId
      const rows = await conn.query(query, [requestId]);
      
      if (rows.length === 0) {
        return {
          request_id: requestId,
          Expenses: []
        };
      }
      
      // Check if any of the rows have validation 'Pendiente'
      const hasPendingValidation = rows.some(row => row.validation === 'Pendiente');
      const expense_status = hasPendingValidation ? 'Pendiente' : 'Sin Pendientes';
      
      // Sort the rows based on the validation status
      rows.sort((a, b) => {
        // Define the order for sorting
        const statusOrder = { "Pendiente": 1, "Rechazado": 2, "Aprobado": 3 };
        return statusOrder[a.validation] - statusOrder[b.validation];
      });

      // Format the response
      const formatted = {
        request_id: requestId,
        status: expense_status,
        Expenses: rows.map(row => ({
          receipt_id: row.receipt_id,
          route_id: row.route_id,
          receipt_type_name: row.receipt_type_name,
          amount: row.amount,
          currency: row.currency,
          validation: row.validation,
          submission_date: row.submission_date,
          pdf_id: row.pdf_file_id,
          pdf_name: row.pdf_file_name,
          xml_id: row.xml_file_id,
          xml_name: row.xml_file_name
        }))
      };
      
      return formatted;
      
    } catch (error) {
      console.error("Error getting expense validations:", error);
      throw error;
      
    } finally {
      if (conn) {
        conn.release();
      }
    }
  },
  
};

export default AccountsPayable;
