import React, { useState, useRef, useEffect, useMemo } from 'react';
import { searchAirports, airportLabel } from '../../data/airports.js';

/**
 * Free-text airport picker backed by the full world airport directory
 * (~6,000 IATA airports). Renders only the top matches as you type, so the
 * dataset size never bloats the DOM. Emits the "City (CODE)" string the rest
 * of the app already understands via resolveAirportCode.
 */
export default function AirportSelect({ label, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState(value || '');
  const wrapRef = useRef(null);

  // Keep the visible text in sync when the parent changes it (e.g. swap button).
  useEffect(() => { setQuery(value || ''); }, [value]);

  const results = useMemo(() => (open ? searchAirports(query, 8) : []), [open, query]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const choose = (airport) => {
    const label = airportLabel(airport);
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
    <div className="fl-field fl-field-airport fl-airport-select" ref={wrapRef}>
      <label>{label}</label>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && results.length > 0 && (
        <ul className="fl-airport-menu" role="listbox">
          {results.map((a, i) => (
            <li
              key={`${a.code}-${a.name}`}
              className={`fl-airport-option${i === active ? ' fl-airport-option-active' : ''}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(a); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="fl-airport-code">{a.code}</span>
              <span className="fl-airport-meta">
                <span className="fl-airport-city">{a.city || a.name}</span>
                <span className="fl-airport-name">{a.name}{a.country ? ` · ${a.country}` : ''}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
