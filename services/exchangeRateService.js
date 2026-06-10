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

function getBanxicoConfig() {
  return {
    apiUrl: process.env.BANXICO_API_URL,
    apiKey: process.env.BANXICO_API_KEY,
    cacheTtl: Number.parseInt(process.env.BANXICO_CACHE_TTL, 10) || 3600,
  };
}

/**
 * Checks whether the cached value for a series is still within the TTL window.
 * @param {string} seriesId - Banxico series ID to check.
 * @returns {boolean} True if the cache is valid, false otherwise.
 */
function isCacheValid(seriesId) {
  const { cacheTtl } = getBanxicoConfig();
  if (!exchangeRateCache[seriesId]) return false;
  const cacheAge = (Date.now() - exchangeRateCache[seriesId].timestamp) / 1000;
  return cacheAge < cacheTtl;
}

// Banxico returns an empty datos[] for weekends, holidays, and any non-publication
// day. We back off this many days to guarantee we capture at least one observation
// (covers long holiday stretches for daily series and any day-of-month for monthly).
const HISTORICAL_LOOKBACK_DAYS = 90;

function toISODate(value) {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).split('T')[0];
}

function subtractDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

function buildBanxicoUrl(apiUrl, seriesId, date) {
  if (date) {
    const endDate = toISODate(date);
    const startDate = subtractDays(endDate, HISTORICAL_LOOKBACK_DAYS);
    return {
      url: `${apiUrl}series/${seriesId}/datos/${startDate}/${endDate}`,
      dateStr: endDate,
    };
  }

  return {
    url: `${apiUrl}series/${seriesId}/datos/oportuno`,
    dateStr: null,
  };
}

function buildNoExchangeRateError(seriesId, dateStr) {
  const suffix = dateStr ? ` on or before ${dateStr}` : '';
  return new Error(`No exchange rate data available for ${seriesId}${suffix}`);
}

// Banxico returns dates as "dd/mm/yyyy". Parse to a sortable yyyy-mm-dd string.
function banxicoDateToISO(banxicoDate) {
  const [dd, mm, yyyy] = banxicoDate.split('/');
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

// Picks the most recent valid observation from a Banxico datos[] array.
// Banxico marks missing values as "N/E" — we skip those.
function pickLatestObservation(datos) {
  const valid = datos
    .filter(d => d?.dato && d.dato !== 'N/E')
    .map(d => ({ iso: banxicoDateToISO(d.fecha), dato: d.dato, fecha: d.fecha }))
    .sort((a, b) => a.iso.localeCompare(b.iso));
  return valid.length ? valid[valid.length - 1] : null;
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
    const { apiUrl, apiKey, cacheTtl } = getBanxicoConfig();

    if (!apiUrl || !apiKey) {
      throw new Error('BANXICO_API_URL or BANXICO_API_KEY is not configured');
    }

    // Validate against the DB catalog before hitting Banxico — avoids unnecessary API calls
    const series = await findSeriesById(seriesId);
    if (!series) throw new Error(`Series ${seriesId} not found in catalog`);

    // For current rates only, check cache
    if (!date && isCacheValid(seriesId)) {
      console.log(`Using cached exchange rate for ${seriesId}`);
      const cached = exchangeRateCache[seriesId];
      return { rate: cached.rate, timestamp: cached.timestamp, source: 'cache', seriesId, seriesName: series.name };
    }

    const { url, dateStr } = buildBanxicoUrl(apiUrl, seriesId, date);
    console.log(
      dateStr
        ? `[ExchangeRate] Fetching HISTORICAL rate for ${seriesId} on DATE: ${dateStr}`
        : `[ExchangeRate] Fetching CURRENT rate for ${seriesId}`
    );

    const response = await axios.get(
      url,
      { headers: { 'Bmx-Token': apiKey } }
    );

    const datos = response.data?.bmx?.series?.[0]?.datos;
    if (!Array.isArray(datos) || datos.length === 0) {
      throw buildNoExchangeRateError(seriesId, dateStr);
    }

    const observation = pickLatestObservation(datos);
    if (!observation) {
      throw buildNoExchangeRateError(seriesId, dateStr);
    }

    const rate = Number.parseFloat(observation.dato);
    const timestamp = Date.now();

    console.log(`Exchange rate for ${seriesId}: ${rate} (fecha ${observation.fecha})`);

    // Store in cache only for current rates (not historical dates)
    if (!date) {
      exchangeRateCache[seriesId] = { rate, timestamp, ttl: cacheTtl };
    }

    return {
      rate,
      timestamp,
      source: 'banxico',
      seriesId,
      seriesName: series.name,
      fecha: observation.fecha,
    };

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
