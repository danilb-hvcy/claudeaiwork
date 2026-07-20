/**
 * Debug helper: list bookings on the LiteAPI account, to check whether the
 * flight book calls actually created anything (the book endpoint returns an
 * empty 200, so this is how we confirm success and learn the reference fields).
 *
 * GET /api/list-bookings  → raw LiteAPI bookings list.
 * Override the endpoint with LITEAPI_BOOKINGS_URL if needed.
 */

const BOOKINGS_URL = process.env.LITEAPI_BOOKINGS_URL || 'https://book.liteapi.travel/v3.0/bookings';

export default async function handler(req, res) {
  const key = process.env.LITEAPI_KEY;
  if (!key) {
    res.status(503).json({ error: 'LITEAPI_KEY is not set on the server.' });
    return;
  }

  try {
    const upstream = await fetch(BOOKINGS_URL, {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-API-Key': key },
    });
    const text = await upstream.text();
    res.status(200).json({
      url: BOOKINGS_URL,
      upstreamStatus: upstream.status,
      upstreamContentType: upstream.headers.get('content-type') || null,
      upstreamBodyLength: text.length,
      upstreamResponse: safeParse(text) || text,
    });
  } catch (err) {
    res.status(502).json({ error: `Upstream bookings list failed: ${err.message}` });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
