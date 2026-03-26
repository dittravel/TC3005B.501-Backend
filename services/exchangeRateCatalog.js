/**
 * Exchange Rate Catalog
 *
 * Static catalog of currencies available in Banxico with their SIE series IDs.
 * The 4 entries marked with frequency: 'daily' (USD, EUR, CAD, JPY) use daily series.
 * All other entries are monthly or less frequent.
 */

export const exchangeRateCatalog = [
  // ========== NORTH AMERICA ==========
  { id: 'SF43718', name: 'USD/MXN', currency: 'USD', country: 'United States of America', description: 'US Dollar', frequency: 'daily' },
  { id: 'SF60632', name: 'CAD/MXN', currency: 'CAD', country: 'Canada', description: 'Canadian Dollar', frequency: 'daily' },
  { id: 'SF57811', name: 'PHP/MXN', currency: 'PHP', country: 'Philippines', description: 'Philippine Peso' },
  
  // ========== CENTRAL AMERICA ==========
  { id: 'SF57817', name: 'GTQ/MXN', currency: 'GTQ', country: 'Guatemala', description: 'Guatemalan Quetzal' },
  { id: 'SF57823', name: 'HTG/MXN', currency: 'HTG', country: 'Haiti', description: 'Haitian Gourde' },
  { id: 'SF57859', name: 'NIC/MXN', currency: 'NIC', country: 'Nicaragua', description: 'Nicaraguan Córdoba' },
  { id: 'SF57871', name: 'PAB/MXN', currency: 'PAB', country: 'Panama', description: 'Panamanian Balboa' },
  { id: 'SF57761', name: 'BZD/MXN', currency: 'BZD', country: 'Belize', description: 'Belize Dollar' },
  { id: 'SF57793', name: 'SVC/MXN', currency: 'SVC', country: 'El Salvador', description: 'Salvadoran Colón' },
  
  // ========== SOUTH AMERICA ==========
  { id: 'SF57731', name: 'ARS/MXN', currency: 'ARS', country: 'Argentina', description: 'Argentine Peso' },
  { id: 'SF57763', name: 'BOB/MXN', currency: 'BOB', country: 'Bolivia', description: 'Boliviano' },
  { id: 'SF57765', name: 'BRL/MXN', currency: 'BRL', country: 'Brazil', description: 'Brazilian Real' },
  { id: 'SF57751', name: 'CLP/MXN', currency: 'CLP', country: 'Chile', description: 'Chilean Peso' },
  { id: 'SF57775', name: 'COP/MXN', currency: 'COP', country: 'Colombia', description: 'Colombian Peso' },
  { id: 'SF57875', name: 'PEN/MXN', currency: 'PEN', country: 'Peru', description: 'Peruvian Sol' },
  { id: 'SF57873', name: 'PYG/MXN', currency: 'PYG', country: 'Paraguay', description: 'Paraguayan Guaraní' },
  { id: 'SF57921', name: 'UYP/MXN', currency: 'UYP', country: 'Uruguay', description: 'Uruguayan Peso' },
  { id: 'SF57925', name: 'VES/MXN', currency: 'VES', country: 'Venezuela', description: 'Venezuelan Bolívar Digital' },
  
  // ========== CARIBBEAN ==========
  { id: 'SF57755', name: 'BSD/MXN', currency: 'BSD', country: 'Bahamas', description: 'Bahamas Dollar' },
  { id: 'SF57759', name: 'BBD/MXN', currency: 'BBD', country: 'Barbados', description: 'Barbados Dollar' },
  { id: 'SF57785', name: 'CUP/MXN', currency: 'CUP', country: 'Cuba', description: 'Cuban Peso' },
  { id: 'SF57837', name: 'JMD/MXN', currency: 'JMD', country: 'Jamaica', description: 'Jamaican Dollar' },
  { id: 'SF57915', name: 'TTD/MXN', currency: 'TTD', country: 'Trinidad and Tobago', description: 'Trinidad and Tobago Dollar' },
  { id: 'SF57819', name: 'GYD/MXN', currency: 'GYD', country: 'Guyana', description: 'Guyanese Dollar' },
  
  // ========== EUROPE ==========
  { id: 'SF46410', name: 'EUR/MXN', currency: 'EUR', country: 'European Monetary Union', description: 'Euro', frequency: 'daily' },
  { id: 'SF57815', name: 'GBP/MXN', currency: 'GBP', country: 'Great Britain', description: 'British Pound Sterling' },
  { id: 'SF57789', name: 'DKK/MXN', currency: 'DKK', country: 'Denmark', description: 'Danish Krone' },
  { id: 'SF57863', name: 'NOK/MXN', currency: 'NOK', country: 'Norway', description: 'Norwegian Krone' },
  { id: 'SF57903', name: 'SEK/MXN', currency: 'SEK', country: 'Sweden', description: 'Swedish Krona' },
  { id: 'SF57827', name: 'HUF/MXN', currency: 'HUF', country: 'Hungary', description: 'Hungarian Forint' },
  { id: 'SF57881', name: 'CZK/MXN', currency: 'CZK', country: 'Czech Republic', description: 'Czech Koruna' },
  { id: 'SF57877', name: 'PLN/MXN', currency: 'PLN', country: 'Poland', description: 'Polish Zloty' },
  { id: 'SF57893', name: 'RON/MXN', currency: 'RON', country: 'Romania', description: 'Romanian Leu' },
  { id: 'SF57917', name: 'TRY/MXN', currency: 'TRY', country: 'Turkey', description: 'Turkish Lira' },
  { id: 'SF57807', name: 'RUB/MXN', currency: 'RUB', country: 'Russian Federation', description: 'Russian Ruble' },
  { id: 'SF57919', name: 'UAH/MXN', currency: 'UAH', country: 'Ukraine', description: 'Ukrainian Hryvnia' },
  { id: 'SF57905', name: 'CHF/MXN', currency: 'CHF', country: 'Switzerland', description: 'Swiss Franc' },
  
  // ========== EAST ASIA ==========
  { id: 'SF46406', name: 'JPY/MXN', currency: 'JPY', country: 'Japan', description: 'Japanese Yen', frequency: 'daily' },
  { id: 'SF57773', name: 'CNY/MXN', currency: 'CNY', country: 'China (Mainland Yuan)', description: 'Chinese Yuan Onshore' },
  { id: 'SF229267', name: 'CNH/MXN', currency: 'CNH', country: 'China (Offshore Yuan)', description: 'Chinese Yuan Offshore' },
  { id: 'SF57783', name: 'KRW/MXN', currency: 'KRW', country: 'South Korea', description: 'South Korean Won' },
  { id: 'SF57911', name: 'TWD/MXN', currency: 'TWD', country: 'Taiwan', description: 'New Taiwan Dollar' },
  { id: 'SF57831', name: 'IDR/MXN', currency: 'IDR', country: 'Indonesia', description: 'Indonesian Rupiah' },
  { id: 'SF57829', name: 'INR/MXN', currency: 'INR', country: 'India', description: 'Indian Rupee' },
  
  // ========== CENTRAL AND SOUTH ASIA ==========
  { id: 'SF57845', name: 'KWD/MXN', currency: 'KWD', country: 'Kuwait', description: 'Kuwaiti Dinar' },
  { id: 'SF57747', name: 'SAR/MXN', currency: 'SAR', country: 'Saudi Arabia', description: 'Saudi Riyal' },
  { id: 'SF57795', name: 'AED/MXN', currency: 'AED', country: 'United Arab Emirates', description: 'UAE Dirham' },
  { id: 'SF57855', name: 'MAD/MXN', currency: 'MAD', country: 'Morocco', description: 'Moroccan Dirham' },
  
  // ========== MIDDLE EAST ==========
  { id: 'SF57791', name: 'EGP/MXN', currency: 'EGP', country: 'Egypt', description: 'Egyptian Pound' },
  { id: 'SF57833', name: 'IQD/MXN', currency: 'IQD', country: 'Iraq', description: 'Iraqi Dinar' },
  { id: 'SF57835', name: 'ILS/MXN', currency: 'ILS', country: 'Israel', description: 'Israeli Shekel' },
  { id: 'SF57749', name: 'DZD/MXN', currency: 'DZD', country: 'Algeria', description: 'Algerian Dinar' },
  
  // ========== SOUTHEAST ASIA ==========
  { id: 'SF57847', name: 'MYR/MXN', currency: 'MYR', country: 'Malaysia', description: 'Malaysian Ringgit' },
  { id: 'SF57897', name: 'SGD/MXN', currency: 'SGD', country: 'Singapore', description: 'Singapore Dollar' },
  { id: 'SF57909', name: 'THB/MXN', currency: 'THB', country: 'Thailand', description: 'Thai Baht' },
  { id: 'SF57927', name: 'VND/MXN', currency: 'VND', country: 'Vietnam', description: 'Vietnamese Dong' },
  
  // ========== OCEANIA AND OTHERS ==========
  { id: 'SF57753', name: 'AUD/MXN', currency: 'AUD', country: 'Australia', description: 'Australian Dollar' },
  { id: 'SF57867', name: 'NZD/MXN', currency: 'NZD', country: 'New Zealand', description: 'New Zealand Dollar' },
  { id: 'SF57809', name: 'FJD/MXN', currency: 'FJD', country: 'Fiji', description: 'Fiji Dollar' },
  
  // ========== AFRICA ==========
  { id: 'SF57841', name: 'KES/MXN', currency: 'KES', country: 'Kenya', description: 'Kenyan Shilling' },
  { id: 'SF57861', name: 'NGN/MXN', currency: 'NGN', country: 'Nigeria', description: 'Nigerian Naira' },
  { id: 'SF57883', name: 'ZAR/MXN', currency: 'ZAR', country: 'South Africa', description: 'South African Rand' },
  
  // ========== MISCELLANEOUS ==========
  { id: 'SF57781', name: 'CRC/MXN', currency: 'CRC', country: 'Costa Rica', description: 'Costa Rican Colón' },
  { id: 'SF57787', name: 'XDR/MXN', currency: 'XDR', country: 'IMF', description: 'Special Drawing Rights' },
];

/**
 * Returns the full list of supported currencies with their Banxico series IDs.
 * @returns {Array} Array of { id, name, currency, country, description, frequency? }
 */
export function getExchangeRateCatalog() {
  return exchangeRateCatalog;
}

/**
 * Finds a catalog entry by its Banxico series ID.
 * @param {string} seriesId - e.g. 'SF43718'
 * @returns {Object|undefined} Matching catalog entry, or undefined if not found.
 */
export function findSeriesById(seriesId) {
  return exchangeRateCatalog.find(s => s.id === seriesId);
}

/**
 * Returns all catalog entries matching the given ISO currency code.
 * @param {string} currencyCode - e.g. 'USD', 'EUR'
 * @returns {Array} Matching catalog entries.
 */
export function getSeriesByCurrency(currencyCode) {
  return exchangeRateCatalog.filter(s => s.currency === currencyCode);
}

/**
 * Returns all catalog entries for a given country (supports partial match).
 * @param {string} countryName - e.g. 'Japan', 'United States'
 * @returns {Array} Matching catalog entries.
 */
export function getSeriesByCountry(countryName) {
  return exchangeRateCatalog.filter(s =>
    s.country.toLowerCase().includes(countryName.toLowerCase())
  );
}

/**
 * Returns the 4 currencies Banxico publishes on a daily basis (USD, EUR, CAD, JPY).
 * @returns {Array} Catalog entries where frequency === 'daily'.
 */
export function getDailyExchangeRateSeries() {
  return exchangeRateCatalog.filter(s => s.frequency === 'daily');
}
