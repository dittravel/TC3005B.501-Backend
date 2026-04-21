/**
 * Hotel Service
 *
 * This module handles hotel search integration with SerpApi (Google Hotels engine).
 * It validates key input, calls SerpApi, transforms results,
 * and returns a paginated hotel list for frontend display.
 */

import axios from "axios";

const SERPAPI_BASE_URL = "https://serpapi.com/search.json";
const DEFAULT_HOTEL_SEARCH_PAGE_SIZE = Number.parseInt(process.env.HOTEL_SEARCH_PAGE_SIZE, 10) || 10;

/**
 * Search hotels using SerpApi Google Hotels engine.
 *
 * @param {Object} params - Hotel search parameters.
 * @param {string} params.checkInDate - Check-in date in YYYY-MM-DD.
 * @param {string} params.checkOutDate - Check-out date in YYYY-MM-DD.
 * @param {number} params.guests - Number of guests.
 * @param {number} [params.page=1] - Internal page number for API consumers.
 * @param {number} [params.pageSize] - Number of hotels per page in response.
 * @param {string} [params.nextPageToken] - SerpApi next page token.
 * @returns {Promise<Object>} Paginated and sorted hotel results by rating and price.
 */
export const searchHotels = async ({
  checkInDate,
  checkOutDate,
  guests,
  address,
  page = 1,
  pageSize,
  nextPageToken,
}) => {
  if (!process.env.SERPAPI_API_KEY) {
    throw new Error("SERPAPI_API_KEY is not configured");
  }

  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const requestedPageSize = pageSize ?? DEFAULT_HOTEL_SEARCH_PAGE_SIZE;
  const normalizedPageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0
    ? requestedPageSize
    : DEFAULT_HOTEL_SEARCH_PAGE_SIZE;

  const requestParams = {
    engine: "google_hotels",
    q: address,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    adults: guests,
    api_key: process.env.SERPAPI_API_KEY,
  };

  if (nextPageToken) {
    requestParams.next_page_token = nextPageToken;
  }

  const response = await axios.get(SERPAPI_BASE_URL, { params: requestParams });

  // SerpApi returns hotel cards under response.data.properties
  const properties = Array.isArray(response.data?.properties) ? response.data.properties : [];
  const allHotels = properties
    .map((hotel) => ({
      rating: hotel.overall_rating || null,
      installation: hotel.room_type || hotel.type || hotel.hotel_class || null,
      cost: hotel.rate_per_night?.extracted_lowest || hotel.total_rate?.extracted_lowest || null,
      name: hotel.name || "No name provided",
    }))
    .sort((a, b) => {
      // Sort by rating descending (higher first)
      if ((b.rating || 0) !== (a.rating || 0)) {
        return (b.rating || 0) - (a.rating || 0);
      }
      // Then sort by cost ascending (lower price first)
      return (a.cost || 0) - (b.cost || 0);
    });

  const totalHotels = allHotels.length;
  const totalPages = Math.max(1, Math.ceil(totalHotels / normalizedPageSize));
  const safePage = Math.min(normalizedPage, totalPages);
  const startIndex = (safePage - 1) * normalizedPageSize;
  const paginatedHotels = allHotels.slice(startIndex, startIndex + normalizedPageSize);

  return {
    search: {
      checkInDate,
      checkOutDate,
      guests,
      address,
      page: safePage,
      pageSize: normalizedPageSize,
    },
    pagination: {
      page: safePage,
      pageSize: normalizedPageSize,
      totalHotels,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
      nextPage: safePage < totalPages ? safePage + 1 : null,
      previousPage: safePage > 1 ? safePage - 1 : null,
      serpApiNextPageToken: response.data?.serpapi_pagination?.next_page_token || null,
    },
    totalHotels,
    hotels: paginatedHotels,
  };
};
