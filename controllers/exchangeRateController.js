/**
 * Exchange Rate Controller
 *
 * Handles HTTP request/response for exchange rate endpoints.
 * Extracts query parameters and delegates all logic to exchangeRateService
 * and exchangeRateCatalog.
 */

import * as exchangeRateService from '../services/exchangeRateService.js';
import * as exchangeRateCatalog from '../services/exchangeRateCatalog.js';

/**
 * Returns the exchange rate for a given Banxico series.
 * Defaults to USD/MXN (SF43718) if no series is specified.
 * Supports optional historical dates.
 * @param {Object} req - Express request. Query: series (string, optional), date (string, optional, format: YYYY-MM-DD)
 * @param {Object} res - Express response. Returns { success, data }
 */
export async function getCurrentExchangeRate(req, res) {
  try {
    const { series = 'SF43718', date } = req.query;
    const parsedDate = date ? new Date(date) : null;
    const data = await exchangeRateService.getExchangeRate(series, parsedDate);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in getCurrentExchangeRate:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Unable to fetch exchange rate' });
  }
}

/**
 * Returns the full list of active currencies from the database.
 * Includes banxico_series_id and frequency so the frontend can derive
 * which currencies support real-time conversion.
 * @param {Object} req - Express request. No params required.
 * @param {Object} res - Express response. Returns { success, data: Array }
 */
export async function getCatalog(req, res) {
  try {
    const catalog = await exchangeRateCatalog.getExchangeRateCatalog();
    res.status(200).json({
      success: true,
      data: catalog.map(c => ({
        currency:          c.currency,
        name:              c.description,
        country:           c.country,
        banxico_series_id: c.id || null,
        frequency:         c.frequency
      }))
    });
  } catch (error) {
    console.error('Error in getCatalog:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Clears the in-memory exchange rate cache.
 * @param {Object} req - Express request. No params required.
 * @param {Object} res - Express response. Returns { success, message }
 */
export async function clearCache(req, res) {
  try {
    exchangeRateService.clearExchangeRateCache();
    res.status(200).json({ success: true, message: 'Exchange rate cache cleared' });
  } catch (error) {
    console.error('Error clearing cache:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
