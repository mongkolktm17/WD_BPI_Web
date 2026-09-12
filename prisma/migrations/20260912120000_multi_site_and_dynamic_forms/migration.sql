-- Multi-Site Support & Dynamic Form Builder Migration

-- 1. Sites Table
CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  config_json JSONB,
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Seed initial 2 sites
INSERT INTO sites (id, code, name, name_en, description, is_active, config_json) VALUES
(1, 'BPI', 'สาขาบางปะอิน', 'Bang Pa-in Plant', 'ศูนย์ปฏิบัติการรักษาความปลอดภัย โรงงานบางปะอิน', true, '{"carCapacity": 1075, "motoCapacity": 757, "buildings": ["B.1", "B.2", "B.3", "B.4", "B.5", "B.6", "B.7", "B.8", "B.9"]}'::jsonb),
(2, 'PRB', 'สาขาปราจีนบุรี', 'Prachinburi Plant', 'ศูนย์ปฏิบัติการรักษาความปลอดภัย โรงงานปราจีนบุรี (สาขาใหม่)', true, '{"carCapacity": 550, "motoCapacity": 380, "buildings": ["P.1", "P.2", "P.3", "Warehouse A", "Gate 1", "Gate 2"]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  name_en = EXCLUDED.name_en, 
  description = EXCLUDED.description, 
  config_json = EXCLUDED.config_json;

SELECT setval(pg_get_serial_sequence('sites', 'id'), GREATEST((SELECT MAX(id) FROM sites), 2));

-- 2. User Sites Table (Many-to-Many for Cross-site users like Executives)
CREATE TABLE IF NOT EXISTS user_sites (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id INT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_user_site UNIQUE (user_id, site_id)
);

-- Add default_site_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_site_id INT DEFAULT 1;

-- 3. Roles Update for Site Manager & Corporate Executive
INSERT INTO roles (id, role_name, description, created_at) VALUES
(5, 'ผู้จัดการสาขา (Site Manager)', 'Site Security Manager', NOW()),
(6, 'ผู้บริหารหลัก (Corporate Executive)', 'Corporate Security Executive', NOW())
ON CONFLICT (id) DO UPDATE SET role_name = EXCLUDED.role_name, description = EXCLUDED.description;

SELECT setval(pg_get_serial_sequence('roles', 'id'), GREATEST((SELECT MAX(id) FROM roles), 6));

-- 4. Add site_id to existing domain tables
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE officers ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE nvr_devices ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE handheld_equipment ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE walkthrough_detectors ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE metal_detectors ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE cctv_reports ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE cctv_inspections ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE car_parkings ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE guard_duty_logs ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE guard_counts ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE patrol_reports ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;
ALTER TABLE building_reports ADD COLUMN IF NOT EXISTS site_id INT DEFAULT 1;

-- 5. Form Templates Table
CREATE TABLE IF NOT EXISTS form_templates (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  site_id INT REFERENCES sites(id) ON DELETE SET NULL,
  cloned_from_id INT REFERENCES form_templates(id) ON DELETE SET NULL,
  version INT DEFAULT 1 NOT NULL,
  is_published BOOLEAN DEFAULT FALSE NOT NULL,
  allowed_roles JSONB DEFAULT '[]'::jsonb NOT NULL,
  schema_json JSONB NOT NULL,
  created_by_id INT,
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Form Submissions Table
CREATE TABLE IF NOT EXISTS form_submissions (
  id SERIAL PRIMARY KEY,
  template_id INT NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
  template_version INT DEFAULT 1 NOT NULL,
  site_id INT NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  submitted_by_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'submitted' NOT NULL,
  data_json JSONB NOT NULL,
  attachments_json JSONB,
  notes TEXT,
  approved_by_id INT,
  approved_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_site ON form_submissions(site_id, created_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_template ON form_submissions(template_id, created_at);
CREATE INDEX IF NOT EXISTS idx_form_templates_site ON form_templates(site_id);
