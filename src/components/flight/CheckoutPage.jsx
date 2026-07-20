import React, { useState } from 'react';
import AirlineLogo from './AirlineLogo.jsx';
import { prebookFlight, bookFlight, pickField, errorText } from '../../utils/liteApi.js';

function money(n, currency = 'USD') {
  const sym = currency === 'USD' ? '$' : '';
  return `${sym}${Number(n).toFixed(2)}${sym ? '' : ` ${currency}`}`;
}

/** Fallback booking reference for the demo path (no live booking). */
function makeBookingRef() {
  const alphabet = 'ACDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = (typeof crypto !== 'undefined' && crypto.getRandomValues)
    ? Array.from(crypto.getRandomValues(new Uint32Array(6)))
    : Array.from({ length: 6 }, (_, i) => Date.now() + i);
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[rand[i] % alphabet.length];
  return out;
}

const EMPTY_PASSENGER = {
  title: 'MR', first: '', last: '', gender: 'MALE',
  dob: '', nationality: '', passport: '', passportExpiry: '',
};

const TITLES = ['MR', 'MRS', 'MS'];
const GENDERS = [['MALE', 'Male'], ['FEMALE', 'Female']];

function stopsLabel(stops) {
  return stops === 0 ? 'Direct' : stops === 1 ? '1 stop' : `${stops} stops`;
}

/**
 * Full checkout: traveller details, contact, payment, order summary — ending in
 * a booking confirmation. When `live` is true (results came from LiteAPI) the
 * confirm button runs the real prebook → book flow against LiteAPI and shows the
 * returned booking reference. On a sandbox key these are TEST bookings: no card
 * is charged and no real ticket is issued. When not live it's a demo confirm.
 */
export default function CheckoutPage({ flight, fare, passengers = 1, live = false, onBack, onHome }) {
  const [pax, setPax] = useState(
    Array.from({ length: passengers }, () => ({ ...EMPTY_PASSENGER }))
  );
  const [contact, setContact] = useState({ email: '', phone: '' });
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [confirmed, setConfirmed] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { airline, origin, destination, departure, arrival, duration, stops, currency } = flight;
  const durationLabel = `${duration.hours}h ${String(duration.minutes).padStart(2, '0')}m`;

  const setPaxField = (i, patch) =>
    setPax((list) => list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const validate = () => {
    for (let i = 0; i < pax.length; i++) {
      const p = pax[i];
      if (!p.first.trim() || !p.last.trim()) return `Enter the name for traveller ${i + 1}.`;
      if (!p.dob) return `Enter the date of birth for traveller ${i + 1}.`;
      if (live) {
        if (!p.nationality.trim()) return `Enter nationality for traveller ${i + 1}.`;
        if (!p.passport.trim()) return `Enter the passport number for traveller ${i + 1}.`;
        if (!p.passportExpiry) return `Enter passport expiry for traveller ${i + 1}.`;
      }
    }
    if (!contact.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) return 'Enter a valid email address.';
    if (!live) {
      if (!card.number.replace(/\s/g, '').match(/^\d{13,19}$/)) return 'Enter a valid card number.';
      if (!card.expiry.match(/^\d{2}\/\d{2}$/)) return 'Enter card expiry as MM/YY.';
      if (!card.cvc.match(/^\d{3,4}$/)) return 'Enter a valid CVC.';
    }
    return '';
  };

  const toApiPassengers = () => pax.map((p) => ({
    title: p.title,
    firstName: p.first.trim(),
    lastName: p.last.trim(),
    dateOfBirth: p.dob,
    gender: p.gender,
    nationality: p.nationality.trim(),
    type: 'ADULT',
    passportNumber: p.passport.trim(),
    passportExpiry: p.passportExpiry,
  }));

  const onConfirm = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');

    // Demo path (mock results): keep the instant confirmation, no API calls.
    if (!live) {
      setConfirmed({ ref: makeBookingRef(), demo: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Live path: real LiteAPI prebook → book (sandbox = test booking).
    setSubmitting(true);
    try {
      const pre = await prebookFlight(fare.id);
      const prebookId = pickField(pre.data, ['prebookId', 'prebookID', 'id']);
      const transactionId = pickField(pre.data, ['transactionId', 'transactionID']);
      if (!pre.ok || !prebookId) {
        const t = errorText(pre.data);
        setError(/expir/i.test(t) || pre.status === 410
          ? 'These fares just expired. Please go back and search again.'
          : `Couldn't lock this fare: ${t}`);
        return;
      }

      const holder = {
        firstName: pax[0].first.trim(),
        lastName: pax[0].last.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
      };
      const bk = await bookFlight({ prebookId, transactionId, holder, passengers: toApiPassengers() });
      if (!bk.ok) {
        setError(`Booking failed: ${errorText(bk.data)}`);
        return;
      }

      const ref = pickField(bk.data, [
        'bookingReference', 'bookingId', 'bookingID', 'confirmationCode',
        'reference', 'pnr', 'supplierBookingId', 'supplierReference',
      ]) || makeBookingRef();
      setConfirmed({ ref, demo: false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(`Something went wrong: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
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
            <p className="fl-checkout-demo-note">
              {confirmed.demo
                ? 'Demo checkout — no payment was actually processed.'
                : 'Sandbox test booking — no card was charged and no real ticket was issued.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fl-checkout">
      <CheckoutNav onHome={onHome} />

      <div className="fl-checkout-topbar">
        <button className="fl-checkout-back" onClick={onBack} disabled={submitting}>← Back to results</button>
        <span className="fl-checkout-step">{live ? 'Sandbox test booking' : 'Secure checkout'}</span>
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
                    <span>Title</span>
                    <select value={p.title} onChange={(e) => setPaxField(i, { title: e.target.value })}>
                      {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="fl-input">
                    <span>Gender</span>
                    <select value={p.gender} onChange={(e) => setPaxField(i, { gender: e.target.value })}>
                      {GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
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
                    <input value={p.nationality} onChange={(e) => setPaxField(i, { nationality: e.target.value })} placeholder="e.g. US" />
                  </label>
                  {live && (
                    <>
                      <label className="fl-input">
                        <span>Passport number</span>
                        <input value={p.passport} onChange={(e) => setPaxField(i, { passport: e.target.value })} placeholder="Passport no." />
                      </label>
                      <label className="fl-input">
                        <span>Passport expiry</span>
                        <input type="date" value={p.passportExpiry} onChange={(e) => setPaxField(i, { passportExpiry: e.target.value })} />
                      </label>
                    </>
                  )}
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
            {live ? (
              <p className="fl-checkout-sandbox">
                🔒 This is a <strong>sandbox test booking</strong> — payment is settled through LiteAPI's
                test transaction, so no card details are needed and nothing is charged.
              </p>
            ) : (
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
            )}
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

            <button type="submit" className="fl-checkout-pay" disabled={submitting}>
              {submitting ? 'Booking…' : `Confirm ${live ? 'booking' : '& pay'} ${money(fare.price, currency)}`}
            </button>
            <p className="fl-checkout-demo-note">
              {live ? 'Sandbox test booking — no card is charged.' : 'Demo checkout — no card is charged.'}
            </p>
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
