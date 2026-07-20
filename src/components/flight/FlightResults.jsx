import React, { useRef } from 'react';
import FlightCard from './FlightCard.jsx';
import { dateStrip, promoOffers } from '../../data/mockFlights.js';

const SORTS = [
  { id: 'cheapest', label: 'Cheapest', icon: '🏷️' },
  { id: 'fastest', label: 'Fastest', icon: '⚡' },
];

const STEPS = ['Choose departing flight', 'Choose returning flight', 'Review flight'];

function DateStrip({ activeDate, onPick }) {
  const scroller = useRef(null);
  const nudge = (dir) => {
    if (scroller.current) scroller.current.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };
  return (
    <div className="fl-datestrip">
      <button className="fl-datestrip-arrow" onClick={() => nudge(-1)} aria-label="Previous dates">‹</button>
      <div className="fl-datestrip-track" ref={scroller}>
        {dateStrip.map((d) => (
          <button
            key={d.value}
            className={`fl-date${activeDate === d.value ? ' fl-date-active' : ''}`}
            onClick={() => onPick(d.value)}
          >
            {d.label}
          </button>
        ))}
      </div>
      <button className="fl-datestrip-arrow" onClick={() => nudge(1)} aria-label="Next dates">›</button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="fl-results-list">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="fl-card fl-card-skeleton">
          <div className="fl-skel fl-skel-logo" />
          <div className="fl-skel-lines">
            <div className="fl-skel fl-skel-line" />
            <div className="fl-skel fl-skel-line short" />
          </div>
          <div className="fl-skel fl-skel-price" />
        </div>
      ))}
    </div>
  );
}

/**
 * Center column: date strip, promo banners, booking breadcrumb, sort toggle,
 * and the scrollable list of flight results with loading/error/empty states.
 */
export default function FlightResults({
  flights,
  loading,
  error,
  sort,
  setSort,
  activeDate,
  onPickDate,
  selectedFlightId,
  onViewDetails,
  onRetry,
}) {
  return (
    <section className="fl-results">
      <DateStrip activeDate={activeDate} onPick={onPickDate} />

      {/* Promo banners */}
      <div className="fl-promos">
        {promoOffers.map((p) => (
          <div key={p.id} className={`fl-promo fl-promo-${p.tone}`}>
            <span className="fl-promo-icon">{p.tone === 'gold' ? '⭐' : '🎟️'}</span>
            <span className="fl-promo-text">
              {p.code && <strong>{p.code}</strong>}{p.code ? ' | ' : ''}{p.text}
            </span>
          </div>
        ))}
      </div>

      {/* Breadcrumb + sort */}
      <div className="fl-results-bar">
        <nav className="fl-breadcrumb">
          {STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <span className={`fl-crumb${i === 0 ? ' fl-crumb-active' : ''}`}>{step}</span>
              {i < STEPS.length - 1 && <span className="fl-crumb-sep">›</span>}
            </React.Fragment>
          ))}
        </nav>
        <div className="fl-sort">
          {SORTS.map((s) => (
            <button
              key={s.id}
              className={`fl-sort-btn${sort === s.id ? ' fl-sort-active' : ''}`}
              onClick={() => setSort(s.id)}
            >
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="fl-error">
          <p className="fl-error-title">We couldn't load flights</p>
          <p className="fl-error-msg">{error}</p>
          <button className="fl-error-retry" onClick={onRetry}>Try again</button>
        </div>
      ) : flights.length === 0 ? (
        <div className="fl-empty">
          <p className="fl-empty-title">No flights match your filters</p>
          <p className="fl-empty-msg">Try widening your price range or clearing some filters.</p>
        </div>
      ) : (
        <>
          <p className="fl-results-count">{flights.length} flights found</p>
          <div className="fl-results-list">
            {flights.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                selected={selectedFlightId === flight.id}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
