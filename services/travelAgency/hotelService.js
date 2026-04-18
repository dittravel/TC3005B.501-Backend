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
 * @param {number} [params.rating] - Hotel rating filter (7, 8, 9 in SerpApi).
 * @param {string} params.address - Destination/city text used for search.
 * @param {number} [params.page=1] - Internal page number for API consumers.
 * @param {number} [params.pageSize] - Number of hotels per page in response.
 * @param {string} [params.nextPageToken] - SerpApi next page token.
 * @returns {Promise<Object>} Paginated hotel results and metadata.
 */
export const searchHotels = async ({
  checkInDate,
  checkOutDate,
  guests,
  rating,
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

  if (rating !== undefined && rating !== null) {
    requestParams.rating = rating;
  }

  if (nextPageToken) {
    requestParams.next_page_token = nextPageToken;
  }

  const response = await axios.get(SERPAPI_BASE_URL, { params: requestParams });

  // SerpApi returns hotel cards under response.data.properties
  const properties = Array.isArray(response.data?.properties) ? response.data.properties : [];
  const allHotels = properties.map((hotel) => ({
    rating: hotel.overall_rating || null,
    address: hotel.address || null,
  }));

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
      rating: rating ?? null,
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
