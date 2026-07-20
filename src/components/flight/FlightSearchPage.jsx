import React, { useState, useEffect, useMemo, useCallback } from 'react';
import FlightSearchBar from './FlightSearchBar.jsx';
import FlightFilters, { TIME_SLOTS } from './FlightFilters.jsx';
import FlightResults from './FlightResults.jsx';
import FareDetailsPanel from './FareDetailsPanel.jsx';
import CheckoutPage from './CheckoutPage.jsx';
import { searchFlights } from '../../utils/liteApi.js';
import { resolveAirportCode } from '../../data/airports.js';
import { buildDateStrip, toISO } from '../../utils/dates.js';

const PRICE_BOUNDS = { min: 200, max: 4000 };

const DEFAULT_FILTERS = {
  stops: [],
  priceMax: PRICE_BOUNDS.max,
  airlines: [],
  departureSlots: [],
  arrivalSlots: [],
};

/** Default dates: two/three weeks out from today so the search is valid live. */
function defaultDates() {
  const dep = new Date();
  dep.setDate(dep.getDate() + 14);
  const ret = new Date();
  ret.setDate(ret.getDate() + 21);
  return { departureDate: toISO(dep), returnDate: toISO(ret) };
}

const DEFAULT_SEARCH = {
  tripType: 'oneway',
  cabin: 'Economy',
  from: 'Sydney (SYD)',
  to: 'Los Angeles (LAX)',
  ...defaultDates(),
  travelers: 1,
};

/** Which time slot does an "HH:MM" string fall into? */
function slotFor(time) {
  const hour = parseInt(time.slice(0, 2), 10);
  const match = TIME_SLOTS.find((s) => hour >= s.range[0] && hour < s.range[1]);
  return match ? match.id : null;
}

/** Normalize stop count into the filter bucket (0, 1, or 2 for "2+"). */
function stopBucket(stops) {
  return stops >= 2 ? 2 : stops;
}

export default function FlightSearchPage({ onExit }) {
  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const [rawFlights, setRawFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('mock');

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState('cheapest');
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [checkout, setCheckout] = useState(null);

  const runSearch = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setSelectedFlight(null);
    try {
      const origin = resolveAirportCode(params.from) || 'SYD';
      const destination = resolveAirportCode(params.to) || 'LAX';
      const { flights, source: src } = await searchFlights({
        origin,
        destination,
        departureDate: params.departureDate,
        returnDate: params.tripType === 'round' ? params.returnDate : undefined,
        adults: params.travelers,
        cabin: params.cabin,
      });
      setRawFlights(flights);
      setSource(src);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setRawFlights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load.
  useEffect(() => {
    runSearch(DEFAULT_SEARCH);
  }, [runSearch]);

  // Picking a date from the strip updates the search and re-runs it.
  const handlePickDate = useCallback((dateISO) => {
    setSearch((s) => {
      const next = { ...s, departureDate: dateISO };
      runSearch(next);
      return next;
    });
  }, [runSearch]);

  const dateStripItems = useMemo(() => buildDateStrip(search.departureDate), [search.departureDate]);

  // Airline options derived from the current result set (dynamic filter list).
  const airlineOptions = useMemo(() => {
    const map = new Map();
    for (const f of rawFlights) {
      const cur = map.get(f.airline.code);
      if (cur) cur.count += 1;
      else map.set(f.airline.code, { code: f.airline.code, name: f.airline.name, count: 1 });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rawFlights]);

  const stopCounts = useMemo(() => {
    const counts = { 0: 0, 1: 0, 2: 0 };
    for (const f of rawFlights) counts[stopBucket(f.stops)] += 1;
    return counts;
  }, [rawFlights]);

  // Apply filters + sort.
  const visibleFlights = useMemo(() => {
    let list = rawFlights.filter((f) => {
      if (filters.stops.length && !filters.stops.includes(stopBucket(f.stops))) return false;
      if (f.price > filters.priceMax) return false;
      if (filters.airlines.length && !filters.airlines.includes(f.airline.code)) return false;
      if (filters.departureSlots.length && !filters.departureSlots.includes(slotFor(f.departure.time))) return false;
      if (filters.arrivalSlots.length && !filters.arrivalSlots.includes(slotFor(f.arrival.time))) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      sort === 'fastest'
        ? a.duration.totalMinutes - b.duration.totalMinutes
        : a.price - b.price
    );
    return list;
  }, [rawFlights, filters, sort]);

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  // A selected fare moves the user into the checkout flow.
  if (checkout) {
    return (
      <CheckoutPage
        flight={checkout.flight}
        fare={checkout.fare}
        passengers={search.travelers}
        onBack={() => setCheckout(null)}
        onHome={onExit}
      />
    );
  }

  return (
    <div className="fl-page">
      {/* Top nav */}
      <header className="fl-nav">
        <div className="fl-nav-left">
          <button className="fl-nav-menu" onClick={onExit} aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
          <button className="fl-nav-logo" onClick={onExit}>
            <span className="fl-logo-mark">🌴</span>
            <span className="fl-logo-text">hey<strong>vacay</strong></span>
          </button>
        </div>
        <div className="fl-nav-right">
          <button className="fl-nav-link">🧳 My Bookings</button>
          <button className="fl-nav-link">👤 Log In</button>
        </div>
      </header>

      <FlightSearchBar search={search} setSearch={setSearch} onSearch={() => runSearch(search)} />

      {source === 'mock' && (
        <div className="fl-demo-note">
          Showing demo flight data. Add your <code>LITEAPI_KEY</code> in your deployment's environment settings to show live prices — see <code>api/flights.js</code>.
        </div>
      )}

      <div className="fl-layout">
        <FlightFilters
          filters={filters}
          setFilters={setFilters}
          airlineOptions={airlineOptions}
          stopCounts={stopCounts}
          priceBounds={PRICE_BOUNDS}
          onReset={resetFilters}
        />
        <FlightResults
          flights={visibleFlights}
          loading={loading}
          error={error}
          sort={sort}
          setSort={setSort}
          dates={dateStripItems}
          activeDate={search.departureDate}
          onPickDate={handlePickDate}
          selectedFlightId={selectedFlight?.id}
          onViewDetails={setSelectedFlight}
          onRetry={() => runSearch(search)}
        />
      </div>

      <footer className="fl-footer">
        <span>© 2025 Heyvacay</span>
        <div className="fl-footer-links">
          <a href="#">Privacy Policy</a><a href="#">Legal</a><a href="#">Terms</a>
          <a href="#">Contact us</a><a href="#">FAQs</a>
        </div>
      </footer>

      {selectedFlight && (
        <FareDetailsPanel
          flight={selectedFlight}
          passengers={search.travelers}
          onClose={() => setSelectedFlight(null)}
          onSelectFare={(fare) => {
            // Move into the checkout flow with the chosen flight + fare.
            setCheckout({ flight: selectedFlight, fare });
            setSelectedFlight(null);
          }}
        />
      )}
    </div>
  );
}
