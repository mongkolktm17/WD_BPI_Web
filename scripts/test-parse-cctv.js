const fs = require('fs');
const path = require('path');

const CCTV_DEVICES = [
  { building: 'B2', nvrName: 'NVR-1', area: 'Centen Canteen กลาง+Canteen B2L4', channels: 31, driveCapacity: '8TB (2ลูก),4TB (4ลูก)', totalCapacityTb: 36.387, targetDays: 62 },
  { building: 'B2', nvrName: 'NVR-2', area: 'Relialab lab room B2L3+ภายใน Lift', channels: 32, driveCapacity: '8TB (4ลูก),4TB (4ลูก)', totalCapacityTb: 43.664, targetDays: 62 },
  { building: 'B2', nvrName: 'NVR-3', area: 'แนวรั้วด้านนอกอาคาร 1-2-6', channels: 61, driveCapacity: '10TB (6ลูก),8TB (2ลูก)', totalCapacityTb: 69.129, targetDays: 62 },
  { building: 'B2', nvrName: 'NVR-4', area: 'ภายในห้องครัว+ลานจอดรถ Park 1,Park 2', channels: 64, driveCapacity: '10TB (8ลูก)', totalCapacityTb: 72.765, targetDays: 62 },
  { building: 'B2', nvrName: 'NVR-5', area: 'ภายในอาคาร 6 ชั้น 1-2-3 เพิ่มกล้อง 2 ตัว', channels: 38, driveCapacity: '10TB (3ลูก),8TB (5ลูก)', totalCapacityTb: 63.674, targetDays: 62 },
  { building: 'B2', nvrName: 'NVR-6', area: 'ภายในอาคาร 1 ชั้น 1', channels: 32, driveCapacity: '8TB (8ลูก)', totalCapacityTb: 58.219, targetDays: 62 },
  { building: 'B2', nvrName: 'NVR-7', area: 'ลานจอดรถ Park 1,Park 2', channels: 32, driveCapacity: '8TB (5ลูก),4TB (3ลูก)', totalCapacityTb: 47.303, targetDays: 62 },
  { building: 'B2', nvrName: 'NVR-8', area: 'แนว Locker อาคาร 1-2-6+ภายในอาคาร2 ชั้น 3', channels: 63, driveCapacity: '10TB (8ลูก)', totalCapacityTb: 72.765, targetDays: 62 },
  { building: 'B2', nvrName: 'NVR-9', area: 'Receiving อาคาร 2 + หน้า Lift อาคาร 2', channels: 32, driveCapacity: '8TB (4ลูก),4TB (3ลูก)', totalCapacityTb: 40.025, targetDays: 62 },
  { building: 'B2', nvrName: 'NVR-10', area: 'ภายในอาคาร 2 ชั้น 2', channels: 32, driveCapacity: '8TB (4ลูก),4TB (4ลูก)', totalCapacityTb: 43.664, targetDays: 62 },
  { building: 'B3', nvrName: 'NVR-1', area: 'ภายในอาคาร 3+แนวรั้ว', channels: 32, driveCapacity: '4TB(6 ลูก) 10TB(2 ลูก)', totalCapacityTb: 40.023, targetDays: 62 },
  { building: 'B3', nvrName: 'NVR-2', area: 'Park 4', channels: 46, driveCapacity: '8TB(3 ลูก) 10TB(5 ลูก)', totalCapacityTb: 67.310, targetDays: 62 },
  { building: 'B4', nvrName: 'NVR-1', area: 'Office ชั้น ลอย,ชั้นลอยจุดพักผ่อน', channels: 64, driveCapacity: '8 TB (3ลูก),10 TB (5ลูก)', totalCapacityTb: 67.310, targetDays: 62 },
  { building: 'B4', nvrName: 'NVR-2', area: 'Scrap park 3/1,จุดรวมพล+เต็นท์มาเลย์', channels: 32, driveCapacity: '4 TB (4ลูก),8 TB (4ลูก)', totalCapacityTb: 43.664, targetDays: 62 },
  { building: 'B4', nvrName: 'NVR-3', area: 'Transfer room+ด้านใน Lift ของอาคาร 4', channels: 62, driveCapacity: '8 TB (8ลูก)', totalCapacityTb: 58.219, targetDays: 62 },
  { building: 'B4', nvrName: 'NVR-4', area: 'แนวรั้วด้านนอกอาคาร 4+Receiving อาคาร 4', channels: 32, driveCapacity: '4 TB (3ลูก),8 TB (5ลูก)', totalCapacityTb: 47.303, targetDays: 62 },
  { building: 'B4', nvrName: 'NVR-5', area: 'Packing+แนวทางเดินเข้าอาคาร 4 ชั้น 1', channels: 62, driveCapacity: '8 TB (1ลูก),10 TB (7ลูก)', totalCapacityTb: 70.947, targetDays: 62 },
  { building: 'B4', nvrName: 'NVR-6', area: 'ห้อง IT DATA เพิ่มกล้อง 4 ตัว', channels: 29, driveCapacity: '4 TB (2ลูก),8 TB (6ลูก)', totalCapacityTb: 50.941, targetDays: 62 },
  { building: 'B9', nvrName: 'NVR-1', area: 'ทุกพื้นที่ของอาคาร 8 + แนวถนนทางเข้าซอย 2', channels: 41, driveCapacity: '8 TB (7ลูก) 4 TB (1ลูก)', totalCapacityTb: 54.580, targetDays: 62 },
];

function parseCsvFiles(baseDir) {
  const cameraNames = {};
  const csvFiles = [
    { bldg: 'B2', nvr: 'NVR-1', file: 'B2/B2_NVR1.csv' },
    { bldg: 'B2', nvr: 'NVR-2', file: 'B2/B2_NVR2.csv' },
    { bldg: 'B2', nvr: 'NVR-3', file: 'B2/B2_NVR3.csv' },
    { bldg: 'B2', nvr: 'NVR-4', file: 'B2/B2_NVR4.csv' },
    { bldg: 'B2', nvr: 'NVR-5', file: 'B2/B2_NVR5.csv' },
    { bldg: 'B2', nvr: 'NVR-6', file: 'B2/B2_NVR6.csv' },
    { bldg: 'B2', nvr: 'NVR-7', file: 'B2/B2_NVR7.csv' },
    { bldg: 'B2', nvr: 'NVR-8', file: 'B2/B2_NVR8.csv' },
    { bldg: 'B2', nvr: 'NVR-9', file: 'B2/B2_NVR9.csv' },
    { bldg: 'B2', nvr: 'NVR-10', file: 'B2/B2_NVR10.csv' },
    { bldg: 'B3', nvr: 'NVR-1', file: 'B3/B3_NVR1.csv' },
    { bldg: 'B3', nvr: 'NVR-2', file: 'B3/B3_NVR2.csv' },
    { bldg: 'B4', nvr: 'NVR-1', file: 'B4/B4_NVR1.csv' },
    { bldg: 'B4', nvr: 'NVR-2', file: 'B4/B4_NVR2.csv' },
    { bldg: 'B4', nvr: 'NVR-3', file: 'B4/B4_NVR3.csv' },
    { bldg: 'B4', nvr: 'NVR-4', file: 'B4/B4_NVR4.csv' },
    { bldg: 'B4', nvr: 'NVR-5', file: 'B4/B4_NVR5.csv' },
    { bldg: 'B4', nvr: 'NVR-6', file: 'B4/B4_NVR6.csv' },
    { bldg: 'B9', nvr: 'NVR-1', file: 'B9/B9_NVR1.csv' },
  ];

  for (const { bldg, nvr, file } of csvFiles) {
    const fullPath = path.join(baseDir, file);
    if (!fs.existsSync(fullPath)) {
      console.warn('File not found:', fullPath);
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);
    // skip first 4 lines
    for (let i = 4; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length >= 3) {
        const ch = parseInt(parts[1], 10);
        const name = parts.slice(2).join(',').trim();
        if (ch > 0 && name) {
          const key = `${bldg}_${nvr}_${ch}`;
          cameraNames[key] = name;
        }
      }
    }
  }
  return cameraNames;
}

const names = parseCsvFiles(path.join(__dirname, '..', 'report_assets', 'CCTV'));
console.log('Total Camera Names Parsed:', Object.keys(names).length);
console.log('Sample Names:', Object.entries(names).slice(0, 10));
