const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { getPool } = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

const getActivityLogs = async (req, res) => {
  try {
    const pool = getPool();
    const [logs] = await pool.query(`
      SELECT l.*, u.name, u.email, u.role 
      FROM activity_logs l 
      LEFT JOIN users u ON l.user_id = u.id 
      ORDER BY l.created_at DESC 
      LIMIT 100
    `);
    sendResponse(res, 200, true, logs, null);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching activity logs');
  }
};

const getAttendanceAnalytics = async (req, res) => {
  try {
    const pool = getPool();
    
    // Summary counts
    const [[{ total_students }]] = await pool.query("SELECT COUNT(*) as total_students FROM users WHERE role = 'student'");
    const [[{ total_courses }]] = await pool.query("SELECT COUNT(*) as total_courses FROM courses");
    const [[{ total_sessions }]] = await pool.query("SELECT COUNT(*) as total_sessions FROM class_sessions");
    const [[{ total_attendance }]] = await pool.query("SELECT COUNT(*) as total_attendance FROM attendance");
    
    // Attendance count per course
    const [courseAttendance] = await pool.query(`
      SELECT c.course_code, c.course_name, COUNT(a.attendance_id) as attendance_count
      FROM courses c
      LEFT JOIN class_sessions s ON c.course_id = s.course_id
      LEFT JOIN attendance a ON s.session_id = a.session_id
      GROUP BY c.course_id
    `);

    // Attendance trends (by date)
    const [attendanceTrends] = await pool.query(`
      SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') as date, COUNT(*) as count 
      FROM attendance 
      GROUP BY TO_CHAR(timestamp, 'YYYY-MM-DD')
      ORDER BY date ASC
      LIMIT 30
    `);

    // Most absent students (missed session count based on student course enrollment vs checkins)
    const [mostAbsent] = await pool.query(`
      SELECT 
        u.id AS student_id,
        u.name AS student_name,
        u.email AS student_email,
        COUNT(DISTINCT s.session_id) - COUNT(DISTINCT a.attendance_id) AS absent_count
      FROM student_courses sc
      JOIN users u ON sc.student_id = u.id
      JOIN courses c ON sc.course_id = c.course_id
      LEFT JOIN class_sessions s ON c.course_id = s.course_id AND s.session_date <= CURRENT_DATE
      LEFT JOIN attendance a ON s.session_id = a.session_id AND a.student_id = u.id
      GROUP BY u.id
      ORDER BY absent_count DESC
      LIMIT 10
    `);

    // Status breakdown (Present vs Late)
    const [statusBreakdown] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM attendance
      GROUP BY status
    `);

    sendResponse(res, 200, true, {
      summary: { total_students, total_courses, total_sessions, total_attendance },
      courseAttendance,
      attendanceTrends,
      mostAbsent,
      statusBreakdown
    }, null);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching analytics');
  }
};

const getIneligibleStudents = async (req, res) => {
  try {
    const pool = getPool();
    
    // Calculates students whose attendance in a course is below 75%
    const [ineligible] = await pool.query(`
      SELECT 
        u.id AS student_id,
        u.name AS student_name,
        u.email AS student_email,
        c.course_code,
        c.course_name,
        COUNT(DISTINCT s.session_id) AS total_sessions,
        COUNT(DISTINCT a.attendance_id) AS attended_sessions,
        COALESCE(ROUND((COUNT(DISTINCT a.attendance_id)::numeric / NULLIF(COUNT(DISTINCT s.session_id), 0)) * 100, 1), 0.0) AS attendance_percentage
      FROM student_courses sc
      JOIN users u ON sc.student_id = u.id
      JOIN courses c ON sc.course_id = c.course_id
      LEFT JOIN class_sessions s ON c.course_id = s.course_id AND s.session_date <= CURRENT_DATE
      LEFT JOIN attendance a ON s.session_id = a.session_id AND a.student_id = u.id
      GROUP BY u.id, c.course_id, u.name, u.email, c.course_code, c.course_name
      HAVING COUNT(DISTINCT s.session_id) > 0 AND (COUNT(DISTINCT a.attendance_id)::numeric / COUNT(DISTINCT s.session_id)) * 100 < 75.0
    `);

    sendResponse(res, 200, true, ineligible, null);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching ineligible students');
  }
};

const getStudentReports = async (req, res) => {
  try {
    const pool = getPool();
    const userRole = req.user.role;
    const userId = req.user.id;

    let query = `
      SELECT 
        u.id AS student_id,
        u.student_id AS student_code,
        u.name AS student_name,
        u.email AS student_email,
        c.course_code,
        c.course_name,
        c.eligibility_percentage AS required_percentage,
        COUNT(DISTINCT s.session_id) AS total_sessions,
        COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.attendance_id END) AS present_count,
        COUNT(DISTINCT CASE WHEN a.status = 'Late' THEN a.attendance_id END) AS late_count,
        (COUNT(DISTINCT s.session_id) - COUNT(DISTINCT a.attendance_id)) AS absent_count,
        COALESCE(ROUND((COUNT(DISTINCT a.attendance_id)::numeric / NULLIF(COUNT(DISTINCT s.session_id), 0)) * 100, 1), 0.0) AS attendance_percentage
      FROM student_courses sc
      JOIN users u ON sc.student_id = u.id
      JOIN courses c ON sc.course_id = c.course_id
      LEFT JOIN class_sessions s ON c.course_id = s.course_id AND s.session_date <= CURRENT_DATE
      LEFT JOIN attendance a ON s.session_id = a.session_id AND a.student_id = u.id
    `;

    const params = [];
    let queryConditions = [];

    if (userRole === 'instructor') {
      params.push(userId);
      queryConditions.push(`c.course_id IN (SELECT course_id FROM instructor_courses WHERE instructor_id = $${params.length})`);
    }

    if (req.query.year) {
      params.push(req.query.year);
      queryConditions.push(`u.student_year = $${params.length}`);
    }

    if (queryConditions.length > 0) {
      query += ` WHERE ` + queryConditions.join(' AND ');
    }

    query += ` GROUP BY u.id, c.course_id, u.name, u.email, u.student_id, c.course_code, c.course_name, c.eligibility_percentage `;

    const [reports] = await pool.query(query, params);

    // Calculate is_eligible
    const formattedReports = reports.map(r => ({
      ...r,
      is_eligible: parseFloat(r.attendance_percentage) >= parseFloat(r.required_percentage)
    }));

    sendResponse(res, 200, true, formattedReports, null);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching student reports');
  }
};
// ExportPDF placeholder removed


const exportPDF = async (req, res) => {
  try {
    const pool = getPool();
    const userRole = req.user.role;
    const userId = req.user.id;

    let query = `
      SELECT a.timestamp, u.name as student_name, u.email, u.student_year, c.course_code, s.session_date, a.status
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      JOIN class_sessions s ON a.session_id = s.session_id
      JOIN courses c ON s.course_id = c.course_id
    `;
    const params = [];

    if (userRole === 'instructor') {
      query += ` WHERE c.course_id IN (SELECT course_id FROM instructor_courses WHERE instructor_id = $1) `;
      params.push(userId);
    }

    query += ` ORDER BY u.student_year, u.name, a.timestamp `;

    const [data] = await pool.query(query, params);

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();

    let currentYear = null;
    data.forEach((row, idx) => {
      if (row.student_year !== currentYear) {
        currentYear = row.student_year;
        doc.fontSize(16).fillColor('#0066CC').text(`Year: ${currentYear || 'N/A'}`, { underline: true });
        doc.moveDown(0.5);
      }
      const date = new Date(row.session_date).toLocaleDateString();
      const time = new Date(row.timestamp).toLocaleTimeString();
      const line = `${idx + 1}. ${row.student_name} (${row.email}) - ${row.course_code} - ${date} ${time} - Status: ${row.status}`;
      doc.fontSize(12).fillColor('black').text(line);
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error generating PDF');
  }
};

const exportExcel = async (req, res) => {
  try {
    const pool = getPool();
    const userRole = req.user.role;
    const userId = req.user.id;

    let query = `
      SELECT a.timestamp, u.name as student_name, u.email, u.student_year, c.course_code, s.session_date, a.status
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      JOIN class_sessions s ON a.session_id = s.session_id
      JOIN courses c ON s.course_id = c.course_id
    `;
    const params = [];

    if (userRole === 'instructor') {
      query += ` WHERE c.course_id IN (SELECT course_id FROM instructor_courses WHERE instructor_id = $1) `;
      params.push(userId);
    }

    query += ` ORDER BY a.timestamp DESC `;

    const [data] = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 15 },
      { header: 'Student Name', key: 'student_name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Year', key: 'student_year', width: 10 },
      { header: 'Course Code', key: 'course_code', width: 15 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    data.forEach(row => {
      worksheet.addRow({
        date: new Date(row.session_date).toLocaleDateString(),
        time: new Date(row.timestamp).toLocaleTimeString(),
        student_name: row.student_name,
        email: row.email,
        student_year: row.student_year || 'N/A',
        course_code: row.course_code,
        status: row.status
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error generating Excel');
  }
};

module.exports = { getActivityLogs, getAttendanceAnalytics, getIneligibleStudents, getStudentReports, exportPDF, exportExcel };
