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
 * Returns the current exchange rate for a given Banxico series.
 * Defaults to USD/MXN (SF57805) if no series is specified.
 * @param {Object} req - Express request. Query: series (string, optional)
 * @param {Object} res - Express response. Returns { success, data }
 */
export async function getCurrentExchangeRate(req, res) {
  try {
    const { series = 'SF57805' } = req.query;
    const data = await exchangeRateService.getExchangeRate(series);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in getCurrentExchangeRate:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Unable to fetch exchange rate' });
  }
}

/**
 * Returns the full list of supported currencies from the local catalog.
 * @param {Object} req - Express request. No params required.
 * @param {Object} res - Express response. Returns { success, data: Array }
 */
export async function getCatalog(req, res) {
  try {
    const catalog = exchangeRateCatalog.getExchangeRateCatalog().map(series => ({
      id: series.id,
      name: series.name,
      currency: series.currency,
      description: series.description
    }));
    res.status(200).json({ success: true, data: catalog });
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
