import React from 'react';
import AirlineLogo from './AirlineLogo.jsx';

function formatDuration(d) {
  return `${d.hours}h ${String(d.minutes).padStart(2, '0')}m`;
}

function stopsLabel(stops) {
  if (stops === 0) return 'Direct';
  return stops === 1 ? '1 stop' : `${stops} stops`;
}

/**
 * A single flight result row: airline, departure → arrival with a duration/stops
 * indicator in the middle, price on the right, and a "View Details" affordance.
 */
export default function FlightCard({ flight, selected, onViewDetails }) {
  const { airline, origin, destination, departure, arrival, duration, stops, price, originalPrice } = flight;
  const direct = stops === 0;

  return (
    <div className={`fl-card${selected ? ' fl-card-selected' : ''}`}>
      {/* Airline */}
      <div className="fl-card-airline">
        <AirlineLogo airline={airline} />
        <span className="fl-card-airline-name">{airline.name}</span>
      </div>

      {/* Route timeline */}
      <div className="fl-card-route">
        <div className="fl-card-endpoint">
          <span className="fl-card-time">{departure.time}</span>
          <span className="fl-card-airport">{origin.city} ({origin.code})</span>
        </div>

        <div className="fl-card-middle">
          <span className={`fl-stop-badge${direct ? ' fl-stop-direct' : ''}`}>
            {stopsLabel(stops)}
          </span>
          <div className="fl-card-line">
            <span className="fl-card-dot" />
            <span className="fl-card-track" />
            <svg className="fl-card-plane" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 12l19-7-4 9 4 9-19-7v-1z" transform="rotate(0)" />
            </svg>
          </div>
          <span className="fl-card-duration">{formatDuration(duration)}</span>
        </div>

        <div className="fl-card-endpoint fl-card-endpoint-right">
          <span className="fl-card-time">{arrival.time}</span>
          <span className="fl-card-airport">{destination.city} ({destination.code})</span>
        </div>
      </div>

      {/* Price + action */}
      <div className="fl-card-pricing">
        {originalPrice > price && (
          <span className="fl-card-price-original">${originalPrice.toFixed(2)}</span>
        )}
        <span className="fl-card-price">${price.toFixed(2)}</span>
        <span className="fl-card-price-note">One way flight</span>
        <button className="fl-card-details-btn" onClick={() => onViewDetails(flight)}>
          View Details
        </button>
      </div>
    </div>
  );
}
