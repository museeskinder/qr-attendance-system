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


const fetchFilteredSummaryData = async (pool, userRole, userId, queryParams) => {
  let query = `
    SELECT 
      u.id AS student_id,
      u.student_id AS student_code,
      u.name AS student_name,
      u.email AS student_email,
      u.student_year,
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

  if (queryParams.year) {
    params.push(queryParams.year);
    queryConditions.push(`u.student_year = $${params.length}`);
  }

  if (queryConditions.length > 0) {
    query += ` WHERE ` + queryConditions.join(' AND ');
  }

  query += ` GROUP BY u.id, c.course_id, u.name, u.email, u.student_year, u.student_id, c.course_code, c.course_name, c.eligibility_percentage `;

  const [reports] = await pool.query(query, params);

  // Calculate is_eligible
  let formatted = reports.map(r => ({
    ...r,
    is_eligible: parseFloat(r.attendance_percentage) >= parseFloat(r.required_percentage)
  }));

  // Apply sorting matching front-end getSortedStudents()
  const sortBy = queryParams.sortBy || 'name_asc';
  switch (sortBy) {
    case 'eligibility_asc':
      formatted.sort((a, b) => (a.is_eligible === b.is_eligible ? 0 : a.is_eligible ? 1 : -1));
      break;
    case 'eligibility_desc':
      formatted.sort((a, b) => (a.is_eligible === b.is_eligible ? 0 : a.is_eligible ? -1 : 1));
      break;
    case 'present_asc':
      formatted.sort((a, b) => a.present_count - b.present_count);
      break;
    case 'present_desc':
      formatted.sort((a, b) => b.present_count - a.present_count);
      break;
    case 'late_asc':
      formatted.sort((a, b) => a.late_count - b.late_count);
      break;
    case 'late_desc':
      formatted.sort((a, b) => b.late_count - a.late_count);
      break;
    case 'absent_asc':
      formatted.sort((a, b) => a.absent_count - b.absent_count);
      break;
    case 'absent_desc':
      formatted.sort((a, b) => b.absent_count - a.absent_count);
      break;
    case 'name_asc':
    default:
      formatted.sort((a, b) => a.student_name.localeCompare(b.student_name));
      break;
  }

  return formatted;
};


const exportPDF = async (req, res) => {
  try {
    const pool = getPool();
    const userRole = req.user.role;
    const userId = req.user.id;

    const data = await fetchFilteredSummaryData(pool, userRole, userId, req.query);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
    doc.pipe(res);

    // Title
    doc.fontSize(20).fillColor('#0F172A').text('Attendance Eligibility Report', { align: 'center' });
    doc.moveDown(0.2);
    
    // Metadata / Filters info
    const filterInfo = `Filters: Academic Year: ${req.query.year || 'All'} | Sorted By: ${req.query.sortBy || 'Name (A-Z)'}`;
    doc.fontSize(10).fillColor('#64748B').text(filterInfo, { align: 'center' });
    doc.moveDown(1.5);

    // Draw table header
    const tableTop = 110;
    const colWidths = {
      id: 60,
      name: 120,
      course: 60,
      present: 45,
      late: 40,
      absent: 45,
      rate: 70,
      status: 70
    };
    
    const colPositions = {
      id: 30,
      name: 90,
      course: 210,
      present: 270,
      late: 315,
      absent: 355,
      rate: 400,
      status: 470
    };

    doc.fontSize(9).fillColor('#475569');
    doc.text('Student ID', colPositions.id, tableTop, { bold: true });
    doc.text('Student Name', colPositions.name, tableTop, { bold: true });
    doc.text('Course', colPositions.course, tableTop, { bold: true });
    doc.text('Presents', colPositions.present, tableTop, { align: 'right', bold: true });
    doc.text('Lates', colPositions.late, tableTop, { align: 'right', bold: true });
    doc.text('Absents', colPositions.absent, tableTop, { align: 'right', bold: true });
    doc.text('Attendance %', colPositions.rate, tableTop, { align: 'right', bold: true });
    doc.text('Exam Eligibility', colPositions.status, tableTop, { align: 'right', bold: true });

    // Draw horizontal separator line
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(30, tableTop + 15).lineTo(565, tableTop + 15).stroke();

    let yPosition = tableTop + 25;

    data.forEach((row) => {
      // Automatic page break check
      if (yPosition > 780) {
        doc.addPage();
        yPosition = 50;
        
        // Re-render header on new page
        doc.fontSize(9).fillColor('#475569');
        doc.text('Student ID', colPositions.id, yPosition);
        doc.text('Student Name', colPositions.name, yPosition);
        doc.text('Course', colPositions.course, yPosition);
        doc.text('Presents', colPositions.present, yPosition, { align: 'right' });
        doc.text('Lates', colPositions.late, yPosition, { align: 'right' });
        doc.text('Absents', colPositions.absent, yPosition, { align: 'right' });
        doc.text('Attendance %', colPositions.rate, yPosition, { align: 'right' });
        doc.text('Exam Eligibility', colPositions.status, yPosition, { align: 'right' });
        doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(30, yPosition + 15).lineTo(565, yPosition + 15).stroke();
        yPosition += 25;
      }

      doc.fontSize(9).fillColor('#0F172A');
      doc.text(row.student_code || 'N/A', colPositions.id, yPosition);
      doc.text(row.student_name || 'N/A', colPositions.name, yPosition);
      doc.text(row.course_code || 'N/A', colPositions.course, yPosition);
      doc.text(row.present_count.toString(), colPositions.present, yPosition, { width: colWidths.present, align: 'right' });
      doc.text(row.late_count.toString(), colPositions.late, yPosition, { width: colWidths.late, align: 'right' });
      doc.text(row.absent_count.toString(), colPositions.absent, yPosition, { width: colWidths.absent, align: 'right' });
      doc.text(`${row.attendance_percentage}%`, colPositions.rate, yPosition, { width: colWidths.rate, align: 'right' });
      
      const statusText = row.is_eligible ? 'Eligible' : 'Ineligible';
      doc.fillColor(row.is_eligible ? '#16A34A' : '#DC2626');
      doc.text(statusText, colPositions.status, yPosition, { width: colWidths.status, align: 'right' });

      // Draw subtle row separator line
      doc.strokeColor('#F1F5F9').lineWidth(0.5).moveTo(30, yPosition + 13).lineTo(565, yPosition + 13).stroke();

      yPosition += 20;
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

    const data = await fetchFilteredSummaryData(pool, userRole, userId, req.query);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Eligibility Summary');

    worksheet.columns = [
      { header: 'Student ID', key: 'student_code', width: 15 },
      { header: 'Student Name', key: 'student_name', width: 25 },
      { header: 'Course Code', key: 'course_code', width: 15 },
      { header: 'Course Name', key: 'course_name', width: 25 },
      { header: 'Academic Year', key: 'student_year', width: 15 },
      { header: 'Presents Count', key: 'present_count', width: 15 },
      { header: 'Lates Count', key: 'late_count', width: 15 },
      { header: 'Absents Count', key: 'absent_count', width: 15 },
      { header: 'Attendance %', key: 'attendance_percentage', width: 15 },
      { header: 'Min Required %', key: 'required_percentage', width: 15 },
      { header: 'Exam Eligibility', key: 'eligibility', width: 18 }
    ];

    // Format headers to look highly professional
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // charcoal slate header background
    };

    data.forEach(row => {
      worksheet.addRow({
        student_code: row.student_code || 'N/A',
        student_name: row.student_name,
        course_code: row.course_code,
        course_name: row.course_name,
        student_year: row.student_year || 'N/A',
        present_count: row.present_count,
        late_count: row.late_count,
        absent_count: row.absent_count,
        attendance_percentage: parseFloat(row.attendance_percentage),
        required_percentage: parseFloat(row.required_percentage),
        eligibility: row.is_eligible ? 'Eligible' : 'Ineligible'
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

