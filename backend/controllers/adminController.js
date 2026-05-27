// backend/controllers/adminController.js
const { getPool } = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const bcrypt = require('bcryptjs');

/**
 * Log an activity to the activity_logs table
 */
const logActivity = async (pool, userId, action) => {
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, action) VALUES (?, ?)',
      [userId, action]
    );
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
};

/**
 * Fetch activity logs (admin only) — enriched with user role
 */
const getActivityLogs = async (req, res) => {
  try {
    const pool = getPool();
    const [logs] = await pool.query(`
      SELECT
        al.log_id,
        al.user_id,
        COALESCE(u.name, 'System') AS name,
        COALESCE(u.email, 'N/A') AS email,
        COALESCE(u.role, 'N/A') AS role,
        al.action,
        al.created_at
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 300
    `);
    sendResponse(res, 200, true, logs, null);
  } catch (err) {
    console.error(err);
    sendResponse(res, 500, false, null, 'Failed to fetch activity logs');
  }
};

/**
 * List all instructors and students (admin only)
 * GET /api/admin/users?role=instructor|student
 */
const listUsers = async (req, res) => {
  const { role } = req.query;
  try {
    const pool = getPool();
    let query = `
      SELECT id, name, email, role, student_year, student_id, requires_password_change
      FROM users
      WHERE role != 'admin'
    `;
    const params = [];
    if (role) {
      query += ` AND role = ?`;
      params.push(role);
    }
    query += ` ORDER BY role, name`;
    const [users] = await pool.query(query, params);
    sendResponse(res, 200, true, users, null);
  } catch (err) {
    console.error(err);
    sendResponse(res, 500, false, null, 'Failed to list users');
  }
};

/**
 * Edit a user account (admin only)
 * PUT /api/admin/users/:id
 */
const editUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, student_year, password } = req.body;

  try {
    const pool = getPool();

    // Get current user
    const [existing] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return sendResponse(res, 404, false, null, 'User not found');
    }

    const user = existing[0];

    // Prevent editing admins
    if (user.role === 'admin') {
      return sendResponse(res, 403, false, null, 'Cannot edit admin accounts');
    }

    // Check email uniqueness
    if (email && email !== user.email) {
      const [emailCheck] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      if (emailCheck.length > 0) {
        return sendResponse(res, 400, false, null, 'Email already in use by another account');
      }
    }

    // Build update fields
    const setParts = [];
    const params = [];

    if (name) { setParts.push('name = ?'); params.push(name); }
    if (email) { setParts.push('email = ?'); params.push(email); }
    if (student_year !== undefined) {
      setParts.push('student_year = ?');
      params.push(student_year || null);
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      setParts.push('password = ?');
      params.push(hashed);
      setParts.push('requires_password_change = FALSE');
    }

    if (setParts.length === 0) {
      return sendResponse(res, 400, false, null, 'No fields provided to update');
    }

    params.push(id);
    await pool.query(`UPDATE users SET ${setParts.join(', ')} WHERE id = ?`, params);

    await logActivity(
      pool,
      req.user.id,
      `Admin edited ${user.role} account: ${user.name} (${user.email})${name && name !== user.name ? ` → name: ${name}` : ''}${email && email !== user.email ? ` → email: ${email}` : ''}`
    );

    sendResponse(res, 200, true, null, 'User updated successfully');
  } catch (err) {
    console.error(err);
    sendResponse(res, 500, false, null, 'Failed to update user');
  }
};

/**
 * Delete a user account (admin only) — safe deletion preserves attendance records
 * DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = getPool();

    // Get user info before deletion
    const [userInfo] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [id]
    );
    if (userInfo.length === 0) {
      return sendResponse(res, 404, false, null, 'User not found');
    }

    const user = userInfo[0];

    // Prevent deletion of admin accounts
    if (user.role === 'admin') {
      return sendResponse(res, 403, false, null, 'Cannot delete admin accounts');
    }

    // Safe deletion: NULL-ify attendance references to preserve history
    await pool.query('UPDATE attendance SET student_id = NULL WHERE student_id = ?', [id]);

    // Clean up relational associations
    await pool.query('DELETE FROM instructor_courses WHERE instructor_id = ?', [id]);
    await pool.query('DELETE FROM student_courses WHERE student_id = ?', [id]);

    // Delete user
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    await logActivity(
      pool,
      req.user.id,
      `Admin deleted ${user.role} account: ${user.name} (${user.email})`
    );

    sendResponse(res, 200, true, { affectedRows: result.affectedRows }, `${user.role} account deleted successfully`);
  } catch (err) {
    console.error(err);
    sendResponse(res, 500, false, null, 'Failed to delete user');
  }
};

module.exports = { getActivityLogs, listUsers, editUser, deleteUser, logActivity };
