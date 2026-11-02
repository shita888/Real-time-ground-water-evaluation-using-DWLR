// test-conn.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI missing'); process.exit(1); }
  const client = new MongoClient(uri, { useNewUrlParser:true, useUnifiedTopology:true });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'dwlr');
    console.log('Connected to DB:', db.databaseName);
    const stats = await db.stats();
    console.log('Collections:', stats.collections);
  } catch (e) {
    console.error('Connection failed:', e.message);
  } finally { await client.close(); }
})();
