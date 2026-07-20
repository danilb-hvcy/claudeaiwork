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
  // GET  → browser-friendly debug: shows what we send AND the raw LiteAPI reply.
  //        e.g. /api/flights?origin=SYD&destination=LAX&departureDate=2026-08-15
  // POST → normal path used by the app (raw upstream status + body passthrough).
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

  // Read params from the query string (GET) or the request body (POST). The
  // body read is robust: Vercel usually pre-parses req.body, but it can arrive
  // as a string, Buffer, or unconsumed stream — if we don't handle that, fields
  // like legs[0].date go out undefined and LiteAPI rejects with 41002.
  const params = isDebug ? (req.query || {}) : await readBody(req);
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

  if (!departureDate) {
    res.status(400).json({
      error: "Missing 'departureDate' (YYYY-MM-DD).",
      hint: isDebug ? 'Add ?departureDate=2026-08-15 to the URL.' : undefined,
      received: params,
    });
    return;
  }

  // LiteAPI /flights/rates is legs-based: one leg for one-way, two for round-trip.
  const legs = [{ origin, destination, date: departureDate, direction: 'OUTBOUND' }];
  if (returnDate) {
    legs.push({ origin: destination, destination: origin, date: returnDate, direction: 'INBOUND' });
  }

  const passengers = [
    ...Array(Math.max(1, Number(adults) || 1)).fill({ type: 'ADULT' }),
    ...Array(Math.max(0, Number(children) || 0)).fill({ type: 'CHILD' }),
    ...Array(Math.max(0, Number(infants) || 0)).fill({ type: 'INFANT' }),
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

    if (isDebug) {
      // Show everything, so the exact request + response are visible in-browser.
      res.status(200).json({
        sentToLiteApi: liteApiBody,
        upstreamStatus: upstream.status,
        upstreamResponse: safeParse(text) || text,
      });
      return;
    }

    // App path: pass the upstream status + body straight through for the client.
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text || '{}');
  } catch (err) {
    res.status(502).json({ error: `Upstream request failed: ${err.message}` });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

/**
 * Return the request body as a plain object, whatever form it arrives in:
 * an already-parsed object, a JSON string, a Buffer, or an unconsumed stream.
 */
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
