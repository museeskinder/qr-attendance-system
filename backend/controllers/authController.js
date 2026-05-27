const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const { sendInstructorCredentials } = require('../utils/emailService');

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

const register = async (req, res) => {
  const { name, email, password, role, department_id, courses, student_year, studentYear } = req.body;

  if (!name || !email || !password) {
    return sendResponse(res, 400, false, null, 'Please provide all required fields');
  }

  const userRole = 'student'; // Public registration is strictly for students
  let student_id = req.body.student_id || req.body.studentId;
  if (!student_id) {
    student_id = 'STU' + Math.floor(100000 + Math.random() * 900000);
  }

  const finalYear = student_year || studentYear;

  try {
    const pool = getPool();
    const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return sendResponse(res, 400, false, null, 'User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, department_id, student_id, student_year) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, userRole, department_id || null, student_id || null, finalYear || null]
    );

    const userId = result.insertId;

    // For students, map their courses in student_courses
    if (userRole === 'student' && courses && Array.isArray(courses) && courses.length > 0) {
      for (const courseId of courses) {
        await pool.query(
          'INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)',
          [userId, courseId]
        );
      }
    }

    await logActivity(pool, userId, `New student registered: ${email}`);

    sendResponse(res, 201, true, { id: userId, name, email, role: userRole, student_year: finalYear }, 'Registration successful');
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error during registration');
  }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendResponse(res, 400, false, null, 'Please provide email and password');
    }

    try {
      const pool = getPool();
      const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

      if (users.length === 0) {
        return sendResponse(res, 401, false, null, 'Invalid credentials');
      }

      const user = users[0];

      // Check account lock
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        return sendResponse(res, 403, false, null, `Account is temporarily locked. Try again in ${remainingMinutes} minutes.`);
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        const newFailed = (user.failed_logins || 0) + 1;
        if (newFailed >= 5) {
          await pool.query(
            "UPDATE users SET failed_logins = 0, locked_until = NOW() + INTERVAL '15 minutes' WHERE id = ?",
            [user.id]
          );
          await logActivity(pool, user.id, `Account locked after 5 failed login attempts`);
          return sendResponse(res, 403, false, null, 'Account locked due to 5 failed login attempts. Try again in 15 minutes.');
        } else {
          await pool.query('UPDATE users SET failed_logins = ? WHERE id = ?', [newFailed, user.id]);
          return sendResponse(res, 401, false, null, `Invalid credentials. Attempt ${newFailed} of 5.`);
        }
      }

      // Successful login – reset counters
      await pool.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?', [user.id]);

      // Ensure JWT secret is present
      if (!process.env.JWT_SECRET) {
        await logActivity(pool, user.id, 'Login failed – missing JWT_SECRET');
        return sendResponse(res, 500, false, null, 'Server misconfiguration: JWT secret not set.');
      }

      await logActivity(pool, user.id, `${user.role} logged in: ${user.email}`);

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

      sendResponse(res, 200, true, {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          requiresPasswordChange: !!user.requires_password_change
        }
      }, null);
    } catch (error) {
      console.error('Login error:', error);
      // Return generic JSON error to avoid network‑error on the frontend
      return sendResponse(res, 500, false, null, 'Server error during login. Please contact support.');
    }
  };

const createInstructor = async (req, res) => {
  const { name, email, assigned_courses } = req.body;

  if (!name || !email) {
    return sendResponse(res, 400, false, null, 'Please provide name and email');
  }

  try {
    const pool = getPool();
    const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return sendResponse(res, 400, false, null, 'User already exists with this email');
    }

    // Generate temporary password
    const tempPassword = 'temp_' + Math.random().toString(36).substring(2, 10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, requires_password_change) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, 'instructor', true]
    );

    const instructorId = result.insertId;

    // Associate assigned courses in instructor_courses table
    if (assigned_courses && Array.isArray(assigned_courses) && assigned_courses.length > 0) {
      for (const courseId of assigned_courses) {
        await pool.query(
          'INSERT INTO instructor_courses (instructor_id, course_id) VALUES (?, ?)',
          [instructorId, courseId]
        );
      }
    }

    // Send credentials email
    try {
      await sendInstructorCredentials(email, name, tempPassword);
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr.message);
    }

    // Log creation
    await logActivity(pool, req.user.id, `Admin created instructor account: ${name} (${email})`);

    sendResponse(res, 201, true, {
      id: instructorId,
      name,
      email,
      role: 'instructor',
      temporaryPassword: tempPassword
    }, 'Instructor created successfully');
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error during instructor creation');
  }
};

const changePassword = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return sendResponse(res, 400, false, null, 'Please provide a password');
  }

  try {
    const pool = getPool();
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'UPDATE users SET password = ?, requires_password_change = FALSE WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    await logActivity(pool, req.user.id, `User changed their password`);

    sendResponse(res, 200, true, null, 'Password updated successfully');
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error during password update');
  }
};

const getInstructors = async (req, res) => {
  try {
    const pool = getPool();
    const [instructors] = await pool.query(
      "SELECT id, name, email, requires_password_change FROM users WHERE role = 'instructor' ORDER BY name"
    );
    sendResponse(res, 200, true, instructors, null);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching instructors');
  }
};

const getDepartments = async (req, res) => {
  try {
    const pool = getPool();
    const [departments] = await pool.query('SELECT * FROM departments');
    sendResponse(res, 200, true, departments, null);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching departments');
  }
};

const getInstructorCourses = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [courses] = await pool.query(
      `SELECT c.course_id, c.course_code, c.course_name, c.department_id
       FROM courses c
       JOIN instructor_courses ic ON c.course_id = ic.course_id
       WHERE ic.instructor_id = ?`,
      [id]
    );
    sendResponse(res, 200, true, courses, null);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error fetching instructor courses');
  }
};

const updateInstructorCourses = async (req, res) => {
  const { id } = req.params;
  const { course_ids } = req.body;

  if (!Array.isArray(course_ids)) {
    return sendResponse(res, 400, false, null, 'course_ids must be an array');
  }

  try {
    const pool = getPool();
    // Verify instructor exists
    const [inst] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'instructor'", [id]);
    if (inst.length === 0) {
      return sendResponse(res, 404, false, null, 'Instructor not found');
    }

    // Replace all assigned courses atomically
    await pool.query('DELETE FROM instructor_courses WHERE instructor_id = ?', [id]);
    if (course_ids.length > 0) {
      const placeholders = course_ids.map(() => '(?, ?)').join(', ');
      const sql = `INSERT INTO instructor_courses (instructor_id, course_id) VALUES ${placeholders}`;
      const flatValues = course_ids.flatMap(cid => [id, cid]);
      await pool.query(sql, flatValues);
    }

    await logActivity(pool, req.user.id, `Admin updated courses for instructor ID ${id}`);
    sendResponse(res, 200, true, null, 'Instructor courses updated successfully');
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, null, 'Server error updating instructor courses');
  }
};

module.exports = { register, login, createInstructor, changePassword, getInstructors, getDepartments, getInstructorCourses, updateInstructorCourses };
