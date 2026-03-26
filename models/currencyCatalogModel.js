/**
 * Currency Catalog Model
 *
 * Data access layer for the Currency table.
 * All queries filter by active = TRUE so deactivated currencies are invisible
 * to the rest of the application without deleting them from the database.
 */

import pool from '../database/config/db.js';

const CurrencyCatalog = {
  /**
   * Returns all active currencies ordered alphabetically by code.
   * @returns {Promise<Array>} Array of Currency rows.
   */
  async getAll() {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT currency_code, currency_name, country, banxico_series_id, frequency
         FROM Currency
         WHERE active = TRUE
         ORDER BY currency_code ASC`
      );
      return rows;
    } finally {
      if (conn) conn.release();
    }
  },

  /**
   * Finds a currency by its Banxico SIE series ID.
   * @param {string} seriesId - e.g. 'SF43718'
   * @returns {Promise<Object|undefined>} Matching Currency row, or undefined.
   */
  async findBySeriesId(seriesId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT currency_code, currency_name, country, banxico_series_id, frequency
         FROM Currency
         WHERE banxico_series_id = ? AND active = TRUE`,
        [seriesId]
      );
      return rows[0];
    } finally {
      if (conn) conn.release();
    }
  },

  /**
   * Finds a currency by its ISO currency code.
   * @param {string} currencyCode - e.g. 'USD', 'EUR'
   * @returns {Promise<Object|undefined>} Matching Currency row, or undefined.
   */
  async findByCode(currencyCode) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT currency_code, currency_name, country, banxico_series_id, frequency
         FROM Currency
         WHERE currency_code = ? AND active = TRUE`,
        [currencyCode]
      );
      return rows[0];
    } finally {
      if (conn) conn.release();
    }
  },

  /**
   * Returns only the currencies with daily Banxico series (USD, EUR, CAD, JPY).
   * @returns {Promise<Array>} Array of daily Currency rows.
   */
  async getDailySeries() {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT currency_code, currency_name, country, banxico_series_id, frequency
         FROM Currency
         WHERE frequency = 'daily' AND banxico_series_id IS NOT NULL AND active = TRUE
         ORDER BY currency_code ASC`
      );
      return rows;
    } finally {
      if (conn) conn.release();
    }
  },
};

export default CurrencyCatalog;
