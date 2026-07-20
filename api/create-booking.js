/**
 * Distinct-named alias of the flight BOOK endpoint, so the debug URL can't be
 * confused with /api/flights-prebook. Same handler — GET runs the full
 * search → prebook → book chain and shows the raw book result.
 */
export { default } from './flights-book.js';
