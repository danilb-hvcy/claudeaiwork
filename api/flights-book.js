/**
 * Serverless LiteAPI flight BOOK proxy (step 3 of 3: search → prebook → book).
 *
 * Takes the prebookId from prebook plus traveller/contact details and a payment
 * method, adds the secret key, and asks LiteAPI to issue the booking. On success
 * LiteAPI returns a booking reference / airline PNR.
 *
 * SANDBOX: with a sandbox key + a wallet/account payment method this creates a
 * TEST booking — no card charged, no real ticket. Swap LITEAPI_KEY for a funded
 * production key (and use a real payment method) to issue real tickets.
 *
 * GET  → browser debug: auto runs search → prebook → book from one clean URL,
 *        so the book payload can be verified without pasting big tokens.
 * POST → normal path used by checkout (raw upstream passthrough).
 */

const BOOK_URL = process.env.LITEAPI_BOOK_URL || 'https://book.liteapi.travel/v3.0/flights/book';
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
  let { prebookId, holder, passengers, contact } = params;
  const paymentMethod = params.paymentMethod || 'ACC_CREDIT_CARD';

  // Debug convenience: with no prebookId, run the whole chain (search → prebook)
  // to get a fresh one, so book can be tested from a single URL.
  let chain = null;
  if (!prebookId && isDebug) {
    const parties = buildParties();
    const offer = await fetchFirstOffer(key, params);
    const pre = await runPrebook(key, offer.offerId, parties);
    prebookId = pre.prebookId;
    contact = parties.contact;
    passengers = parties.passengers;
    chain = { offer, prebookStatus: pre.status, prebookId, prebookError: pre.error };
    if (!prebookId) {
      res.status(200).json({ note: 'Could not obtain a prebookId — see chain.', chain });
      return;
    }
  }

  if (!prebookId) {
    res.status(400).json({ error: "Missing 'prebookId' (from the prebook step).", received: params });
    return;
  }

  const c = contact || {};
  const liteApiBody = {
    prebookId,
    holder: {
      firstName: holder?.firstName || c.firstName || passengers?.[0]?.firstName || '',
      lastName: holder?.lastName || c.lastName || passengers?.[0]?.lastName || '',
      email: holder?.email || c.email || '',
      phoneNumber: holder?.phoneNumber || c.phoneNumber || '',
      phoneCountryCode: holder?.phoneCountryCode || c.phoneCountryCode || '',
    },
    payment: { method: paymentMethod },
  };

  try {
    const upstream = await fetch(BOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-API-Key': key },
      body: JSON.stringify(liteApiBody),
    });
    const text = await upstream.text();

    if (isDebug) {
      res.status(200).json({
        url: BOOK_URL,
        chain,
        sentToLiteApi: liteApiBody,
        upstreamStatus: upstream.status,
        upstreamContentType: upstream.headers.get('content-type') || null,
        upstreamBodyLength: text.length,
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

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

/** Realistic dummy contact + passenger that passes LiteAPI prebook validation. */
function buildParties() {
  const contact = {
    title: 'MR', firstName: 'Jordan', lastName: 'Rivera', email: 'jordan.rivera@example.com',
    phoneNumber: '2015550123', phoneCountryCode: '1',
  };
  const passengers = [{
    title: 'MR', firstName: 'Jordan', lastName: 'Rivera', birthday: '1990-01-01',
    gender: 'M', nationality: 'US', type: 'ADULT', passengerId: 1,
    documentType: 'passport', documentNumber: 'X1234567', documentIssueCountry: 'US',
    documentExpiry: '2032-01-01', documentNationality: 'US',
  }];
  return { contact, passengers };
}

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
    return { searchStatus: r.status, searchedFor: { origin, destination, departureDate }, offerId: journeys[0]?.cheapestOffer?.offerId || null };
  } catch (err) {
    return { searchStatus: 'error', error: err.message, offerId: null };
  }
}

async function runPrebook(key, offerId, parties) {
  if (!offerId) return { status: 'no-offer', prebookId: null };
  try {
    const r = await fetch(PREBOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-API-Key': key },
      body: JSON.stringify({ offerId, usePaymentSdk: false, ...parties }),
    });
    const json = safeParse(await r.text());
    const rec = Array.isArray(json?.data) ? json.data[0] : json?.data || json;
    return { status: r.status, prebookId: rec?.prebookId || null, error: json?.error || null };
  } catch (err) {
    return { status: 'error', prebookId: null, error: err.message };
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
