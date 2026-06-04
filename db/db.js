const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Convenience helpers matching the old SQLite API shape
const db = {
  // Execute a query and return all rows
  async all(text, params = []) {
    const res = await pool.query(text, params);
    return res.rows;
  },

  // Execute a query and return first row (or undefined)
  async get(text, params = []) {
    const res = await pool.query(text, params);
    return res.rows[0];
  },

  // Execute a write query, return rows (for RETURNING clauses)
  async run(text, params = []) {
    const res = await pool.query(text, params);
    return res.rows;
  },

  // Execute raw SQL (migrations, DDL)
  async exec(text) {
    await pool.query(text);
  },

  pool,
};

module.exports = db;
