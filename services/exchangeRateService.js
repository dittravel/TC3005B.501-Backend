/**
 * Exchange Rate Service
 *
 * Fetches exchange rates from the Banxico SIE API and caches them in memory
 * to reduce API calls. Cache TTL defaults to 1 hour (BANXICO_CACHE_TTL env var).
 * If the API fails but a stale cache exists, returns it with source: 'cache-fallback'.
 */

import axios from 'axios';
import { findSeriesById } from './exchangeRateCatalog.js';

let exchangeRateCache = {};

const BANXICO_API_URL = process.env.BANXICO_API_URL;
const BANXICO_API_KEY = process.env.BANXICO_API_KEY;
const CACHE_TTL = parseInt(process.env.BANXICO_CACHE_TTL) || 3600; // seconds

/**
 * Checks whether the cached value for a series is still within the TTL window.
 * @param {string} seriesId - Banxico series ID to check.
 * @returns {boolean} True if the cache is valid, false otherwise.
 */
function isCacheValid(seriesId) {
  if (!exchangeRateCache[seriesId]) return false;
  const cacheAge = (Date.now() - exchangeRateCache[seriesId].timestamp) / 1000;
  return cacheAge < CACHE_TTL;
}

/**
 * Returns the exchange rate for a given Banxico series.
 * Validates the series against the database catalog before calling the API.
 * @param {string} seriesId - Banxico series ID (e.g. 'SF43718' for USD/MXN).
 * @param {Date|string} date - Optional date for historical rates (e.g. '2024-01-15' or Date object)
 * @returns {Promise<Object>} { rate, timestamp, source, seriesId, seriesName, warning? }
 *   source can be 'banxico' | 'cache' | 'cache-fallback'
 */
export async function getExchangeRate(seriesId = 'SF43718', date = null) {
  try {
    // Validate against the DB catalog before hitting Banxico — avoids unnecessary API calls
    const series = await findSeriesById(seriesId);
    if (!series) throw new Error(`Series ${seriesId} not found in catalog`);

    // For current rates only, check cache
    if (!date && isCacheValid(seriesId)) {
      console.log(`Using cached exchange rate for ${seriesId}`);
      const cached = exchangeRateCache[seriesId];
      return { rate: cached.rate, timestamp: cached.timestamp, source: 'cache', seriesId, seriesName: series.name };
    }

    let url;
    let dateStr = null;
    if (date) {
      // Format date as YYYY-MM-DD for historical rates
      dateStr = date instanceof Date ? date.toISOString().split('T')[0] : String(date);
      url = `${BANXICO_API_URL}series/${seriesId}/datos/${dateStr}/${dateStr}`;
      console.log(`[ExchangeRate] Fetching HISTORICAL rate for ${seriesId} on DATE: ${dateStr}`);
    } else {
      // /datos/oportuno returns the most recent available data point for the series
      url = `${BANXICO_API_URL}series/${seriesId}/datos/oportuno`;
      console.log(`[ExchangeRate] Fetching CURRENT rate for ${seriesId}`);
    }

    const response = await axios.get(
      url,
      { headers: { 'Bmx-Token': BANXICO_API_KEY } }
    );

    // Banxico wraps the value in bmx.series[0].datos[0].dato as a string
    if (!response.data?.bmx?.series?.[0]?.datos?.[0]?.dato) {
      throw new Error(`No exchange rate data available for ${seriesId}${dateStr ? ` on ${dateStr}` : ''}`);
    }

    const rate = parseFloat(response.data.bmx.series[0].datos[0].dato);
    const timestamp = Date.now();

    console.log(`Exchange rate for ${seriesId}: ${rate}`);

    // Store in cache only for current rates (not historical dates)
    if (!date) {
      exchangeRateCache[seriesId] = { rate, timestamp, ttl: CACHE_TTL };
    }

    return { rate, timestamp, source: 'banxico', seriesId, seriesName: series.name };

  } catch (error) {
    console.error(`Error fetching exchange rate for ${seriesId}:`, error.message);

    // If the API fails and we have a stale cache, return it rather than throwing (only for current rates)
    if (!date && exchangeRateCache[seriesId]) {
      const cached = exchangeRateCache[seriesId];
      const series = await findSeriesById(seriesId);
      return {
        rate: cached.rate,
        timestamp: cached.timestamp,
        source: 'cache-fallback',
        seriesId,
        seriesName: series?.name || 'Unknown',
        warning: 'API unavailable, using cached rate'
      };
    }

    throw new Error(`Unable to fetch exchange rate for ${seriesId}: ${error.message}`);
  }
}

/**
 * Convenience wrapper that returns the USD/MXN FIX rate.
 * @returns {Promise<Object>} See getExchangeRate return value.
 */
export async function getCurrentExchangeRate() {
  return getExchangeRate('SF43718');
}

/**
 * Clears all cached exchange rates, forcing fresh API calls on next request.
 */
export function clearExchangeRateCache() {
  exchangeRateCache = {};
  console.log('Exchange rate cache cleared');
}
