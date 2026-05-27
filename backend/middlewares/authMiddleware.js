const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Verify JWT and load the full user record from DB into req.user
const verifyToken = async (req, res, next) => {
  let token;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    // Allow token via query param for PDF/Excel download links
    token = req.query.token;
  }

  if (!token) {
    return sendResponse(res, 401, false, null, 'Access denied. No token provided.');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, name, email, role, requires_password_change FROM users WHERE id = ?', [payload.id]);
    if (rows.length === 0) {
      return sendResponse(res, 401, false, null, 'User no longer exists.');
    }
    req.user = rows[0]; // full DB record — role is always from the source of truth
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return sendResponse(res, 401, false, null, 'Invalid or expired token.');
  }
};

// Role-based access guard
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, false, null, 'Not authenticated.');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendResponse(res, 403, false, null, `Access denied. Required role: ${allowedRoles.join(' or ')}.`);
    }
    next();
  };
};

module.exports = { verifyToken, authorizeRoles };
