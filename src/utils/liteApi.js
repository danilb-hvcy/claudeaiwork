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
 * 4. Map LiteAPI's response to the HeyVacay flight schema via `mapLiteApiJourney`.
 *
 * RESPONSE SHAPE (confirmed against a live /flights/rates 200):
 *   { data: [ { journeys: [ {
 *       journeyKey, isCheapest,
 *       segments: [ { originCode, destinationCode, departureTime, arrivalTime,
 *                     carrier: { marketingCode, marketingName }, duration:{minutes} } ],
 *       totalDuration: { iso8601, minutes },
 *       cheapestOffer: { offerId, pricing:{ display:{ total, currency } }, fare:{ family } },
 *       offers: [ { offerId, pricing:{display:{total,currency}}, fare:{family},
 *                   baggage:{...}, seats:{...}, terms:{...}, segmentFares:[{cabin}] } ]
 *   } ] } ] }
 */

import { mockFlights, AIRLINES } from '../data/mockFlights.js';
import { AIRPORTS } from '../data/airports.js';

const LITEAPI_BASE_URL = 'https://api.liteapi.travel/v3.0';

/** IATA code → { city, name, country } for enriching bare segment codes. */
const AIRPORT_BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

/**
 * Client-facing endpoint. Defaults to the bundled serverless proxy at
 * `/api/flights` (see api/flights.js) so a deployed site shows live prices
 * with zero client config — you only set LITEAPI_KEY on the server. Override
 * with VITE_FLIGHTS_API_URL if your proxy lives elsewhere.
 */
const FLIGHTS_API_URL = import.meta.env.VITE_FLIGHTS_API_URL || '/api/flights';

/**
 * Convert an ISO-ish duration or minutes value into { hours, minutes, total }.
 */
function normalizeDuration(totalMinutes) {
  const safe = Number(totalMinutes) || 0;
  return { hours: Math.floor(safe / 60), minutes: safe % 60, totalMinutes: safe };
}

/** "2026-08-15T09:30:00" → "09:30". */
function hhmm(iso) {
  return (iso || '').slice(11, 16);
}

/** { city, name, country } for an IATA code, or {} if unknown. */
function airportInfo(code) {
  return AIRPORT_BY_CODE.get(code) || {};
}

/** Human-readable baggage lines from a LiteAPI offer's baggage object. */
function baggageLines(baggage) {
  if (!baggage) return [];
  const lines = [];
  for (const item of baggage.included || []) {
    const label = item.description || (item.bagType === 'checked' ? 'Checked bag' : 'Cabin bag');
    lines.push(item.pieces ? `${label} included (${item.pieces})` : `${label} included`);
  }
  if (!baggage.hasCheckedBag) lines.push('Checked baggage for a fee');
  if (!lines.length) lines.push(baggage.hasCarryOnBag ? 'Hand baggage included' : 'No baggage included');
  return lines;
}

/** Human-readable flexibility lines from a LiteAPI offer's terms object. */
function flexibilityLines(terms) {
  if (!terms) return [];
  if (Array.isArray(terms.summary) && terms.summary.length) {
    return terms.summary.filter((t) => t.level !== 'info').map((t) => t.message).filter(Boolean);
  }
  return [
    terms.refundable ? 'Refundable' : 'Non-refundable',
    terms.changeable ? 'Changes allowed' : 'Non-changeable',
  ];
}

/**
 * Turn a journey's `offers[]` into the fare columns the FareDetailsPanel shows.
 * De-dupes to the cheapest offer per fare family, sorts cheapest-first, caps at
 * four columns, and flags a sensible middle tier as recommended (mirrors the UI).
 */
function buildFaresFromOffers(offers, fallbackPrice) {
  const byFamily = new Map();
  for (const offer of offers || []) {
    const price = Number(offer.pricing?.display?.total);
    if (!price) continue;
    const family = offer.fare?.family || 'Standard';
    const existing = byFamily.get(family);
    if (!existing || price < existing.price) {
      byFamily.set(family, {
        id: offer.offerId,
        name: family,
        price,
        cabin: offer.segmentFares?.[0]?.cabin || offer.fare?.family || 'Economy',
        recommended: false,
        seat: offer.seats?.seatReservation?.description || 'Seat selection available for purchase',
        bags: baggageLines(offer.baggage),
        flexibility: flexibilityLines(offer.terms),
      });
    }
  }

  const list = [...byFamily.values()].sort((a, b) => a.price - b.price).slice(0, 4);
  if (list.length >= 2) list[1].recommended = true;

  if (!list.length && fallbackPrice) {
    list.push({
      id: 'fare-standard',
      name: 'Economy',
      price: fallbackPrice,
      cabin: 'Economy',
      recommended: false,
      seat: 'Seat selection available for purchase',
      bags: [],
      flexibility: [],
    });
  }
  return list;
}

/**
 * Map one LiteAPI journey (from data[].journeys[]) to the HeyVacay flight schema
 * used by the UI. Defensive about missing fields — carrier/segment shapes vary.
 *
 * @param {Object} journey - A single journey object
 * @returns {Object|null} HeyVacay-compatible flight object, or null if unusable
 */
export function mapLiteApiJourney(journey) {
  const segments = journey?.segments || [];
  if (!segments.length) return null;
  const first = segments[0];
  const last = segments[segments.length - 1];
  const stops = Math.max(0, segments.length - 1);

  const carrierCode = first.carrier?.marketingCode || '';
  const airline = AIRLINES[carrierCode] || {
    name: first.carrier?.marketingName || carrierCode || 'Airline',
    code: carrierCode || '--',
    color: '#5A6B7E',
  };

  const cheapest = journey.cheapestOffer || journey.offers?.[0] || {};
  const price = Number(cheapest.pricing?.display?.total) || null;
  const currency = cheapest.pricing?.display?.currency || 'USD';

  const oInfo = airportInfo(first.originCode);
  const dInfo = airportInfo(last.destinationCode);

  return {
    id: cheapest.offerId || journey.journeyKey,
    airline,
    origin: {
      code: first.originCode,
      city: oInfo.city || first.originName || first.originCode,
      airport: first.originName || oInfo.name || '',
      country: oInfo.country || '',
    },
    destination: {
      code: last.destinationCode,
      city: dInfo.city || last.destinationName || last.destinationCode,
      airport: last.destinationName || dInfo.name || '',
      country: dInfo.country || '',
    },
    departure: { time: hhmm(first.departureTime) },
    arrival: { time: hhmm(last.arrivalTime) },
    duration: normalizeDuration(journey.totalDuration?.minutes),
    stops,
    stopCities: segments.slice(0, -1).map((s) => s.destinationCode).filter(Boolean),
    price,
    originalPrice: null,
    currency,
    cabin: cheapest.fare?.family || cheapest.segmentFares?.[0]?.cabin || 'Economy',
    fares: buildFaresFromOffers(journey.offers, price),
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
  const payload = { origin, destination, departureDate, returnDate, adults, children, infants, cabin };

  try {
    const response = await fetch(FLIGHTS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Any non-OK (e.g. 503 = key not set on server, 404 = opened as a local
    // file with no function) → silently fall back to demo data so the UI is
    // never empty. The banner tells the user how to enable live results.
    if (!response.ok) return mockResult();

    const data = await response.json();

    // Live shape: { data: [ { journeys: [ ... ] } ] }. Each journey becomes one
    // flight card. Flatten every itinerary's journeys, then map + keep priced.
    const itineraries = Array.isArray(data.data) ? data.data : [];
    const journeys = itineraries.flatMap((it) => it.journeys || []);
    const flights = journeys.map(mapLiteApiJourney).filter((f) => f && f.price);

    // A configured key with real results → live. Otherwise keep the demo full.
    return flights.length ? { flights, source: 'liteapi' } : mockResult();
  } catch {
    // Network error / offline / local file → demo data.
    return mockResult();
  }
}

/** Bundled demo inventory, with a touch of latency so loading states show. */
async function mockResult() {
  await new Promise((r) => setTimeout(r, 500));
  return { flights: mockFlights, source: 'mock' };
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
