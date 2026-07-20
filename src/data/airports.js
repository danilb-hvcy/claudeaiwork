/**
 * Compact list of major world airports for the From/To autocomplete.
 * Each entry: { code (IATA), city, name, country }.
 * Not exhaustive — enough to make real searches easy; extend as needed.
 */
export const AIRPORTS = [
  { code: 'SYD', city: 'Sydney', name: 'Kingsford Smith', country: 'Australia' },
  { code: 'MEL', city: 'Melbourne', name: 'Tullamarine', country: 'Australia' },
  { code: 'BNE', city: 'Brisbane', name: 'Brisbane', country: 'Australia' },
  { code: 'PER', city: 'Perth', name: 'Perth', country: 'Australia' },
  { code: 'AKL', city: 'Auckland', name: 'Auckland', country: 'New Zealand' },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles Intl', country: 'USA' },
  { code: 'SFO', city: 'San Francisco', name: 'San Francisco Intl', country: 'USA' },
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy', country: 'USA' },
  { code: 'EWR', city: 'Newark', name: 'Newark Liberty', country: 'USA' },
  { code: 'ORD', city: 'Chicago', name: "O'Hare", country: 'USA' },
  { code: 'DFW', city: 'Dallas', name: 'Dallas Fort Worth', country: 'USA' },
  { code: 'DEN', city: 'Denver', name: 'Denver Intl', country: 'USA' },
  { code: 'SEA', city: 'Seattle', name: 'Seattle Tacoma', country: 'USA' },
  { code: 'MIA', city: 'Miami', name: 'Miami Intl', country: 'USA' },
  { code: 'ATL', city: 'Atlanta', name: 'Hartsfield Jackson', country: 'USA' },
  { code: 'BOS', city: 'Boston', name: 'Logan Intl', country: 'USA' },
  { code: 'LAS', city: 'Las Vegas', name: 'Harry Reid Intl', country: 'USA' },
  { code: 'IAH', city: 'Houston', name: 'George Bush', country: 'USA' },
  { code: 'HNL', city: 'Honolulu', name: 'Daniel K. Inouye', country: 'USA' },
  { code: 'YYZ', city: 'Toronto', name: 'Pearson', country: 'Canada' },
  { code: 'YVR', city: 'Vancouver', name: 'Vancouver Intl', country: 'Canada' },
  { code: 'LHR', city: 'London', name: 'Heathrow', country: 'UK' },
  { code: 'LGW', city: 'London', name: 'Gatwick', country: 'UK' },
  { code: 'MAN', city: 'Manchester', name: 'Manchester', country: 'UK' },
  { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle', country: 'France' },
  { code: 'AMS', city: 'Amsterdam', name: 'Schiphol', country: 'Netherlands' },
  { code: 'FRA', city: 'Frankfurt', name: 'Frankfurt', country: 'Germany' },
  { code: 'MUC', city: 'Munich', name: 'Munich', country: 'Germany' },
  { code: 'MAD', city: 'Madrid', name: 'Barajas', country: 'Spain' },
  { code: 'BCN', city: 'Barcelona', name: 'El Prat', country: 'Spain' },
  { code: 'FCO', city: 'Rome', name: 'Fiumicino', country: 'Italy' },
  { code: 'ZRH', city: 'Zurich', name: 'Zurich', country: 'Switzerland' },
  { code: 'IST', city: 'Istanbul', name: 'Istanbul', country: 'Turkey' },
  { code: 'DXB', city: 'Dubai', name: 'Dubai Intl', country: 'UAE' },
  { code: 'DOH', city: 'Doha', name: 'Hamad Intl', country: 'Qatar' },
  { code: 'SIN', city: 'Singapore', name: 'Changi', country: 'Singapore' },
  { code: 'HKG', city: 'Hong Kong', name: 'Hong Kong Intl', country: 'Hong Kong' },
  { code: 'NRT', city: 'Tokyo', name: 'Narita', country: 'Japan' },
  { code: 'HND', city: 'Tokyo', name: 'Haneda', country: 'Japan' },
  { code: 'ICN', city: 'Seoul', name: 'Incheon', country: 'South Korea' },
  { code: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi', country: 'Thailand' },
  { code: 'KUL', city: 'Kuala Lumpur', name: 'KLIA', country: 'Malaysia' },
  { code: 'DEL', city: 'Delhi', name: 'Indira Gandhi', country: 'India' },
  { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji', country: 'India' },
  { code: 'PEK', city: 'Beijing', name: 'Capital', country: 'China' },
  { code: 'PVG', city: 'Shanghai', name: 'Pudong', country: 'China' },
  { code: 'GRU', city: 'São Paulo', name: 'Guarulhos', country: 'Brazil' },
  { code: 'MEX', city: 'Mexico City', name: 'Benito Juárez', country: 'Mexico' },
  { code: 'CUN', city: 'Cancún', name: 'Cancún Intl', country: 'Mexico' },
  { code: 'JNB', city: 'Johannesburg', name: 'O. R. Tambo', country: 'South Africa' },
  { code: 'CAI', city: 'Cairo', name: 'Cairo Intl', country: 'Egypt' },
  { code: 'NAN', city: 'Nadi', name: 'Nadi Intl', country: 'Fiji' },
];

/** "Sydney (SYD)" display label used in inputs + the datalist. */
export function airportLabel(a) {
  return `${a.city} (${a.code})`;
}

/**
 * Resolve free-text input to an IATA code. Handles:
 *  - "Sydney (SYD)"  → SYD  (the datalist format)
 *  - "syd" / "SYD"   → SYD  (bare code)
 *  - "sydney"        → SYD  (city / name match)
 * Returns null if nothing matches.
 */
export function resolveAirportCode(input) {
  if (!input) return null;
  const text = input.trim();

  const paren = text.match(/\(([A-Za-z]{3})\)/);
  if (paren) return paren[1].toUpperCase();

  const upper = text.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper) && AIRPORTS.some((a) => a.code === upper)) return upper;

  const lower = text.toLowerCase();
  const hit = AIRPORTS.find(
    (a) =>
      a.city.toLowerCase() === lower ||
      a.city.toLowerCase().includes(lower) ||
      a.name.toLowerCase().includes(lower)
  );
  return hit ? hit.code : null;
}
