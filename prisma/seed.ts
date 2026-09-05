import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Idempotent seed: roles only (no default users — create admin manually,
// see docs/prod-runbook.md). Run: npx ts-node prisma/seed.ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ROLES = [
  { id: 1, roleName: 'ผู้ดูแลระบบ', description: 'System Administrator' },
  { id: 2, roleName: 'หัวหน้าเจ้าหน้าที่รักษาความปลอดภัย', description: 'Head Security Officer' },
  { id: 3, roleName: 'เจ้าหน้าที่รักษาความปลอดภัย', description: 'Security Officer' },
  { id: 4, roleName: 'เจ้าหน้าที่ตรวจตรา', description: 'Patrol Officer' },
];

async function main() {
  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: { roleName: r.roleName, description: r.description },
      create: r,
    });
  }
  console.log(`Seeded ${ROLES.length} roles (idempotent, safe to re-run)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
