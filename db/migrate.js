// Run: node src/db/migrate.js
require('dotenv').config();
const db = require('./db');
const SCHEMA = require('./schema');

async function migrate() {
  console.log('Running migrations…');
  await db.exec(SCHEMA);
  console.log('✓ Schema applied');
  await db.pool.end();
}

migrate().catch(err => { console.error(err); process.exit(1); });
