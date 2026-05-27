const { getPool } = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

const createCourse = async (req, res) => {
  const { course_code, course_name, department_id, credit_hour, instructor_id, eligibility_percentage } = req.body;

  if (!course_code || !course_name) {
    return sendResponse(res, 400, false, null, 'Course code and name are required');
  }

  try {
    const pool = getPool();

    // Validate instructor_id
    if (instructor_id) {
      const [instructor] = await pool.query('SELECT id, role FROM users WHERE id = ?', [instructor_id]);
      if (instructor.length === 0) {
        return sendResponse(res, 400, false, null, 'Invalid instructor ID: User does not exist');
      }
      if (instructor[0].role !== 'instructor') {
        return sendResponse(res, 400, false, null, 'Invalid instructor ID: User is not an instructor');
      }
    }

    const [result] = await pool.query(
      `INSERT INTO courses 
      (course_code, course_name, department_id, credit_hour, instructor_id, eligibility_percentage) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [course_code, course_name, department_id || null, credit_hour || null, instructor_id || null, eligibility_percentage || 75]
    );

    sendResponse(res, 201, true, { course_id: result.insertId }, 'Course created successfully');
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
      return sendResponse(res, 400, false, null, 'Invalid instructor ID: Reference constraint failed');
    }
    sendResponse(res, 500, false, null, 'Server error while creating course');
  }
};

const getCourses = async (req, res) => {
  try {
    const pool = getPool();
    let query = `
      SELECT c.*, u.name as instructor_name 
      FROM courses c 
      LEFT JOIN users u ON c.instructor_id = u.id
    `;
    let params = [];

    // If instructor, only show courses assigned via instructor_courses
    if (req.user.role === 'instructor') {
      query = `
        SELECT c.*, u.name as instructor_name
        FROM courses c
        JOIN instructor_courses ic ON c.course_id = ic.course_id
        LEFT JOIN users u ON c.instructor_id = u.id
        WHERE ic.instructor_id = ?
      `;
      params.push(req.user.id);
    } 
    // If student, only show courses enrolled via student_courses
    else if (req.user.role === 'student') {
      query = `
        SELECT c.*, u.name as instructor_name
        FROM courses c
        JOIN student_courses sc ON c.course_id = sc.course_id
        LEFT JOIN users u ON c.instructor_id = u.id
        WHERE sc.student_id = ?
      `;
      params.push(req.user.id);
    }

    const [courses] = await pool.query(query, params);
    sendResponse(res, 200, true, courses, null);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching courses');
  }
};

const getCoursesByDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [courses] = await pool.query(
      'SELECT * FROM courses WHERE department_id = ?',
      [id]
    );
    sendResponse(res, 200, true, courses, null);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching courses by department');
  }
};

const updateCourseEligibility = async (req, res) => {
  const { id } = req.params;
  const { eligibility_percentage } = req.body;

  if (eligibility_percentage === undefined || eligibility_percentage === null) {
    return sendResponse(res, 400, false, null, 'eligibility_percentage is required');
  }

  const percentage = parseInt(eligibility_percentage);
  if (isNaN(percentage) || percentage < 0 || percentage > 100) {
    return sendResponse(res, 400, false, null, 'eligibility_percentage must be an integer between 0 and 100');
  }

  try {
    const pool = getPool();

    // If instructor, check if they are assigned to this course
    if (req.user.role === 'instructor') {
      const [assignment] = await pool.query(
        'SELECT * FROM instructor_courses WHERE instructor_id = ? AND course_id = ?',
        [req.user.id, id]
      );
      if (assignment.length === 0) {
        return sendResponse(res, 403, false, null, 'Access denied. You are not assigned to this course.');
      }
    }

    const [result] = await pool.query(
      'UPDATE courses SET eligibility_percentage = ? WHERE course_id = ? RETURNING *',
      [percentage, id]
    );

    if (result.length === 0) {
      return sendResponse(res, 404, false, null, 'Course not found');
    }

    sendResponse(res, 200, true, { course_id: id, eligibility_percentage: percentage }, 'Course eligibility threshold updated successfully');
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error while updating course eligibility');
  }
};

module.exports = { createCourse, getCourses, getCoursesByDepartment, updateCourseEligibility };

