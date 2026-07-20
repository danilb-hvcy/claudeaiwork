/**
 * Serverless LiteAPI flight PREBOOK proxy (step 2 of 3: search → prebook → book).
 *
 * Prebook locks the chosen offer's price and returns a prebookId + a
 * transactionId used by the book step. The browser POSTs the selected fare's
 * offerId here; this function adds the secret key and forwards to LiteAPI.
 *
 * GET  → browser debug (shows exactly what we send + LiteAPI's raw reply):
 *          /api/flights-prebook?offerId=XXXX
 * POST → normal path used by the checkout flow (raw upstream passthrough).
 *
 * The endpoint host can be overridden with LITEAPI_PREBOOK_URL if LiteAPI moves
 * it; the default matches LiteAPI's booking host + the flights path.
 */

const PREBOOK_URL = process.env.LITEAPI_PREBOOK_URL || 'https://book.liteapi.travel/v3.0/flights/prebook';

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
  const { offerId } = params;

  if (!offerId) {
    res.status(400).json({
      error: "Missing 'offerId'.",
      hint: isDebug ? 'Add ?offerId=... to the URL (grab one from /api/flights debug).' : undefined,
      received: params,
    });
    return;
  }

  // usePaymentSdk:false → LiteAPI returns a transactionId we can pass straight
  // to book (no card tokenization needed for sandbox test bookings).
  const liteApiBody = { offerId, usePaymentSdk: false };

  try {
    const upstream = await fetch(PREBOOK_URL, {
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
      res.status(200).json({
        url: PREBOOK_URL,
        sentToLiteApi: liteApiBody,
        upstreamStatus: upstream.status,
        upstreamResponse: safeParse(text) || text,
      });
      return;
    }

    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text || '{}');
  } catch (err) {
    res.status(502).json({ error: `Upstream prebook failed: ${err.message}` });
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
