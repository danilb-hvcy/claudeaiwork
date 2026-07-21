import React, { useState, useRef, useEffect, useMemo } from 'react';
import { searchCities, cityLabel } from '../../data/hotelCities.js';

/**
 * Destination picker for hotels, backed by the curated city list. Emits the
 * "City, Country" string the rest of the flow resolves via resolveCity.
 */
export default function HotelDestinationSelect({ label = 'Destination', value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState(value || '');
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);
  const results = useMemo(() => (open ? searchCities(query, 8) : []), [open, query]);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const choose = (c) => {
    const label = cityLabel(c);
    setQuery(label);
    onChange(label);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="ht-field ht-destination" ref={wrapRef}>
      <label>{label}</label>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder || 'City or destination'}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
      />
      {open && results.length > 0 && (
        <ul className="ht-menu" role="listbox">
          {results.map((c, i) => (
            <li
              key={`${c.city}-${c.countryCode}`}
              className={`ht-option${i === active ? ' ht-option-active' : ''}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(c); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="ht-option-pin">📍</span>
              <span className="ht-option-meta">
                <span className="ht-option-city">{c.city}</span>
                <span className="ht-option-country">{c.country}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
