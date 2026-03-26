/**
 * Series Catalog Service
 *
 * Fetches and caches the full Banxico series catalog to support keyword-based search.
 * Used by the /search endpoint to find series not included in the local catalog.
 * Cache TTL is 24 hours since the catalog is large and changes infrequently.
 */

import axios from 'axios';

let catalogCache = {
  data: null,
  timestamp: null,
  ttl: 86400 // 24 hours in seconds
};

const BANXICO_API_URL = process.env.BANXICO_API_URL;
const BANXICO_API_KEY = process.env.BANXICO_API_KEY;

/**
 * Checks whether the catalog cache is still within the TTL window.
 * @returns {boolean} True if the cache is valid, false otherwise.
 */
function isCacheValid() {
  if (!catalogCache.data || !catalogCache.timestamp) return false;
  const cacheAge = (Date.now() - catalogCache.timestamp) / 1000;
  return cacheAge < catalogCache.ttl;
}

/**
 * Searches the Banxico series catalog by keyword.
 * Without a keyword, filters to exchange-rate related series only
 * to avoid returning unrelated Banxico data (inflation, reserves, etc.).
 * @param {string} keyword - Search term (optional). Matches title, description, or series ID.
 * @returns {Promise<Array>} Array of { id, title, description } matching the query.
 */
export async function searchExchangeRateSeries(keyword = '') {
  try {
    let series = [];

    if (isCacheValid()) {
      console.log('Using cached catalog');
      series = catalogCache.data;
    } else {
      console.log('Fetching catalog from Banxico...');
      const response = await axios.get(
        `${BANXICO_API_URL}series`,
        { headers: { 'Bmx-Token': BANXICO_API_KEY } }
      );

      series = response.data.bmx.series.map(s => ({
        id: s.idSerie,
        title: s.titulo,
        description: s.descripcion || ''
      }));

      catalogCache = { data: series, timestamp: Date.now(), ttl: catalogCache.ttl };
    }

    if (keyword && keyword.trim()) {
      const lowerKeyword = keyword.toLowerCase();
      return series.filter(s =>
        s.title.toLowerCase().includes(lowerKeyword) ||
        s.description.toLowerCase().includes(lowerKeyword) ||
        s.id.toLowerCase().includes(lowerKeyword)
      );
    }

    // No keyword: return only exchange rate series
    return series.filter(s => {
      const title = s.title.toLowerCase();
      return title.includes('cambio') ||
             title.includes('dólar') ||
             title.includes('euro') ||
             title.includes('libra') ||
             title.includes('yen') ||
             title.includes('canadiense') ||
             title.includes('tipo');
    });

  } catch (error) {
    console.error('Error searching series:', error.message);
    throw new Error(`Unable to search series: ${error.message}`);
  }
}

/**
 * Clears the in-memory catalog cache, forcing a fresh fetch on next call.
 */
export function clearCatalogCache() {
  catalogCache = { data: null, timestamp: null, ttl: catalogCache.ttl };
  console.log('Catalog cache cleared');
}

export default { searchExchangeRateSeries, clearCatalogCache };
