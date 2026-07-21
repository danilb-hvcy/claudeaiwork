/**
 * LiteAPI Hotels integration (same key as flights: server-side LITEAPI_KEY).
 *
 * Calls the bundled serverless proxy at /api/hotels, which does the two LiteAPI
 * calls (GET /data/hotels for static content, POST /hotels/rates for prices) and
 * returns { hotels, rates }. We merge them by id and normalize to the HeyVacay
 * hotel schema the existing HotelCard / HotelDetailModal already consume.
 *
 * Falls back to bundled mock hotels so the UI works with no key configured.
 */

import { mockHotels } from '../data/mockHotels.js';

const HOTELS_API_URL = import.meta.env.VITE_HOTELS_API_URL || '/api/hotels';

/** Nights between two YYYY-MM-DD dates (min 1). */
function nightsBetween(checkin, checkout) {
  const a = new Date(checkin), b = new Date(checkout);
  const n = Math.round((b - a) / 86400000);
  return n > 0 ? n : 1;
}

/** Read a numeric amount from LiteAPI's various total shapes. */
function amountOf(total) {
  if (Array.isArray(total)) return Number(total[0]?.amount);
  if (total && typeof total === 'object') return Number(total.amount);
  return Number(total);
}
function currencyOf(total, fallback = 'USD') {
  if (Array.isArray(total)) return total[0]?.currency || fallback;
  if (total && typeof total === 'object') return total.currency || fallback;
  return fallback;
}

/**
 * Pull the cheapest bookable rate (and a room list) from a LiteAPI rates entry.
 * Defensive about field names — room/rate shapes vary by supplier.
 */
function extractRates(entry) {
  const roomTypes = entry?.roomTypes || entry?.rooms || [];
  const rooms = [];
  let best = null;
  for (const rt of roomTypes) {
    const rateList = rt.rates || rt.offers || [];
    for (const r of rateList) {
      const totalRaw = r.retailRate?.total ?? r.retailRate ?? r.total ?? r.price;
      const total = amountOf(totalRaw);
      if (!total || Number.isNaN(total)) continue;
      const currency = currencyOf(totalRaw);
      const refundable = /rfn|refundable/i.test(r.refundableTag || r.cancellationPolicies?.refundableTag || '');
      rooms.push({
        id: r.offerId || r.rateId || rt.roomTypeId || `rate-${rooms.length}`,
        name: rt.name || r.name || r.roomTypeName || 'Room',
        board: r.boardName || r.board || 'Room Only',
        price: total,
        currency,
        refundable,
        cancellation: refundable ? 'Free cancellation available' : 'Non-refundable',
      });
      if (!best || total < best.total) best = { total, currency };
    }
  }
  rooms.sort((a, b) => a.price - b.price);
  return best ? { ...best, rooms } : null;
}

/**
 * Map a LiteAPI static hotel + its rate entry to the HeyVacay hotel schema.
 * Returns null if the hotel has no bookable price (so it won't render empty).
 */
export function mapLiteApiHotel(hotel, rateEntry, nights) {
  const rate = extractRates(rateEntry);
  if (!rate) return null;

  const image =
    hotel.main_photo || hotel.thumbnail ||
    hotel.hotelImages?.[0]?.urlHd || hotel.hotelImages?.[0]?.url || '';
  const reviewScore = Number(hotel.rating ?? hotel.reviewRating);
  // HotelCard's labels assume a /5 score; LiteAPI review scores are often /10.
  const rating = reviewScore ? (reviewScore > 5 ? Math.round((reviewScore / 2) * 10) / 10 : reviewScore) : null;
  const city = hotel.city || hotel.cityName || '';
  const country = hotel.country || hotel.countryName || hotel.countryCode || '';
  const perNight = Math.max(1, Math.round(rate.total / nights));

  return {
    id: hotel.id || hotel.hotelId,
    name: hotel.name || 'Hotel',
    location: [city, country].filter(Boolean).join(', '),
    city,
    country,
    stars: Number(hotel.stars ?? hotel.starRating) || 0,
    rating,
    reviews: Number(hotel.reviewCount) || null,
    price_per_night: perNight,
    original_price: null,
    currency: rate.currency,
    amenities: (hotel.hotelFacilities || hotel.amenities || []).slice(0, 6),
    perks: [],
    image_url: image,
    refundable: Boolean(rate.rooms.some((r) => r.refundable)),
    description: hotel.hotelDescription || hotel.description || '',
    room_types: rate.rooms.map((r) => ({ name: `${r.name}${r.board ? ` · ${r.board}` : ''}`, price: r.price })),
    rooms: rate.rooms,
    cancellation_policy: rate.rooms[0]?.cancellation || '',
    nights,
  };
}

/**
 * Search hotels. Returns { hotels, source: 'liteapi'|'mock' }. Never throws for
 * the mock path so the UI always renders.
 */
export async function searchHotels({
  city = 'Rome',
  countryCode = 'IT',
  checkin,
  checkout,
  adults = 2,
  children = 0,
  rooms = 1,
  currency = 'USD',
  guestNationality = 'US',
} = {}) {
  const nights = nightsBetween(checkin, checkout);
  const payload = { cityName: city, countryCode, checkin, checkout, adults, children, rooms, currency, guestNationality };

  try {
    const response = await fetch(HOTELS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return mockResult();

    const data = await response.json();
    const staticHotels = Array.isArray(data.hotels) ? data.hotels : [];
    const rates = Array.isArray(data.rates) ? data.rates : [];

    // Index rates by hotel id for the merge.
    const ratesById = new Map();
    for (const r of rates) {
      const id = r.hotelId || r.id;
      if (id) ratesById.set(id, r);
    }

    const hotels = staticHotels
      .map((h) => mapLiteApiHotel(h, ratesById.get(h.id || h.hotelId), nights))
      .filter(Boolean)
      .sort((a, b) => a.price_per_night - b.price_per_night);

    return hotels.length ? { hotels, source: 'liteapi' } : mockResult();
  } catch {
    return mockResult();
  }
}

async function mockResult() {
  await new Promise((r) => setTimeout(r, 400));
  return { hotels: mockHotels, source: 'mock' };
}
