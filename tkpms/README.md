# TKPMS — Turkish Passenger Management System

A complete airline operations platform: flight management, passenger booking,
check-in (baggage + APIS), and boarding with barcode scanning. Single-page
React frontend served by an Express + SQLite backend.

## Tech stack

- **Backend:** Express.js, SQLite3 (in-memory), body-parser, CORS
- **Frontend:** React 18 (single HTML file, in-browser Babel), JsBarcode, Web Audio API
- All frontend libraries are vendored from `node_modules` and served locally, so
  the app works fully offline (no CDN required).

## Run

```bash
cd tkpms
npm install
npm start
```

Then open <http://localhost:5000> and sign in:

- **Username:** `danilb`
- **Password:** `20100603`

The in-memory database is seeded on every start with three sample flights
(TK1 IST→JFK, TK79 IST→LAX, TK1985 IST→LHR) and one demo booking
(PNR **TKDEMO**, John Doe, seat 12A) for quick testing. Data resets on restart.

## Standalone version (no server, just double-click)

If you'd rather not run a backend, open **`standalone/tkpms-standalone.html`** directly
in a browser (double-click it). It's a single self-contained file with React, JsBarcode,
and all logic inlined — no install, no server, works offline from `file://`.

The only difference: there's no shared SQLite database, so data is stored in that
browser's `localStorage` instead. It persists across reloads but is local to that
machine/browser. A **Reset demo data** button (footer) restores the seeded sample.

Rebuild it after changing the app with:

```bash
cd tkpms
npm install
node build/build-standalone.js   # regenerates standalone/tkpms-standalone.html
```

> Opening `public/index.html` directly will *not* work — that file expects the
> Express backend to serve its libraries and API. Use the standalone file for
> double-click usage, or run the server (below) for the full version.

## Modes

1. **Operations** — create/edit/delete flights, view per-flight seat maps with
   live occupancy, capacity, and emergency-exit rows.
2. **Sales** — book a passenger onto a flight, pick a seat from the live grid
   (Economy $200 / Business $500), pay by card or cash, and print a boarding pass.
3. **Check-In** — look up a booking by scanned barcode or 6-char PNR, process
   baggage (sequential tags, $50 per extra bag, printable airline-style tags),
   capture APIS / Secure Flight data, and print an IATA boarding pass.
4. **Boarding** — scan boarding passes (full IATA BCBP barcode **or** PNR),
   validate (checked-in? right flight? already boarded? exit seat?), with Web
   Audio feedback (ok / exit-row warning / error), a live boarded count, and an
   exportable boarding log.

## Aircraft

| Code | Type            | Business      | Economy        | Seats |
|------|-----------------|---------------|----------------|-------|
| A359 | Airbus A350-900 | 8 rows × A–H  | 18 rows × A–I  | 226   |
| A332 | Airbus A330-200 | 7 rows × A–H  | 24 rows × A–I  | 272   |
| A320 | Airbus A320-200 | 5 rows × A–F  | 30 rows × A–F  | 210   |

Business is numbered from row 1; economy starts further back so every seat id is
unique. Two economy rows over the wings are marked as emergency-exit rows.

## Boarding pass barcode (BCBP)

Boarding passes encode a fixed-width, IATA-style M1 string that the backend can
parse back during boarding, e.g.:

```
M1SMITH/ALICE         E8K5Z6S ISTJFKTK0001181J001A0001
```

(format · legs · name · e-ticket · PNR · origin · dest · carrier · flight ·
Julian date · cabin · seat · sequence)
