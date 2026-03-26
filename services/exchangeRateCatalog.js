/**
 * Exchange Rate Catalog Service
 *
 * Provides catalog lookup functions backed by the Currency database table.
 * Maps DB rows to the { id, name, currency, country, description, frequency } shape
 * expected by exchangeRateService.js and the controller.
 */

import CurrencyCatalog from '../models/currencyCatalogModel.js';

/**
 * Maps a Currency DB row to the catalog entry shape used across the app.
 *
 * When the DB returns a row, each column becomes a property of an object.
 * For example, a row from the Currency table looks like:
 *   {
 *     currency_code:     'USD',
 *     currency_name:     'Dólar Estadounidense',
 *     country:           'Estados Unidos',
 *     banxico_series_id: 'SF43718',
 *     frequency:         'daily'
 *   }
 * You access each column with dot notation: row.currency_code, row.banxico_series_id, etc.
 * This function renames those columns to the shorter shape the rest of the app expects.
 *
 * @param {Object} row - Row from the Currency table.
 * @returns {Object} { id, name, currency, country, description, frequency }
 */
function mapRow(row) {
  return {
    // Banxico series ID — e.g. 'SF43718'. NULL for MXN (it's the base currency, no series needed)
    id: row.banxico_series_id,

    // Currency pair name. If the row has a series, format as 'USD/MXN'; otherwise just 'MXN'
    name: row.banxico_series_id ? `${row.currency_code}/MXN` : row.currency_code,

    // ISO 4217 currency code — e.g. 'USD', 'EUR', 'MXN'
    currency: row.currency_code,

    country: row.country,

    // Human-readable name in Spanish — e.g. 'Dólar Estadounidense'
    description: row.currency_name,

    // 'daily' for USD/EUR/CAD/JPY, 'monthly' for everything else
    frequency: row.frequency
  };
}

/**
 * Returns all active currencies from the database.
 * @returns {Promise<Array>} Array of { id, name, currency, country, description, frequency }
 */
export async function getExchangeRateCatalog() {
  const rows = await CurrencyCatalog.getAll();
  return rows.map(mapRow);
}

/**
 * Finds a catalog entry by its Banxico series ID.
 * @param {string} seriesId - e.g. 'SF43718'
 * @returns {Promise<Object|undefined>} Matching entry, or undefined if not found.
 */
export async function findSeriesById(seriesId) {
  const row = await CurrencyCatalog.findBySeriesId(seriesId);
  return row ? mapRow(row) : undefined;
}

/**
 * Finds a catalog entry by ISO currency code.
 * @param {string} currencyCode - e.g. 'USD', 'EUR'
 * @returns {Promise<Object|undefined>} Matching entry, or undefined if not found.
 */
export async function getSeriesByCurrency(currencyCode) {
  const row = await CurrencyCatalog.findByCode(currencyCode);
  return row ? mapRow(row) : undefined;
}

/**
 * Returns the currencies Banxico publishes on a daily basis (USD, EUR, CAD, JPY).
 * @returns {Promise<Array>} Array of daily catalog entries.
 */
export async function getDailyExchangeRateSeries() {
  const rows = await CurrencyCatalog.getDailySeries();
  return rows.map(mapRow);
}
