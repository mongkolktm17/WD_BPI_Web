-- Seed roles from legacy MySQL data
INSERT INTO "roles" ("id", "role_name", "description", "created_at") VALUES
(1, 'ผู้ดูแลระบบ', 'System Administrator', NOW()),
(2, 'หัวหน้าเจ้าหน้าที่รักษาความปลอดภัย', 'Head Security Officer', NOW()),
(3, 'เจ้าหน้าที่รักษาความปลอดภัย', 'Security Officer', NOW()),
(4, 'เจ้าหน้าที่ตรวจตรา', 'Patrol Officer', NOW())
ON CONFLICT ("id") DO NOTHING;

-- Reset sequence
SELECT setval(pg_get_serial_sequence('roles', 'id'), (SELECT MAX(id) FROM "roles"));
