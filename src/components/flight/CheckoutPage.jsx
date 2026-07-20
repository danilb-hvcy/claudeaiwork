import React, { useState } from 'react';
import AirlineLogo from './AirlineLogo.jsx';

function money(n, currency = 'USD') {
  const sym = currency === 'USD' ? '$' : '';
  return `${sym}${Number(n).toFixed(2)}${sym ? '' : ` ${currency}`}`;
}

/** Generate a friendly booking reference (6 chars, no ambiguous letters). */
function makeBookingRef() {
  const alphabet = 'ACDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  // Browser crypto for a stable, unique-ish code; falls back to time-based.
  const rand = (typeof crypto !== 'undefined' && crypto.getRandomValues)
    ? Array.from(crypto.getRandomValues(new Uint32Array(6)))
    : Array.from({ length: 6 }, (_, i) => Date.now() + i);
  for (let i = 0; i < 6; i++) out += alphabet[rand[i] % alphabet.length];
  return out;
}

const EMPTY_PASSENGER = { first: '', last: '', dob: '', nationality: '' };

function stopsLabel(stops) {
  return stops === 0 ? 'Direct' : stops === 1 ? '1 stop' : `${stops} stops`;
}

/**
 * Full checkout flow reached after a fare is selected: passenger details,
 * contact info, payment, and an order summary — ending in a booking
 * confirmation. Payment is a demo (no card is charged); wire the "Confirm"
 * handler into LiteAPI prebook/book + your PSP to take real bookings live.
 */
export default function CheckoutPage({ flight, fare, passengers = 1, onBack, onHome }) {
  const [pax, setPax] = useState(
    Array.from({ length: passengers }, () => ({ ...EMPTY_PASSENGER }))
  );
  const [contact, setContact] = useState({ email: '', phone: '' });
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [confirmed, setConfirmed] = useState(null);
  const [error, setError] = useState('');

  const { airline, origin, destination, departure, arrival, duration, stops, currency } = flight;
  const durationLabel = `${duration.hours}h ${String(duration.minutes).padStart(2, '0')}m`;

  const setPaxField = (i, patch) =>
    setPax((list) => list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const validate = () => {
    for (let i = 0; i < pax.length; i++) {
      if (!pax[i].first.trim() || !pax[i].last.trim()) return `Enter the name for traveller ${i + 1}.`;
    }
    if (!contact.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) return 'Enter a valid email address.';
    if (!card.number.replace(/\s/g, '').match(/^\d{13,19}$/)) return 'Enter a valid card number.';
    if (!card.expiry.match(/^\d{2}\/\d{2}$/)) return 'Enter card expiry as MM/YY.';
    if (!card.cvc.match(/^\d{3,4}$/)) return 'Enter a valid CVC.';
    return '';
  };

  const onConfirm = (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setConfirmed({ ref: makeBookingRef() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (confirmed) {
    return (
      <div className="fl-checkout">
        <CheckoutNav onHome={onHome} />
        <div className="fl-checkout-body fl-checkout-confirm">
          <div className="fl-confirm-card">
            <div className="fl-confirm-check">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="fl-confirm-title">Booking confirmed</h1>
            <p className="fl-confirm-sub">
              Your flight from {origin.city} ({origin.code}) to {destination.city} ({destination.code}) is booked.
              A confirmation has been sent to <strong>{contact.email}</strong>.
            </p>
            <div className="fl-confirm-ref">
              <span>Booking reference</span>
              <strong>{confirmed.ref}</strong>
            </div>
            <div className="fl-confirm-summary">
              <div className="fl-confirm-row">
                <AirlineLogo airline={airline} size={22} />
                <span>{airline.name} · {departure.time}–{arrival.time} · {durationLabel} · {stopsLabel(stops)}</span>
              </div>
              <div className="fl-confirm-row fl-confirm-total">
                <span>Total paid</span>
                <strong>{money(fare.price, currency)}</strong>
              </div>
            </div>
            <button className="fl-checkout-pay" onClick={onHome}>Done</button>
            <p className="fl-checkout-demo-note">Demo checkout — no payment was actually processed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fl-checkout">
      <CheckoutNav onHome={onHome} />

      <div className="fl-checkout-topbar">
        <button className="fl-checkout-back" onClick={onBack}>← Back to results</button>
        <span className="fl-checkout-step">Secure checkout</span>
      </div>

      <form className="fl-checkout-body" onSubmit={onConfirm}>
        <div className="fl-checkout-main">
          {/* Passengers */}
          <section className="fl-checkout-section">
            <h2 className="fl-checkout-h2">Traveller details</h2>
            {pax.map((p, i) => (
              <div key={i} className="fl-checkout-passenger">
                <div className="fl-checkout-passenger-title">Traveller {i + 1} <span>Adult</span></div>
                <div className="fl-checkout-grid">
                  <label className="fl-input">
                    <span>First name</span>
                    <input value={p.first} onChange={(e) => setPaxField(i, { first: e.target.value })} placeholder="As on passport" />
                  </label>
                  <label className="fl-input">
                    <span>Last name</span>
                    <input value={p.last} onChange={(e) => setPaxField(i, { last: e.target.value })} placeholder="As on passport" />
                  </label>
                  <label className="fl-input">
                    <span>Date of birth</span>
                    <input type="date" value={p.dob} onChange={(e) => setPaxField(i, { dob: e.target.value })} />
                  </label>
                  <label className="fl-input">
                    <span>Nationality</span>
                    <input value={p.nationality} onChange={(e) => setPaxField(i, { nationality: e.target.value })} placeholder="Country" />
                  </label>
                </div>
              </div>
            ))}
          </section>

          {/* Contact */}
          <section className="fl-checkout-section">
            <h2 className="fl-checkout-h2">Contact details</h2>
            <div className="fl-checkout-grid">
              <label className="fl-input">
                <span>Email</span>
                <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="you@email.com" />
              </label>
              <label className="fl-input">
                <span>Phone</span>
                <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="+1 555 000 0000" />
              </label>
            </div>
          </section>

          {/* Payment */}
          <section className="fl-checkout-section">
            <h2 className="fl-checkout-h2">Payment</h2>
            <div className="fl-checkout-grid">
              <label className="fl-input fl-input-full">
                <span>Name on card</span>
                <input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="Full name" />
              </label>
              <label className="fl-input fl-input-full">
                <span>Card number</span>
                <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="1234 5678 9012 3456" inputMode="numeric" />
              </label>
              <label className="fl-input">
                <span>Expiry (MM/YY)</span>
                <input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="08/28" />
              </label>
              <label className="fl-input">
                <span>CVC</span>
                <input value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} placeholder="123" inputMode="numeric" />
              </label>
            </div>
          </section>

          {error && <p className="fl-checkout-error">{error}</p>}
        </div>

        {/* Order summary */}
        <aside className="fl-checkout-summary">
          <div className="fl-summary-card">
            <h3 className="fl-summary-title">Your trip</h3>
            <div className="fl-summary-flight">
              <AirlineLogo airline={airline} size={26} />
              <div>
                <div className="fl-summary-airline">{airline.name}</div>
                <div className="fl-summary-cabin">{fare.name} · {fare.cabin}</div>
              </div>
            </div>
            <div className="fl-summary-route">
              <div className="fl-summary-endpoint">
                <strong>{departure.time}</strong>
                <span>{origin.city} ({origin.code})</span>
              </div>
              <div className="fl-summary-mid">
                <span>{durationLabel}</span>
                <span className="fl-summary-stops">{stopsLabel(stops)}</span>
              </div>
              <div className="fl-summary-endpoint fl-summary-endpoint-right">
                <strong>{arrival.time}</strong>
                <span>{destination.city} ({destination.code})</span>
              </div>
            </div>

            <div className="fl-summary-lines">
              <div className="fl-summary-line">
                <span>Flight fare ({pax.length} traveller{pax.length > 1 ? 's' : ''})</span>
                <span>{money(fare.price, currency)}</span>
              </div>
              <div className="fl-summary-line fl-summary-muted">
                <span>Taxes &amp; fees</span>
                <span>Included</span>
              </div>
              <div className="fl-summary-line fl-summary-grand">
                <span>Total due</span>
                <strong>{money(fare.price, currency)}</strong>
              </div>
            </div>

            <button type="submit" className="fl-checkout-pay">Confirm &amp; pay {money(fare.price, currency)}</button>
            <p className="fl-checkout-demo-note">Demo checkout — no card is charged.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function CheckoutNav({ onHome }) {
  return (
    <header className="fl-nav">
      <div className="fl-nav-left">
        <button className="fl-nav-logo" onClick={onHome}>
          <span className="fl-logo-mark">🌴</span>
          <span className="fl-logo-text">hey<strong>vacay</strong></span>
        </button>
      </div>
      <div className="fl-nav-right">
        <span className="fl-checkout-secure">🔒 Secure checkout</span>
      </div>
    </header>
  );
}
