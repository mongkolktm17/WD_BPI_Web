const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgresql://wdbpi_user:wdbpi_pass@127.0.0.1:5432/wdbpi_db?schema=public' });
  await client.connect();

  const hash = await bcrypt.hash('password123', 10);

  // 1. Update existing role 2 and role 3 users
  await client.query('UPDATE users SET password = $1 WHERE username IN ($2, $3)', [hash, 'saranyasit', 'kesornbo']);
  console.log('Updated passwords for saranyasit and kesornbo');

  // 2. Upsert easy-to-remember test accounts: 'supervisor' (role 2) and 'guard' (role 3)
  const users = [
    { username: 'supervisor', fullName: 'หัวหน้า รปภ. (ทดสอบ)', roleId: 2, empId: 'EMP-S01', dept: 'Security' },
    { username: 'guard', fullName: 'เจ้าหน้าที่ รปภ. (ทดสอบ)', roleId: 3, empId: 'EMP-G01', dept: 'Security' }
  ];

  for (const u of users) {
    const existing = await client.query('SELECT id FROM users WHERE username = $1', [u.username]);
    if (existing.rows.length > 0) {
      await client.query('UPDATE users SET password = $1, role_id = $2, is_active = true WHERE username = $3', [hash, u.roleId, u.username]);
      console.log('Updated user:', u.username);
    } else {
      await client.query(
        'INSERT INTO users (username, password, full_name, employee_id, role_id, department, is_active) VALUES ($1, $2, $3, $4, $5, $6, true)',
        [u.username, hash, u.fullName, u.empId, u.roleId, u.dept]
      );
      console.log('Created user:', u.username);
    }
  }

  await client.end();

  // 3. Test API login for all test accounts
  const testLogins = ['saranyasit', 'kesornbo', 'supervisor', 'guard'];
  for (const uname of testLogins) {
    const res = await fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uname, password: 'password123' })
    });
    const data = await res.json();
    console.log(`[LOGIN_TEST] ${uname} => status: ${res.status}, success: ${data.success}, role: ${data.data?.user?.role?.roleName || data.data?.user?.roleId}`);
  }
}

main().catch(console.error);
