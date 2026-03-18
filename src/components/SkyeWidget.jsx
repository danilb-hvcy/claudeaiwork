import React, { useState, useEffect, useRef, useCallback } from 'react';
import HotelCard from './HotelCard.jsx';
import BookingSummary from './BookingSummary.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import HotelDetailModal from './HotelDetailModal.jsx';
import { sendMessageToSkye } from '../utils/skyeApi.js';

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const PalmLogo = ({ size = 36 }) => (
  <svg viewBox="0 0 500 500" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="250" cy="250" r="250" fill="#00C4CC" />
    {/* Palm tree silhouette */}
    <g transform="translate(125,80) scale(0.5)">
      <text x="0" y="320" fontSize="380" fontFamily="Arial">🌴</text>
    </g>
  </svg>
);

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const MinimizeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13H5v-2h14v2z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
  </svg>
);

// ─── Booking Intake Form ──────────────────────────────────────────────────────

function BookingIntakeForm({ hotel, onSubmit }) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    check_in: '',
    check_out: '',
    guests: 2,
    room_type: hotel.room_types?.[0]?.name || 'Standard Room',
  });

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nights = form.check_in && form.check_out
      ? Math.max(1, Math.round((new Date(form.check_out) - new Date(form.check_in)) / 86400000))
      : 1;
    const total = hotel.price_per_night * nights;
    onSubmit({ ...form, nights, total });
  };

  return (
    <form className="hv-intake-form" onSubmit={handleSubmit}>
      <div className="hv-intake-hotel-mini">
        <img src={hotel.image_url} alt={hotel.name} className="hv-intake-thumb"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=120&h=80&fit=crop'; }} />
        <div>
          <p className="hv-intake-hotel-name">{hotel.name}</p>
          <p className="hv-intake-hotel-loc">{hotel.location}</p>
        </div>
      </div>

      <div className="hv-form-group">
        <label className="hv-form-label">Full Name *</label>
        <input className="hv-form-input" name="full_name" required value={form.full_name}
          onChange={handleChange} placeholder="John Smith" />
      </div>

      <div className="hv-form-row">
        <div className="hv-form-group">
          <label className="hv-form-label">Email *</label>
          <input className="hv-form-input" name="email" type="email" required value={form.email}
            onChange={handleChange} placeholder="john@example.com" />
        </div>
        <div className="hv-form-group">
          <label className="hv-form-label">Phone *</label>
          <input className="hv-form-input" name="phone" type="tel" required value={form.phone}
            onChange={handleChange} placeholder="+1 555 0100" />
        </div>
      </div>

      <div className="hv-form-row">
        <div className="hv-form-group">
          <label className="hv-form-label">Check-in *</label>
          <input className="hv-form-input" name="check_in" type="date" required value={form.check_in}
            onChange={handleChange} min={new Date().toISOString().split('T')[0]} />
        </div>
        <div className="hv-form-group">
          <label className="hv-form-label">Check-out *</label>
          <input className="hv-form-input" name="check_out" type="date" required value={form.check_out}
            onChange={handleChange} min={form.check_in || new Date().toISOString().split('T')[0]} />
        </div>
      </div>

      <div className="hv-form-row">
        <div className="hv-form-group">
          <label className="hv-form-label">Guests</label>
          <select className="hv-form-input" name="guests" value={form.guests} onChange={handleChange}>
            {[1,2,3,4,5,6].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
            ))}
          </select>
        </div>
        <div className="hv-form-group">
          <label className="hv-form-label">Room Type</label>
          <select className="hv-form-input" name="room_type" value={form.room_type} onChange={handleChange}>
            {hotel.room_types?.map((r) => (
              <option key={r.name} value={r.name}>{r.name}</option>
            )) || <option>Standard Room</option>}
          </select>
        </div>
      </div>

      <button type="submit" className="hv-btn hv-btn-primary hv-btn-full" style={{ marginTop: 8 }}>
        Review Booking Summary →
      </button>
    </form>
  );
}

// ─── Message Renderer ─────────────────────────────────────────────────────────

function ChatMessage({ message, onHotelSelect, onHotelView, onIntakeSubmit, onConfirmBooking, onEditBooking }) {
  const isSkye = message.role === 'skye';
  const data = message.data;

  if (!isSkye) {
    return (
      <div className="hv-msg hv-msg-user">
        <div className="hv-bubble hv-bubble-user">{message.text}</div>
      </div>
    );
  }

  // Skye message
  return (
    <div className="hv-msg hv-msg-skye">
      <div className="hv-avatar-wrap">
        <div className="hv-avatar">
          <PalmLogo size={32} />
        </div>
        <span className="hv-avatar-name">Skye</span>
      </div>
      <div className="hv-skye-content">
        {/* Text message */}
        {data?.type === 'text' && (
          <div className="hv-bubble hv-bubble-skye">
            <MessageText text={data.message || message.text} />
          </div>
        )}

        {/* Hotel cards */}
        {data?.type === 'hotels' && (
          <>
            {data.message && (
              <div className="hv-bubble hv-bubble-skye">
                <MessageText text={data.message} />
              </div>
            )}
            <div className="hv-hotel-cards">
              {data.hotels?.map((hotel, i) => (
                <HotelCard
                  key={hotel.id || i}
                  hotel={hotel}
                  onSelect={onHotelSelect}
                  onViewMore={onHotelView}
                />
              ))}
            </div>
          </>
        )}

        {/* Booking intake */}
        {data?.type === 'booking_intake' && (
          <>
            {data.message && (
              <div className="hv-bubble hv-bubble-skye">
                <MessageText text={data.message} />
              </div>
            )}
            <BookingIntakeForm hotel={data.hotel} onSubmit={onIntakeSubmit} />
          </>
        )}

        {/* Booking summary */}
        {data?.type === 'booking_summary' && (
          <>
            {data.message && (
              <div className="hv-bubble hv-bubble-skye">
                <MessageText text={data.message} />
              </div>
            )}
            <BookingSummary
              hotel={data.hotel}
              booking={data.booking}
              onConfirm={onConfirmBooking}
              onEdit={onEditBooking}
            />
          </>
        )}

        {/* Fallback plain text */}
        {!data?.type && message.text && (
          <div className="hv-bubble hv-bubble-skye">
            <MessageText text={message.text} />
          </div>
        )}
      </div>
    </div>
  );
}

function MessageText({ text }) {
  if (!text) return null;
  // Simple newline-to-br rendering
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

// ─── Intro Animation ──────────────────────────────────────────────────────────

function SkyeIntro({ onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="hv-intro">
      <div className="hv-intro-content">
        <div className="hv-intro-logo">
          <PalmLogo size={72} />
          <div className="hv-intro-pulse" />
        </div>
        <h2 className="hv-intro-brand">HeyVacay</h2>
        <div className="hv-intro-skye">
          <SparkleIcon />
          <span>Skye.AI</span>
          <SparkleIcon />
        </div>
        <p className="hv-intro-tagline">World's best trips at the world's best prices</p>
        <div className="hv-intro-dots">
          <span className="hv-intro-dot" />
          <span className="hv-intro-dot" />
          <span className="hv-intro-dot" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'skye',
  text: "Hi! I'm Skye, your personal travel consultant at HeyVacay. I'm here to find you the world's best hotel deals — think of me as your luxury travel advisor on speed dial.\n\nWhere are you dreaming of going?",
  data: {
    type: 'text',
    message: "Hi! I'm Skye, your personal travel consultant at HeyVacay. I'm here to find you the world's best hotel deals — think of me as your luxury travel advisor on speed dial.\n\nWhere are you dreaming of going?",
    quick_replies: ['Beach getaway 🏖️', 'City & culture 🏙️', 'Romantic escape 💑', 'Surprise me! 🌍'],
  },
};

export default function SkyeWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [history, setHistory] = useState([]); // Claude API conversation history
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [detailHotel, setDetailHotel] = useState(null);
  const [hasApiKey] = useState(() => {
    const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
    return key && key !== 'sk-ant-your-key-here';
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when widget opens
  useEffect(() => {
    if (isOpen && !isMinimized && !showIntro) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized, showIntro]);

  const openWidget = () => {
    if (!isOpen) {
      setShowIntro(true);
      setIsOpen(true);
      setIsMinimized(false);
    } else if (isMinimized) {
      setIsMinimized(false);
    }
  };

  const minimizeWidget = () => setIsMinimized(true);
  const closeWidget = () => setIsOpen(false);

  const dismissIntro = useCallback(() => setShowIntro(false), []);

  const addSkyeMessage = (data) => {
    const msg = {
      id: Date.now() + Math.random(),
      role: 'skye',
      text: data?.message || '',
      data,
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isTyping) return;

    setError(null);
    const userText = text.trim();
    setInputValue('');

    // Add user message
    const userMsg = { id: Date.now(), role: 'user', text: userText };
    setMessages((prev) => [...prev, userMsg]);

    // Update Claude history
    const newHistory = [...history, { role: 'user', content: userText }];
    setHistory(newHistory);

    setIsTyping(true);

    try {
      const response = await sendMessageToSkye(history, userText);

      setIsTyping(false);
      addSkyeMessage(response);

      // Update history with assistant reply
      setHistory((prev) => [
        ...prev,
        { role: 'assistant', content: response.message || JSON.stringify(response) },
      ]);
    } catch (err) {
      setIsTyping(false);
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleQuickReply = (reply) => sendMessage(reply);

  const handleHotelSelect = (hotel) => {
    const userText = `I'd like to book ${hotel.name}`;
    const userMsg = { id: Date.now(), role: 'user', text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setHistory((prev) => [...prev, { role: 'user', content: userText }]);

    // Immediately show booking intake form
    const intakeData = {
      type: 'booking_intake',
      message: `Excellent choice! ${hotel.name} is one of our most loved properties. Let me collect a few details to hold your room.`,
      hotel,
      fields_needed: ['full_name', 'email', 'phone'],
    };
    addSkyeMessage(intakeData);
    setHistory((prev) => [...prev, { role: 'assistant', content: intakeData.message }]);
  };

  const handleHotelView = (hotel) => setDetailHotel(hotel);

  const handleIntakeSubmit = (formData) => {
    // Store the form in a message and show summary
    const summaryData = {
      type: 'booking_summary',
      message: "Here's your complete booking summary. Please review everything carefully before proceeding to payment.",
      hotel: messages.findLast?.((m) => m.data?.type === 'booking_intake')?.data?.hotel
        || messages.reverse().find((m) => m.data?.type === 'booking_intake')?.data?.hotel,
      booking: formData,
    };
    addSkyeMessage(summaryData);
  };

  const handleConfirmBooking = () => {
    addSkyeMessage({
      type: 'text',
      message: "🎉 Redirecting you to secure payment now... (In the live version, this would connect to the payment gateway. Your booking reference will be emailed to you shortly.)",
      quick_replies: ['Book another hotel', 'Start over'],
    });
  };

  const handleEditBooking = () => {
    const lastIntake = [...messages].reverse().find((m) => m.data?.type === 'booking_intake');
    if (lastIntake) {
      addSkyeMessage(lastIntake.data);
    }
  };

  const handleStartOver = () => {
    setMessages([WELCOME_MESSAGE]);
    setHistory([]);
    setError(null);
  };

  // The last skye message for quick replies
  const lastSkyeMsg = [...messages].reverse().find((m) => m.role === 'skye');
  const quickReplies = lastSkyeMsg?.data?.quick_replies || [];

  return (
    <>
      {/* Floating Launcher Button */}
      {(!isOpen || isMinimized) && (
        <button className="hv-launcher" onClick={openWidget} aria-label="Open Skye.AI">
          <div className="hv-launcher-inner">
            <PalmLogo size={28} />
            <div className="hv-launcher-text">
              <span className="hv-launcher-brand">Skye.AI</span>
              <span className="hv-launcher-sub">Travel Assistant</span>
            </div>
          </div>
          <div className="hv-launcher-pulse" />
          {isMinimized && <span className="hv-minimized-badge">1</span>}
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && !isMinimized && (
        <div className="hv-widget" role="dialog" aria-label="Skye.AI Travel Assistant">
          {/* Intro Animation */}
          {showIntro && <SkyeIntro onDismiss={dismissIntro} />}

          {/* Widget Header */}
          <div className="hv-header">
            <div className="hv-header-brand">
              <PalmLogo size={38} />
              <div>
                <div className="hv-header-title">
                  <span>Skye.AI</span>
                  <SparkleIcon />
                </div>
                <p className="hv-header-sub">HeyVacay Travel Consultant • Online</p>
              </div>
            </div>
            <div className="hv-header-actions">
              <button className="hv-icon-btn" onClick={handleStartOver} title="Start over" aria-label="Start over">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                </svg>
              </button>
              <button className="hv-icon-btn" onClick={minimizeWidget} title="Minimize" aria-label="Minimize">
                <MinimizeIcon />
              </button>
              <button className="hv-icon-btn" onClick={closeWidget} title="Close" aria-label="Close">
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* API Key Notice */}
          {!hasApiKey && (
            <div className="hv-api-notice">
              <strong>Demo Mode</strong> — Add your <code>VITE_ANTHROPIC_API_KEY</code> to <code>.env</code> for live AI responses.
            </div>
          )}

          {/* Messages */}
          <div className="hv-messages" role="log" aria-live="polite">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onHotelSelect={handleHotelSelect}
                onHotelView={handleHotelView}
                onIntakeSubmit={handleIntakeSubmit}
                onConfirmBooking={handleConfirmBooking}
                onEditBooking={handleEditBooking}
              />
            ))}

            {isTyping && <TypingIndicator />}

            {error && (
              <div className="hv-error-msg">
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {quickReplies.length > 0 && !isTyping && (
            <div className="hv-quick-replies" role="group" aria-label="Quick reply options">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  className="hv-quick-chip"
                  onClick={() => handleQuickReply(reply)}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="hv-input-bar">
            <button className="hv-mic-btn" title="Voice input (coming soon)" aria-label="Voice input">
              <MicIcon />
            </button>
            <textarea
              ref={inputRef}
              className="hv-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your trip..."
              rows={1}
              aria-label="Message Skye"
            />
            <button
              className={`hv-send-btn ${inputValue.trim() ? 'hv-send-active' : ''}`}
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>

          {/* Footer */}
          <div className="hv-footer">
            <span>Powered by</span>
            <strong> HeyVacay</strong>
            <span> · Hotel-only MVP</span>
          </div>
        </div>
      )}

      {/* Hotel Detail Modal */}
      {detailHotel && (
        <HotelDetailModal
          hotel={detailHotel}
          onClose={() => setDetailHotel(null)}
          onSelect={(hotel) => {
            setDetailHotel(null);
            handleHotelSelect(hotel);
          }}
        />
      )}
    </>
  );
}
