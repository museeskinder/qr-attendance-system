const api = 'http://127.0.0.1:5000/api';

async function run() {
  const ts = Date.now();

  // Get a department and course
  let res = await fetch(`${api}/auth/departments`);
  const depts = await res.json();
  const deptId = depts.data[0].department_id;

  res = await fetch(`${api}/courses/department/${deptId}`);
  const courses = await res.json();
  const courseId = courses.data[0].course_id;

  // Test 1: Register student WITH year
  res = await fetch(`${api}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Year Test Student',
      email: `yr_${ts}@test.com`,
      password: 'pass123',
      student_year: 'Year 3',
      department_id: deptId,
      courses: [courseId]
    })
  });
  const reg = await res.json();
  if (!reg.success) { console.error('FAIL register:', reg.error); process.exit(1); }
  console.log('✅ Student registered with student_year:', reg.data.student_year);

  // Test 2: Admin login
  res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' })
  });
  const admin = await res.json();
  const token = admin.data.token;

  // Test 3: Filter reports by Year 3
  res = await fetch(`${api}/reports/student-reports?year=Year 3`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const reports = await res.json();
  if (!reports.success) { console.error('FAIL reports:', reports.error); process.exit(1); }
  console.log(`✅ /reports/student-reports?year=Year 3 => ${reports.data.length} records`);

  const match = reports.data.find(s => s.student_email === `yr_${ts}@test.com`);
  if (!match) {
    console.error('FAIL: Newly registered Year 3 student not found in filtered report');
    process.exit(1);
  }
  console.log('✅ Year 3 student appears in Year 3 filtered report');

  // Test 4: student@test.com must NOT exist (purged)
  res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@test.com', password: 'student123' })
  });
  const stuLogin = await res.json();
  if (stuLogin.success) {
    console.error('FAIL: student@test.com still exists and can login!');
    process.exit(1);
  }
  console.log('✅ student@test.com correctly purged — login rejected');

  // Test 5: instructor@test.com must NOT exist (purged)
  res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'instructor@test.com', password: 'instructor123' })
  });
  const instLogin = await res.json();
  if (instLogin.success) {
    console.error('FAIL: instructor@test.com still exists!');
    process.exit(1);
  }
  console.log('✅ instructor@test.com correctly purged — login rejected');

  console.log('\n🎉 ALL CHECKS PASSED SUCCESSFULLY!');
}

run().catch(e => { console.error(e); process.exit(1); });
