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
const RATES_URL = 'https://api.liteapi.travel/v3.0/flights/rates';

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
  let { offerId } = params;

  // Debug convenience: with no offerId, run a live search and grab a fresh one
  // so the whole prebook can be tested from a single clean URL (offerIds are
  // huge and get mangled if pasted into a browser address bar).
  let autoOffer = null;
  if (!offerId && isDebug) {
    autoOffer = await fetchFirstOffer(key, params);
    offerId = autoOffer.offerId;
  }

  if (!offerId) {
    res.status(400).json({
      error: "Missing 'offerId'.",
      hint: isDebug ? 'Just open this URL bare to auto-fetch one, or add ?departureDate=YYYY-MM-DD.' : undefined,
      autoOffer,
      received: params,
    });
    return;
  }

  // LiteAPI flight prebook wants traveller/contact details up front. The app
  // (POST) sends the real ones; the debug GET path synthesizes a full dummy set
  // so every remaining required field surfaces in as few round-trips as possible.
  const parties = buildParties(params, isDebug);

  // usePaymentSdk:false → LiteAPI returns a transactionId we can pass straight
  // to book (no card tokenization needed for sandbox test bookings).
  const liteApiBody = { offerId, usePaymentSdk: false, ...parties };

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
        autoOffer,
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

/**
 * Build the contact + passengers block LiteAPI flight prebook requires. The app
 * supplies real values via POST; the debug GET path uses a complete dummy set
 * (nested + flat field variants) so any remaining required field is revealed.
 */
function buildParties(params, isDebug) {
  if (!isDebug) {
    return {
      contact: params.contact || {},
      passengers: Array.isArray(params.passengers) ? params.passengers : [],
    };
  }
  const contact = { title: 'MR', firstName: 'Test', lastName: 'Traveller', email: 'test@example.com', phoneNumber: '+15551234567' };
  const passengers = [{
    title: 'MR',
    firstName: 'Test',
    lastName: 'Traveller',
    birthday: '1990-01-01',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    nationality: 'US',
    type: 'ADULT',
    passengerId: 1,
    // LiteAPI wants document fields flat on the passenger (documentType, ...).
    documentType: 'passport',
    documentNumber: 'X1234567',
    documentIssuingCountry: 'US',
    documentExpiryDate: '2032-01-01',
    documentNationality: 'US',
  }];
  return { contact, passengers };
}

/** YYYY-MM-DD roughly a month out — a safe default future date for debugging. */
function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

/**
 * Run a live flight search and return the first journey's cheapest offerId.
 * Used only by the debug GET path so prebook can be tested from one URL.
 */
async function fetchFirstOffer(key, params) {
  const origin = params.origin || 'SYD';
  const destination = params.destination || 'LAX';
  const departureDate = params.departureDate || defaultDate();
  const body = {
    legs: [{ origin, destination, date: departureDate, direction: 'OUTBOUND' }],
    adults: 1, children: 0, infants: 0,
    cabinClass: String(params.cabin || 'ECONOMY').toUpperCase(),
    currency: params.currency || 'USD',
  };
  try {
    const r = await fetch(RATES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-API-Key': key },
      body: JSON.stringify(body),
    });
    const json = safeParse(await r.text());
    const journeys = (json?.data || []).flatMap((d) => d.journeys || []);
    const first = journeys[0]?.cheapestOffer;
    return {
      searchStatus: r.status,
      searchedFor: { origin, destination, departureDate },
      journeysFound: journeys.length,
      offerId: first?.offerId || null,
      offerPrice: first?.pricing?.display?.total ?? null,
    };
  } catch (err) {
    return { searchStatus: 'error', error: err.message, offerId: null };
  }
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
