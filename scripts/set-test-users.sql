-- Update existing users to password123
UPDATE users SET password = '$2b$10$e2PXOi3lAJ/xagSZPnspLezjj8ejHxu2t0U05IIMZGj8qL/YRZA7K' WHERE username IN ('saranyasit', 'kesornbo');

-- Insert or update 'supervisor' (Role 2: หัวหน้าเจ้าหน้าที่รักษาความปลอดภัย)
INSERT INTO users (username, password, full_name, employee_id, role_id, department, is_active)
VALUES ('supervisor', '$2b$10$e2PXOi3lAJ/xagSZPnspLezjj8ejHxu2t0U05IIMZGj8qL/YRZA7K', 'หัวหน้า รปภ. (ทดสอบ)', 'SUP001', 2, 'Security', true)
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role_id = 2, is_active = true;

-- Insert or update 'guard' (Role 3: เจ้าหน้าที่รักษาความปลอดภัย)
INSERT INTO users (username, password, full_name, employee_id, role_id, department, is_active)
VALUES ('guard', '$2b$10$e2PXOi3lAJ/xagSZPnspLezjj8ejHxu2t0U05IIMZGj8qL/YRZA7K', 'เจ้าหน้าที่ รปภ. (ทดสอบ)', 'GRD001', 3, 'Security', true)
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role_id = 3, is_active = true;
