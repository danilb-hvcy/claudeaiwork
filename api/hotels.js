/**
 * Serverless hotel-search proxy for LiteAPI (same key as flights: LITEAPI_KEY).
 *
 * Two upstream calls, one clean endpoint for the app:
 *   1. GET  /data/hotels?countryCode=&cityName=  → static hotel list (name,
 *      photo, address, stars) for the destination.
 *   2. POST /hotels/rates                          → live prices for those hotels.
 * We return both arrays; the client merges them by hotel id and maps to the UI.
 *
 * GET  → browser debug (shows what we send + both raw LiteAPI replies):
 *          /api/hotels?cityName=Rome&countryCode=IT&checkin=2026-08-19&checkout=2026-08-22
 * POST → normal path used by the app ({ hotels, rates } passthrough).
 */

const DATA_HOTELS_URL = 'https://api.liteapi.travel/v3.0/data/hotels';
const RATES_URL = 'https://api.liteapi.travel/v3.0/hotels/rates';
const HOTEL_LIMIT = 30; // cap hotels we price per search (rates for hundreds is slow)

export default async function handler(req, res) {
  const isDebug = req.method === 'GET';
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use POST (or GET to debug).' });
    return;
  }

  const key = process.env.LITEAPI_KEY;
  if (!key) {
    res.status(503).json({ error: 'LITEAPI_KEY is not set on the server.', demo: true });
    return;
  }

  const params = isDebug ? (req.query || {}) : await readBody(req);
  const {
    cityName = 'Rome',
    countryCode = 'IT',
    checkin,
    checkout,
    adults = 2,
    children = 0,
    rooms = 1,
    currency = 'USD',
    guestNationality = 'US',
  } = params;

  if (!checkin || !checkout) {
    res.status(400).json({
      error: "Missing 'checkin'/'checkout' (YYYY-MM-DD).",
      hint: isDebug ? 'Add &checkin=2026-08-19&checkout=2026-08-22 to the URL.' : undefined,
      received: params,
    });
    return;
  }

  try {
    // 1) Static hotel list for the destination.
    const listUrl = `${DATA_HOTELS_URL}?countryCode=${encodeURIComponent(countryCode)}&cityName=${encodeURIComponent(cityName)}&limit=${HOTEL_LIMIT}`;
    const listRes = await fetch(listUrl, { headers: { Accept: 'application/json', 'X-API-Key': key } });
    const listJson = safeParse(await listRes.text());
    const hotels = (listJson?.data || listJson?.hotels || listJson || []).slice(0, HOTEL_LIMIT);
    const hotelIds = hotels.map((h) => h.id || h.hotelId).filter(Boolean);

    // 2) Live rates for those hotels.
    const childrenAges = Array.from({ length: Math.max(0, Number(children) || 0) }, () => 8);
    const occupancies = Array.from({ length: Math.max(1, Number(rooms) || 1) }, () => ({
      adults: Math.max(1, Number(adults) || 1),
      children: childrenAges,
    }));
    const ratesBody = { hotelIds, checkin, checkout, occupancies, currency, guestNationality };

    let ratesJson = null;
    let ratesStatus = 0;
    if (hotelIds.length) {
      const ratesRes = await fetch(RATES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-API-Key': key },
        body: JSON.stringify(ratesBody),
      });
      ratesStatus = ratesRes.status;
      ratesJson = safeParse(await ratesRes.text());
    }
    const rates = ratesJson?.data || ratesJson?.rates || ratesJson || [];

    if (isDebug) {
      res.status(200).json({
        sent: { listUrl, ratesBody },
        hotelsStatus: listRes.status,
        hotelsCount: hotels.length,
        ratesStatus,
        ratesCount: Array.isArray(rates) ? rates.length : 0,
        sampleHotel: hotels[0] || null,
        sampleRate: Array.isArray(rates) ? rates[0] || null : null,
      });
      return;
    }

    res.status(200).json({ hotels, rates });
  } catch (err) {
    res.status(502).json({ error: `Upstream hotel search failed: ${err.message}` });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

async function readBody(req) {
  const b = req.body;
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  if (typeof b === 'string') return safeParse(b) || {};
  if (Buffer.isBuffer(b)) return safeParse(b.toString('utf8')) || {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return {};
    return safeParse(Buffer.concat(chunks).toString('utf8')) || {};
  } catch {
    return {};
  }
}
