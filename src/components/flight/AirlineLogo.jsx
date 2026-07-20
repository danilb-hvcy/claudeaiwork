import React from 'react';

/**
 * Small rounded logo chip for an airline. We render the carrier's brand color
 * with a plane glyph + IATA code rather than loading remote logos (keeps the
 * bundle self-contained and avoids broken-image states).
 */
export default function AirlineLogo({ airline, size = 40 }) {
  if (!airline) return null;
  return (
    <div
      className="fl-airline-logo"
      style={{ width: size, height: size, background: airline.color }}
      title={airline.name}
      aria-label={airline.name}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="white">
        <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
      </svg>
    </div>
  );
}
