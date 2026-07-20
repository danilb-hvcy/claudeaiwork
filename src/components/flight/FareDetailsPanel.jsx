import React from 'react';
import AirlineLogo from './AirlineLogo.jsx';

function SeatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 4v11a2 2 0 0 0 2 2h9M5 15h11a2 2 0 0 1 2 2v3M19 20h-1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="7" width="14" height="13" rx="2" /><path d="M9 7V4h6v3" strokeLinecap="round" />
    </svg>
  );
}
function FlexIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12a8 8 0 0 1 14-5m2-2v4h-4M20 12a8 8 0 0 1-14 5m-2 2v-4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FareColumn({ fare, passengers, onSelect }) {
  return (
    <div className={`fl-fare${fare.recommended ? ' fl-fare-recommended' : ''}`}>
      {fare.recommended && <span className="fl-fare-badge">RECOMMENDED</span>}

      <div className="fl-fare-price">${fare.price.toFixed(2)}</div>
      <div className="fl-fare-price-note">${fare.price.toFixed(0)} for {passengers} traveller{passengers > 1 ? 's' : ''}</div>
      <div className="fl-fare-name">{fare.name}</div>
      <div className="fl-fare-cabin">Cabin: {fare.cabin}</div>

      <div className="fl-fare-group">
        <div className="fl-fare-group-title">Seat</div>
        <div className="fl-fare-item"><SeatIcon /><span>{fare.seat}</span></div>
      </div>

      <div className="fl-fare-group">
        <div className="fl-fare-group-title">Bags</div>
        {fare.bags.map((b, i) => (
          <div key={i} className="fl-fare-item"><BagIcon /><span>{b}</span></div>
        ))}
      </div>

      <div className="fl-fare-group">
        <div className="fl-fare-group-title">Flexibility</div>
        {fare.flexibility.map((f, i) => (
          <div key={i} className="fl-fare-item"><FlexIcon /><span>{f}</span></div>
        ))}
      </div>

      <button className="fl-fare-select" onClick={() => onSelect(fare)}>Select</button>
    </div>
  );
}

/**
 * Slide-in panel on the right showing the fare families for a chosen flight.
 * Matches flow09: route header, close button, three fare columns with Select.
 */
export default function FareDetailsPanel({ flight, passengers = 1, onClose, onSelectFare }) {
  if (!flight) return null;
  const { airline, origin, destination, departure, arrival, duration, stops } = flight;
  const durationLabel = `${duration.hours}h ${String(duration.minutes).padStart(2, '0')}m`;
  const stopLabel = stops === 0 ? 'Direct' : stops === 1 ? '1 Stop' : `${stops} Stops`;

  return (
    <>
      <div className="fl-panel-overlay" onClick={onClose} />
      <aside className="fl-panel" role="dialog" aria-label="Flight fare options">
        <div className="fl-panel-head">
          <div>
            <h3 className="fl-panel-title">{origin.country} to {destination.city} Flight</h3>
            <p className="fl-panel-sub">
              {departure.time} - {arrival.time} ({durationLabel}, {stopLabel})
            </p>
            <div className="fl-panel-airline">
              <AirlineLogo airline={airline} size={22} />
              <span>{airline.name}</span>
            </div>
          </div>
          <button className="fl-panel-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="fl-panel-fares">
          {flight.fares.map((fare) => (
            <FareColumn key={fare.id} fare={fare} passengers={passengers} onSelect={onSelectFare} />
          ))}
        </div>
      </aside>
    </>
  );
}
