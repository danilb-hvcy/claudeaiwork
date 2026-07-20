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

  // Read the body robustly. Vercel usually pre-parses JSON into req.body, but
  // depending on runtime/config it can arrive as a string, a Buffer, or not at
  // all — in which case we must read the raw stream ourselves. If we don't, all
  // fields (including legs[0].date) go out undefined and LiteAPI rejects with
  // "field 'Date' is required" (code 41002).
  const params = await readBody(req);
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

  // Fail fast with a clear message rather than sending a broken request upstream.
  if (!departureDate) {
    res.status(400).json({
      error: "Missing 'departureDate' (YYYY-MM-DD).",
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

/**
 * Return the request body as a plain object, whatever form it arrives in:
 * an already-parsed object, a JSON string, a Buffer, or an unconsumed stream.
 */
async function readBody(req) {
  const b = req.body;
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  if (typeof b === 'string') return safeParse(b);
  if (Buffer.isBuffer(b)) return safeParse(b.toString('utf8'));
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return {};
    return safeParse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}
