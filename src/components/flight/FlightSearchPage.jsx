import React, { useState, useEffect, useMemo, useCallback } from 'react';
import FlightSearchBar from './FlightSearchBar.jsx';
import FlightFilters, { TIME_SLOTS } from './FlightFilters.jsx';
import FlightResults from './FlightResults.jsx';
import FareDetailsPanel from './FareDetailsPanel.jsx';
import { searchFlights } from '../../utils/liteApi.js';

const PRICE_BOUNDS = { min: 200, max: 4000 };

const DEFAULT_FILTERS = {
  stops: [],
  priceMax: PRICE_BOUNDS.max,
  airlines: [],
  departureSlots: [],
  arrivalSlots: [],
};

const DEFAULT_SEARCH = {
  tripType: 'oneway',
  cabin: 'Economy',
  from: 'Australia (SYD)',
  to: 'Los Angeles (LAX)',
  departureDate: '2025-12-26',
  returnDate: '2026-01-02',
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
  const [activeDate, setActiveDate] = useState(DEFAULT_SEARCH.departureDate);
  const [selectedFlight, setSelectedFlight] = useState(null);

  const runSearch = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setSelectedFlight(null);
    try {
      const [origin] = (params.from.match(/\(([A-Z]{3})\)/) || [null, 'SYD']).slice(1);
      const [destination] = (params.to.match(/\(([A-Z]{3})\)/) || [null, 'LAX']).slice(1);
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
          activeDate={activeDate}
          onPickDate={(d) => { setActiveDate(d); }}
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
            // In production this would deep-link into the HeyVacay booking flow.
            // eslint-disable-next-line no-alert
            alert(`Selected ${fare.name} — $${fare.price.toFixed(2)} on ${selectedFlight.airline.name}.\nProceeding to checkout…`);
            setSelectedFlight(null);
          }}
        />
      )}
    </div>
  );
}
