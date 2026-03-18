import React from 'react';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);

export default function HotelDetailModal({ hotel, onClose, onSelect }) {
  if (!hotel) return null;

  return (
    <div className="hv-modal-overlay" onClick={onClose}>
      <div className="hv-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="hv-modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="hv-dm-img-wrap">
          <img
            src={hotel.image_url}
            alt={hotel.name}
            className="hv-dm-img"
            onError={(e) => {
              e.target.src = `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop&q=80`;
            }}
          />
        </div>

        <div className="hv-dm-body">
          <div className="hv-dm-header">
            <div>
              <span className="hv-dm-stars">{'★'.repeat(hotel.stars)}</span>
              <h2 className="hv-dm-title">{hotel.name}</h2>
              <p className="hv-dm-location">{hotel.location}</p>
            </div>
            <div className="hv-dm-price-block">
              {hotel.original_price && (
                <span className="hv-price-original">{formatPrice(hotel.original_price)}/night</span>
              )}
              <span className="hv-dm-price">{formatPrice(hotel.price_per_night)}<small>/night</small></span>
            </div>
          </div>

          <p className="hv-dm-desc">{hotel.description}</p>

          <div className="hv-dm-section">
            <h4>Amenities</h4>
            <div className="hv-amenities">
              {hotel.amenities?.map((a) => (
                <span key={a} className="hv-amenity-chip">{a}</span>
              ))}
            </div>
          </div>

          <div className="hv-dm-section">
            <h4>✦ HeyVacay Member Perks</h4>
            <ul className="hv-dm-perks">
              {hotel.perks?.map((p) => (
                <li key={p}>✓ {p}</li>
              ))}
            </ul>
          </div>

          <div className="hv-dm-section">
            <h4>Available Rooms</h4>
            <div className="hv-room-list">
              {hotel.room_types?.map((r) => (
                <div key={r.name} className="hv-room-row">
                  <span className="hv-room-name">{r.name}</span>
                  <span className="hv-room-price">{formatPrice(r.price)}/night</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hv-dm-section">
            <h4>Cancellation Policy</h4>
            <p className={`hv-cancel-policy ${hotel.refundable ? 'hv-refundable' : 'hv-nonrefundable'}`}>
              {hotel.cancellation_policy}
              {hotel.refundable && ' Excluding credit card processing fees.'}
            </p>
          </div>

          <div className="hv-dm-checkin">
            <p>🕐 Arrive after 3 PM, as the room may not be ready before then, unless early check-in is requested (which is not guaranteed).</p>
          </div>

          <button className="hv-btn hv-btn-primary hv-btn-full" onClick={() => { onSelect(hotel); onClose(); }}>
            Select This Hotel
          </button>
        </div>
      </div>
    </div>
  );
}
