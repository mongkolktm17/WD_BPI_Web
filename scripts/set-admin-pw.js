const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  const pool = new Pool({ connectionString: 'postgresql://wdbpi_user:wdbpi_pass@127.0.0.1:5432/wdbpi_db?schema=public' });
  await pool.query('UPDATE users SET password = $1 WHERE id = 1', [hash]);
  console.log('Admin password set to: admin123');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
