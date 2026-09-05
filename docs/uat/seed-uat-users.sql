-- UAT seed: 3 test users + officer role permissions
-- วิธีใช้: แทน __ADMIN_HASH__ / __OFFICER_HASH__ ด้วยค่าจาก scripts\make-uat-hashes.js ก่อนรัน
-- รัน: docker exec -i wdbpi_postgres_dev psql -U wdbpi_user -d wdbpi_db -f - < docs\uat\seed-uat-users.sql

INSERT INTO users (username, password, full_name, role_id, department, is_active)
VALUES ('admin', '__ADMIN_HASH__', 'ผู้ดูแลระบบ', 1, 'Administration', true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, full_name, role_id, department, is_active)
VALUES ('100001', '__OFFICER_HASH__', 'สมชาย ใจดี', 3, 'Security', true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, full_name, role_id, department, is_active)
VALUES ('100002', '__OFFICER_HASH__', 'สมหญิง ใจงาม', 3, 'Security', true)
ON CONFLICT (username) DO NOTHING;

-- สิทธิ์ role รปภ. (role_id=3) สำหรับเทส QuickLinks + ฟอร์มหลัก
DELETE FROM role_permissions
WHERE role_id = 3 AND module_name IN
  ('report_page', 'car_parking', 'patrol_checklist', 'guard_duty_log', 'cctv_inspection', 'report_visual');
INSERT INTO role_permissions (role_id, module_name, can_read, can_write, can_delete)
VALUES
  (3, 'report_page', true, true, false),
  (3, 'car_parking', true, true, false),
  (3, 'patrol_checklist', true, true, false),
  (3, 'guard_duty_log', true, true, false),
  (3, 'cctv_inspection', true, true, false),
  (3, 'report_visual', true, false, false);
