/**
 * Popular hotel destinations for the search autocomplete. LiteAPI's
 * /data/hotels needs an ISO-2 countryCode plus a cityName, so each entry
 * carries both. Extend freely — this is a curated shortlist, not exhaustive.
 */
const RAW = [
  ['Paris', 'FR', 'France'],
  ['London', 'GB', 'United Kingdom'],
  ['Rome', 'IT', 'Italy'],
  ['Milan', 'IT', 'Italy'],
  ['Venice', 'IT', 'Italy'],
  ['Barcelona', 'ES', 'Spain'],
  ['Madrid', 'ES', 'Spain'],
  ['Amsterdam', 'NL', 'Netherlands'],
  ['Berlin', 'DE', 'Germany'],
  ['Munich', 'DE', 'Germany'],
  ['Lisbon', 'PT', 'Portugal'],
  ['Vienna', 'AT', 'Austria'],
  ['Prague', 'CZ', 'Czechia'],
  ['Zurich', 'CH', 'Switzerland'],
  ['Istanbul', 'TR', 'Turkey'],
  ['Athens', 'GR', 'Greece'],
  ['Dublin', 'IE', 'Ireland'],
  ['New York', 'US', 'United States'],
  ['Los Angeles', 'US', 'United States'],
  ['Las Vegas', 'US', 'United States'],
  ['Miami', 'US', 'United States'],
  ['Orlando', 'US', 'United States'],
  ['San Francisco', 'US', 'United States'],
  ['Chicago', 'US', 'United States'],
  ['Honolulu', 'US', 'United States'],
  ['Toronto', 'CA', 'Canada'],
  ['Vancouver', 'CA', 'Canada'],
  ['Cancún', 'MX', 'Mexico'],
  ['Mexico City', 'MX', 'Mexico'],
  ['Rio de Janeiro', 'BR', 'Brazil'],
  ['São Paulo', 'BR', 'Brazil'],
  ['Buenos Aires', 'AR', 'Argentina'],
  ['Dubai', 'AE', 'United Arab Emirates'],
  ['Abu Dhabi', 'AE', 'United Arab Emirates'],
  ['Doha', 'QA', 'Qatar'],
  ['Singapore', 'SG', 'Singapore'],
  ['Bangkok', 'TH', 'Thailand'],
  ['Phuket', 'TH', 'Thailand'],
  ['Bali', 'ID', 'Indonesia'],
  ['Kuala Lumpur', 'MY', 'Malaysia'],
  ['Hong Kong', 'HK', 'Hong Kong'],
  ['Tokyo', 'JP', 'Japan'],
  ['Osaka', 'JP', 'Japan'],
  ['Seoul', 'KR', 'South Korea'],
  ['Male', 'MV', 'Maldives'],
  ['Sydney', 'AU', 'Australia'],
  ['Melbourne', 'AU', 'Australia'],
  ['Auckland', 'NZ', 'New Zealand'],
  ['Cape Town', 'ZA', 'South Africa'],
  ['Marrakech', 'MA', 'Morocco'],
  ['Cairo', 'EG', 'Egypt'],
];

export const HOTEL_CITIES = RAW.map(([city, countryCode, country]) => ({ city, countryCode, country }));

/** "Paris, France" display label. */
export function cityLabel(c) {
  return `${c.city}, ${c.country}`;
}

/** Rank destinations against a free-text query for the autocomplete. */
export function searchCities(query, limit = 8) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const c of HOTEL_CITIES) {
    const city = c.city.toLowerCase();
    const country = c.country.toLowerCase();
    let score = -1;
    if (city === q) score = 100;
    else if (city.startsWith(q)) score = 80;
    else if (city.includes(q)) score = 55;
    else if (country.startsWith(q)) score = 40;
    else if (country.includes(q)) score = 25;
    if (score >= 0) scored.push({ c, score });
  }
  scored.sort((a, b) => b.score - a.score || a.c.city.length - b.c.city.length);
  return scored.slice(0, limit).map((s) => s.c);
}

/** Resolve free text ("Paris, France" / "paris") to { city, countryCode, country } or null. */
export function resolveCity(input) {
  if (!input) return null;
  const text = input.split(',')[0].trim().toLowerCase();
  const exact = HOTEL_CITIES.find((c) => c.city.toLowerCase() === text);
  if (exact) return exact;
  const hits = searchCities(input, 1);
  return hits.length ? hits[0] : null;
}
