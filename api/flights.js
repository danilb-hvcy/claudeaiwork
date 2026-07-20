/**
 * Serverless flight-search proxy for LiteAPI.
 *
 * WHY THIS EXISTS
 * ---------------
 * The browser must never see the LiteAPI key (anything shipped to the client is
 * public), and browsers can't call LiteAPI directly. This function is the
 * middleman: the app POSTs clean search params to `/api/flights`, this function
 * adds the secret key and forwards to LiteAPI, then returns the result.
 *
 * DEPLOY (Vercel — zero config)
 * -----------------------------
 * 1. Deploy this repo to Vercel (it auto-detects Vite + the `api/` folder).
 * 2. Project → Settings → Environment Variables → add:
 *        LITEAPI_KEY = <your LiteAPI private or sandbox key>
 * 3. Redeploy. The flight UI now shows live prices — nothing else to configure.
 *
 * Netlify: rename/move this to `netlify/functions/flights.js` and export a
 * `handler(event)` instead; the LiteAPI call below is identical.
 *
 * Runs on Node 18+ (global `fetch`). No dependencies.
 */

const LITEAPI_FLIGHTS_URL = 'https://api.liteapi.travel/v3.0/flights/rates';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const key = process.env.LITEAPI_KEY;
  if (!key) {
    // No key configured → tell the client so it can fall back to demo data.
    res.status(503).json({ error: 'LITEAPI_KEY is not set on the server.', demo: true });
    return;
  }

  // Vercel parses JSON bodies automatically; guard in case it arrives as a string.
  const params = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const {
    origin = 'SYD',
    destination = 'LAX',
    departureDate,
    returnDate,
    adults = 1,
    children = 0,
    infants = 0,
    cabin = 'ECONOMY',
    currency = 'USD',
  } = params;

  // LiteAPI /flights/rates is legs-based: one leg for one-way, two for round-trip.
  const legs = [{ origin, destination, date: departureDate, direction: 'OUTBOUND' }];
  if (returnDate) {
    legs.push({ origin: destination, destination: origin, date: returnDate, direction: 'INBOUND' });
  }

  const passengers = [
    ...Array(Math.max(1, adults)).fill({ type: 'ADULT' }),
    ...Array(Math.max(0, children)).fill({ type: 'CHILD' }),
    ...Array(Math.max(0, infants)).fill({ type: 'INFANT' }),
  ];

  const liteApiBody = {
    legs,
    passengers,
    cabinClass: String(cabin || 'ECONOMY').toUpperCase(),
    currency,
  };

  try {
    const upstream = await fetch(LITEAPI_FLIGHTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-Key': key,
      },
      body: JSON.stringify(liteApiBody),
    });

    const text = await upstream.text();
    // Pass the upstream status + body straight through so the client can map it.
    res
      .status(upstream.status)
      .setHeader('Content-Type', 'application/json')
      .send(text || '{}');
  } catch (err) {
    res.status(502).json({ error: `Upstream request failed: ${err.message}` });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
