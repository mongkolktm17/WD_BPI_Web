const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://wdbpi_user:wdbpi_pass@postgres:5432/wdbpi_db?schema=public' });
  await client.connect();
  const hash = await bcrypt.hash('admin123', 10);
  const res = await client.query('UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username, full_name', [hash, 'adminxx']);
  console.log('UPDATE_RESULT:', res.rows);
  await client.end();
}

main().catch(console.error);
