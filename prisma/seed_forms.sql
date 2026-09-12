INSERT INTO form_templates (code, title, description, category, site_id, version, is_published, allowed_roles, schema_json, created_at, updated_at)
VALUES 
(
  'BPI_PATROL_V1',
  'แบบฟอร์มตรวจตราความเรียบร้อยรอบอาคาร (สาขาบางปะอิน)',
  'แบบฟอร์มมาตรฐานสำหรับเจ้าหน้าที่ รปภ. เดินตรวจตราความปลอดภัยรอบอาคาร B.1 - B.9',
  'patrol',
  1,
  1,
  true,
  '["เจ้าหน้าที่ตรวจตรา", "เจ้าหน้าที่รักษาความปลอดภัย", "หัวหน้าเจ้าหน้าที่รักษาความปลอดภัย"]'::jsonb,
  '{"sections": [{"title": "ข้อมูลทั่วไปและเวรยาม", "fields": [{"id": "inspector_name", "label": "ชื่อผู้ตรวจ (รปภ.)", "type": "text", "required": true}, {"id": "shift", "label": "กะการทำงาน", "type": "select", "options": ["กะกลางวัน (Day)", "กะกลางคืน (Night)"], "required": true}, {"id": "building", "label": "อาคารที่ตรวจ", "type": "select", "options": ["B.1", "B.2", "B.3", "B.4", "B.5", "B.6", "B.7", "B.8", "B.9"], "required": true}]}, {"title": "รายการตรวจสอบความปลอดภัย", "fields": [{"id": "door_locks", "label": "การล็อคประตูหนีไฟและทางเข้า-ออก", "type": "audit_status", "required": true}, {"id": "lighting", "label": "ระบบไฟส่องสว่างและความพร้อมใช้งาน", "type": "audit_status", "required": true}, {"id": "cctv_visual", "label": "มุมมองกล้อง CCTV และสายสัญญาณ", "type": "audit_status", "required": true}, {"id": "fire_extinguisher", "label": "ถังดับเพลิงและตู้สายฉีดน้ำดับเพลิง", "type": "audit_status", "required": true}, {"id": "notes", "label": "หมายเหตุ / รายละเอียดความผิดปกติ", "type": "textarea"}, {"id": "photo", "label": "แนบรูปภาพหน้างาน", "type": "photo_upload"}]}, {"title": "การรับรอง", "fields": [{"id": "guard_signature", "label": "ลายเซ็นเจ้าหน้าที่ รปภ.", "type": "signature", "required": true}]}]}'::jsonb,
  NOW(),
  NOW()
),
(
  'BPI_PARKING_V1',
  'แบบฟอร์มตรวจสอบความเรียบร้อยลานจอดรถ (สาขาบางปะอิน)',
  'ตรวจตราความปลอดภัยลานจอดรถยนต์ (1,075 ช่อง) และลานจอดรถจักรยานยนต์ (757 ช่อง)',
  'parking',
  1,
  1,
  true,
  '["เจ้าหน้าที่ตรวจตรา", "เจ้าหน้าที่รักษาความปลอดภัย", "หัวหน้าเจ้าหน้าที่รักษาความปลอดภัย"]'::jsonb,
  '{"sections": [{"title": "ข้อมูลการตรวจ", "fields": [{"id": "inspector_code", "label": "รหัสผู้ตรวจ", "type": "text", "required": true}, {"id": "shift", "label": "กะการทำงาน", "type": "select", "options": ["กะกลางวัน", "กะกลางคืน"], "required": true}, {"id": "parking_zone", "label": "โซนลานจอดรถ", "type": "select", "options": ["ลานจอดรถยนต์ B1-B3", "ลานจอดรถยนต์ B4-B7", "ลานจอดรถจักรยานยนต์ 1", "ลานจอดรถจักรยานยนต์ 2"], "required": true}]}, {"title": "การตรวจความปลอดภัย", "fields": [{"id": "lighting", "label": "ไฟฟ้าส่องสว่างลานจอด", "type": "audit_status", "required": true}, {"id": "traffic_flow", "label": "การจราจรและกีดขวางช่องจราจร", "type": "audit_status", "required": true}, {"id": "suspicious_cars", "label": "ตรวจพบยานพาหนะต้องสงสัย/จอดค้างคืน", "type": "audit_status", "required": true}, {"id": "remarks", "label": "บันทึกเหตุการณ์", "type": "textarea"}]}]}'::jsonb,
  NOW(),
  NOW()
),
(
  'PRB_PATROL_V1',
  'แบบฟอร์มตรวจตราความเรียบร้อยโรงงาน (สาขาปราจีนบุรี)',
  'คัดลอกและปรับปรุงจากฟอร์มบางปะอิน เพื่อใช้สำหรับอาคารและพื้นที่เฉพาะของสาขาปราจีนบุรี',
  'patrol',
  2,
  1,
  true,
  '["เจ้าหน้าที่ตรวจตรา", "เจ้าหน้าที่รักษาความปลอดภัย", "หัวหน้าเจ้าหน้าที่รักษาความปลอดภัย"]'::jsonb,
  '{"sections": [{"title": "ข้อมูลทั่วไปและเวรยาม (ปราจีนบุรี)", "fields": [{"id": "inspector_name", "label": "ชื่อผู้ตรวจ (รปภ.)", "type": "text", "required": true}, {"id": "shift", "label": "กะการทำงาน", "type": "select", "options": ["กะกลางวัน (Day)", "กะกลางคืน (Night)"], "required": true}, {"id": "area", "label": "พื้นที่ตรวจโรงงาน PRB", "type": "select", "options": ["Plant 1 (ผลิตหลัก)", "Plant 2 (ประกอบชิ้นส่วน)", "Warehouse A (คลังสินค้า A)", "Warehouse B (คลังสินค้า B)", "Main Gate 1 (ประตูใหญ่ 1)", "Gate 2 (ประตูผู้รับเหมา)", "Substation (สถานีไฟฟ้าย่อย)", "บ่อบำบัดน้ำเสียส่วนกลาง"], "required": true}]}, {"title": "รายการตรวจสอบความปลอดภัย PRB", "fields": [{"id": "access_control", "label": "ประตูและระบบคีย์การ์ดผ่านเข้า-ออก", "type": "audit_status", "required": true}, {"id": "perimeter_fence", "label": "รั้วแนวเขตโรงงานและตรวจจับการบุกรุก", "type": "audit_status", "required": true}, {"id": "cctv_status", "label": "มุมมองกล้อง CCTV รอบตัวอาคาร PRB", "type": "audit_status", "required": true}, {"id": "chemical_storage", "label": "จุดจัดเก็บสารเคมีและวัตถุไวไฟ", "type": "audit_status", "required": true}, {"id": "notes", "label": "บันทึกข้อบกพร่อง / เหตุการณ์", "type": "textarea"}, {"id": "photo", "label": "แนบรูปภาพหน้างาน", "type": "photo_upload"}]}, {"title": "การรับรอง", "fields": [{"id": "guard_signature", "label": "ลายเซ็นเจ้าหน้าที่ รปภ.", "type": "signature", "required": true}]}]}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;
