const mysql = require('mysql2/promise');
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306,
};
async function test() {
  try {
    console.log('Connecting to localhost:3306...');
    const conn = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!');
    await conn.end();
  } catch (e) {
    console.error('Connection failed:', e);
  }
}
test();
