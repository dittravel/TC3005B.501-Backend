/**
 * Country City Controller
 *
 * Handles HTTP request/response for country and city catalog endpoints.
 * Queries the database directly to return lists of countries and cities
 * filtered by country.
 */

import { prisma } from "../lib/prisma.js";

/**
 * Returns all countries ordered alphabetically.
 * @param {Object} req - Express request.
 * @param {Object} res - Express response. Returns Country[].
 */
export async function getCountries(req, res) {
  const countries = await prisma.country.findMany({ orderBy: { country_name: 'asc' } });
  return res.status(200).json(countries);
}

/**
 * Returns all cities belonging to a given country, ordered alphabetically.
 * @param {Object} req - Express request. Query: countryId (number, required).
 * @param {Object} res - Express response. Returns City[].
 */
export async function getCitiesByCountry(req, res) {
  const { countryId } = req.query;
  const cities = await prisma.city.findMany({
    where: countryId ? { country_id: Number(countryId) } : undefined,
    orderBy: { city_name: 'asc' },
  });
  return res.status(200).json(cities);
}