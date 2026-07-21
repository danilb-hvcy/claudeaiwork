import React from 'react';
import HotelDestinationSelect from './HotelDestinationSelect.jsx';

/**
 * Hotel search row: destination, check-in/out dates, guests & rooms, and the
 * search button. Controlled by the parent (HotelSearchPage).
 */
export default function HotelSearchBar({ search, setSearch, onSearch, ctaLabel = 'Search' }) {
  const set = (patch) => setSearch((s) => ({ ...s, ...patch }));

  return (
    <div className="ht-searchbar">
      <div className="ht-search-fields">
        <HotelDestinationSelect
          label="Destination"
          value={search.destination}
          onChange={(v) => set({ destination: v })}
        />

        <div className="ht-field">
          <label>Check-in</label>
          <input type="date" value={search.checkin} onChange={(e) => set({ checkin: e.target.value })} />
        </div>

        <div className="ht-field">
          <label>Check-out</label>
          <input type="date" value={search.checkout} onChange={(e) => set({ checkout: e.target.value })} />
        </div>

        <div className="ht-field">
          <label>Rooms</label>
          <select value={search.rooms} onChange={(e) => set({ rooms: Number(e.target.value) })}>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} Room{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>

        <div className="ht-field">
          <label>Guests</label>
          <select value={search.adults} onChange={(e) => set({ adults: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>

        <button className="ht-search-btn" onClick={onSearch}>{ctaLabel}</button>
      </div>
    </div>
  );
}
