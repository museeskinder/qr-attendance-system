require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected idle client error', err);
  process.exit(-1);
});

function translatePlaceholders(sql) {
  let idx = 1;
  return sql.replace(/\?/g, () => `$${idx++}`);
}

// Wrapper returns [rows] to keep compatibility with mysql2 style `const [rows] = await pool.query(...);`
async function query(sql, params = []) {
  const text = translatePlaceholders(sql);
  
  // If it's an INSERT query and doesn't contain RETURNING, append RETURNING *
  const isInsert = /^\s*insert\s+into/i.test(text);
  const hasReturning = /returning/i.test(text);
  let finalSql = text;
  if (isInsert && !hasReturning) {
    finalSql += ' RETURNING *';
  }

  const result = await pool.query(finalSql, params);
  const rowsArray = result.rows;
  
  if (isInsert && rowsArray.length > 0) {
    const firstRow = rowsArray[0];
    // Find any key that ends with 'id' or is exactly 'id'
    const idKey = Object.keys(firstRow).find(key => key.toLowerCase() === 'id' || key.toLowerCase().endsWith('_id'));
    const insertedId = idKey ? firstRow[idKey] : null;
    rowsArray.insertId = insertedId;
  }
  
  return [rowsArray];
}

async function initializeDatabase() {
  try {
    // 1. Create tables
    console.log('⏳ Creating tables if not exists...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        department_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        department_id INT REFERENCES departments(department_id) ON DELETE SET NULL,
        student_id VARCHAR(50),
        student_year VARCHAR(20) DEFAULT NULL,
        failed_logins INT DEFAULT 0,
        locked_until TIMESTAMP NULL,
        requires_password_change BOOLEAN DEFAULT FALSE
      );
    `);

    // Ensure student_year column exists in case users table already exists
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS student_year VARCHAR(20) DEFAULT NULL;");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        course_id SERIAL PRIMARY KEY,
        course_code VARCHAR(50) NOT NULL UNIQUE,
        course_name VARCHAR(100) NOT NULL,
        department_id INT REFERENCES departments(department_id) ON DELETE SET NULL,
        credit_hour INT,
        instructor_id INT REFERENCES users(id) ON DELETE SET NULL,
        eligibility_percentage INT DEFAULT 75
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS instructor_courses (
        instructor_id INT REFERENCES users(id) ON DELETE CASCADE,
        course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
        PRIMARY KEY (instructor_id, course_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_courses (
        student_id INT REFERENCES users(id) ON DELETE CASCADE,
        course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
        PRIMARY KEY (student_id, course_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_sessions (
        session_id SERIAL PRIMARY KEY,
        course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
        session_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        room_number VARCHAR(50),
        status VARCHAR(20) DEFAULT 'open',
        qr_code VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        allowed_radius INT DEFAULT 30
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        attendance_id SERIAL PRIMARY KEY,
        student_id INT REFERENCES users(id) ON DELETE CASCADE,
        session_id INT REFERENCES class_sessions(session_id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        log_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tables created. Seeding data...');

    // 2. Seed departments
    const depts = ['Geophysics', 'Computer Science', 'Mathematics'];
    for (const d of depts) {
      await pool.query('INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [d]);
    }

    // Get department IDs
    const deptRows = (await pool.query('SELECT department_id, name FROM departments')).rows;
    const csDept = deptRows.find(r => r.name === 'Computer Science');
    const csDeptId = csDept ? csDept.department_id : null;

    // Purge demo student and instructor accounts from the database
    await pool.query("DELETE FROM users WHERE email = 'student@test.com'");
    await pool.query("DELETE FROM users WHERE email = 'instructor@test.com'");

    // 3. Seed users (Only Admin User now)
    const usersToSeed = [
      {
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'admin123',
        role: 'admin',
        department_id: null,
        student_id: null
      }
    ];

    const seededUsers = {};
    for (const u of usersToSeed) {
      const existing = (await pool.query('SELECT id FROM users WHERE email = $1', [u.email])).rows;
      if (existing.length === 0) {
        const hashed = await bcrypt.hash(u.password, 10);
        const res = await pool.query(
          'INSERT INTO users (name, email, password, role, department_id, student_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [u.name, u.email, hashed, u.role, u.department_id, u.student_id]
        );
        seededUsers[u.email] = res.rows[0].id;
        console.log(`👤 Seeded user: ${u.email}`);
      } else {
        seededUsers[u.email] = existing[0].id;
      }
    }

    // 4. Seed courses for all departments
    const instructorId = null; // No default instructor exists
    const studentId = null; // No default student exists

    for (const dept of deptRows) {
      const deptId = dept.department_id;
      const deptName = dept.name;

      let coursesToSeed = [];
      if (deptName === 'Geophysics') {
        coursesToSeed = [
          { code: 'GP101', name: 'Intro to Geophysics' },
          { code: 'GP102', name: 'Seismology' }
        ];
      } else if (deptName === 'Computer Science') {
        coursesToSeed = [
          { code: 'CS101', name: 'Intro to Computer Science' },
          { code: 'CS102', name: 'Data Structures' }
        ];
      } else if (deptName === 'Mathematics') {
        coursesToSeed = [
          { code: 'MA101', name: 'Calculus I' },
          { code: 'MA102', name: 'Calculus II' }
        ];
      }

      for (const c of coursesToSeed) {
        const existingCourse = (await pool.query('SELECT course_id FROM courses WHERE course_code = $1', [c.code])).rows;
        let courseId;
        if (existingCourse.length === 0) {
          const res = await pool.query(
            'INSERT INTO courses (course_code, course_name, department_id, credit_hour, instructor_id, eligibility_percentage) VALUES ($1, $2, $3, $4, $5, $6) RETURNING course_id',
            [c.code, c.name, deptId, 3, instructorId, 75]
          );
          courseId = res.rows[0].course_id;
          console.log(`📚 Seeded course: ${c.code}`);
        } else {
          courseId = existingCourse[0].course_id;
        }

        // Link instructor
        if (instructorId) {
          await pool.query(
            'INSERT INTO instructor_courses (instructor_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [instructorId, courseId]
          );
        }

        // Link student
        if (studentId) {
          await pool.query(
            'INSERT INTO student_courses (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [studentId, courseId]
          );
        }
      }
    }

    console.log('✅ Connected to Neon PostgreSQL & migration/seeds completed');
  } catch (err) {
    console.error('❌ Failed to connect to Neon PostgreSQL:', err.message);
    throw err;
  }
}

function getPool() {
  return { query };
}

module.exports = { initializeDatabase, getPool, pool, query };
