const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT NOW()');
    res.json({ success: true, now: rows[0] || rows });
  } catch (err) {
    console.error('DB test error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
