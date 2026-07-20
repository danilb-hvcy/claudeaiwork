import React from 'react';

export const TIME_SLOTS = [
  { id: 'early', label: '12AM - 6AM', icon: '🌙', range: [0, 6] },
  { id: 'morning', label: '6AM - 12PM', icon: '🌅', range: [6, 12] },
  { id: 'afternoon', label: '12PM - 6PM', icon: '☀️', range: [12, 18] },
  { id: 'evening', label: '6PM - 12AM', icon: '🌆', range: [18, 24] },
];

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="fl-check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="fl-check-box" aria-hidden="true" />
      <span className="fl-check-label">{label}</span>
    </label>
  );
}

function TimeGrid({ selected, onToggle }) {
  return (
    <div className="fl-time-grid">
      {TIME_SLOTS.map((slot) => (
        <button
          key={slot.id}
          className={`fl-time-slot${selected.includes(slot.id) ? ' fl-time-slot-active' : ''}`}
          onClick={() => onToggle(slot.id)}
        >
          <span className="fl-time-icon">{slot.icon}</span>
          <span>{slot.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Left sidebar filter panel: stops, price slider, airlines (dynamic),
 * departure/arrival time windows, and Reset All. Fully controlled by the parent.
 */
export default function FlightFilters({ filters, setFilters, airlineOptions, stopCounts, priceBounds, onReset }) {
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <aside className="fl-filters">
      <div className="fl-filters-head">
        <h3>Filters</h3>
        <button className="fl-reset" onClick={onReset}>Reset All</button>
      </div>

      {/* Stops */}
      <div className="fl-filter-group">
        <h4 className="fl-filter-title">Stops</h4>
        <Checkbox
          checked={filters.stops.includes(0)}
          onChange={() => set({ stops: toggle(filters.stops, 0) })}
          label={`Direct flights (${stopCounts[0] || 0} results)`}
        />
        <Checkbox
          checked={filters.stops.includes(1)}
          onChange={() => set({ stops: toggle(filters.stops, 1) })}
          label={`1 stop (${stopCounts[1] || 0} results)`}
        />
        <Checkbox
          checked={filters.stops.includes(2)}
          onChange={() => set({ stops: toggle(filters.stops, 2) })}
          label={`2+ stops (${stopCounts[2] || 0} results)`}
        />
      </div>

      {/* Price range */}
      <div className="fl-filter-group">
        <h4 className="fl-filter-title">Price range</h4>
        <input
          type="range"
          className="fl-price-slider"
          min={priceBounds.min}
          max={priceBounds.max}
          value={filters.priceMax}
          onChange={(e) => set({ priceMax: Number(e.target.value) })}
        />
        <div className="fl-price-labels">
          <span>${priceBounds.min}</span>
          <span className="fl-price-current">up to ${filters.priceMax}</span>
          <span>${priceBounds.max}</span>
        </div>
      </div>

      {/* Airlines (dynamic) */}
      <div className="fl-filter-group">
        <h4 className="fl-filter-title">Airlines</h4>
        {airlineOptions.map((a) => (
          <Checkbox
            key={a.code}
            checked={filters.airlines.includes(a.code)}
            onChange={() => set({ airlines: toggle(filters.airlines, a.code) })}
            label={`${a.name} (${a.count})`}
          />
        ))}
      </div>

      {/* Departure time */}
      <div className="fl-filter-group">
        <h4 className="fl-filter-title">Departure Time</h4>
        <TimeGrid
          selected={filters.departureSlots}
          onToggle={(id) => set({ departureSlots: toggle(filters.departureSlots, id) })}
        />
      </div>

      {/* Arrival time */}
      <div className="fl-filter-group">
        <h4 className="fl-filter-title">Arrival Time</h4>
        <TimeGrid
          selected={filters.arrivalSlots}
          onToggle={(id) => set({ arrivalSlots: toggle(filters.arrivalSlots, id) })}
        />
      </div>
    </aside>
  );
}
