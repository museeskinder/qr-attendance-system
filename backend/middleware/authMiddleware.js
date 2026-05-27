const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Middleware to verify JWT and attach user payload to req.user
const verifyToken = async (req, res, next) => {
  let token;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return sendResponse(res, 401, false, null, 'Token missing');
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (rows.length === 0) {
      return sendResponse(res, 401, false, null, 'User not found');
    }
    req.user = rows[0]; // full user record
    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    return sendResponse(res, 401, false, null, 'Invalid or expired token');
  }
};

// Middleware to authorize based on allowed roles
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, false, null, 'User not authenticated');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendResponse(res, 403, false, null, 'Insufficient permissions');
    }
    next();
  };
};

module.exports = { verifyToken, authorizeRoles };
