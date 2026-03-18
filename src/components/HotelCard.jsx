import React from 'react';

const StarRating = ({ count }) => (
  <span className="hv-stars" aria-label={`${count} stars`}>
    {'★'.repeat(count)}{'☆'.repeat(5 - count)}
  </span>
);

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);

export default function HotelCard({ hotel, onSelect, onViewMore }) {
  const savings = hotel.original_price - hotel.price_per_night;
  const savingsPct = Math.round((savings / hotel.original_price) * 100);

  return (
    <div className="hv-hotel-card">
      {/* Hotel Image */}
      <div className="hv-hotel-img-wrap">
        <img
          src={hotel.image_url}
          alt={hotel.name}
          className="hv-hotel-img"
          onError={(e) => {
            e.target.src = `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&q=80`;
          }}
        />
        {hotel.refundable && (
          <span className="hv-badge hv-badge-refund">✓ Free Cancellation</span>
        )}
        {savingsPct > 0 && (
          <span className="hv-badge hv-badge-save">Save {savingsPct}%</span>
        )}
      </div>

      {/* Hotel Info */}
      <div className="hv-hotel-body">
        <div className="hv-hotel-header">
          <div>
            <StarRating count={hotel.stars} />
            <h3 className="hv-hotel-name">{hotel.name}</h3>
            <p className="hv-hotel-location">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              {hotel.location}
            </p>
          </div>
          <div className="hv-hotel-pricing">
            {hotel.original_price && (
              <span className="hv-price-original">{formatPrice(hotel.original_price)}</span>
            )}
            <span className="hv-price-now">{formatPrice(hotel.price_per_night)}</span>
            <span className="hv-price-label">/night</span>
          </div>
        </div>

        {/* Savings Callout */}
        {savings > 0 && (
          <div className="hv-savings-bar">
            <span>🎉 You save <strong>{formatPrice(savings)}/night</strong> with HeyVacay member rates</span>
          </div>
        )}

        {/* Rating */}
        {hotel.rating && (
          <div className="hv-rating-row">
            <span className="hv-rating-badge">{hotel.rating}</span>
            <span className="hv-rating-text">
              {hotel.rating >= 4.9 ? 'Exceptional' : hotel.rating >= 4.7 ? 'Excellent' : 'Very Good'}
            </span>
            {hotel.reviews && (
              <span className="hv-rating-reviews">· {hotel.reviews.toLocaleString()} reviews</span>
            )}
          </div>
        )}

        {/* Amenities */}
        {hotel.amenities?.length > 0 && (
          <div className="hv-amenities">
            {hotel.amenities.slice(0, 5).map((a) => (
              <span key={a} className="hv-amenity-chip">{a}</span>
            ))}
          </div>
        )}

        {/* Member Perks */}
        {hotel.perks?.length > 0 && (
          <div className="hv-perks">
            <p className="hv-perks-label">✦ HeyVacay Member Perks</p>
            <ul className="hv-perks-list">
              {hotel.perks.slice(0, 3).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="hv-hotel-actions">
          <button className="hv-btn hv-btn-primary" onClick={() => onSelect(hotel)}>
            Select This Hotel
          </button>
          <button className="hv-btn hv-btn-ghost" onClick={() => onViewMore(hotel)}>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
