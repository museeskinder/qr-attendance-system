const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const { getGMT3Now } = require('../utils/time');

// Helper to write activity logs
const logActivity = async (pool, userId, action) => {
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, action) VALUES (?, ?)',
      [userId, action]
    );
  } catch (err) {
    console.error('Activity log error:', err);
  }
};

const createSession = async (req, res) => {
  const { course_id, session_date, start_time, end_time, room_number, latitude, longitude, allowed_radius } = req.body;

  if (!course_id || !session_date || !start_time || !end_time) {
    return sendResponse(res, 400, false, null, 'Please provide all required fields');
  }

  try {
    const pool = getPool();

    // Verify course belongs to instructor using instructor_courses mapping
    if (req.user.role === 'instructor') {
      const [course] = await pool.query(
        'SELECT c.* FROM courses c JOIN instructor_courses ic ON c.course_id = ic.course_id WHERE c.course_id = ? AND ic.instructor_id = ?',
        [course_id, req.user.id]
      );
      if (course.length === 0) {
        return sendResponse(res, 403, false, null, 'Not authorized to create session for this course');
      }
    }

    const qr_code = crypto.randomBytes(20).toString('hex'); // Legacy backup hex code

    // Default to New York coords if not specified
    const sessionLat = latitude !== undefined && latitude !== null ? latitude : 40.7128;
    const sessionLon = longitude !== undefined && longitude !== null ? longitude : -74.0060;
    const sessionRad = allowed_radius !== undefined && allowed_radius !== null ? allowed_radius : 30;

    const [result] = await pool.query(
      `INSERT INTO class_sessions 
      (course_id, session_date, start_time, end_time, room_number, status, qr_code, latitude, longitude, allowed_radius) 
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
      [course_id, session_date, start_time, end_time, room_number || null, qr_code, sessionLat, sessionLon, sessionRad]
    );

    await logActivity(
      pool,
      req.user.id,
      `Created attendance session for course_id=${course_id} on ${session_date} ${start_time}-${end_time} (Room: ${room_number || 'N/A'})`
    );

    sendResponse(res, 201, true, {
      session_id: result.insertId,
      qr_code,
      room_number,
      latitude: sessionLat,
      longitude: sessionLon,
      allowed_radius: sessionRad
    }, 'Session created and opened');
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error while creating session');
  }
};

const getSessions = async (req, res) => {
  try {
    const pool = getPool();
    let query = '';
    let params = [];

    if (req.user.role === 'instructor') {
      query = `
        SELECT s.*, c.course_name, c.course_code, ic.instructor_id, u.name as instructor_name
        FROM class_sessions s 
        JOIN courses c ON s.course_id = c.course_id
        JOIN instructor_courses ic ON c.course_id = ic.course_id
        LEFT JOIN users u ON ic.instructor_id = u.id
        WHERE ic.instructor_id = ?
      `;
      params.push(req.user.id);
    } else if (req.user.role === 'student') {
      // ONLY show sessions for courses the student is enrolled in
      query = `
        SELECT s.*, c.course_name, c.course_code, c.instructor_id, u.name as instructor_name
        FROM class_sessions s 
        JOIN courses c ON s.course_id = c.course_id
        JOIN student_courses sc ON c.course_id = sc.course_id
        LEFT JOIN users u ON c.instructor_id = u.id
        WHERE s.status = 'open' AND sc.student_id = ?
      `;
      params.push(req.user.id);
    } else {
      // Admin gets all
      query = `
        SELECT s.*, c.course_name, c.course_code, u.name as instructor_name
        FROM class_sessions s
        JOIN courses c ON s.course_id = c.course_id
        LEFT JOIN users u ON c.instructor_id = u.id
      `;
    }

    query += ' ORDER BY s.session_date DESC, s.start_time DESC';

    const [sessions] = await pool.query(query, params);
    sendResponse(res, 200, true, sessions, null);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching sessions');
  }
};

const updateSessionStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'open' or 'closed'

  if (!['open', 'closed'].includes(status)) {
    return sendResponse(res, 400, false, null, 'Invalid status');
  }

  try {
    const pool = getPool();
    // Authorization check
    if (req.user.role === 'instructor') {
      const [sessionInfo] = await pool.query(`
        SELECT ic.instructor_id FROM class_sessions s
        JOIN courses c ON s.course_id = c.course_id
        JOIN instructor_courses ic ON c.course_id = ic.course_id
        WHERE s.session_id = ? AND ic.instructor_id = ?
      `, [id, req.user.id]);

      if (sessionInfo.length === 0) {
        return sendResponse(res, 403, false, null, 'Not authorized to update this session');
      }
    }

    await pool.query('UPDATE class_sessions SET status = ? WHERE session_id = ?', [status, id]);

    await logActivity(
      pool,
      req.user.id,
      `Session #${id} status changed to '${status}'`
    );

    sendResponse(res, 200, true, null, 'Session status updated');
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error updating session');
  }
};

const getSessionQRToken = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = getPool();

    if (req.user.role === 'instructor') {
      const [sessionInfo] = await pool.query(`
        SELECT ic.instructor_id FROM class_sessions s
        JOIN courses c ON s.course_id = c.course_id
        JOIN instructor_courses ic ON c.course_id = ic.course_id
        WHERE s.session_id = ? AND ic.instructor_id = ?
      `, [id, req.user.id]);

      if (sessionInfo.length === 0) {
        return sendResponse(res, 403, false, null, 'Not authorized to view QR code for this session');
      }
    }

    // Check session is still open
    const [sessionRows] = await pool.query(
      'SELECT status, session_date, end_time FROM class_sessions WHERE session_id = ?',
      [id]
    );
    if (sessionRows.length === 0) {
      return sendResponse(res, 404, false, null, 'Session not found');
    }

    const session = sessionRows[0];

    // Verify session has not expired using GMT+3
    const now = getGMT3Now();
    const sessionEnd = new Date(`${session.session_date}T${session.end_time}`);
    if (session.status === 'closed' || now > sessionEnd) {
      // Auto-close if past end time
      if (now > sessionEnd && session.status === 'open') {
        await pool.query(
          "UPDATE class_sessions SET status = 'closed' WHERE session_id = ?",
          [id]
        );
        await logActivity(pool, req.user.id, `Session #${id} auto-closed (past end time)`);
      }
      return sendResponse(res, 400, false, null, 'Session is closed or has expired');
    }

    // Embed current timestamp for verification (10-second expiry)
    const qrToken = jwt.sign(
      { session_id: parseInt(id), timestamp: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '10s' }
    );

    sendResponse(res, 200, true, { qr_code: qrToken }, 'QR code token generated');
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error generating QR code token');
  }
};

const getSessionReport = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = getPool();
    const [sessions] = await pool.query(`
      SELECT s.*, c.course_name, c.course_code
      FROM class_sessions s
      JOIN courses c ON s.course_id = c.course_id
      WHERE s.session_id = ?
    `, [id]);

    if (sessions.length === 0) {
      return sendResponse(res, 404, false, null, 'Session not found');
    }

    const session = sessions[0];

    // Authorization check
    if (req.user.role === 'instructor') {
      const [course] = await pool.query(
        'SELECT c.* FROM courses c JOIN instructor_courses ic ON c.course_id = ic.course_id WHERE c.course_id = ? AND ic.instructor_id = ?',
        [session.course_id, req.user.id]
      );
      if (course.length === 0) {
        return sendResponse(res, 403, false, null, 'Not authorized to view report for this session');
      }
    }

    // Fetch total students enrolled in the course
    const [enrolledRes] = await pool.query(
      'SELECT COUNT(*) as enrolled FROM student_courses WHERE course_id = ?',
      [session.course_id]
    );
    const enrolledCount = enrolledRes[0].enrolled || 0;

    // Fetch attending students with year info
    const [attendance] = await pool.query(`
      SELECT a.attendance_id, a.timestamp, a.status,
             u.id as student_id, u.name as student_name,
             u.email as student_email, u.student_year
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      WHERE a.session_id = ?
      ORDER BY u.student_year, u.name ASC
    `, [id]);

    // Calculate percentage
    const attendancePercentage = enrolledCount > 0
      ? parseFloat(((attendance.length / enrolledCount) * 100).toFixed(1))
      : 0;

    sendResponse(res, 200, true, {
      session,
      attendance,
      total_attendance: attendance.length,
      enrolled_count: enrolledCount,
      attendance_percentage: attendancePercentage
    }, null);

  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching session report');
  }
};

/**
 * Auto-close all open sessions whose end_time has passed (GMT+3)
 * POST /api/sessions/auto-close
 */
const autoCloseExpiredSessions = async (req, res) => {
  try {
    const pool = getPool();
    const now = getGMT3Now();

    // Find all open sessions for this instructor where end_time has passed
    let query = `
      SELECT s.session_id, s.session_date, s.end_time, c.course_code
      FROM class_sessions s
      JOIN courses c ON s.course_id = c.course_id
      WHERE s.status = 'open'
    `;
    const params = [];

    if (req.user.role === 'instructor') {
      query += ` AND c.course_id IN (SELECT course_id FROM instructor_courses WHERE instructor_id = ?)`;
      params.push(req.user.id);
    }

    const [openSessions] = await pool.query(query, params);

    const closedIds = [];
    for (const s of openSessions) {
      const sessionEnd = new Date(`${s.session_date}T${s.end_time}`);
      if (now > sessionEnd) {
        await pool.query(
          "UPDATE class_sessions SET status = 'closed' WHERE session_id = ?",
          [s.session_id]
        );
        await logActivity(
          pool,
          req.user.id,
          `Session #${s.session_id} (${s.course_code}) auto-closed — past end time`
        );
        closedIds.push(s.session_id);
      }
    }

    sendResponse(res, 200, true, { closed: closedIds }, `Auto-closed ${closedIds.length} expired session(s)`);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error during auto-close');
  }
};

module.exports = {
  createSession,
  getSessions,
  updateSessionStatus,
  getSessionQRToken,
  getSessionReport,
  autoCloseExpiredSessions
};
