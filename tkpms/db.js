'use strict';

const sqlite3 = require('sqlite3').verbose();

// In-memory SQLite database (data resets on server restart, per spec).
const db = new sqlite3.Database(':memory:');

// Promise helpers around the callback-based sqlite3 API.
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function init() {
  await run(`CREATE TABLE flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flightNumber TEXT NOT NULL,
    departure TEXT NOT NULL,
    arrival TEXT NOT NULL,
    departureTime TEXT NOT NULL,
    arrivalTime TEXT NOT NULL,
    aircraftType TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    createdAt TEXT NOT NULL
  )`);

  await run(`CREATE TABLE passengers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flightId INTEGER NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    passportNumber TEXT,
    dateOfBirth TEXT,
    nationality TEXT,
    createdAt TEXT NOT NULL
  )`);

  // A booking row is one passenger+seat. Multiple rows can share a
  // bookingReference (PNR) on the same flight — paxSeq orders them 1..N.
  await run(`CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passengerId INTEGER NOT NULL,
    flightId INTEGER NOT NULL,
    seatAssigned TEXT,
    cabinClass TEXT NOT NULL,
    bookingReference TEXT NOT NULL,
    paxSeq INTEGER NOT NULL DEFAULT 1,
    paymentMethod TEXT,
    paymentAmount REAL,
    paymentStatus TEXT DEFAULT 'paid',
    createdAt TEXT NOT NULL
  )`);

  await run(`CREATE TABLE baggage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookingId INTEGER NOT NULL,
    bagCount INTEGER DEFAULT 1,
    weight REAL,
    dimensions TEXT,
    extraCharge REAL DEFAULT 0,
    bagTagNumber TEXT,
    createdAt TEXT NOT NULL
  )`);

  await run(`CREATE TABLE checkin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookingId INTEGER NOT NULL UNIQUE,
    checkedInTime TEXT,
    bagCount INTEGER DEFAULT 0,
    apisData TEXT,
    apisSfNumber TEXT,
    boardingPassPrinted INTEGER DEFAULT 0,
    sequence INTEGER,
    createdAt TEXT NOT NULL
  )`);

  await run(`CREATE TABLE boarding (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookingId INTEGER NOT NULL UNIQUE,
    flightId INTEGER NOT NULL,
    boardedTime TEXT,
    sequence INTEGER
  )`);
}

module.exports = { db, run, get, all, init };
