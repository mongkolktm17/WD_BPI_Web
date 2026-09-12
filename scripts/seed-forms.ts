import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Form Templates for Multi-site (BPI & PRB)...');

  // 1. Template for BPI
  const bpiTemplate = await prisma.formTemplate.upsert({
    where: { code: 'BPI-CCTV-01' },
    update: {},
    create: {
      code: 'BPI-CCTV-01',
      title: 'แบบฟอร์มตรวจเช็คมุมกล้องและระบบบันทึก CCTV สาขาบางปะอิน',
      description: 'ตรวจสอบความคมชัด ทิศทางมุมกล้อง และสถานะบันทึก NVR อาคาร 2, 3, 4, 6, 9 สำนักงานใหญ่ BPI',
      category: 'CCTV & Surveillance',
      siteId: 1, // BPI
      isPublished: true,
      version: 1,
      allowedRoles: ['4', '5', '6', '1'],
      schemaJson: {
        sections: [
          {
            title: 'หมวดที่ 1: ตรวจสอบกล้องอาคาร 2 และ อาคาร 3',
            fields: [
              {
                id: 'b2_entrance',
                label: 'กล้องทางเข้าอาคาร 2 (Main Entrance)',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'b2_server',
                label: 'กล้องห้อง Server & Control Room B2',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'b3_gate2',
                label: 'กล้องป้อม Gate 2 อาคาร 3',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'b3_lab',
                label: 'กล้องตรวจพื้นที่ FA LAB B3',
                type: 'audit_status',
                required: true,
              },
            ],
          },
          {
            title: 'หมวดที่ 2: ตรวจสอบกล้องอาคาร 4, 6 และ 9',
            fields: [
              {
                id: 'b4_customs',
                label: 'กล้องจุด Customs Park 2 & Receiving B4',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'b6_production',
                label: 'กล้องไลน์การผลิต อาคาร 6 (6/1, 6/2)',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'b9_perimeter',
                label: 'กล้องรอบรั้วด้านนอก อาคาร 9',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'nvr_hdd_status',
                label: 'สถานะการบันทึกของเครื่อง NVR และฮาร์ดดิสก์',
                type: 'select',
                required: true,
                options: ['ปกติ บันทึกครบทุกช่อง', 'พบข้อผิดพลาด HDD', 'บางช่องสัญญาณดับ'],
              },
            ],
          },
          {
            title: 'หมวดที่ 3: หลักฐานภาพถ่ายและการลงนาม',
            fields: [
              {
                id: 'cctv_screen_photo',
                label: 'ภาพถ่ายหน้าจอมอนิเตอร์ห้อง CCTV SOC',
                type: 'photo_upload',
                required: false,
              },
              {
                id: 'officer_signature',
                label: 'ลงชื่อเจ้าหน้าที่ รปภ. ประจำห้องควบคุม',
                type: 'signature',
                required: true,
              },
            ],
          },
        ],
      },
    },
  });

  console.log(`- Created/Updated BPI Template: ${bpiTemplate.code} (ID: ${bpiTemplate.id})`);

  // 2. Template for PRB
  const prbTemplate = await prisma.formTemplate.upsert({
    where: { code: 'PRB-PERIM-01' },
    update: {},
    create: {
      code: 'PRB-PERIM-01',
      title: 'แบบตรวจความปลอดภัยคลังสินค้าและรั้วรอบโรงงาน สาขาปราจีนบุรี',
      description: 'ตรวจเช็คประตูทางเข้า Gate นิคม 304, แนวรั้วโรงงาน, คลังสินค้า Logistic และแท่นชั่งรถบรรทุก',
      category: 'Facility & Perimeter',
      siteId: 2, // PRB
      isPublished: true,
      version: 1,
      allowedRoles: ['4', '5', '6', '1'],
      schemaJson: {
        sections: [
          {
            title: 'หมวดที่ 1: ตรวจจุดทางเข้า-ออก และแท่นชั่งน้ำหนักรถบรรทุก',
            fields: [
              {
                id: 'prb_gate1_barrier',
                label: 'ไม้กั้นทางเข้า Gate 1 (Automated Barrier)',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'prb_truck_scale',
                label: 'เครื่องชั่งน้ำหนักรถบรรทุกเข้า-ออก (Truck Scale)',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'prb_truck_count',
                label: 'จำนวนรถบรรทุกที่เข้ามาโหลดสินค้าในกะ (คัน)',
                type: 'number',
                required: true,
                placeholder: '0',
              },
            ],
          },
          {
            title: 'หมวดที่ 2: ตรวจความปลอดภัยคลังสินค้าและโซนขนถ่ายสินค้า (Loading Dock)',
            fields: [
              {
                id: 'prb_warehouse_doors',
                label: 'ประตูล็อคคลังสินค้า A & B สนิทและมีซีลป้องกัน',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'prb_loading_bay',
                label: 'แท่นโหลดสินค้า Loading Bay 1-6 มีความปลอดภัย',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'prb_fire_extinguisher',
                label: 'ถังดับเพลิงบริเวณทางเข้าคลังพร้อมใช้งาน (เกจวัดปกติ)',
                type: 'audit_status',
                required: true,
              },
            ],
          },
          {
            title: 'หมวดที่ 3: ตรวจรั้วรอบโรงงานและไฟส่องสว่างนิคม 304',
            fields: [
              {
                id: 'prb_perimeter_fence',
                label: 'สภาพรั้วลวดหนามรอบโรงงาน ไม่พบร่องรอยการตัดหรือชำรุด',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'prb_floodlights',
                label: 'ไฟส่องสว่างรอบรั้วและลานจอดรถบรรทุกติดครบทุกดวง',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'prb_photo_evidence',
                label: 'ภาพถ่ายบริเวณรั้วหรือจุดโหลดสินค้า',
                type: 'photo_upload',
                required: false,
              },
              {
                id: 'prb_inspector_sign',
                label: 'ลงชื่อเจ้าหน้าที่ตรวจการ PRB',
                type: 'signature',
                required: true,
              },
            ],
          },
        ],
      },
    },
  });

  console.log(`- Created/Updated PRB Template: ${prbTemplate.code} (ID: ${prbTemplate.id})`);

  // 3. Global Template (Usable & Cloneable by both BPI & PRB)
  const globalTemplate = await prisma.formTemplate.upsert({
    where: { code: 'GLOBAL-PATROL-01' },
    update: {},
    create: {
      code: 'GLOBAL-PATROL-01',
      title: 'แบบฟอร์มตรวจตราและเดินเวรมาตรฐาน (Standard Patrol Checklist)',
      description: 'แบบฟอร์มกลางมาตรฐาน สามารถนำไปใช้งานได้ทั้งสาขาบางปะอินและสาขาปราจีนบุรี หรือกด Clone เพื่อแก้ไขฟิลด์เฉพาะพื้นที่',
      category: 'Patrol Checklist',
      siteId: null, // Global
      isPublished: true,
      version: 1,
      allowedRoles: ['4', '5', '6', '1'],
      schemaJson: {
        sections: [
          {
            title: 'หมวดที่ 1: ตรวจความพร้อมของอุปกรณ์ประจำกาย รปภ.',
            fields: [
              {
                id: 'radio_status',
                label: 'วิทยุสื่อสาร ว. ประจำจุด (แบตเตอรี่และสัญญาณชัดเจน)',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'flashlight_status',
                label: 'ไฟฉายส่องสว่างและกระบองไฟประจำตัว',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'firstaid_kit',
                label: 'ชุดปฐมพยาบาลเบื้องต้นประจำป้อม',
                type: 'audit_status',
                required: true,
              },
            ],
          },
          {
            title: 'หมวดที่ 2: รายการตรวจสอบทางกายภาพและประตูหนีไฟ',
            fields: [
              {
                id: 'fire_exit_clear',
                label: 'ประตูหนีไฟไม่มีสิ่งกีดขวางและสามารถเปิดออกได้ทันที',
                type: 'audit_status',
                required: true,
              },
              {
                id: 'suspicious_objects',
                label: 'การตรวจพบสิ่งของต้องสงสัย หรือบุคคลภายนอกไม่พกบัตร',
                type: 'select',
                required: true,
                options: ['ไม่พบความผิดปกติ (ปกติ 100%)', 'พบบุคคลภายนอกไม่มีบัตร (เชิญออก)', 'พบสิ่งของวางกีดขวาง'],
              },
              {
                id: 'patrol_notes',
                label: 'รายละเอียดสรุปเหตุการณ์การเดินเวร',
                type: 'textarea',
                required: false,
                placeholder: 'ระบุสภาพแวดล้อม สภาพอากาศ หรือเหตุการณ์สำคัญ...',
              },
            ],
          },
          {
            title: 'หมวดที่ 3: รับรองผลการปฏิบัติหน้าที่',
            fields: [
              {
                id: 'guard_sign',
                label: 'ลงชื่อเจ้าหน้าที่ รปภ. ผู้ปฏิบัติหน้าที่',
                type: 'signature',
                required: true,
              },
            ],
          },
        ],
      },
    },
  });

  console.log(`- Created/Updated Global Template: ${globalTemplate.code} (ID: ${globalTemplate.id})`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding forms:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
