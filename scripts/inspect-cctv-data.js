const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://wdbpi_user:wdbpi_pass@localhost:5432/wdbpi_db?schema=public',
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('--- Columns of cctv_reports ---');
  const cols = await prisma.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cctv_reports'");
  console.log(cols);

  console.log('--- Sample cctv_reports with details ---');
  const reports = await prisma.cctvReport.findMany({ take: 5, orderBy: { id: 'desc' } });
  for (const r of reports) {
    const details = await prisma.cctvReportDetail.findMany({ where: { reportId: r.id } });
    console.log(`Report ID ${r.id}: date=${r.reportDate.toISOString().slice(0,10)}, normal=${r.totalNormal}, abnormal=${r.totalAbnormal}, reporter=${r.reporterName}, detailsCount=${details.length}`);
    if (details.length > 0) {
      console.log('  Details summary:', details.map(d => `${d.nvrName}: ${d.onlineChannels}/${d.totalChannels}`));
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
