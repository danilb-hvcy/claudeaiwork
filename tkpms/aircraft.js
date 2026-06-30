'use strict';

/**
 * Aircraft configurations and seat-map generation for TKPMS.
 *
 * Business cabin is numbered from row 1. Economy starts a few rows behind the
 * business cabin so that every seat id (e.g. "12A") is globally unique on a
 * given aircraft. Emergency-exit rows are the rows positioned over the wings
 * (two rows near the middle of the economy cabin).
 */

const AIRCRAFT = {
  A359: {
    code: 'A359',
    name: 'Airbus A350-900',
    business: { rows: 8, letters: 'ABCDEFGH', startRow: 1 },
    economy: { rows: 18, letters: 'ABCDEFGHI', startRow: 11 },
  },
  A332: {
    code: 'A332',
    name: 'Airbus A330-200',
    business: { rows: 7, letters: 'ABCDEFGH', startRow: 1 },
    economy: { rows: 24, letters: 'ABCDEFGHI', startRow: 11 },
  },
  A320: {
    code: 'A320',
    name: 'Airbus A320-200',
    business: { rows: 5, letters: 'ABCDEF', startRow: 1 },
    economy: { rows: 30, letters: 'ABCDEF', startRow: 9 },
  },
};

// Which letters sit next to an aisle (used purely for visual gap rendering).
// We render an aisle gap after these letters.
const AISLE_AFTER = {
  9: ['C', 'F'], // 3-3-3 layout (A-I)
  8: ['B', 'F'], // 2-4-2 business (A-H)
  6: ['C'], // 3-3 layout (A-F)
};

function exitRowNumbers(cabin) {
  // Two exit rows positioned over the wings (roughly the middle of economy).
  const mid = Math.floor(cabin.rows / 2);
  const r1 = cabin.startRow + mid - 1;
  const r2 = cabin.startRow + mid;
  return [r1, r2];
}

function buildCabin(cabin, cabinClass) {
  const letters = cabin.letters.split('');
  const aisleAfter = AISLE_AFTER[letters.length] || [];
  const exitRows = cabinClass === 'Economy' ? exitRowNumbers(cabin) : [];
  const rows = [];
  for (let i = 0; i < cabin.rows; i++) {
    const rowNum = cabin.startRow + i;
    const isExit = exitRows.includes(rowNum);
    const seats = letters.map((letter) => ({
      id: `${rowNum}${letter}`,
      row: rowNum,
      letter,
      cabin: cabinClass,
      isExit,
      aisleAfter: aisleAfter.includes(letter),
    }));
    rows.push({ row: rowNum, isExit, seats });
  }
  return rows;
}

function getSeatMap(aircraftType) {
  const cfg = AIRCRAFT[aircraftType];
  if (!cfg) return null;
  return {
    code: cfg.code,
    name: cfg.name,
    business: buildCabin(cfg.business, 'Business'),
    economy: buildCabin(cfg.economy, 'Economy'),
  };
}

function getCapacity(aircraftType) {
  const cfg = AIRCRAFT[aircraftType];
  if (!cfg) return 0;
  return (
    cfg.business.rows * cfg.business.letters.length +
    cfg.economy.rows * cfg.economy.letters.length
  );
}

// Flat list of every valid seat id for an aircraft, with its cabin + exit flag.
function getAllSeats(aircraftType) {
  const map = getSeatMap(aircraftType);
  if (!map) return [];
  const out = [];
  for (const section of ['business', 'economy']) {
    for (const row of map[section]) {
      for (const seat of row.seats) out.push(seat);
    }
  }
  return out;
}

function isExitSeat(aircraftType, seatId) {
  const seat = getAllSeats(aircraftType).find((s) => s.id === seatId);
  return seat ? seat.isExit : false;
}

module.exports = {
  AIRCRAFT,
  getSeatMap,
  getCapacity,
  getAllSeats,
  isExitSeat,
};
