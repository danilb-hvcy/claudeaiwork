'use strict';

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { run, get, all, init } = require('./db');
const aircraft = require('./aircraft');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// ----- Static: app + vendored libraries (offline-friendly) -----
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  '/vendor/react.js',
  express.static(path.join(__dirname, 'node_modules/react/umd/react.development.js'))
);
app.use(
  '/vendor/react-dom.js',
  express.static(
    path.join(__dirname, 'node_modules/react-dom/umd/react-dom.development.js')
  )
);
app.use(
  '/vendor/babel.js',
  express.static(path.join(__dirname, 'node_modules/@babel/standalone/babel.min.js'))
);
app.use(
  '/vendor/jsbarcode.js',
  express.static(
    path.join(__dirname, 'node_modules/jsbarcode/dist/JsBarcode.all.min.js')
  )
);

// -------------------- Helpers --------------------
const AIRLINE_CODE = 'TK';
const SEAT_PRICE = { Economy: 200, Business: 500 };
const EXTRA_BAG_CHARGE = 50;

function now() {
  return new Date().toISOString();
}

// 6-character alphanumeric booking reference (excludes ambiguous chars).
function makeBookingRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) ref += chars[bytes[i] % chars.length];
  return ref;
}

function julianDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  const day = Math.floor(diff / 86400000);
  return String(day).padStart(3, '0');
}

function cabinLetter(cabinClass) {
  return cabinClass === 'Business' ? 'J' : 'Y';
}

function pad(str, len) {
  return String(str == null ? '' : str)
    .slice(0, len)
    .padEnd(len, ' ');
}

function padNum(num, len) {
  return String(num == null ? '' : num)
    .replace(/\D/g, '')
    .slice(-len)
    .padStart(len, '0');
}

// Seat "12A" -> "012A" (3-digit row + letter). Fixed width 4.
function encodeSeat(seat) {
  if (!seat) return '0000';
  const m = String(seat).match(/^(\d+)([A-Z])$/i);
  if (!m) return pad(seat, 4);
  return padNum(m[1], 3) + m[2].toUpperCase();
}

/**
 * Build a fixed-width, IATA-style BCBP string that we can also parse back.
 * Layout (offsets):
 *   0  M1
 *   2  name(20)
 *  22  E (electronic ticket)
 *  23  pnr(7)
 *  30  origin(3)
 *  33  destination(3)
 *  36  carrier(2)
 *  38  flight(4)
 *  42  julian(3)
 *  45  cabin(1)
 *  46  seat(4)
 *  50  sequence(4)        => total 54
 */
function buildBCBP(d) {
  const name = `${d.lastName}/${d.firstName}`.toUpperCase();
  return (
    'M1' +
    pad(name, 20) +
    'E' +
    pad(d.bookingReference, 7) +
    pad(d.departure, 3).toUpperCase() +
    pad(d.arrival, 3).toUpperCase() +
    pad(AIRLINE_CODE, 2) +
    padNum(d.flightNumber, 4) +
    julianDate(d.departureTime) +
    cabinLetter(d.cabinClass) +
    encodeSeat(d.seatAssigned) +
    padNum(d.sequence || 0, 4)
  );
}

function parseBCBP(raw) {
  const s = String(raw || '');
  if (s.length < 54 || s.slice(0, 1).toUpperCase() !== 'M') return null;
  try {
    const name = s.slice(2, 22).trim();
    const [lastName, firstName] = name.split('/');
    return {
      name,
      lastName: lastName || '',
      firstName: firstName || '',
      bookingReference: s.slice(23, 30).trim(),
      departure: s.slice(30, 33).trim(),
      arrival: s.slice(33, 36).trim(),
      carrier: s.slice(36, 38).trim(),
      flightNumber: s.slice(38, 42).replace(/^0+/, ''),
      julian: s.slice(42, 45).trim(),
      cabin: s.slice(45, 46).trim(),
      seat: s.slice(46, 50).replace(/^0+/, '').trim(),
      sequence: parseInt(s.slice(50, 54), 10) || 0,
    };
  } catch (e) {
    return null;
  }
}

// -------------------- Auth --------------------
const CREDENTIALS = { username: 'danilb', password: '20100603' };

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = (username || '').trim();
  if (
    (user === CREDENTIALS.username || user === 'danilb@heyvacay.co') &&
    password === CREDENTIALS.password
  ) {
    return res.json({ ok: true, username: CREDENTIALS.username });
  }
  return res.status(401).json({ ok: false, error: 'Invalid credentials' });
});

// -------------------- Aircraft / seat map --------------------
app.get('/api/aircraft', (req, res) => {
  const out = {};
  for (const code of Object.keys(aircraft.AIRCRAFT)) {
    out[code] = {
      code,
      name: aircraft.AIRCRAFT[code].name,
      capacity: aircraft.getCapacity(code),
      seatMap: aircraft.getSeatMap(code),
    };
  }
  res.json(out);
});

// -------------------- Flights --------------------
app.get('/api/flights', async (req, res) => {
  try {
    const flights = await all('SELECT * FROM flights ORDER BY departureTime ASC');
    const counts = await all(
      'SELECT flightId, COUNT(*) AS booked FROM bookings GROUP BY flightId'
    );
    const map = {};
    counts.forEach((c) => (map[c.flightId] = c.booked));
    const enriched = flights.map((f) => ({
      ...f,
      capacity: aircraft.getCapacity(f.aircraftType),
      booked: map[f.id] || 0,
    }));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/flights/:id', async (req, res) => {
  try {
    const flight = await get('SELECT * FROM flights WHERE id=?', [req.params.id]);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });
    const bookings = await all(
      `SELECT b.*, p.firstName, p.lastName, p.email, p.phone,
              p.passportNumber, p.nationality, p.dateOfBirth,
              c.checkedInTime, c.sequence AS checkinSequence,
              bo.boardedTime
       FROM bookings b
       JOIN passengers p ON p.id = b.passengerId
       LEFT JOIN checkin c ON c.bookingId = b.id
       LEFT JOIN boarding bo ON bo.bookingId = b.id
       WHERE b.flightId = ?
       ORDER BY b.cabinClass, b.seatAssigned`,
      [req.params.id]
    );
    res.json({
      flight: {
        ...flight,
        capacity: aircraft.getCapacity(flight.aircraftType),
        booked: bookings.length,
      },
      seatMap: aircraft.getSeatMap(flight.aircraftType),
      bookings,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/flights', async (req, res) => {
  try {
    const {
      flightNumber,
      departure,
      arrival,
      departureTime,
      arrivalTime,
      aircraftType,
    } = req.body || {};
    if (
      !flightNumber ||
      !departure ||
      !arrival ||
      !departureTime ||
      !arrivalTime ||
      !aircraftType
    ) {
      return res.status(400).json({ error: 'All flight fields are required' });
    }
    if (!aircraft.AIRCRAFT[aircraftType]) {
      return res.status(400).json({ error: 'Unknown aircraft type' });
    }
    const result = await run(
      `INSERT INTO flights (flightNumber, departure, arrival, departureTime, arrivalTime, aircraftType, status, createdAt)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        flightNumber.toUpperCase(),
        departure.toUpperCase(),
        arrival.toUpperCase(),
        departureTime,
        arrivalTime,
        aircraftType,
        'Scheduled',
        now(),
      ]
    );
    const flight = await get('SELECT * FROM flights WHERE id=?', [result.lastID]);
    res.json(flight);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/flights/:id', async (req, res) => {
  try {
    const existing = await get('SELECT * FROM flights WHERE id=?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Flight not found' });
    const f = { ...existing, ...req.body };
    await run(
      `UPDATE flights SET flightNumber=?, departure=?, arrival=?, departureTime=?, arrivalTime=?, aircraftType=?, status=? WHERE id=?`,
      [
        String(f.flightNumber).toUpperCase(),
        String(f.departure).toUpperCase(),
        String(f.arrival).toUpperCase(),
        f.departureTime,
        f.arrivalTime,
        f.aircraftType,
        f.status,
        req.params.id,
      ]
    );
    const updated = await get('SELECT * FROM flights WHERE id=?', [req.params.id]);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/flights/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const bookings = await all('SELECT id FROM bookings WHERE flightId=?', [id]);
    const bookingIds = bookings.map((b) => b.id);
    for (const bid of bookingIds) {
      await run('DELETE FROM baggage WHERE bookingId=?', [bid]);
      await run('DELETE FROM checkin WHERE bookingId=?', [bid]);
      await run('DELETE FROM boarding WHERE bookingId=?', [bid]);
    }
    await run('DELETE FROM bookings WHERE flightId=?', [id]);
    await run('DELETE FROM passengers WHERE flightId=?', [id]);
    await run('DELETE FROM flights WHERE id=?', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------------- Bookings (Sales) --------------------
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      flightId,
      firstName,
      lastName,
      email,
      phone,
      cabinClass,
      seatAssigned,
      paymentMethod,
      passportNumber,
      dateOfBirth,
      nationality,
    } = req.body || {};

    if (!flightId || !firstName || !lastName || !cabinClass || !seatAssigned) {
      return res
        .status(400)
        .json({ error: 'Flight, passenger name, cabin class and seat are required' });
    }
    const flight = await get('SELECT * FROM flights WHERE id=?', [flightId]);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });

    // Validate seat belongs to this aircraft and matches cabin.
    const seatDef = aircraft
      .getAllSeats(flight.aircraftType)
      .find((s) => s.id === seatAssigned);
    if (!seatDef) return res.status(400).json({ error: 'Invalid seat for aircraft' });
    if (seatDef.cabin !== cabinClass) {
      return res
        .status(400)
        .json({ error: `Seat ${seatAssigned} is not in ${cabinClass} cabin` });
    }

    // Prevent double-booking the same seat (overbooking protection).
    const taken = await get(
      'SELECT id FROM bookings WHERE flightId=? AND seatAssigned=?',
      [flightId, seatAssigned]
    );
    if (taken) return res.status(409).json({ error: `Seat ${seatAssigned} already booked` });

    const passenger = await run(
      `INSERT INTO passengers (flightId, firstName, lastName, email, phone, passportNumber, dateOfBirth, nationality, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        flightId,
        firstName,
        lastName,
        email || '',
        phone || '',
        passportNumber || '',
        dateOfBirth || '',
        nationality || '',
        now(),
      ]
    );

    const amount = SEAT_PRICE[cabinClass] || 0;

    // Unique booking reference (retry on the rare collision).
    let ref;
    for (let i = 0; i < 10; i++) {
      ref = makeBookingRef();
      const exists = await get('SELECT id FROM bookings WHERE bookingReference=?', [ref]);
      if (!exists) break;
    }

    const booking = await run(
      `INSERT INTO bookings (passengerId, flightId, seatAssigned, cabinClass, bookingReference, paymentMethod, paymentAmount, paymentStatus, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        passenger.lastID,
        flightId,
        seatAssigned,
        cabinClass,
        ref,
        paymentMethod || 'cash',
        amount,
        'paid',
        now(),
      ]
    );

    const full = await getBookingFull(booking.lastID);
    res.json(full);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function getBookingFull(bookingId) {
  const row = await get(
    `SELECT b.*, p.firstName, p.lastName, p.email, p.phone, p.passportNumber,
            p.dateOfBirth, p.nationality,
            f.flightNumber, f.departure, f.arrival, f.departureTime, f.arrivalTime,
            f.aircraftType, f.status AS flightStatus,
            c.checkedInTime, c.sequence AS sequence, c.apisData, c.bagCount AS checkinBagCount,
            c.boardingPassPrinted,
            bo.boardedTime, bo.sequence AS boardingSequence
     FROM bookings b
     JOIN passengers p ON p.id = b.passengerId
     JOIN flights f ON f.id = b.flightId
     LEFT JOIN checkin c ON c.bookingId = b.id
     LEFT JOIN boarding bo ON bo.bookingId = b.id
     WHERE b.id = ?`,
    [bookingId]
  );
  if (!row) return null;
  row.isExitSeat = aircraft.isExitSeat(row.aircraftType, row.seatAssigned);
  row.bcbp = buildBCBP(row);
  const bags = await all('SELECT * FROM baggage WHERE bookingId=? ORDER BY id', [
    bookingId,
  ]);
  row.baggage = bags;
  return row;
}

app.get('/api/bookings', async (req, res) => {
  try {
    const { flightId } = req.query;
    const where = flightId ? 'WHERE b.flightId=?' : '';
    const params = flightId ? [flightId] : [];
    const rows = await all(
      `SELECT b.*, p.firstName, p.lastName, f.flightNumber, f.departure, f.arrival
       FROM bookings b
       JOIN passengers p ON p.id=b.passengerId
       JOIN flights f ON f.id=b.flightId ${where}
       ORDER BY b.createdAt DESC`,
      params
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Lookup by PNR (6-char) or by scanned BCBP barcode string.
app.get('/api/lookup', async (req, res) => {
  try {
    const raw = String(req.query.code || '').trim();
    if (!raw) return res.status(400).json({ error: 'No lookup code provided' });
    let ref = raw.toUpperCase();
    const parsed = parseBCBP(raw);
    if (parsed && parsed.bookingReference) ref = parsed.bookingReference.toUpperCase();
    const booking = await get('SELECT id FROM bookings WHERE bookingReference=?', [ref]);
    if (!booking) return res.status(404).json({ error: `No booking for "${ref}"` });
    const full = await getBookingFull(booking.id);
    res.json(full);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------------- Baggage (Check-in) --------------------
app.post('/api/baggage', async (req, res) => {
  try {
    const { bookingId, weight, dimensions, charge } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });
    const booking = await get('SELECT * FROM bookings WHERE id=?', [bookingId]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Sequential bag tag number, global across the system.
    const last = await get('SELECT COUNT(*) AS n FROM baggage');
    const tagSeq = (last.n || 0) + 1;
    const bagTagNumber = AIRLINE_CODE + String(tagSeq).padStart(6, '0');
    const extraCharge = charge ? EXTRA_BAG_CHARGE : 0;

    const result = await run(
      `INSERT INTO baggage (bookingId, bagCount, weight, dimensions, extraCharge, bagTagNumber, createdAt)
       VALUES (?,?,?,?,?,?,?)`,
      [bookingId, 1, weight || null, dimensions || '', extraCharge, bagTagNumber, now()]
    );
    const bag = await get('SELECT * FROM baggage WHERE id=?', [result.lastID]);
    res.json(bag);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/baggage/:id', async (req, res) => {
  try {
    await run('DELETE FROM baggage WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------------- Check-in --------------------
app.post('/api/checkin', async (req, res) => {
  try {
    const { bookingId, apisData } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });
    const booking = await get('SELECT * FROM bookings WHERE id=?', [bookingId]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Update passenger APIS fields when provided.
    if (apisData) {
      await run(
        `UPDATE passengers SET passportNumber=?, dateOfBirth=?, nationality=? WHERE id=?`,
        [
          apisData.passportNumber || '',
          apisData.dateOfBirth || '',
          apisData.nationality || '',
          booking.passengerId,
        ]
      );
    }

    const bags = await get('SELECT COUNT(*) AS n FROM baggage WHERE bookingId=?', [
      bookingId,
    ]);
    const apisSf =
      'SF' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);

    const existing = await get('SELECT * FROM checkin WHERE bookingId=?', [bookingId]);
    let sequence;
    if (existing) {
      sequence = existing.sequence;
      await run(
        `UPDATE checkin SET checkedInTime=?, bagCount=?, apisData=?, apisSfNumber=?, boardingPassPrinted=1 WHERE bookingId=?`,
        [now(), bags.n || 0, JSON.stringify(apisData || {}), apisSf, bookingId]
      );
    } else {
      // Sequence = check-in order on this flight.
      const seqRow = await get(
        `SELECT COUNT(*) AS n FROM checkin c JOIN bookings b ON b.id=c.bookingId WHERE b.flightId=?`,
        [booking.flightId]
      );
      sequence = (seqRow.n || 0) + 1;
      await run(
        `INSERT INTO checkin (bookingId, checkedInTime, bagCount, apisData, apisSfNumber, boardingPassPrinted, sequence, createdAt)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          bookingId,
          now(),
          bags.n || 0,
          JSON.stringify(apisData || {}),
          apisSf,
          1,
          sequence,
          now(),
        ]
      );
    }

    const full = await getBookingFull(bookingId);
    res.json(full);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------------- Boarding --------------------
app.post('/api/boarding/scan', async (req, res) => {
  try {
    const raw = String(req.body.code || '').trim();
    if (!raw) return res.status(400).json({ error: 'No barcode scanned', status: 'error' });

    let ref = raw.toUpperCase();
    const parsed = parseBCBP(raw);
    if (parsed && parsed.bookingReference) ref = parsed.bookingReference.toUpperCase();

    const bookingRow = await get('SELECT id FROM bookings WHERE bookingReference=?', [ref]);
    if (!bookingRow) {
      return res.json({ status: 'error', reason: `Unknown boarding pass (${ref})` });
    }
    const booking = await getBookingFull(bookingRow.id);

    // Validation chain.
    if (!booking.checkedInTime) {
      return res.json({
        status: 'error',
        reason: 'Passenger is NOT checked in',
        booking,
      });
    }
    // If a specific flight context was provided, ensure it matches.
    if (req.body.flightId && Number(req.body.flightId) !== Number(booking.flightId)) {
      return res.json({
        status: 'error',
        reason: `Wrong flight (pass is for ${booking.flightNumber})`,
        booking,
      });
    }
    const already = await get('SELECT * FROM boarding WHERE bookingId=?', [booking.id]);
    if (already) {
      return res.json({
        status: 'error',
        reason: 'Already boarded',
        booking,
      });
    }

    // Board: sequence = boarding order on this flight.
    const seqRow = await get(
      'SELECT COUNT(*) AS n FROM boarding WHERE flightId=?',
      [booking.flightId]
    );
    const sequence = (seqRow.n || 0) + 1;
    await run(
      `INSERT INTO boarding (bookingId, flightId, boardedTime, sequence) VALUES (?,?,?,?)`,
      [booking.id, booking.flightId, now(), sequence]
    );
    booking.boardingSequence = sequence;
    booking.boardedTime = now();

    const status = booking.isExitSeat ? 'exit' : 'ok';
    return res.json({ status, booking, sequence });
  } catch (e) {
    res.status(500).json({ error: e.message, status: 'error' });
  }
});

app.get('/api/boarding', async (req, res) => {
  try {
    const { flightId } = req.query;
    const where = flightId ? 'WHERE bo.flightId=?' : '';
    const params = flightId ? [flightId] : [];
    const rows = await all(
      `SELECT bo.*, b.bookingReference, b.seatAssigned, b.cabinClass,
              p.firstName, p.lastName, f.flightNumber, f.aircraftType
       FROM boarding bo
       JOIN bookings b ON b.id=bo.bookingId
       JOIN passengers p ON p.id=b.passengerId
       JOIN flights f ON f.id=bo.flightId ${where}
       ORDER BY bo.sequence ASC`,
      params
    );
    rows.forEach((r) => (r.isExitSeat = aircraft.isExitSeat(r.aircraftType, r.seatAssigned)));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------------- SPA fallback --------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------- Seed + start --------------------
async function seed() {
  const sampleFlights = [
    {
      flightNumber: 'TK1',
      departure: 'IST',
      arrival: 'JFK',
      aircraftType: 'A359',
      depOffsetH: 3,
      durH: 11,
    },
    {
      flightNumber: 'TK79',
      departure: 'IST',
      arrival: 'LAX',
      aircraftType: 'A332',
      depOffsetH: 5,
      durH: 14,
    },
    {
      flightNumber: 'TK1985',
      departure: 'IST',
      arrival: 'LHR',
      aircraftType: 'A320',
      depOffsetH: 2,
      durH: 4,
    },
  ];

  for (const f of sampleFlights) {
    const dep = new Date(Date.now() + f.depOffsetH * 3600000);
    const arr = new Date(dep.getTime() + f.durH * 3600000);
    await run(
      `INSERT INTO flights (flightNumber, departure, arrival, departureTime, arrivalTime, aircraftType, status, createdAt)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        f.flightNumber,
        f.departure,
        f.arrival,
        dep.toISOString().slice(0, 16),
        arr.toISOString().slice(0, 16),
        f.aircraftType,
        'Scheduled',
        now(),
      ]
    );
  }

  // A sample passenger + booking on the first flight for quick testing.
  const first = await get('SELECT * FROM flights ORDER BY id ASC LIMIT 1');
  if (first) {
    const p = await run(
      `INSERT INTO passengers (flightId, firstName, lastName, email, phone, passportNumber, dateOfBirth, nationality, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        first.id,
        'John',
        'Doe',
        'john.doe@example.com',
        '+1 555 0100',
        'U12345678',
        '1985-06-15',
        'USA',
        now(),
      ]
    );
    await run(
      `INSERT INTO bookings (passengerId, flightId, seatAssigned, cabinClass, bookingReference, paymentMethod, paymentAmount, paymentStatus, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [p.lastID, first.id, '12A', 'Economy', 'TKDEMO', 'credit_card', 200, 'paid', now()]
    );
  }
}

async function main() {
  await init();
  await seed();
  app.listen(PORT, () => {
    console.log(`TKPMS backend listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error('Fatal startup error:', e);
  process.exit(1);
});
