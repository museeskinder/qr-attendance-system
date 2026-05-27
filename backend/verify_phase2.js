const api = 'http://127.0.0.1:5000/api';

// Helper to sign a mock expired QR token (expires in 10s, but we generate it with timestamp 15 seconds ago)
const jwt = require('jsonwebtoken');
require('dotenv').config();

const getExpiredToken = (sessionId) => {
  return jwt.sign(
    { session_id: sessionId, timestamp: Date.now() - 15000 },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '10s' }
  );
};

const getValidToken = (sessionId) => {
  return jwt.sign(
    { session_id: sessionId, timestamp: Date.now() },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '10s' }
  );
};

async function runVerification() {
  console.log('🏁 STARTING PHASE 2 E2E VERIFICATION SCRIPT...\n');

  // Test setup emails
  const adminEmail = 'admin@test.com';
  const adminPass = 'admin123';
  const testInstructorEmail = `instructor_${Date.now()}@test.com`;
  const testStudentEmail = `student_${Date.now()}@test.com`;

  // Fetch departments and courses dynamically first
  console.log('👉 0. Fetching departments and courses dynamically...');
  let res = await fetch(`${api}/auth/departments`);
  let deptsData = await res.json();
  if (!deptsData.success || deptsData.data.length === 0) throw new Error('No departments found!');
  const deptId = deptsData.data[0].department_id;
  console.log(`   Fetched Department ID: ${deptId}`);

  res = await fetch(`${api}/courses/department/${deptId}`);
  let coursesData = await res.json();
  if (!coursesData.success || coursesData.data.length < 2) throw new Error('Not enough courses found in department!');
  const courseIds = coursesData.data.slice(0, 2).map(c => c.course_id);
  console.log(`   Fetched Course IDs: ${JSON.stringify(courseIds)}`);

  // 1. ADMIN LOGIN
  console.log('\n👉 1. Logging in as Admin...');
  res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPass })
  });
  let adminData = await res.json();
  if (!adminData.success) throw new Error('Admin login failed: ' + adminData.error);
  const adminToken = adminData.data.token;
  console.log('   ✅ Admin logged in.');

  // 2. USER LOGIN ATTEMPTS / LOCKING
  console.log('\n👉 2. Verifying Account Locking (5 failed attempts)...');
  const lockEmail = `lock_test_${Date.now()}@test.com`;
  
  // Register a temporary user to test locking
  res = await fetch(`${api}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Lock Test', email: lockEmail, password: 'password123', role: 'student', student_year: 'Year 1', department_id: deptId, courses: [courseIds[0]] })
  });
  
  // Attempt 5 bad logins
  for (let i = 1; i <= 5; i++) {
    res = await fetch(`${api}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockEmail, password: 'wrongpassword' })
    });
    let attemptData = await res.json();
    console.log(`   Attempt ${i}/5 response status: ${res.status}. Message: ${attemptData.error}`);
    if (i === 5) {
      if (res.status !== 403 || !attemptData.error.includes('locked')) {
        throw new Error('5th failed attempt did not lock the account!');
      }
    }
  }

  // Attempt 6th login (should be locked instantly)
  res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: lockEmail, password: 'wrongpassword' })
  });
  let lockedData = await res.json();
  console.log(`   Attempt 6 response status: ${res.status}. Message: ${lockedData.error}`);
  if (res.status !== 403 || !lockedData.error.includes('locked')) {
    throw new Error('Account was not locked on subsequent attempt!');
  }
  console.log('   ✅ Account locking functions correctly.');

  // 3. STUDENT REGISTRATION WITH DEPT & COURSES
  console.log('\n👉 3b. Registering student with dynamic Department & Courses...');
  res = await fetch(`${api}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Student',
      email: testStudentEmail,
      password: 'studentpassword123',
      role: 'student',
      student_year: 'Year 3',
      department_id: deptId,
      courses: courseIds
    })
  });
  let regData = await res.json();
  if (!regData.success) throw new Error('Student registration failed: ' + regData.error);
  console.log('   ✅ Student registered successfully.');

  // Log in the student to fetch token
  res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudentEmail, password: 'studentpassword123' })
  });
  let studentLogin = await res.json();
  const studentToken = studentLogin.data.token;
  const studentId = studentLogin.data.user.id;
  console.log('   ✅ Student logged in.');

  // 4. ADMIN CREATES INSTRUCTOR & ASSIGNS COURSES
  console.log('\n👉 4. Admin creating Instructor with courses assigned...');
  res = await fetch(`${api}/auth/instructor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Test Instructor',
      email: testInstructorEmail,
      assigned_courses: courseIds
    })
  });
  let instCreate = await res.json();
  if (!instCreate.success) throw new Error('Instructor creation failed: ' + instCreate.error);
  const tempPassword = instCreate.data.temporaryPassword;
  console.log(`   ✅ Instructor created with Temp Password: ${tempPassword}`);

  // Login with temporary password
  res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testInstructorEmail, password: tempPassword })
  });
  let instLogin = await res.json();
  if (!instLogin.success) throw new Error('Instructor temp login failed: ' + instLogin.error);
  if (!instLogin.data.user.requiresPasswordChange) {
    throw new Error('Instructor requiresPasswordChange is not true!');
  }
  let instToken = instLogin.data.token;
  console.log('   ✅ Instructor logged in and flagged for password change.');

  // Change password
  res = await fetch(`${api}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${instToken}`
    },
    body: JSON.stringify({ password: 'newinstructorpassword123' })
  });
  let passChange = await res.json();
  if (!passChange.success) throw new Error('Password change failed: ' + passChange.error);
  console.log('   ✅ Password changed.');

  // Re-login with new password
  res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testInstructorEmail, password: 'newinstructorpassword123' })
  });
  instLogin = await res.json();
  if (!instLogin.success) throw new Error('Instructor final login failed: ' + instLogin.error);
  if (instLogin.data.user.requiresPasswordChange) {
    throw new Error('Instructor requiresPasswordChange is still true after update!');
  }
  instToken = instLogin.data.token;
  console.log('   ✅ Logged in successfully with new password.');

  // 5. GEOLOCATION & SESSION CREATION
  console.log('\n👉 5. Creating class sessions to test geolocation and timing...');
  
  // A. Session in current time (Present)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const sessionDate = now.toISOString().split('T')[0];
  const startTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  const endTime = `${pad((now.getHours() + 1) % 24)}:${pad(now.getMinutes())}:00`;

  res = await fetch(`${api}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${instToken}`
    },
    body: JSON.stringify({
      course_id: courseIds[0],
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      room_number: 'CS Lab 1',
      latitude: 40.7128,  // New York Coordinates
      longitude: -74.0060,
      allowed_radius: 30  // 30 meters
    })
  });
  let activeSessionRes = await res.json();
  if (!activeSessionRes.success) throw new Error('Failed to create present session: ' + activeSessionRes.error);
  const activeSessionId = activeSessionRes.data.session_id;
  console.log(`   ` + `✅ Created "Present" session ID ${activeSessionId} at coordinates (40.7128, -74.0060)`);

  // B. Session started 15 minutes ago (Late status)
  const lateTimeObj = new Date(Date.now() - 15 * 60 * 1000);
  const lateStartTime = `${pad(lateTimeObj.getHours())}:${pad(lateTimeObj.getMinutes())}:00`;
  res = await fetch(`${api}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${instToken}`
    },
    body: JSON.stringify({
      course_id: courseIds[0],
      session_date: sessionDate,
      start_time: lateStartTime,
      end_time: endTime,
      room_number: 'CS Lab 1',
      latitude: 40.7128,
      longitude: -74.0060,
      allowed_radius: 30
    })
  });
  let lateSessionRes = await res.json();
  const lateSessionId = lateSessionRes.data.session_id;
  console.log(`   ✅ Created "Late" session ID ${lateSessionId} starting 15m ago`);

  // C. Session started 25 minutes ago (Closed status)
  const expiredTimeObj = new Date(Date.now() - 25 * 60 * 1000);
  const expiredStartTime = `${pad(expiredTimeObj.getHours())}:${pad(expiredTimeObj.getMinutes())}:00`;
  res = await fetch(`${api}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${instToken}`
    },
    body: JSON.stringify({
      course_id: courseIds[0],
      session_date: sessionDate,
      start_time: expiredStartTime,
      end_time: endTime,
      room_number: 'CS Lab 1',
      latitude: 40.7128,
      longitude: -74.0060,
      allowed_radius: 30
    })
  });
  let expiredSessionRes = await res.json();
  const expiredSessionId = expiredSessionRes.data.session_id;
  console.log(`   ✅ Created "Expired" session ID ${expiredSessionId} starting 25m ago`);

  // 6. TESTING FAILED SCAN (OUTSIDE RADIUS)
  console.log('\n👉 6. Scanning session with coordinates outside range (should fail)...');
  const tokenForPresent = getValidToken(activeSessionId);
  res = await fetch(`${api}/attendance/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      qr_code: tokenForPresent,
      latitude: 40.8128,  // Over 10km away
      longitude: -74.1060
    })
  });
  let outsideRes = await res.json();
  console.log(`   Response status: ${res.status}. Message: ${outsideRes.error}`);
  if (outsideRes.success || !outsideRes.error.includes('Outside allowed classroom radius')) {
    throw new Error('Check-in outside classroom radius did not fail as expected!');
  }
  console.log('   ✅ Outside radius scan correctly rejected.');

  // 7. TESTING FAILED SCAN (EXPIRED ROTATING TOKEN)
  console.log('\n👉 7. Scanning with expired rotating token (timestamp > 10s ago) (should fail)...');
  const expiredToken = getExpiredToken(activeSessionId);
  res = await fetch(`${api}/attendance/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      qr_code: expiredToken,
      latitude: 40.7128,
      longitude: -74.0060
    })
  });
  let expiredTokenRes = await res.json();
  console.log(`   Response status: ${res.status}. Message: ${expiredTokenRes.error}`);
  if (expiredTokenRes.success || !expiredTokenRes.error.includes('expired')) {
    throw new Error('Expired rotating token did not fail as expected!');
  }
  console.log('   ✅ Expired rotating token scan correctly rejected.');

  // 8. TESTING PRESENT CHECK-IN (INSIDE RADIUS)
  console.log('\n👉 8. Scanning present session inside classroom radius...');
  res = await fetch(`${api}/attendance/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      qr_code: getValidToken(activeSessionId),
      latitude: 40.7128,
      longitude: -74.0060
    })
  });
  let presentScanRes = await res.json();
  console.log(`   Response status: ${res.status}. Status: ${presentScanRes.data?.status}`);
  if (!presentScanRes.success || presentScanRes.data.status !== 'Present') {
    throw new Error('Present scan failed: ' + presentScanRes.error);
  }
  console.log('   ✅ Present attendance logged.');

  // 9. TESTING LATE CHECK-IN (INSIDE RADIUS)
  console.log('\n👉 9. Scanning late session inside classroom radius...');
  res = await fetch(`${api}/attendance/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      qr_code: getValidToken(lateSessionId),
      latitude: 40.7128,
      longitude: -74.0060
    })
  });
  let lateScanRes = await res.json();
  console.log(`   Response status: ${res.status}. Status: ${lateScanRes.data?.status}`);
  if (!lateScanRes.success || lateScanRes.data.status !== 'Late') {
    throw new Error('Late scan failed: ' + lateScanRes.error);
  }
  console.log('   ✅ Late attendance logged.');

  // 10. TESTING EXPIRED CHECK-IN (TIME OVER 20 MINUTES)
  console.log('\n👉 10. Scanning expired session (time > 20 mins)...');
  res = await fetch(`${api}/attendance/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      qr_code: getValidToken(expiredSessionId),
      latitude: 40.7128,
      longitude: -74.0060
    })
  });
  let expiredTimeRes = await res.json();
  console.log(`    Response status: ${res.status}. Message: ${expiredTimeRes.error}`);
  if (expiredTimeRes.success || !expiredTimeRes.error.includes('expired')) {
    throw new Error('Expired session time check-in did not fail as expected!');
  }
  console.log('    ✅ Expired session time check-in correctly rejected.');

  // 11. REPORTS AND INELIGIBLE LISTS
  console.log('\n👉 11. Verifying reports, ineligible students list & student stats...');
  
  // Student stats
  res = await fetch(`${api}/attendance/stats`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  let studentStats = await res.json();
  if (!studentStats.success) throw new Error('Failed to fetch student stats');
  console.log(`    Student stats courses fetched: ${studentStats.data.length}`);
  console.log(`    Course stats example: ${studentStats.data[0].course_name} -> Attended: ${studentStats.data[0].attended_count}, Missed: ${studentStats.data[0].missed_count}, Attendance %: ${studentStats.data[0].attendance_percentage}%, Eligible: ${studentStats.data[0].eligible}`);

  // Ineligible list (admin)
  res = await fetch(`${api}/reports/ineligible-students`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  let ineligibleList = await res.json();
  if (!ineligibleList.success) throw new Error('Failed to fetch ineligible students list');
  console.log(`    Ineligible students count: ${ineligibleList.data.length}`);

  // Analytics (admin)
  res = await fetch(`${api}/reports/attendance-analytics`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  let reportAnalytics = await res.json();
  if (!reportAnalytics.success) throw new Error('Failed to fetch report analytics');
  console.log('    ✅ Analytics and ineligible reports fetched successfully.');

  console.log('\n🌟🌟🌟 ALL UPGRADE AND SECURITY VERIFICATIONS PASSED SUCCESSFULLY! 🌟🌟🌟\n');
}

runVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
