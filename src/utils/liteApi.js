/**
 * LiteAPI Flight Integration
 *
 * LiteAPI provides real-time travel content (flights, hotels, transfers).
 * API docs: https://docs.liteapi.travel/reference/overview
 *
 * ⚠️  IMPORTANT: LiteAPI private/sandbox keys must stay server-side. Browser code
 * should never ship a secret key. For production, proxy these requests through
 * your backend (Node/Express/Next.js API route) and expose only a thin endpoint
 * to the client.
 *
 * This module mirrors the pattern used in ratehawk.js: it documents the live
 * integration + a response normalizer, and falls back to bundled mock data so
 * the UI is fully functional out of the box. Wire `searchFlights` to your
 * backend proxy when credentials are available.
 *
 * Steps to go live:
 * 1. Get your keys at https://dashboard.liteapi.travel (public + sandbox/private).
 * 2. Create a backend endpoint (e.g. POST /api/flights/search) that forwards to
 *    LiteAPI with the private key in the `X-API-Key` header.
 * 3. Set VITE_FLIGHTS_API_URL to that endpoint. The client calls your proxy,
 *    never LiteAPI directly.
 * 4. Map LiteAPI's response to the HeyVacay flight schema via `mapLiteApiOffer`.
 */

import { mockFlights, AIRLINES } from '../data/mockFlights.js';

const LITEAPI_BASE_URL = 'https://api.liteapi.travel/v3.0';

/** Client-facing backend proxy endpoint (empty => use mock data). */
const FLIGHTS_API_URL = import.meta.env.VITE_FLIGHTS_API_URL || '';

/** Public key is safe to expose; only used when a proxy explicitly needs it. */
const PUBLIC_KEY = import.meta.env.VITE_LITEAPI_PUBLIC_KEY || '';

/**
 * Convert an ISO-ish duration or minutes value into { hours, minutes, total }.
 */
function normalizeDuration(totalMinutes) {
  const safe = Number(totalMinutes) || 0;
  return { hours: Math.floor(safe / 60), minutes: safe % 60, totalMinutes: safe };
}

/**
 * Map a raw LiteAPI flight offer to the HeyVacay flight schema used by the UI.
 * Defensive about missing fields — LiteAPI segment shapes vary by carrier.
 *
 * @param {Object} offer - Raw LiteAPI offer/itinerary object
 * @returns {Object} HeyVacay-compatible flight object
 */
export function mapLiteApiOffer(offer) {
  const segments = offer.segments || offer.slices?.[0]?.segments || [];
  const first = segments[0] || {};
  const last = segments[segments.length - 1] || first;
  const stops = Math.max(0, segments.length - 1);

  const carrierCode = first.marketingCarrier || first.carrierCode || offer.carrier;
  const airline = AIRLINES[carrierCode] || {
    name: first.carrierName || carrierCode || 'Airline',
    code: carrierCode || '--',
    color: '#5A6B7E',
  };

  const price = Number(offer.price?.total ?? offer.totalPrice ?? offer.amount) || null;

  return {
    id: offer.id || offer.offerId,
    airline,
    origin: {
      code: first.departure?.iataCode || first.origin,
      city: first.departure?.city || '',
      airport: first.departure?.airportName || '',
      country: first.departure?.country || '',
    },
    destination: {
      code: last.arrival?.iataCode || last.destination,
      city: last.arrival?.city || '',
      airport: last.arrival?.airportName || '',
      country: last.arrival?.country || '',
    },
    departure: { time: (first.departure?.at || '').slice(11, 16) },
    arrival: { time: (last.arrival?.at || '').slice(11, 16) },
    duration: normalizeDuration(offer.durationMinutes ?? offer.totalDuration),
    stops,
    stopCities: segments.slice(0, -1).map((s) => s.arrival?.iataCode).filter(Boolean),
    price,
    originalPrice: Number(offer.price?.base) || null,
    currency: offer.price?.currency || offer.currency || 'USD',
    cabin: offer.cabinClass || 'Economy',
    fares: (offer.fareOptions || []).map((f, i) => ({
      id: f.id || `fare-${i}`,
      name: f.brandName || f.name,
      price: Number(f.price?.total ?? f.amount) || price,
      cabin: f.cabinClass || 'Economy',
      recommended: Boolean(f.recommended),
      seat: f.seatSelection || 'Seat choice for a fee',
      bags: f.baggage || [],
      flexibility: f.flexibility || [],
    })),
  };
}

/**
 * Search flights. Calls your backend proxy when VITE_FLIGHTS_API_URL is set,
 * otherwise resolves bundled mock data (filtered by nothing — the UI filters
 * client-side). Never throws for the mock path so the UI always renders.
 *
 * @param {Object} params
 * @param {string} params.origin - Origin IATA code (e.g. "SYD")
 * @param {string} params.destination - Destination IATA code (e.g. "LAX")
 * @param {string} params.departureDate - YYYY-MM-DD
 * @param {string} [params.returnDate] - YYYY-MM-DD (round-trip only)
 * @param {number} [params.adults] - Adult passengers
 * @param {number} [params.children] - Child passengers
 * @param {number} [params.infants] - Infant passengers
 * @param {string} [params.cabin] - Economy | Premium | Business | First
 * @returns {Promise<{flights: Array, source: 'liteapi'|'mock'}>}
 */
export async function searchFlights({
  origin = 'SYD',
  destination = 'LAX',
  departureDate,
  returnDate,
  adults = 1,
  children = 0,
  infants = 0,
  cabin = 'Economy',
} = {}) {
  // No backend configured → return mock inventory (simulate a small latency).
  if (!FLIGHTS_API_URL) {
    await new Promise((r) => setTimeout(r, 650));
    return { flights: mockFlights, source: 'mock' };
  }

  const payload = {
    origin,
    destination,
    departureDate,
    returnDate,
    passengers: { adults, children, infants },
    cabinClass: cabin,
  };

  const response = await fetch(FLIGHTS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(PUBLIC_KEY ? { 'X-API-Key': PUBLIC_KEY } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Flight search failed (${response.status}). Please try again.`);
  }

  const data = await response.json();
  const offers = data.offers || data.data || [];
  return { flights: offers.map(mapLiteApiOffer), source: 'liteapi' };
}

/**
 * Reference: the direct LiteAPI endpoint your backend proxy would call.
 * Kept here so backend developers have the exact shape in one place.
 */
export const LITEAPI_ENDPOINTS = {
  searchFlights: `${LITEAPI_BASE_URL}/flights/search`,
  flightDetails: `${LITEAPI_BASE_URL}/flights/offers`,
  airlines: `${LITEAPI_BASE_URL}/data/airlines`,
};
