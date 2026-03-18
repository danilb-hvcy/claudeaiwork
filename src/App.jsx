import React from 'react';
import SkyeWidget from './components/SkyeWidget.jsx';

// Mock HeyVacay page — replace with your actual website
function HeyVacayPage() {
  return (
    <div className="hv-page">
      {/* Nav */}
      <nav className="hv-nav">
        <div className="hv-nav-inner">
          <div className="hv-nav-logo">
            <svg viewBox="0 0 500 500" width="36" height="36" fill="none">
              <circle cx="250" cy="250" r="250" fill="#00C4CC" />
              <text x="90" y="330" fontSize="320" fontFamily="Arial">🌴</text>
            </svg>
            <span className="hv-wordmark">hey<strong>vacay</strong></span>
          </div>
          <div className="hv-nav-links">
            <a href="#" className="hv-nav-link">Hotels</a>
            <a href="#" className="hv-nav-link">Flights</a>
            <a href="#" className="hv-nav-link">Packages</a>
            <span className="hv-nav-skye">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
              Skye.AI
            </span>
          </div>
          <button className="hv-nav-cta">Hi, Traveler</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hv-hero">
        <div className="hv-hero-overlay" />
        <img
          src="https://images.unsplash.com/photo-1520250497591-112581d77d1f?w=1600&h=700&fit=crop&q=80"
          alt="Tropical resort"
          className="hv-hero-bg"
        />
        <div className="hv-hero-content">
          <h1 className="hv-hero-title">Start your Trip —<br />The Best Hotel Deals are Now Unlocked</h1>

          {/* Search Tabs */}
          <div className="hv-tabs">
            <button className="hv-tab hv-tab-active">🏨 Hotels</button>
            <button className="hv-tab">✈️ Flights</button>
            <button className="hv-tab">📦 Packages</button>
            <button className="hv-tab hv-tab-skye">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
              Skye.AI
            </button>
          </div>

          {/* Search Bar */}
          <div className="hv-search-bar">
            <div className="hv-search-field">
              <label>City, Area or Property</label>
              <input type="text" placeholder="Where to?" defaultValue="" />
            </div>
            <div className="hv-search-divider" />
            <div className="hv-search-field">
              <label>Date</label>
              <input type="text" placeholder="Check-in → Check-out" />
            </div>
            <div className="hv-search-divider" />
            <div className="hv-search-field">
              <label>Room and Guest</label>
              <input type="text" placeholder="1 Room, 2 Guests" />
            </div>
            <button className="hv-search-btn">Search</button>
          </div>
        </div>
      </section>

      {/* Recommended section */}
      <section className="hv-section">
        <div className="hv-section-header">
          <h2>Recommended Stays</h2>
          <a href="#" className="hv-explore-link">Explore more →</a>
        </div>
        <div className="hv-recommended-grid">
          {[
            { name: "Excellence Playa Mujeres", location: "Cancún, Mexico", price: 289, img: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400&h=280&fit=crop&q=80", stars: 5 },
            { name: "Waldorf Astoria Maldives", location: "Maldives", price: 1290, img: "https://images.unsplash.com/photo-1573843981267-be1d879d9d16?w=400&h=280&fit=crop&q=80", stars: 5 },
            { name: "Four Seasons Maui", location: "Wailea, Hawaii", price: 679, img: "https://images.unsplash.com/photo-1520250497591-112581d77d1f?w=400&h=280&fit=crop&q=80", stars: 5 },
            { name: "Jade Mountain Resort", location: "St. Lucia", price: 1150, img: "https://images.unsplash.com/photo-1582719508104-b4f35f9d28e1?w=400&h=280&fit=crop&q=80", stars: 5 },
          ].map((hotel) => (
            <div key={hotel.name} className="hv-rec-card">
              <img src={hotel.img} alt={hotel.name} className="hv-rec-img" />
              <div className="hv-rec-body">
                <p className="hv-rec-stars">{'★'.repeat(hotel.stars)}</p>
                <h3 className="hv-rec-name">{hotel.name}</h3>
                <p className="hv-rec-loc">{hotel.location}</p>
                <p className="hv-rec-price">from <strong>${hotel.price}</strong>/night</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skye CTA Banner */}
      <section className="hv-skye-banner">
        <div className="hv-skye-banner-inner">
          <div className="hv-skye-banner-text">
            <h2>Let Skye plan your perfect trip</h2>
            <p>Our AI travel consultant finds hidden deals and creates personalized itineraries in seconds.</p>
          </div>
          <button className="hv-skye-banner-btn" onClick={() => {
            // Trigger widget open via custom event
            window.dispatchEvent(new CustomEvent('openSkye'));
          }}>
            Chat with Skye →
          </button>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <>
      <HeyVacayPage />
      <SkyeWidget />
    </>
  );
}
