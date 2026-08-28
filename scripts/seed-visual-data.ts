import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding visual report sample data...');

  // Parent records
  const building = await prisma.building.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, buildingCode: 'B2', buildingName: 'Building 2' },
  });

  const hhDevice = await prisma.handheldEquipment.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, deviceCode: 'HH-001', deviceName: 'Handheld Detector 1', status: 'normal' },
  });

  const wtDetector = await prisma.walkthroughDetector.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, detectorCode: 'WT-001', location: 'Building 2 Gate', status: 'normal' },
  });

  console.log('  ✅ Parent records created');

  // guard_counts for last 30 days
  const guardData: any[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    guardData.push(
      { recordDate: d, shift: 'morning', totalGuards: 15, presentGuards: 12 + Math.floor(Math.random() * 3), absentGuards: 1 },
      { recordDate: d, shift: 'evening', totalGuards: 10, presentGuards: 8 + Math.floor(Math.random() * 2), absentGuards: 1 }
    );
  }
  await prisma.guardCount.createMany({ data: guardData, skipDuplicates: true });
  console.log(`  ✅ guard_counts: ${guardData.length} rows`);

  // handheld_checks for last 30 days
  const hhData: any[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    for (let j = 0; j < 3; j++) {
      hhData.push({ equipmentId: 1, checkDate: d, status: Math.random() > 0.1 ? 'pass' : 'fail', inspector: 'Inspector A' });
    }
  }
  await prisma.handheldCheck.createMany({ data: hhData, skipDuplicates: true });
  console.log(`  ✅ handheld_checks: ${hhData.length} rows`);

  // walkthrough_checks for last 30 days
  const wtData: any[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    for (let j = 0; j < 2; j++) {
      wtData.push({ detectorId: 1, checkDate: d, status: Math.random() > 0.05 ? 'pass' : 'fail', inspector: 'Inspector B' });
    }
  }
  await prisma.walkthroughCheck.createMany({ data: wtData, skipDuplicates: true });
  console.log(`  ✅ walkthrough_checks: ${wtData.length} rows`);

  // cameras
  const cameraData: any[] = [];
  const blds = ['B2', 'B3', 'B4', 'B9'];
  for (const b of blds) {
    const cnt = b === 'B2' ? 32 : b === 'B3' ? 20 : b === 'B4' ? 25 : 15;
    for (let i = 1; i <= cnt; i++) {
      cameraData.push({ buildingId: 1, cameraNo: `${b}-CH${String(i).padStart(2, '0')}`, cameraName: `Camera ${i}`, location: `${b} Location ${i}`, status: Math.random() > 0.05 ? 'normal' : 'abnormal' });
    }
  }
  await prisma.camera.createMany({ data: cameraData, skipDuplicates: true });
  console.log(`  ✅ cameras: ${cameraData.length} rows`);

  // car_parkings for last 30 days
  const parkingData: any[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const carCount = 40 + Math.floor(Math.random() * 15);
    const motoCount = 25 + Math.floor(Math.random() * 10);
    for (let j = 0; j < carCount; j++) {
      parkingData.push({ recordDate: d, slotNo: `C${String(j + 1).padStart(3, '0')}`, carLicense: `CAR-${j + 1}-${i}`, status: 'parked' });
    }
    for (let j = 0; j < motoCount; j++) {
      parkingData.push({ recordDate: d, slotNo: `MOTO-${String(j + 1).padStart(3, '0')}`, carLicense: `MOTO-${j + 1}-${i}`, status: 'parked' });
    }
  }
  await prisma.carParking.createMany({ data: parkingData, skipDuplicates: true });
  console.log(`  ✅ car_parkings: ${parkingData.length} rows`);

  console.log('🎉 Visual report seeding completed!');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
