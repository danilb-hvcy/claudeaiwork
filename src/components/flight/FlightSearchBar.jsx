import React from 'react';
import { AIRPORTS, airportLabel } from '../../data/airports.js';

const CABINS = ['Economy', 'Premium', 'Business', 'First'];

/**
 * Top search row: trip type, cabin, from/to (with swap), dates, travelers,
 * and the "Modify" button that re-runs the search. Controlled by the parent.
 */
export default function FlightSearchBar({ search, setSearch, onSearch }) {
  const set = (patch) => setSearch((s) => ({ ...s, ...patch }));
  const swap = () => set({ from: search.to, to: search.from });

  return (
    <div className="fl-searchbar">
      {/* Trip type + cabin */}
      <div className="fl-search-options">
        <label className="fl-radio">
          <input
            type="radio"
            name="trip"
            checked={search.tripType === 'round'}
            onChange={() => set({ tripType: 'round' })}
          />
          <span className="fl-radio-dot" /> Return
        </label>
        <label className="fl-radio">
          <input
            type="radio"
            name="trip"
            checked={search.tripType === 'oneway'}
            onChange={() => set({ tripType: 'oneway' })}
          />
          <span className="fl-radio-dot" /> One-way
        </label>
        <div className="fl-cabin-select">
          <select value={search.cabin} onChange={(e) => set({ cabin: e.target.value })}>
            {CABINS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Fields */}
      <div className="fl-search-fields">
        <div className="fl-field fl-field-airport">
          <label>From</label>
          <input
            list="fl-airport-list"
            value={search.from}
            onChange={(e) => set({ from: e.target.value })}
            placeholder="City or airport code"
            autoComplete="off"
          />
        </div>

        <button className="fl-swap" onClick={swap} aria-label="Swap origin and destination">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="fl-field fl-field-airport">
          <label>To</label>
          <input
            list="fl-airport-list"
            value={search.to}
            onChange={(e) => set({ to: e.target.value })}
            placeholder="City or airport code"
            autoComplete="off"
          />
        </div>

        {/* Shared airport autocomplete for both From and To */}
        <datalist id="fl-airport-list">
          {AIRPORTS.map((a) => (
            <option key={a.code} value={airportLabel(a)}>{a.name}, {a.country}</option>
          ))}
        </datalist>

        <div className="fl-field">
          <label>Date</label>
          <input type="date" value={search.departureDate} onChange={(e) => set({ departureDate: e.target.value })} />
        </div>

        {search.tripType === 'round' && (
          <div className="fl-field">
            <label>Return</label>
            <input type="date" value={search.returnDate} onChange={(e) => set({ returnDate: e.target.value })} />
          </div>
        )}

        <div className="fl-field">
          <label>Travelers</label>
          <select value={search.travelers} onChange={(e) => set({ travelers: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        <button className="fl-modify-btn" onClick={onSearch}>Modify</button>
      </div>
    </div>
  );
}
