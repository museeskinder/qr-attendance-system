const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Haversine formula to compute distance in meters between two coordinates
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

const markAttendance = async (req, res) => {
  const { qr_code, latitude, longitude } = req.body;
  const student_id = req.user.id;

  if (!qr_code) {
    return sendResponse(res, 400, false, null, 'QR code is required');
  }

  try {
    const pool = getPool();
    let session_id;
    let decoded;

    // Try to decode as JWT first
    try {
      decoded = jwt.verify(qr_code, process.env.JWT_SECRET);
      session_id = decoded.session_id;

      // Validate token issue timestamp (expiry after 10 seconds)
      if (decoded.timestamp && Date.now() - decoded.timestamp > 10000) {
        return sendResponse(res, 400, false, null, 'QR code has expired');
      }
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendResponse(res, 400, false, null, 'QR code has expired');
      }
      // If verification fails, we can fall back to checking if it is a legacy hex token
    }

    let session;

    if (session_id) {
      const [rows] = await pool.query(
        "SELECT * FROM class_sessions WHERE session_id = ?",
        [session_id]
      );
      if (rows.length > 0) {
        session = rows[0];
      }
    } else {
      const [rows] = await pool.query(
        "SELECT * FROM class_sessions WHERE qr_code = ?",
        [qr_code]
      );
      if (rows.length > 0) {
        session = rows[0];
        session_id = session.session_id;
      }
    }

    if (!session) {
      return sendResponse(res, 404, false, null, 'Invalid or expired session QR code');
    }

    if (session.status !== 'open') {
      return sendResponse(res, 400, false, null, 'This session is already closed');
    }

    // Verify student is enrolled in the course
    const [enrollment] = await pool.query(
      'SELECT student_id FROM student_courses WHERE student_id = ? AND course_id = ?',
      [student_id, session.course_id]
    );
    if (enrollment.length === 0) {
      return sendResponse(res, 400, false, null, 'You are not enrolled in this course.');
    }

    // Geolocation Validation
    if (session.latitude !== null && session.longitude !== null) {
      if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
        return sendResponse(res, 400, false, null, 'GPS location coordinates are required to mark attendance');
      }
      const distance = getDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(session.latitude),
        parseFloat(session.longitude)
      );
      if (distance > session.allowed_radius) {
        return sendResponse(
          res,
          400,
          false,
          null,
          `Outside allowed classroom radius. Distance: ${distance.toFixed(1)} meters. Max allowed: ${session.allowed_radius} meters.`
        );
      }
    }

    // Use GMT+3 current time
    const now = require('../utils/time').getGMT3Now();
    const sessionDate = session.session_date; // assumed format YYYY-MM-DD
    const sessionStart = new Date(`${sessionDate}T${session.start_time}`);
    const sessionEnd = new Date(`${sessionDate}T${session.end_time}`);
    if (now > sessionEnd) {
      return sendResponse(res, 400, false, null, 'Attendance period has ended (session closed).');
    }
    // Calculate attendance status based on start time
    const diffMins = (now.getTime() - sessionStart.getTime()) / 60000;
    let status = 'Present';
    if (diffMins > 20) {
      return sendResponse(res, 400, false, null, 'Attendance period has expired. This session is closed.');
    } else if (diffMins > 10) {
      status = 'Late';
    }

    // Check if attendance already marked
    const [existing] = await pool.query(
      'SELECT attendance_id FROM attendance WHERE student_id = ? AND session_id = ?',
      [student_id, session_id]
    );

    if (existing.length > 0) {
      return sendResponse(res, 400, false, null, 'Attendance already marked for this session');
    }

    // Insert attendance
    await pool.query(
      'INSERT INTO attendance (student_id, session_id, status, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
      [student_id, session_id, status, latitude || null, longitude || null]
    );

    // Log the activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action) VALUES (?, ?)',
      [student_id, `Marked attendance for session_id: ${session_id} Status: ${status}`]
    );

    sendResponse(res, 201, true, { status }, 'Attendance marked successfully');
  } catch (error) {
    console.error('Error marking attendance:', error);
    sendResponse(res, 500, false, null, 'Server error while marking attendance');
  }
};

const getHistory = async (req, res) => {
  const student_id = req.user.id;

  try {
    const pool = getPool();
    const query = `
      SELECT a.timestamp, a.status, s.session_date, s.start_time, s.end_time, c.course_name, c.course_code
      FROM attendance a
      JOIN class_sessions s ON a.session_id = s.session_id
      JOIN courses c ON s.course_id = c.course_id
      WHERE a.student_id = ?
      ORDER BY a.timestamp DESC
    `;

    const [history] = await pool.query(query, [student_id]);
    sendResponse(res, 200, true, history, null);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching history');
  }
};

const getStudentStats = async (req, res) => {
  const student_id = req.user.id;

  try {
    const pool = getPool();

    // Fetch all courses student is enrolled in
    const [enrolledCourses] = await pool.query(`
      SELECT c.course_id, c.course_code, c.course_name, c.eligibility_percentage, u.name as instructor_name
      FROM student_courses sc
      JOIN courses c ON sc.course_id = c.course_id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE sc.student_id = ?
    `, [student_id]);

    const stats = [];
    for (const course of enrolledCourses) {
      // Count total sessions held so far (all past and current sessions)
      const [sessions] = await pool.query(
        "SELECT session_id FROM class_sessions WHERE course_id = ? AND session_date <= CURRENT_DATE",
        [course.course_id]
      );
      const totalSessions = sessions.length;

      // Count sessions attended
      const [attended] = await pool.query(
        `SELECT a.attendance_id, a.status FROM attendance a
         JOIN class_sessions s ON a.session_id = s.session_id
         WHERE a.student_id = ? AND s.course_id = ?`,
        [student_id, course.course_id]
      );

      const attendedCount = attended.length;
      const missedCount = Math.max(0, totalSessions - attendedCount);
      const attendancePercentage = totalSessions > 0 ? parseFloat(((attendedCount / totalSessions) * 100).toFixed(1)) : 100.0;
      const eligibilityThreshold = course.eligibility_percentage || 75;
      const eligible = attendancePercentage >= eligibilityThreshold;

      stats.push({
        course_id: course.course_id,
        course_code: course.course_code,
        course_name: course.course_name,
        instructor_name: course.instructor_name || 'N/A',
        attended_count: attendedCount,
        missed_count: missedCount,
        total_sessions: totalSessions,
        attendance_percentage: attendancePercentage,
        eligible
      });
    }

    sendResponse(res, 200, true, stats, null);
  } catch (error) {
    console.error('Error fetching student stats:', error);
    sendResponse(res, 500, false, null, 'Server error fetching student stats');
  }
};

module.exports = { markAttendance, getHistory, getStudentStats };
