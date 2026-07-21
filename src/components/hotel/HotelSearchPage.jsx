import React, { useState, useMemo, useCallback } from 'react';
import HotelSearchBar from './HotelSearchBar.jsx';
import HotelCard from '../HotelCard.jsx';
import HotelDetailModal from '../HotelDetailModal.jsx';
import { searchHotels } from '../../utils/liteApiHotels.js';
import { resolveCity } from '../../data/hotelCities.js';
import { toISO } from '../../utils/dates.js';

/** Default stay: two weeks out, three nights, in Rome. */
function defaultDates() {
  const ci = new Date(); ci.setDate(ci.getDate() + 14);
  const co = new Date(); co.setDate(co.getDate() + 17);
  return { checkin: toISO(ci), checkout: toISO(co) };
}

const DEFAULT_SEARCH = {
  destination: 'Rome, Italy',
  ...defaultDates(),
  rooms: 1,
  adults: 2,
};

const SORTS = [
  { id: 'price', label: 'Lowest price' },
  { id: 'rating', label: 'Top rated' },
  { id: 'stars', label: 'Most stars' },
];

export default function HotelSearchPage({ onExit }) {
  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('mock');
  const [hasSearched, setHasSearched] = useState(false);
  const [sort, setSort] = useState('price');
  const [detailHotel, setDetailHotel] = useState(null);

  const runSearch = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setDetailHotel(null);
    try {
      const place = resolveCity(params.destination) || { city: 'Rome', countryCode: 'IT' };
      const { hotels: list, source: src } = await searchHotels({
        city: place.city,
        countryCode: place.countryCode,
        checkin: params.checkin,
        checkout: params.checkout,
        adults: params.adults,
        rooms: params.rooms,
      });
      setHotels(list);
      setSource(src);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const startSearch = useCallback(() => {
    setHasSearched(true);
    runSearch(search);
  }, [runSearch, search]);

  const sortedHotels = useMemo(() => {
    const list = [...hotels];
    if (sort === 'price') list.sort((a, b) => a.price_per_night - b.price_per_night);
    else if (sort === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'stars') list.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    return list;
  }, [hotels, sort]);

  const nights = hotels[0]?.nights || 3;

  return (
    <div className="ht-page">
      {/* Nav */}
      <header className="fl-nav">
        <div className="fl-nav-left">
          <button className="fl-nav-menu" onClick={onExit} aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
          <button className="fl-nav-logo" onClick={onExit}>
            <span className="fl-logo-mark">🌴</span>
            <span className="fl-logo-text">hey<strong>vacay</strong></span>
          </button>
        </div>
        <div className="fl-nav-right">
          <button className="fl-nav-link">🧳 My Bookings</button>
          <button className="fl-nav-link">👤 Log In</button>
        </div>
      </header>

      {!hasSearched ? (
        <div className="ht-hero">
          <div className="ht-hero-inner">
            <h1 className="ht-hero-title">Find your perfect stay</h1>
            <p className="ht-hero-sub">Search live hotel deals across thousands of destinations.</p>
            <HotelSearchBar search={search} setSearch={setSearch} onSearch={startSearch} ctaLabel="Search hotels" />
          </div>
        </div>
      ) : (
        <>
          <HotelSearchBar search={search} setSearch={setSearch} onSearch={() => runSearch(search)} ctaLabel="Search" />

          {source === 'mock' && (
            <div className="fl-demo-note">
              Showing demo hotel data. Add your <code>LITEAPI_KEY</code> in your deployment's environment settings to show live rates — see <code>api/hotels.js</code>.
            </div>
          )}

          <div className="ht-results">
            <div className="ht-results-bar">
              <p className="ht-results-count">
                {loading ? 'Searching…' : `${sortedHotels.length} hotels in ${search.destination.split(',')[0]}`}
                {!loading && sortedHotels.length > 0 && <span className="ht-results-nights"> · {nights} night{nights > 1 ? 's' : ''}</span>}
              </p>
              <div className="ht-sort">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    className={`ht-sort-btn${sort === s.id ? ' ht-sort-active' : ''}`}
                    onClick={() => setSort(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="ht-grid">
                {[0, 1, 2, 3].map((i) => <div key={i} className="ht-card-skeleton" />)}
              </div>
            ) : error ? (
              <div className="fl-error">
                <p className="fl-error-title">We couldn't load hotels</p>
                <p className="fl-error-msg">{error}</p>
                <button className="fl-error-retry" onClick={() => runSearch(search)}>Try again</button>
              </div>
            ) : sortedHotels.length === 0 ? (
              <div className="fl-empty">
                <p className="fl-empty-title">No hotels found</p>
                <p className="fl-empty-msg">Try different dates or another destination.</p>
              </div>
            ) : (
              <div className="ht-grid">
                {sortedHotels.map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    onSelect={setDetailHotel}
                    onViewMore={setDetailHotel}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <footer className="fl-footer">
        <span>© 2025 Heyvacay</span>
        <div className="fl-footer-links">
          <a href="#">Privacy Policy</a><a href="#">Legal</a><a href="#">Terms</a>
          <a href="#">Contact us</a><a href="#">FAQs</a>
        </div>
      </footer>

      {detailHotel && (
        <HotelDetailModal
          hotel={detailHotel}
          onClose={() => setDetailHotel(null)}
          onSelect={(hotel) => {
            setDetailHotel(null);
            // eslint-disable-next-line no-alert
            alert(`Reserved ${hotel.name} — $${hotel.price_per_night}/night.\nHotel booking checkout is the next step.`);
          }}
        />
      )}
    </div>
  );
}
