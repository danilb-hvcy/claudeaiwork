/**
 * Skye.AI – Claude API integration
 * Manages conversation history and structured JSON responses from Claude.
 */

import mockHotels from '../data/mockHotels.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

/**
 * System prompt that defines Skye's personality, capabilities, and response format.
 * All Claude responses MUST be valid JSON matching the SkyeResponse schema.
 */
export const SKYE_SYSTEM_PROMPT = `You are Skye, HeyVacay's AI travel consultant. HeyVacay is a premium travel brand that offers the world's best trips at the world's best prices. You specialize in hotel bookings ONLY (no flights, car rentals, or packages at this time). Your tone is warm, proactive, and consultant-like — think luxury travel advisor, never robotic.

## HeyVacay Hotel Inventory
You have access to this curated hotel inventory. When presenting hotels, ALWAYS pull from this list:

${JSON.stringify(mockHotels, null, 2)}

## Response Format
CRITICAL: Every single response MUST be a valid JSON object. No exceptions. No text outside the JSON.

Use one of these response types:

### Type 1 – Conversational text
{
  "type": "text",
  "message": "Your warm, consultative response here.",
  "quick_replies": ["Option A", "Option B", "Option C"]
}

### Type 2 – Hotel recommendations
{
  "type": "hotels",
  "message": "Intro message before the cards, e.g. 'Here are my top picks for you...'",
  "hotels": [
    {
      "id": "hotel-id-from-inventory",
      "name": "Hotel Name",
      "location": "City, Country",
      "stars": 5,
      "rating": 4.9,
      "price_per_night": 289,
      "original_price": 459,
      "amenities": ["Amenity 1", "Amenity 2"],
      "perks": ["Perk 1", "Perk 2"],
      "image_url": "url from inventory",
      "refundable": true,
      "description": "Brief enticing description"
    }
  ],
  "quick_replies": ["Show cheaper options", "Filter by pool & spa", "Tell me more about #1"]
}

### Type 3 – Booking intake (after user selects a hotel)
{
  "type": "booking_intake",
  "message": "Great choice! Let me get a few details to complete your booking.",
  "hotel": { ...hotel object from inventory... },
  "fields_needed": ["full_name", "email", "phone"]
}

### Type 4 – Booking summary (after collecting guest details)
{
  "type": "booking_summary",
  "message": "Here's your booking summary. Everything look good?",
  "hotel": { ...hotel object... },
  "booking": {
    "full_name": "Guest Name",
    "email": "guest@email.com",
    "phone": "+1-555-0100",
    "room_type": "Room Type Selected",
    "check_in": "YYYY-MM-DD",
    "check_out": "YYYY-MM-DD",
    "nights": 3,
    "guests": 2,
    "price_per_night": 289,
    "original_price": 459,
    "total": 867,
    "savings": 510,
    "refundable": true
  }
}

## Behavioral Rules
1. NEVER mention flights, car rentals, or packages. HeyVacay is hotel-only right now.
2. If the user's destination or dates are unclear, ask proactively. Don't guess.
3. When showing hotels, ALWAYS highlight HeyVacay savings vs. original price.
4. For refundable hotels, ALWAYS include this note: "Fully refundable excluding credit card processing fees."
5. ALWAYS include the check-in advisory: "Arrive after 3 PM, as the room may not be ready before then, unless early check-in is requested (which is not guaranteed)."
6. Keep responses concise and action-oriented. Lead with value, not explanation.
7. Be proactive — if someone says "anniversary trip," suggest romantic properties without being asked.
8. When a user selects a hotel, smoothly transition to collecting their booking details (name, email, phone).
9. Use quick_replies to guide the conversation forward. Include 2-4 chips per response when appropriate.
10. If a user asks something unrelated to travel/hotels, gently redirect them to travel planning.
11. ALWAYS return valid JSON. Never return plain text.`;

/**
 * Sends a message to Claude and returns a parsed SkyeResponse.
 * @param {Array} conversationHistory - Full message history [{role, content}]
 * @param {string} userMessage - The latest user message
 * @returns {Promise<Object>} Parsed SkyeResponse object
 */
export async function sendMessageToSkye(conversationHistory, userMessage) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'sk-ant-your-key-here') {
    // Return a helpful mock response when no API key is configured
    return getMockResponse(userMessage, conversationHistory);
  }

  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SKYE_SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.content?.[0]?.text || '';

  return parseRawResponse(rawContent);
}

/**
 * Parses the raw Claude response string into a structured SkyeResponse.
 * Strips markdown code fences if present.
 */
function parseRawResponse(raw) {
  // Strip ```json ... ``` wrappers
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fallback: wrap in text response
    return {
      type: 'text',
      message: raw || "I'm sorry, I had trouble processing that. Could you try again?",
      quick_replies: ['Search hotels', 'Start over'],
    };
  }
}

/**
 * Demo mode: returns realistic mock responses when no API key is set.
 * This lets developers preview the UI without spending API credits.
 */
function getMockResponse(userMessage, history) {
  const msg = userMessage.toLowerCase();
  const isFirstMessage = history.length === 0;

  if (isFirstMessage || msg.includes('hello') || msg.includes('hi')) {
    return {
      type: 'text',
      message:
        "Hi! I'm Skye, your personal travel consultant at HeyVacay. I'm here to find you the world's best hotel deals — think of me as your luxury travel advisor on speed dial. ✨\n\nWhere are you dreaming of going?",
      quick_replies: [
        'Beach getaway 🏖️',
        'City & culture 🏙️',
        'Romantic escape 💑',
        'Surprise me! 🌍',
      ],
    };
  }

  if (msg.includes('beach') || msg.includes('caribbean') || msg.includes('cancun') || msg.includes('bahamas')) {
    return {
      type: 'hotels',
      message:
        "Perfect taste! Here are my top beachfront picks — every one of these has HeyVacay member rates that I guarantee you won't find elsewhere:",
      hotels: [mockHotels[0], mockHotels[9], mockHotels[7]],
      quick_replies: [
        'Show all-inclusive only',
        'Under $500/night',
        'Most romantic option',
      ],
    };
  }

  if (msg.includes('maldives') || msg.includes('overwater') || msg.includes('bungalow')) {
    return {
      type: 'hotels',
      message:
        "Oh, the Maldives — excellent choice. I have one property there that consistently blows our guests away:",
      hotels: [mockHotels[1]],
      quick_replies: ['Tell me more', 'Book this', 'Show something cheaper'],
    };
  }

  if (msg.includes('europe') || msg.includes('italy') || msg.includes('venice') || msg.includes('anniversary')) {
    return {
      type: 'hotels',
      message:
        "For a European escape — especially a romantic one — these two properties are in a league of their own:",
      hotels: [mockHotels[3], mockHotels[8]],
      quick_replies: ['I love Venice!', 'More Europe options', 'Book the first one'],
    };
  }

  if (msg.includes('book') || msg.includes('select') || msg.includes('reserve')) {
    return {
      type: 'booking_intake',
      message:
        "Excellent choice! Let me collect a few details to hold your room. This will just take a moment.",
      hotel: mockHotels[0],
      fields_needed: ['full_name', 'email', 'phone'],
    };
  }

  if (msg.includes('cheaper') || msg.includes('budget') || msg.includes('under')) {
    return {
      type: 'hotels',
      message:
        "No worries — great value doesn't mean compromising on experience. Here are some of our best mid-range picks:",
      hotels: [mockHotels[0], mockHotels[4], mockHotels[7]],
      quick_replies: ['Under $300/night', 'Show all options', 'Include perks'],
    };
  }

  // Default
  return {
    type: 'text',
    message:
      "I'd love to help you plan the perfect trip! To find your ideal hotel, could you tell me:\n\n• Where are you thinking of going?\n• When are you planning to travel?\n• How many guests will be staying?",
    quick_replies: [
      'Beach destination',
      'City escape',
      'Open to suggestions',
    ],
  };
}
