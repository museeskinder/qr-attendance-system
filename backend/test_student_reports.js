const api = 'http://127.0.0.1:5000/api';

async function run() {
  console.log('Testing /reports/student-reports');
  const res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' })
  });
  const data = await res.json();
  const token = data.data.token;
  
  const reportRes = await fetch(`${api}/reports/student-reports`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const reportData = await reportRes.json();
  
  if (reportData.success) {
    console.log('✅ /reports/student-reports WORKS!');
    console.log(`Found ${reportData.data.length} records.`);
    if (reportData.data.length > 0) {
      console.log('Sample record:', reportData.data[0]);
    }
  } else {
    console.error('❌ Failed:', reportData);
  }
}

run();
