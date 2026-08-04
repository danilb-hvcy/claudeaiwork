/**
 * Mock hotel inventory for HeyVacay Skye.AI MVP
 * Data is structured to mirror the RateHawk API schema for easy swap-in.
 * See src/utils/ratehawk.js for the live integration pattern.
 */

export const mockHotels = [
  {
    id: "excellence-playa-mujeres",
    name: "Excellence Playa Mujeres",
    location: "Cancún, Mexico",
    city: "Cancún",
    country: "Mexico",
    region: "Caribbean",
    coordinates: { lat: 21.2682, lng: -86.7502 },
    stars: 5,
    rating: 4.9,
    reviews: 3241,
    price_per_night: 289,
    original_price: 459,
    currency: "USD",
    amenities: [
      "Beachfront",
      "All-Inclusive",
      "Infinity Pool",
      "World-Class Spa",
      "Gourmet Dining",
      "Adults Only",
      "Free WiFi",
    ],
    perks: [
      "Welcome Champagne",
      "Room Upgrade on Arrival",
      "Late Checkout (2PM)",
      "Complimentary Mini-Bar",
    ],
    image_url:
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&h=380&fit=crop&q=80",
    refundable: true,
    description:
      "Adults-only paradise on a pristine 1km stretch of white-sand beach. All-inclusive luxury with 10 gourmet restaurants and 11 bars.",
    room_types: [
      { name: "Junior Suite Garden View", price: 289 },
      { name: "Junior Suite Ocean View", price: 349 },
      { name: "Ocean Front Suite", price: 499 },
    ],
    tags: ["beachfront", "adults-only", "all-inclusive", "luxury", "romantic", "cancun", "mexico", "caribbean"],
    check_in_time: "3:00 PM",
    check_out_time: "12:00 PM",
    cancellation_policy: "Fully refundable if cancelled 72 hours before check-in.",
  },
  {
    id: "waldorf-maldives",
    name: "Waldorf Astoria Maldives Ithaafushi",
    location: "South Malé Atoll, Maldives",
    city: "Maldives",
    country: "Maldives",
    region: "Indian Ocean",
    coordinates: { lat: 3.9736, lng: 73.5292 },
    stars: 5,
    rating: 4.9,
    reviews: 1187,
    price_per_night: 1290,
    original_price: 1850,
    currency: "USD",
    amenities: [
      "Overwater Bungalows",
      "Private Pool",
      "Coral Reef Snorkeling",
      "ESPA Spa",
      "11 Restaurants & Bars",
      "Seaplane Transfers",
      "Free WiFi",
    ],
    perks: [
      "Overwater Villa with Private Pool",
      "Daily Breakfast for Two",
      "Seaplane Transfer from Malé",
      "Sunset Dolphin Cruise",
    ],
    image_url:
      "https://images.unsplash.com/photo-1573843981267-be1d879d9d16?w=600&h=380&fit=crop&q=80",
    refundable: true,
    description:
      "The most awarded resort in the Maldives. Private overwater villas with direct lagoon access, crystal waters, and unmatched luxury.",
    room_types: [
      { name: "Reef Villa with Pool", price: 1290 },
      { name: "Ocean Villa with Pool", price: 1690 },
      { name: "Grand Overwater Villa", price: 2490 },
    ],
    tags: ["overwater", "maldives", "luxury", "romantic", "honeymoon", "snorkeling", "private pool"],
    check_in_time: "3:00 PM",
    check_out_time: "12:00 PM",
    cancellation_policy: "Fully refundable if cancelled 7 days before check-in.",
  },
  {
    id: "four-seasons-maui",
    name: "Four Seasons Resort Maui at Wailea",
    location: "Wailea, Maui, Hawaii",
    city: "Maui",
    country: "United States",
    region: "Hawaii",
    coordinates: { lat: 20.6851, lng: -156.4425 },
    stars: 5,
    rating: 4.8,
    reviews: 4892,
    price_per_night: 679,
    original_price: 950,
    currency: "USD",
    amenities: [
      "Beachfront",
      "3 Pools",
      "Spa",
      "Watersports",
      "5 Restaurants",
      "Kids Club",
      "Free WiFi",
    ],
    perks: [
      "Daily Breakfast",
      "Complimentary Cabana",
      "Watersport Equipment Rental",
      "Early Check-In (Noon)",
    ],
    image_url:
      "https://images.unsplash.com/photo-1520250497591-112581d77d1f?w=600&h=380&fit=crop&q=80",
    refundable: true,
    description:
      "Hawaii's finest beachfront resort on the golden crescent of Wailea Beach. Iconic service, three oceanfront pools, and the island's best dining.",
    room_types: [
      { name: "Mountain View Room", price: 679 },
      { name: "Ocean View Room", price: 849 },
      { name: "Ocean Front Suite", price: 1299 },
    ],
    tags: ["beachfront", "hawaii", "maui", "family", "luxury", "pool", "watersports"],
    check_in_time: "3:00 PM",
    check_out_time: "12:00 PM",
    cancellation_policy: "Fully refundable if cancelled 48 hours before check-in.",
  },
  {
    id: "belmond-cipriani",
    name: "Belmond Hotel Cipriani",
    location: "Giudecca Island, Venice, Italy",
    city: "Venice",
    country: "Italy",
    region: "Europe",
    coordinates: { lat: 45.4267, lng: 12.3387 },
    stars: 5,
    rating: 4.9,
    reviews: 2103,
    price_per_night: 895,
    original_price: 1250,
    currency: "USD",
    amenities: [
      "Private Island",
      "Heated Saltwater Pool",
      "Michelin-Star Dining",
      "Casanova Spa",
      "Private Boats to San Marco",
      "Tennis Court",
      "Free WiFi",
    ],
    perks: [
      "Private Boat Transfer from Airport",
      "Welcome Prosecco & Antipasti",
      "Daily Afternoon Tea",
      "Priority Table at Oro Restaurant",
    ],
    image_url:
      "https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=600&h=380&fit=crop&q=80",
    refundable: false,
    description:
      "Venice's most iconic hotel on its own private island. Breathtaking views of Piazza San Marco, heated pool, and legendary Cipriani hospitality since 1958.",
    room_types: [
      { name: "Classic Room Garden View", price: 895 },
      { name: "Deluxe Room Lagoon View", price: 1195 },
      { name: "Penthouse Suite", price: 3500 },
    ],
    tags: ["venice", "italy", "europe", "luxury", "romantic", "historic", "cultural", "anniversary"],
    check_in_time: "3:00 PM",
    check_out_time: "12:00 PM",
    cancellation_policy: "Non-refundable. Cancellation results in full charge.",
  },
  {
    id: "park-hyatt-tokyo",
    name: "Park Hyatt Tokyo",
    location: "Shinjuku, Tokyo, Japan",
    city: "Tokyo",
    country: "Japan",
    region: "Asia",
    coordinates: { lat: 35.6870, lng: 139.6929 },
    stars: 5,
    rating: 4.8,
    reviews: 3567,
    price_per_night: 498,
    original_price: 720,
    currency: "USD",
    amenities: [
      "Panoramic City Views",
      "Indoor Pool on 47th Floor",
      "The Peak Bar & Lounge",
      "New York Grill",
      "Club on the Park Fitness",
      "Spa",
      "Free WiFi",
    ],
    perks: [
      "Park Club Lounge Access",
      "Daily Breakfast for Two",
      "Complimentary Sake upon Arrival",
      "Late Checkout (2PM)",
    ],
    image_url:
      "https://images.unsplash.com/photo-1551882547-ff40c599c4e8?w=600&h=380&fit=crop&q=80",
    refundable: true,
    description:
      "As seen in Lost in Translation — Tokyo's most romantic high-rise sanctuary. Occupies floors 39–52 of the Shinjuku Park Tower with unrivaled Mt. Fuji views.",
    room_types: [
      { name: "Park Room City View", price: 498 },
      { name: "Deluxe City View Room", price: 650 },
      { name: "Park Suite", price: 1100 },
    ],
    tags: ["tokyo", "japan", "asia", "city", "luxury", "skyline", "romantic", "cultural"],
    check_in_time: "3:00 PM",
    check_out_time: "12:00 PM",
    cancellation_policy: "Fully refundable if cancelled 48 hours before check-in.",
  },
  {
    id: "jade-mountain-st-lucia",
    name: "Jade Mountain Resort",
    location: "Soufrière, St. Lucia",
    city: "Soufrière",
    country: "Saint Lucia",
    region: "Caribbean",
    coordinates: { lat: 13.8566, lng: -61.0571 },
    stars: 5,
    rating: 5.0,
    reviews: 987,
    price_per_night: 1150,
    original_price: 1580,
    currency: "USD",
    amenities: [
      "Private Infinity Pool in Every Suite",
      "Piton Mountain Views",
      "Organic Farm-to-Table Dining",
      "No TV (digital detox)",
      "Snorkeling & Diving",
      "Yoga Pavilion",
      "Free WiFi",
    ],
    perks: [
      "Private Infinity Pool",
      "Personal Sanctuary Butler",
      "Daily Breakfast & Dinner",
      "Complimentary Snorkeling Trip",
    ],
    image_url:
      "https://images.unsplash.com/photo-1582719508104-b4f35f9d28e1?w=600&h=380&fit=crop&q=80",
    refundable: true,
    description:
      "Consistently ranked the #1 hotel in the Caribbean. Open-wall sanctuaries with private infinity pools and unobstructed views of the iconic Piton mountains.",
    room_types: [
      { name: "Sky Sanctuary (Planets theme)", price: 1150 },
      { name: "Sky Sanctuary (Universe theme)", price: 1350 },
      { name: "Celestial Sky Sanctuary", price: 1750 },
    ],
    tags: ["st lucia", "caribbean", "luxury", "romantic", "honeymoon", "infinity pool", "private pool", "wellness"],
    check_in_time: "3:00 PM",
    check_out_time: "12:00 PM",
    cancellation_policy: "Fully refundable if cancelled 14 days before check-in.",
  },
  {
    id: "amanyara-turks",
    name: "Amanyara",
    location: "Providenciales, Turks & Caicos",
    city: "Providenciales",
    country: "Turks and Caicos Islands",
    region: "Caribbean",
    coordinates: { lat: 21.7987, lng: -72.2597 },
    stars: 5,
    rating: 4.9,
    reviews: 742,
    price_per_night: 1580,
    original_price: 2100,
    currency: "USD",
    amenities: [
      "Beachfront",
      "COMO Shambhala Spa",
      "PADI Dive Center",
      "Tennis Courts",
      "3 Infinity Pools",
      "Holistic Wellness Program",
      "Free WiFi",
    ],
    perks: [
      "Aman Journey Credit ($500)",
      "Daily Breakfast",
      "One Scuba Dive for Two",
      "Airport Transfers",
    ],
    image_url:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&q=80",
    refundable: true,
    description:
      "Remote barefoot luxury on Grace Bay, home to the world's best beach. Minimalist Aman pavilions set among coral rock and native sea grape trees.",
    room_types: [
      { name: "Ocean Pavilion", price: 1580 },
      { name: "Reef Pavilion", price: 1980 },
      { name: "4-Bedroom Villa", price: 6000 },
    ],
    tags: ["turks and caicos", "caribbean", "beach", "luxury", "diving", "wellness", "romantic", "honeymoon"],
    check_in_time: "3:00 PM",
    check_out_time: "12:00 PM",
    cancellation_policy: "Fully refundable if cancelled 14 days before check-in.",
  },
  {
    id: "montage-los-cabos",
    name: "Montage Los Cabos",
    location: "Los Cabos, Baja California Sur, Mexico",
    city: "Los Cabos",
    country: "Mexico",
    region: "Mexico Pacific",
    coordinates: { lat: 22.8905, lng: -109.9167 },
    stars: 5,
    rating: 4.8,
    reviews: 2156,
    price_per_night: 499,
    original_price: 750,
    currency: "USD",
    amenities: [
      "Beachfront on Sea of Cortez",
      "4 Swimming Pools",
      "Spa Montage",
      "Multiple Restaurants",
      "Surfing & Watersports",
      "Kids Club",
      "Free WiFi",
    ],
    perks: [
      "Daily Breakfast",
      "Surf Lesson for Two",
      "Spa Credit ($100)",
      "Room Upgrade (subject to availability)",
    ],
    image_url:
      "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=600&h=380&fit=crop&q=80",
    refundable: true,
    description:
      "Mexico's most glamorous beach resort where the Sea of Cortez meets the Pacific. Stunning architecture, celebrity chef dining, and world-class surfing.",
    room_types: [
      { name: "Deluxe Room", price: 499 },
      { name: "Ocean View Suite", price: 749 },
      { name: "Beachfront Penthouse", price: 1499 },
    ],
    tags: ["los cabos", "mexico", "beachfront", "luxury", "family", "surfing", "pool", "resort"],
    check_in_time: "3:00 PM",
    check_out_time: "12:00 PM",
    cancellation_policy: "Fully refundable if cancelled 48 hours before check-in.",
  },
  {
    id: "aman-sveti-stefan",
    name: "Aman Sveti Stefan",
    location: "Sveti Stefan, Montenegro",
    city: "Sveti Stefan",
    country: "Montenegro",
    region: "Europe",
    coordinates: { lat: 42.2597, lng: 18.8916 },
    stars: 5,
    rating: 4.8,
    reviews: 531,
    price_per_night: 1100,
    original_price: 1450,
    currency: "USD",
    amenities: [
      "Private Island Village",
      "2km Private Beach",
      "Aman Spa",
      "Cooking Classes",
      "Water Sports",
      "Tennis Academy",
      "Free WiFi",
    ],
    perks: [
      "Private Beach Access",
      "Daily Breakfast",
      "Wine & Cheese Welcome",
      "Afternoon Tea Daily",
    ],
    image_url:
      "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600&h=380&fit=crop&q=80",
    refundable: true,
    description:
      "Europe's most exclusive island retreat — a 15th-century Venetian fishing village transformed into the Adriatic's crown jewel. Staying here is staying in history.",
    room_types: [
      { name: "Cottage", price: 1100 },
      { name: "Piazza Cottage", price: 1400 },
      { name: "Villa Miločer Suite", price: 2800 },
    ],
    tags: ["montenegro", "europe", "luxury", "island", "beach", "romantic", "historic", "adriatic"],
    check_in_time: "3:00 PM",
    check_out_time: "12:00 PM",
    cancellation_policy: "Fully refundable if cancelled 14 days before check-in.",
  },
  {
    id: "rosewood-baha-mar",
    name: "Rosewood Baha Mar",
    location: "Nassau, Bahamas",
    city: "Nassau",
    country: "Bahamas",
    region: "Caribbean",
    coordinates: { lat: 25.0881, lng: -77.3375 },
    stars: 5,
    rating: 4.7,
    reviews: 1893,
    price_per_night: 385,
    original_price: 590,
    currency: "USD",
    amenities: [
      "11 Pools",
      "Private Beach",
      "Sense Spa",
      "Casino Access",
      "11 Restaurants",
      "Water Park",
      "Free WiFi",
    ],
    perks: [
      "Daily Resort Credit ($75)",
      "Welcome Cocktail",
      "Water Park Access",
      "Priority Casino Access",
    ],
    image_url:
      "https://images.unsplash.com/photo-1540541338537-1220059c4019?w=600&h=380&fit=crop&q=80",
    refundable: true,
    description:
      "The Bahamas' most celebrated new resort. Rosewood's signature residential style meets 11 oceanfront pools, a world-class casino, and crystal-clear Nassau waters.",
    room_types: [
      { name: "Manor Room", price: 385 },
      { name: "Ocean View Suite", price: 525 },
      { name: "Estate Suite", price: 995 },
    ],
    tags: ["bahamas", "nassau", "caribbean", "beach", "luxury", "pool", "casino", "family", "resort"],
    check_in_time: "3:00 PM",
    check_out_time: "12:00 PM",
    cancellation_policy: "Fully refundable if cancelled 48 hours before check-in.",
  },
];

/**
 * Fast id → hotel lookup. This inventory is the single source of truth for
 * all factual hotel fields (prices, ratings, refundability, room types…).
 */
const hotelsById = new Map(mockHotels.map((h) => [h.id, h]));

/**
 * Normalize a hotel name for fuzzy fallback matching (lowercase, alnum only).
 */
const normalizeName = (name = '') =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const hotelsByName = new Map(
  mockHotels.map((h) => [normalizeName(h.name), h])
);

/**
 * Look up the canonical hotel record by id (preferred) or, as a fallback,
 * by normalized name. Returns undefined if the reference doesn't match any
 * real property in inventory.
 *
 * @param {{id?: string, name?: string}} ref
 * @returns {Object|undefined} The canonical hotel object from inventory.
 */
export function getCanonicalHotel(ref) {
  if (!ref) return undefined;
  if (ref.id && hotelsById.has(ref.id)) return hotelsById.get(ref.id);
  if (ref.name) {
    const byName = hotelsByName.get(normalizeName(ref.name));
    if (byName) return byName;
  }
  return undefined;
}

/**
 * Helper: search hotels by tags, region, city, or country.
 * Used internally by the Skye AI response handler.
 */
export function searchHotels({ destination, maxPrice, tags = [], stars } = {}) {
  return mockHotels.filter((hotel) => {
    if (maxPrice && hotel.price_per_night > maxPrice) return false;
    if (stars && hotel.stars < stars) return false;

    if (destination) {
      const dest = destination.toLowerCase();
      const locationMatch =
        hotel.city.toLowerCase().includes(dest) ||
        hotel.country.toLowerCase().includes(dest) ||
        hotel.region.toLowerCase().includes(dest) ||
        hotel.location.toLowerCase().includes(dest) ||
        hotel.tags.some((t) => t.includes(dest));
      if (!locationMatch) return false;
    }

    if (tags.length > 0) {
      const hasTag = tags.some((tag) =>
        hotel.tags.some((t) => t.includes(tag.toLowerCase()))
      );
      if (!hasTag) return false;
    }

    return true;
  });
}

export default mockHotels;
