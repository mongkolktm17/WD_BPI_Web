import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding initial database records for testing...');

  // 1. Create Admin Role
  const adminRole = await prisma.role.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      roleName: 'Admin',
      description: 'Super Administrator with full system permissions',
    },
  });

  // 2. Create Default Admin User (admin / admin123)
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      fullName: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
      roleId: adminRole.id,
      department: 'Security & IT Management',
      isActive: true,
    },
  });

  console.log('✅ Seeding completed: Admin User (username: admin, password: admin123)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
