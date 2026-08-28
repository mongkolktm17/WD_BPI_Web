const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({ connectionString: 'postgresql://wdbpi_user:wdbpi_pass@127.0.0.1:5432/wdbpi_db?schema=public' });

async function main() {
  await client.connect();
  const rawData = fs.readFileSync(path.join(__dirname, 'staff_data.json'), 'utf8');
  const staffData = JSON.parse(rawData);

  console.log(`Importing ${staffData.length} officers...`);

  let created = 0, updated = 0, skipped = 0;

  for (const s of staffData) {
    const employeeId = String(s.employee_id || '').trim();
    if (!employeeId) { skipped++; continue; }

    const fullName = String(s.name || '').trim();
    if (!fullName) { skipped++; continue; }

    const parts = fullName.split(' ');
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : fullName;
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

    const shift = s.shift === 'Night Shift' ? 'ดึก' : 'เช้า';
    const status = s.status === 'active' ? 'active' : 'inactive';
    const position = s.role || null;

    try {
      const existing = await client.query('SELECT id FROM officers WHERE employee_id = $1', [employeeId]);
      if (existing.rows.length > 0) {
        await client.query('UPDATE officers SET first_name=$1, last_name=$2, shift=$3, status=$4, position=$5 WHERE employee_id=$6', [firstName, lastName, shift, status, position, employeeId]);
        updated++;
      } else {
        await client.query('INSERT INTO officers (employee_id, first_name, last_name, shift, status, position) VALUES ($1,$2,$3,$4,$5,$6)', [employeeId, firstName, lastName, shift, status, position]);
        created++;
      }
    } catch (e) {
      console.error(`  Skip id=${s.id} emp=${employeeId}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`Done: ${created} created, ${updated} updated, ${skipped} skipped`);

  const count = await client.query('SELECT COUNT(*) FROM officers');
  console.log(`Total officers in DB: ${count.rows[0].count}`);

  await client.end();
}

main().catch(console.error);
