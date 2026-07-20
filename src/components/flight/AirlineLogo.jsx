import React, { useState } from 'react';

/**
 * Real airline logo on a white chip, with a graceful fallback to a brand-color
 * plane glyph when no logo is available or the image fails to load.
 *
 * Logo source priority:
 *   1. airline.logo — the hosted logo LiteAPI returns per carrier (live data).
 *   2. Kiwi.com's public airline logo CDN, keyed by IATA code (demo data + any
 *      carrier LiteAPI didn't give a logo for).
 */
function logoUrl(airline) {
  if (airline.logo) return airline.logo;
  if (airline.code && /^[A-Z0-9]{2}$/.test(airline.code)) {
    return `https://images.kiwi.com/airlines/64/${airline.code}.png`;
  }
  return '';
}

export default function AirlineLogo({ airline, size = 40 }) {
  // Track the specific URL that failed so switching airlines re-tries cleanly.
  const [failedUrl, setFailedUrl] = useState('');
  if (!airline) return null;

  const url = logoUrl(airline);
  const showImg = url && failedUrl !== url;

  if (showImg) {
    return (
      <div
        className="fl-airline-logo fl-airline-logo-img"
        style={{ width: size, height: size }}
        title={airline.name}
        aria-label={airline.name}
      >
        <img
          src={url}
          alt={airline.name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailedUrl(url)}
        />
      </div>
    );
  }

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
