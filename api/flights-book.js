/**
 * Serverless LiteAPI flight BOOK proxy (step 3 of 3: search → prebook → book).
 *
 * Takes the prebookId + transactionId from prebook plus the traveller/contact
 * details, adds the secret key, and asks LiteAPI to issue the booking. On
 * success LiteAPI returns a booking reference / PNR.
 *
 * SANDBOX: with a sandbox key this creates a test booking — no card is charged
 * and no real ticket is issued. Swap LITEAPI_KEY for a funded production key to
 * issue real tickets (and integrate LiteAPI's Payment SDK for real card capture).
 *
 * GET  → browser debug (shows what we send + LiteAPI's raw reply).
 * POST → normal path used by checkout (raw upstream passthrough).
 */

const BOOK_URL = process.env.LITEAPI_BOOK_URL || 'https://book.liteapi.travel/v3.0/flights/book';

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
    prebookId,
    transactionId,
    holder = {},
    passengers = [],
  } = params;

  if (!prebookId) {
    res.status(400).json({ error: "Missing 'prebookId' (from the prebook step).", received: params });
    return;
  }

  // Payment via the transactionId returned by prebook. For production real-money
  // bookings this is where LiteAPI's Payment SDK transaction id goes instead.
  const liteApiBody = {
    prebookId,
    holder: {
      firstName: holder.firstName || passengers[0]?.firstName || '',
      lastName: holder.lastName || passengers[0]?.lastName || '',
      email: holder.email || '',
      phone: holder.phone || '',
    },
    passengers: passengers.map((p, i) => ({
      title: p.title || 'MR',
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      dateOfBirth: p.dateOfBirth || '',
      gender: p.gender || '',
      nationality: p.nationality || '',
      type: p.type || 'ADULT',
      passengerId: i + 1,
      document: {
        type: 'PASSPORT',
        number: p.passportNumber || '',
        issuingCountry: p.nationality || '',
        expiryDate: p.passportExpiry || '',
      },
    })),
    payment: { method: 'TRANSACTION_ID', transactionId: transactionId || '' },
  };

  try {
    const upstream = await fetch(BOOK_URL, {
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
        url: BOOK_URL,
        sentToLiteApi: liteApiBody,
        upstreamStatus: upstream.status,
        upstreamResponse: safeParse(text) || text,
      });
      return;
    }

    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text || '{}');
  } catch (err) {
    res.status(502).json({ error: `Upstream book failed: ${err.message}` });
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
