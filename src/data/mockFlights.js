/**
 * Mock flight inventory for the HeyVacay flight search MVP.
 *
 * The schema mirrors a normalized LiteAPI flight offer (see src/utils/liteApi.js
 * for the live integration + mapper), so mock results and real API results are
 * interchangeable in the UI.
 *
 * Route for this dataset: Australia (SYD) → Los Angeles (LAX), one-way.
 */

/**
 * Airline reference data. `color` drives the logo chip; `code` is the IATA code.
 */
export const AIRLINES = {
  QF: { name: 'Qantas', code: 'QF', color: '#E40000' },
  DL: { name: 'Delta Airlines', code: 'DL', color: '#C8102E' },
  UA: { name: 'United Airlines', code: 'UA', color: '#005DAA' },
  AA: { name: 'American Airlines', code: 'AA', color: '#0078D2' },
  B6: { name: 'Jetblue Airways', code: 'B6', color: '#003876' },
  EK: { name: 'Emirates', code: 'EK', color: '#D71921' },
};

/**
 * Build the three standard fare families for a given base economy price.
 * Higher tiers add checked bags, seat selection and flexibility.
 */
function buildFares(base) {
  return [
    {
      id: 'eco-standard',
      name: 'Ecostandard',
      price: base,
      cabin: 'Economy',
      recommended: false,
      seat: 'Seat choice for a fee',
      bags: ['Hand baggage included (7kg)', 'Checked baggage for a fee'],
      flexibility: ['Cancellation fees apply', 'Change fee apply'],
    },
    {
      id: 'eco-premium',
      name: 'Eco Premium',
      price: base + 130,
      cabin: 'Economy',
      recommended: true,
      seat: 'Standard seat choice included',
      bags: ['Hand baggage included (7kg)', 'Checked baggage included (24kg)'],
      flexibility: ['Cancellation fees apply', 'Change fee apply'],
    },
    {
      id: 'eco-flexi',
      name: 'Eco Flexi',
      price: base + 239,
      cabin: 'Economy',
      recommended: false,
      seat: 'Any seat choice included',
      bags: ['Hand baggage included (7kg)', 'Checked baggage included (32kg)'],
      flexibility: ['Free cancellation', 'Free date changes'],
    },
  ];
}

/**
 * Compact helper to declare a flight leg without repeating boilerplate.
 */
function makeFlight({
  id,
  airline,
  depTime,
  arrTime,
  durationMin,
  stops,
  stopCities = [],
  price,
  originalPrice,
}) {
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  return {
    id,
    airline: AIRLINES[airline],
    origin: { code: 'SYD', city: 'Sydney', airport: 'Kingsford Smith', country: 'Australia' },
    destination: { code: 'LAX', city: 'Los Angeles', airport: 'Los Angeles Intl', country: 'USA' },
    departure: { time: depTime },
    arrival: { time: arrTime },
    duration: { hours, minutes, totalMinutes: durationMin },
    stops,
    stopCities,
    price,
    originalPrice,
    currency: 'USD',
    cabin: 'Economy',
    fares: buildFares(price),
  };
}

export const mockFlights = [
  makeFlight({ id: 'fl-001', airline: 'QF', depTime: '11:40', arrTime: '10:20', durationMin: 1090, stops: 1, stopCities: ['Auckland (AKL)'], price: 720, originalPrice: 780 }),
  makeFlight({ id: 'fl-002', airline: 'DL', depTime: '05:00', arrTime: '23:35', durationMin: 815, stops: 0, price: 695, originalPrice: 790 }),
  makeFlight({ id: 'fl-003', airline: 'EK', depTime: '01:05', arrTime: '17:10', durationMin: 1195, stops: 1, stopCities: ['Dubai (DXB)'], price: 730, originalPrice: 740 }),
  makeFlight({ id: 'fl-004', airline: 'UA', depTime: '09:15', arrTime: '06:45', durationMin: 810, stops: 0, price: 750, originalPrice: 780 }),
  makeFlight({ id: 'fl-005', airline: 'AA', depTime: '14:20', arrTime: '11:05', durationMin: 1005, stops: 1, stopCities: ['San Francisco (SFO)'], price: 710, originalPrice: 765 }),
  makeFlight({ id: 'fl-006', airline: 'B6', depTime: '22:30', arrTime: '20:10', durationMin: 1180, stops: 1, stopCities: ['Honolulu (HNL)'], price: 680, originalPrice: 780 }),
  makeFlight({ id: 'fl-007', airline: 'QF', depTime: '07:50', arrTime: '05:30', durationMin: 820, stops: 0, price: 815, originalPrice: 890 }),
  makeFlight({ id: 'fl-008', airline: 'DL', depTime: '16:40', arrTime: '13:25', durationMin: 1005, stops: 1, stopCities: ['Los Angeles connection (SLC)'], price: 705, originalPrice: 760 }),
  makeFlight({ id: 'fl-009', airline: 'EK', depTime: '23:55', arrTime: '22:35', durationMin: 1360, stops: 2, stopCities: ['Dubai (DXB)', 'New York (JFK)'], price: 660, originalPrice: 720 }),
  makeFlight({ id: 'fl-010', airline: 'UA', depTime: '13:10', arrTime: '10:55', durationMin: 1005, stops: 1, stopCities: ['Houston (IAH)'], price: 740, originalPrice: 790 }),
  makeFlight({ id: 'fl-011', airline: 'AA', depTime: '06:25', arrTime: '04:05', durationMin: 820, stops: 0, price: 830, originalPrice: 910 }),
  makeFlight({ id: 'fl-012', airline: 'B6', depTime: '19:05', arrTime: '16:50', durationMin: 1185, stops: 1, stopCities: ['Vancouver (YVR)'], price: 690, originalPrice: 745 }),
  makeFlight({ id: 'fl-013', airline: 'QF', depTime: '10:00', arrTime: '07:40', durationMin: 820, stops: 0, price: 799, originalPrice: 860 }),
  makeFlight({ id: 'fl-014', airline: 'DL', depTime: '03:35', arrTime: '01:15', durationMin: 1180, stops: 1, stopCities: ['Seattle (SEA)'], price: 715, originalPrice: 795 }),
  makeFlight({ id: 'fl-015', airline: 'EK', depTime: '18:45', arrTime: '17:25', durationMin: 1360, stops: 2, stopCities: ['Singapore (SIN)', 'Dubai (DXB)'], price: 645, originalPrice: 700 }),
  makeFlight({ id: 'fl-016', airline: 'UA', depTime: '08:30', arrTime: '06:15', durationMin: 810, stops: 0, price: 770, originalPrice: 820 }),
  makeFlight({ id: 'fl-017', airline: 'AA', depTime: '21:15', arrTime: '18:00', durationMin: 1005, stops: 1, stopCities: ['Dallas (DFW)'], price: 725, originalPrice: 780 }),
  makeFlight({ id: 'fl-018', airline: 'B6', depTime: '12:50', arrTime: '10:30', durationMin: 820, stops: 0, price: 760, originalPrice: 810 }),
  makeFlight({ id: 'fl-019', airline: 'QF', depTime: '00:30', arrTime: '23:10', durationMin: 1180, stops: 1, stopCities: ['Nadi (NAN)'], price: 700, originalPrice: 770 }),
  makeFlight({ id: 'fl-020', airline: 'DL', depTime: '15:25', arrTime: '13:05', durationMin: 820, stops: 0, price: 745, originalPrice: 800 }),
];

/**
 * Promotional offers shown as banners above the results (matches the mockup).
 */
export const promoOffers = [
  { id: 'fly350', code: 'FLY350', text: 'Get $35 off your first flight booking!', tone: 'red' },
  { id: 'flight500', code: 'FLIGHT500', text: 'Save $500 on your first flight booking!', tone: 'red' },
  { id: 'loyalty', code: null, text: 'Earn 5% Loyalty Points on this transaction', tone: 'gold' },
];

/**
 * Date strip shown above the results (horizontal scroll in the mockup).
 */
export const dateStrip = [
  { label: 'Mon, 26 Dec', value: '2025-12-26', active: true },
  { label: 'Tue, 27 Dec', value: '2025-12-27' },
  { label: 'Wed, 28 Dec', value: '2025-12-28' },
  { label: 'Thu, 29 Dec', value: '2025-12-29' },
  { label: 'Fri, 30 Dec', value: '2025-12-30' },
  { label: 'Sat, 31 Dec', value: '2025-12-31' },
  { label: 'Sun, 01 Jan', value: '2026-01-01' },
  { label: 'Mon, 02 Jan', value: '2026-01-02' },
  { label: 'Thu, 03 Jan', value: '2026-01-03' },
];
