/**
 * Currency Catalog Model
 *
 * Data access layer for the Currency table.
 * All queries filter by active = TRUE so deactivated currencies are invisible
 * to the rest of the application without deleting them from the database.
 */

import { prisma } from '../lib/prisma.js';


const CurrencyCatalog = {
  /**
   * Returns all active currencies ordered alphabetically by code.
   * @returns {Promise<Array>} Array of Currency rows.
   */
  async getAll() {
    return prisma.currency.findMany({
      where: { active: true },
      orderBy: { currency_code: 'asc' },
      select: {
        currency_code: true,
        currency_name: true,
        country: true,
        banxico_series_id: true,
        frequency: true,
      },
    });
  },

  /**
   * Finds a currency by its Banxico SIE series ID.
   * @param {string} seriesId - e.g. 'SF43718'
   * @returns {Promise<Object|undefined>} Matching Currency row, or undefined.
   */
  async findBySeriesId(seriesId) {
    return prisma.currency.findFirst({
      where: {
        banxico_series_id: seriesId,
        active: true,
      },
      select: {
        currency_code: true,
        currency_name: true,
        country: true,
        banxico_series_id: true,
        frequency: true,
      },
    });
  },

  /**
   * Finds a currency by its ISO currency code.
   * @param {string} currencyCode - e.g. 'USD', 'EUR'
   * @returns {Promise<Object|undefined>} Matching Currency row, or undefined.
   */
  async findByCode(currencyCode) {
    return prisma.currency.findFirst({
      where: {
        currency_code: currencyCode,
        active: true,
      },
      select: {
        currency_code: true,
        currency_name: true,
        country: true,
        banxico_series_id: true,
        frequency: true,
      },
    });
  },

  /**
   * Returns only the currencies with daily Banxico series (USD, EUR, CAD, JPY).
   * @returns {Promise<Array>} Array of daily Currency rows.
   */
  async getDailySeries() {
    return prisma.currency.findMany({
      where: {
        frequency: 'daily',
        banxico_series_id: { not: null },
        active: true,
      },
      orderBy: { currency_code: 'asc' },
      select: {
        currency_code: true,
        currency_name: true,
        country: true,
        banxico_series_id: true,
        frequency: true,
      },
    });
  },
};

export default CurrencyCatalog;
