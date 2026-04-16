/**
 * Flight Service
 *
 * This module handles flight search integration with the Duffel API.
 * It constructs multi-leg journey searches, transforms API responses,
 * and returns flight offers in a simplified format for display.
 */

import { Duffel } from "@duffel/api";

const duffel = new Duffel({
  token: process.env.DUFFEL_TOKEN
});

const DEFAULT_FLIGHT_SEARCH_PAGE_SIZE = Number.parseInt(process.env.FLIGHT_SEARCH_PAGE_SIZE, 10) || 10;

/**
 * Search available flight offers from Duffel API
 * Supports one-way and round-trip searches with cabin class preferences.
 *
 * @param {Object} params - Search parameters
 * @param {string} params.origin - IATA code for departure airport (e.g., 'MEX', 'NYC')
 * @param {string} params.destination - IATA code for arrival airport (e.g., 'CUN', 'ATL')
 * @param {string} params.departureDate - Departure date in YYYY-MM-DD format
 * @param {string} [params.returnDate] - Return date for round trips in YYYY-MM-DD format
 * @param {string} params.tripType - Trip type: 'one_way' or 'round'
 * @param {string} [params.cabinClass='economy'] - Cabin class: economy, premium_economy, business, first
 * @param {string} [params.passengerName] - Name of the searching passenger
 * @returns {Promise<Object>} Transformed flight offers with passenger and search metadata
 * @throws {Error} If DUFFEL_TOKEN is not configured or API call fails
 */
export const searchFlights = async ({
  origin,
  destination,
  departureDate,
  returnDate,
  tripType,
  cabinClass = "economy",
  passengerName,
  page = 1,
  pageSize,
  limit,
}) => {
  try {
    if (!process.env.DUFFEL_TOKEN) {
      throw new Error("DUFFEL_TOKEN is not configured");
    }

    const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
    const requestedPageSize = pageSize ?? limit ?? DEFAULT_FLIGHT_SEARCH_PAGE_SIZE;
    const normalizedPageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? requestedPageSize
      : DEFAULT_FLIGHT_SEARCH_PAGE_SIZE;

    // Construct Duffel API slices based on trip type
    const slices = tripType === "round"
      ? [
          { origin, destination, departure_date: departureDate },
          { origin: destination, destination: origin, departure_date: returnDate }
        ]
      : [
          { origin, destination, departure_date: departureDate }
        ];

    // Call Duffel API to create offer request
    const response = await duffel.offerRequests.create({
      slices,
      passengers: [{ type: "adult" }],
      cabin_class: cabinClass
    });

    // Transform Duffel API response to simplified offer format
    const allOffers = response.data.offers.map(offer => ({
      id: offer.id,
      owner: offer.owner?.name || null,
      price: offer.total_amount,
      currency: offer.total_currency,
      cabinClass: offer.slices?.[0]?.segments?.[0]?.passengers?.[0]?.cabin_class_marketing_name || cabinClass,
      totalDuration: offer.total_duration || null,
      segments: offer.slices.flatMap(slice =>
        slice.segments.map(segment => ({
          from: segment.origin.iata_code,
          to: segment.destination.iata_code,
          departure: segment.departing_at,
          arrival: segment.arriving_at,
          airline: segment.operating_carrier?.name || null,
          flightNumber: segment.marketing_carrier_flight_number || null, 
          aircraft: segment.aircraft?.name || null
        }))
      )
    }));

    const totalOffers = allOffers.length;
    const totalPages = Math.max(1, Math.ceil(totalOffers / normalizedPageSize));
    const safePage = Math.min(normalizedPage, totalPages);
    const startIndex = (safePage - 1) * normalizedPageSize;
    const paginatedOffers = allOffers.slice(startIndex, startIndex + normalizedPageSize);

    return {
      passenger: {
        name: passengerName || "Unknown passenger",
        type: "adult"
      },
      search: {
        tripType,
        origin,
        destination,
        departureDate,
        returnDate: tripType === "round" ? returnDate : null,
        cabinClass,
        page: safePage,
        pageSize: normalizedPageSize
      },
      pagination: {
        page: safePage,
        pageSize: normalizedPageSize,
        totalOffers,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
        nextPage: safePage < totalPages ? safePage + 1 : null,
        previousPage: safePage > 1 ? safePage - 1 : null,
      },
      totalOffers,
      offers: paginatedOffers
    };

  } catch (error) {
    console.error("Error searching flights in Duffel:", error?.message || error);
    throw error;
  }
};