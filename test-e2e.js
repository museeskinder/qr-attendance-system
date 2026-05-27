const api = 'http://localhost:5000/api';

async function testE2E() {
  console.log('--- E2E Test Starting ---');

  // 1. Admin Login
  console.log('1. Admin Login');
  let res = await fetch(`${api}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' })
  });
  let data = await res.json();
  if (!data.success) throw new Error('Admin login failed: ' + data.error);
  const adminToken = data.data.token;
  console.log('Admin login OK');

  // 2. Instructor Login
  console.log('2. Instructor Login');
  res = await fetch(`${api}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'instructor@test.com', password: 'instructor123' })
  });
  data = await res.json();
  if (!data.success) throw new Error('Instructor login failed: ' + data.error);
  const instructorToken = data.data.token;
  const instructorId = data.data.user.id;
  console.log('Instructor login OK');

  // 3. Student Login
  console.log('3. Student Login');
  res = await fetch(`${api}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@test.com', password: 'student123' })
  });
  data = await res.json();
  if (!data.success) throw new Error('Student login failed: ' + data.error);
  const studentToken = data.data.token;
  console.log('Student login OK');

  // 4. Admin Creates Course
  console.log('4. Create Course');
  res = await fetch(`${api}/courses`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ course_code: 'CS101', course_name: 'Intro to CS', instructor_id: instructorId })
  });
  data = await res.json();
  if (!data.success) throw new Error('Course creation failed: ' + data.error);
  const courseId = data.data.course_id;
  console.log('Course created OK:', courseId);

  // 5. Instructor Creates Session
  console.log('5. Create Session');
  res = await fetch(`${api}/sessions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instructorToken}` },
    body: JSON.stringify({ course_id: courseId, session_date: '2026-05-20', start_time: '10:00:00', end_time: '11:00:00' })
  });
  data = await res.json();
  if (!data.success) throw new Error('Session creation failed: ' + data.error);
  const sessionId = data.data.session_id;
  const qrCode = data.data.qr_code;
  console.log('Session created OK:', sessionId, 'QR Code:', qrCode);

  // 6. Student Marks Attendance
  console.log('6. Mark Attendance');
  res = await fetch(`${api}/attendance/scan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
    body: JSON.stringify({ qr_code: qrCode })
  });
  data = await res.json();
  if (!data.success) throw new Error('Attendance marking failed: ' + data.error);
  console.log('Attendance marked OK');

  // 7. Prevent Duplicate Attendance
  console.log('7. Test Duplicate Attendance');
  res = await fetch(`${api}/attendance/scan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
    body: JSON.stringify({ qr_code: qrCode })
  });
  data = await res.json();
  if (data.success) throw new Error('Duplicate attendance should have failed but succeeded');
  console.log('Duplicate attendance prevented OK');

  // 8. Admin Fetch Reports
  console.log('8. Fetch Admin Analytics');
  res = await fetch(`${api}/reports/attendance-analytics`, {
    method: 'GET', headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  data = await res.json();
  if (!data.success) throw new Error('Analytics failed: ' + data.error);
  console.log('Analytics fetched OK');

  console.log('--- E2E Test Passed Successfully ---');
}

testE2E().catch(console.error);
