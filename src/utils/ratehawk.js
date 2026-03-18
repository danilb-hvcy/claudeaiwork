/**
 * RateHawk (WorldOTA) API Integration
 *
 * RateHawk is a B2B hotel distribution platform giving access to 2M+ properties.
 * API docs: https://docs.worldota.net/
 *
 * ⚠️  IMPORTANT: RateHawk requires server-side API calls (credentials must stay secret).
 * For production, proxy these requests through your backend (Node/Express/Next.js API route).
 *
 * This file shows the integration pattern so it's ready to wire up
 * when a backend is available. For the MVP, mock data from mockHotels.js is used.
 *
 * Steps to go live:
 * 1. Sign up at https://partner.worldota.net and get Key ID + API Key
 * 2. Create a backend endpoint (e.g., /api/hotels/search) that proxies RateHawk
 * 3. Replace the mock data calls in skyeApi.js with calls to your backend
 * 4. Map RateHawk's response schema to the HeyVacay hotel schema below
 */

const RATEHAWK_BASE_URL = 'https://api.worldota.net/api/b2b/v3';

/**
 * RateHawk → HeyVacay hotel schema mapper.
 * Call this after fetching from RateHawk to normalize the data.
 *
 * @param {Object} rhHotel - Raw RateHawk hotel object
 * @returns {Object} HeyVacay-compatible hotel object
 */
export function mapRateHawkHotel(rhHotel) {
  const rate = rhHotel.rates?.[0];
  const originalPrice = rate?.daily_prices?.[0]
    ? parseFloat(rate.daily_prices[0]) * 1.35 // estimate 35% markup for "original price"
    : null;

  return {
    id: rhHotel.id,
    name: rhHotel.name,
    location: `${rhHotel.region?.name}, ${rhHotel.region?.country_name}`,
    city: rhHotel.region?.name,
    country: rhHotel.region?.country_name,
    region: rhHotel.region?.name,
    coordinates: {
      lat: rhHotel.latitude,
      lng: rhHotel.longitude,
    },
    stars: rhHotel.star_rating,
    rating: rhHotel.rating?.score,
    reviews: rhHotel.rating?.reviews_count,
    price_per_night: rate?.daily_prices?.[0]
      ? parseFloat(rate.daily_prices[0])
      : null,
    original_price: originalPrice,
    currency: rate?.payment_options?.payment_types?.[0]?.currency_code || 'USD',
    amenities: rhHotel.amenity_groups
      ?.flatMap((g) => g.amenities)
      .slice(0, 7) || [],
    perks: [], // HeyVacay member perks added separately
    image_url: rhHotel.images?.[0]?.replace('{size}', '640x400'),
    refundable: rate?.payment_options?.payment_types?.some(
      (p) => p.cancellation_penalties?.free_cancellation_before
    ) ?? false,
    description: rhHotel.description_struct?.[0]?.paragraphs?.[0] || '',
    room_types: rhHotel.rates?.map((r) => ({
      name: r.room_name,
      price: r.daily_prices?.[0] ? parseFloat(r.daily_prices[0]) : null,
      ratehawk_rate_id: r.id,
    })) || [],
    tags: rhHotel.amenity_groups?.flatMap((g) =>
      g.amenities.map((a) => a.toLowerCase())
    ) || [],
    check_in_time: '3:00 PM',
    check_out_time: '12:00 PM',
    cancellation_policy:
      rate?.payment_options?.payment_types?.[0]?.cancellation_penalties
        ?.policies?.[0]?.penalty === 'no_show_penalty'
        ? 'Non-refundable.'
        : 'Fully refundable excluding credit card processing fees.',
    // Keep original RateHawk data for booking
    _ratehawk: {
      hotel_id: rhHotel.id,
      rate_id: rate?.id,
      book_hash: rate?.book_hash,
    },
  };
}

/**
 * Search hotels via your backend proxy (which calls RateHawk).
 *
 * @param {Object} params
 * @param {string} params.destination - City or region name
 * @param {string} params.checkin - YYYY-MM-DD
 * @param {string} params.checkout - YYYY-MM-DD
 * @param {number} params.adults - Number of adult guests
 * @param {number} [params.children] - Number of children
 * @param {number} [params.rooms] - Number of rooms (default 1)
 * @param {string} [params.currency] - Currency code (default USD)
 * @returns {Promise<Array>} Array of HeyVacay-compatible hotel objects
 */
export async function searchHotelsRateHawk({
  destination,
  checkin,
  checkout,
  adults = 2,
  children = 0,
  rooms = 1,
  currency = 'USD',
}) {
  // In production, replace with your backend endpoint:
  // const response = await fetch('/api/hotels/search', { method: 'POST', body: JSON.stringify({...}) });

  // For now, this pattern shows what the backend call would look like:
  const backendPayload = {
    checkin,
    checkout,
    residency: 'us',
    language: 'en',
    guests: [
      {
        adults,
        children: Array(children).fill(0), // child ages – 0 means infant
      },
    ],
    region_id: null, // resolved by backend using destination string
    currency,
  };

  // Stub: throw error pointing to backend setup
  throw new Error(
    `RateHawk integration requires a backend proxy. ` +
    `Send a POST request to your backend with: ${JSON.stringify(backendPayload)}. ` +
    `See src/utils/ratehawk.js for the full integration guide.`
  );
}

/**
 * Confirm a booking via your backend proxy.
 * Called after the user clicks "All is Correct, Let's Make the Payment!"
 *
 * @param {Object} params
 * @param {string} params.book_hash - From the hotel's _ratehawk.book_hash
 * @param {Object} params.guest - { first_name, last_name, email, phone }
 * @param {string} params.return_url - URL to redirect after payment
 * @returns {Promise<Object>} { payment_url, booking_id }
 */
export async function confirmBookingRateHawk({ book_hash, guest, return_url }) {
  // Replace with your backend endpoint:
  // const response = await fetch('/api/hotels/book', { method: 'POST', body: JSON.stringify({...}) });

  throw new Error(
    `RateHawk booking requires a backend proxy. ` +
    `See src/utils/ratehawk.js for the integration guide.`
  );
}
