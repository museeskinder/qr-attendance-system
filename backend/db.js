// db.js – PostgreSQL (Neon) connection pool
const { Pool } = require('pg');
require('dotenv').config();

// Neon connection string must be stored in DATABASE_URL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not defined in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Neon requires SSL; allow self‑signed certs
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};
