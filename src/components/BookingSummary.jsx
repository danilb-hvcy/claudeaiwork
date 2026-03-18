import React from 'react';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function BookingSummary({ hotel, booking, onConfirm, onEdit }) {
  const nights = booking.nights || 1;
  const total = booking.total || hotel.price_per_night * nights;
  const originalTotal = hotel.original_price * nights;
  const totalSavings = originalTotal - total;

  return (
    <div className="hv-booking-summary">
      {/* Header */}
      <div className="hv-bs-header">
        <div className="hv-bs-icon">🏨</div>
        <div>
          <p className="hv-bs-pre">Booking Summary</p>
          <h3 className="hv-bs-title">{hotel.name}</h3>
          <p className="hv-bs-location">{hotel.location}</p>
        </div>
      </div>

      {/* Hotel image strip */}
      <div className="hv-bs-img-wrap">
        <img
          src={hotel.image_url}
          alt={hotel.name}
          className="hv-bs-img"
          onError={(e) => {
            e.target.src = `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=200&fit=crop&q=80`;
          }}
        />
      </div>

      {/* Guest Details */}
      <div className="hv-bs-section">
        <h4 className="hv-bs-section-title">Guest Information</h4>
        <div className="hv-bs-row">
          <span className="hv-bs-key">Name</span>
          <span className="hv-bs-val">{booking.full_name || '—'}</span>
        </div>
        <div className="hv-bs-row">
          <span className="hv-bs-key">Email</span>
          <span className="hv-bs-val">{booking.email || '—'}</span>
        </div>
        <div className="hv-bs-row">
          <span className="hv-bs-key">Phone</span>
          <span className="hv-bs-val">{booking.phone || '—'}</span>
        </div>
      </div>

      {/* Stay Details */}
      <div className="hv-bs-section">
        <h4 className="hv-bs-section-title">Stay Details</h4>
        <div className="hv-bs-row">
          <span className="hv-bs-key">Room</span>
          <span className="hv-bs-val">{booking.room_type || 'Standard Room'}</span>
        </div>
        <div className="hv-bs-row">
          <span className="hv-bs-key">Check-in</span>
          <span className="hv-bs-val">{formatDate(booking.check_in)}</span>
        </div>
        <div className="hv-bs-row">
          <span className="hv-bs-key">Check-out</span>
          <span className="hv-bs-val">{formatDate(booking.check_out)}</span>
        </div>
        <div className="hv-bs-row">
          <span className="hv-bs-key">Guests</span>
          <span className="hv-bs-val">{booking.guests || 2} {(booking.guests || 2) === 1 ? 'Guest' : 'Guests'}</span>
        </div>
        <div className="hv-bs-row">
          <span className="hv-bs-key">Nights</span>
          <span className="hv-bs-val">{nights} {nights === 1 ? 'night' : 'nights'}</span>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="hv-bs-section">
        <h4 className="hv-bs-section-title">Price Breakdown</h4>
        <div className="hv-bs-row">
          <span className="hv-bs-key">Rate/night</span>
          <span className="hv-bs-val">{formatPrice(hotel.price_per_night)}</span>
        </div>
        {hotel.original_price && (
          <div className="hv-bs-row">
            <span className="hv-bs-key">Original rate</span>
            <span className="hv-bs-val hv-strikethrough">{formatPrice(hotel.original_price)}/night</span>
          </div>
        )}
        <div className="hv-bs-row hv-bs-row-total">
          <span className="hv-bs-key">Total ({nights} nights)</span>
          <span className="hv-bs-val hv-bs-total">{formatPrice(total)}</span>
        </div>
        {totalSavings > 0 && (
          <div className="hv-bs-savings-callout">
            <span>🎉 You're saving <strong>{formatPrice(totalSavings)}</strong> with HeyVacay!</span>
          </div>
        )}
      </div>

      {/* Policies */}
      <div className="hv-bs-policies">
        {hotel.refundable ? (
          <div className="hv-policy hv-policy-green">
            <span className="hv-policy-icon">✓</span>
            <span>Fully refundable excluding credit card processing fees.</span>
          </div>
        ) : (
          <div className="hv-policy hv-policy-red">
            <span className="hv-policy-icon">✗</span>
            <span>Non-refundable. Cancellation will result in full charge.</span>
          </div>
        )}
        <div className="hv-policy hv-policy-blue">
          <span className="hv-policy-icon">🕐</span>
          <span>Arrive after 3 PM, as the room may not be ready before then, unless early check-in is requested (which is not guaranteed).</span>
        </div>
      </div>

      {/* Actions */}
      <div className="hv-bs-actions">
        <button className="hv-btn hv-btn-confirm" onClick={onConfirm}>
          All is Correct — Let's Make the Payment!
        </button>
        <button className="hv-btn hv-btn-ghost" onClick={onEdit}>
          Edit Booking Details
        </button>
      </div>
    </div>
  );
}
