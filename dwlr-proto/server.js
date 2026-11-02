// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { MongoClient } = require('mongodb');
const { Server } = require('socket.io');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'dwlr';
const PORT = Number(process.env.PORT || 3000);
const INGEST_TOKEN = process.env.INGEST_TOKEN;

if (!MONGODB_URI) {
  console.error('MONGODB_URI missing in .env — fill it and restart');
  process.exit(1);
}

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server);

let mongoClient;
let changeStream;

(async function main() {
  try {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const db = mongoClient.db(DB_NAME);
    const readings = db.collection('readings'); // plain history collection
    const latest = db.collection('latest');     // only most recent per station

    // create indexes
    try {
      await readings.createIndex({ station_id: 1, ts: 1 });
      await latest.createIndex({ station_id: 1 }, { unique: true });
    } catch (e) {
      console.warn("⚠️ Index creation issue:", e.message);
    }

    // watch latest for realtime updates
    try {
      changeStream = latest.watch([], { fullDocument: 'updateLookup' });
      changeStream.on('change', change => {
        if (change.fullDocument) io.emit('latest', change.fullDocument);
      });
      console.log('📡 Watching latest for realtime updates');
    } catch (err) {
      console.warn('⚠️ Change stream unavailable:', err.message);
    }

    io.on('connection', async socket => {
      console.log('🔌 Socket connected:', socket.id);
      try {
        const docs = await latest.find({}).toArray();
        socket.emit('initial', docs);
      } catch (err) {
        console.error('Error sending initial docs:', err.message);
      }
    });

    // ingest endpoint
    app.post('/ingest', async (req, res) => {
      try {
        if (INGEST_TOKEN) {
          const token = req.headers['x-ingest-token'] || req.headers['authorization'];
          if (token !== INGEST_TOKEN) {
            return res.status(401).json({ error: 'unauthorized - bad token' });
          }
        }

        const { station_id, name, lat, lon, gw_level, ts } = req.body;
        if (!station_id || typeof gw_level !== 'number') {
          return res.status(400).json({ error: 'station_id and gw_level required' });
        }

        const now = ts ? new Date(ts) : new Date();

        // smoothing
        const prev = await latest.findOne({ station_id });
        let smoothed = gw_level;
        if (prev && prev.last && typeof prev.last.gw_level_smoothed === 'number') {
          const alpha = 0.2;
          smoothed = prev.last.gw_level_smoothed * (1 - alpha) + gw_level * alpha;
        }

        // flat doc for readings
        const doc = {
          ts: now,
          station_id,
          name,
          lat,
          lon,
          gw_level,
          gw_level_smoothed: smoothed
        };

        // always insert into readings (historical)
        try {
          await readings.insertOne(doc);
        } catch (err) {
          console.error('insert error:', err.message);
        }

        // update latest
        await latest.updateOne(
          { station_id },
          {
            $set: {
              station_id,
              name,
              lat,          //  store latitude
              lon,          //  store longitude
              last: { gw_level, gw_level_smoothed: smoothed },
              ts: now
            }
          },
          { upsert: true }
      );

        return res.json({ success: true });
      } catch (err) {
        console.error('Ingest error:', err);
        return res.status(500).json({ error: 'server error' });
      }
    });

    server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
})();

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  try {
    if (changeStream) await changeStream.close();
    if (mongoClient) await mongoClient.close();
  } catch (e) {}
  process.exit(0);
});
