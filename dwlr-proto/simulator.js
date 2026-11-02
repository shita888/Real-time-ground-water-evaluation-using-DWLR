// simulator.js
require('dotenv').config();
const axios = require('axios');

const API = process.env.INGEST_URL || 'http://localhost:3000/ingest';
const TOKEN = process.env.INGEST_TOKEN;
const STATION_ID = "DWLR_001";

// generate random groundwater level between -40 and -5
function randomLevel() {
  const min = -40, max = -5;
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

// Send one reading
async function sendReading(payload) {
  try {
    await axios.post(API, payload, { headers: { 'x-ingest-token': TOKEN }});
    // log both the date-only and full ISO timestamp for clarity
    console.log("sent:", payload.date, payload.ts.toISOString(), payload.gw_level);
  } catch (err) {
    console.error('POST error:', err.response ? err.response.data : err.message);
  }
}

// helper: get ISO date string YYYY-MM-DD from a Date
function dateOnlyISO(d) {
  return d.toISOString().slice(0, 10);
}

// ---------- Make a stable "base date" locked to local midnight ----------
const baseDate = new Date();        // now
baseDate.setHours(0, 0, 0, 0);      // local midnight for today
// If you prefer UTC-midnight (no local offset), use:
// const baseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

// Seed N historical points spaced 1 day apart (dates at midnight)
async function seedData(n = 50) {
  console.log(`🌱 Seeding ${n} historical points for ${STATION_ID}...`);
  for (let i = n; i > 0; i--) {
    const d = new Date(baseDate);       // clone
    d.setDate(baseDate.getDate() - i);  // i days ago (so oldest first)

    const gw_level = randomLevel();
    const payload = {
      station_id: STATION_ID,
      name: "Station 1",
      lat: 28.6,
      lon: 77.2,
      gw_level,
      ts: d,                 // full Date object (midnight)
      date: dateOnlyISO(d)   // YYYY-MM-DD (use this for UI to avoid timezone fuss)
    };

    await sendReading(payload);
  }
  console.log("✅ Seeding complete");
}

// Realtime mode: each tick = next day (time kept at midnight)
let lastDate = new Date(baseDate);
lastDate.setDate(baseDate.getDate() + 1); // first realtime point = tomorrow (midnight)

function startRealtime(intervalMs = 30000) {
  console.log(`📡 Starting realtime simulator for ${STATION_ID} (tick every ${intervalMs} ms)...`);
  setInterval(async () => {
    const d = new Date(lastDate); // clone
    const gw_level = randomLevel();

    const payload = {
      station_id: STATION_ID,
      name: "Station 1",
      lat: 28.6,
      lon: 77.2,
      gw_level,
      ts: d,
      date: dateOnlyISO(d)
    };

    // advance for next tick
    lastDate.setDate(lastDate.getDate() + 1);

    await sendReading(payload);
  }, intervalMs);
}

// Run: seed 50 days, then produce a new "day" every 1s (demo speed)
(async () => {
  await seedData(50);
  startRealtime(30000); // every second = next day
})();
