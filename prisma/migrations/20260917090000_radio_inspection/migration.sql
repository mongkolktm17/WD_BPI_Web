-- Radio Inspection Migration (whole-lot per round)
-- Master imported from legacy Excel: legacy/Backup/รายการวิทยุ 20260914.xlsx
-- Regenerate seed with: python scripts/import-radio-master.py

-- 1. Radio Equipment Master Table
CREATE TABLE IF NOT EXISTS radio_equipments (
  id SERIAL PRIMARY KEY,
  asset_number VARCHAR(50) UNIQUE NOT NULL,
  asset_name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  location VARCHAR(200),
  reference_image_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  site_id INT DEFAULT 1 NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_radio_equipments_asset ON radio_equipments(asset_number);
CREATE INDEX IF NOT EXISTS idx_radio_equipments_brand ON radio_equipments(brand);

-- 2. Radio Inspection Header Table (one record per round)
CREATE TABLE IF NOT EXISTS radio_inspections (
  id SERIAL PRIMARY KEY,
  inspection_date DATE NOT NULL,
  shift VARCHAR(50) NOT NULL,
  inspector_name VARCHAR(100) NOT NULL,
  total_checked INT NOT NULL,
  total_present INT DEFAULT 0 NOT NULL,
  total_working INT DEFAULT 0 NOT NULL,
  total_failed INT DEFAULT 0 NOT NULL,
  summary TEXT,
  site_id INT DEFAULT 1 NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_by TEXT,
  deleted_at TIMESTAMPTZ(6),
  updated_by VARCHAR(100),
  updated_at TIMESTAMPTZ(6),
  submitted_by_id INT,
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_radio_inspections_date ON radio_inspections(inspection_date DESC);

-- 3. Radio Inspection Item Table (one row per radio per round)
CREATE TABLE IF NOT EXISTS radio_inspection_items (
  id SERIAL PRIMARY KEY,
  inspection_id INT NOT NULL REFERENCES radio_inspections(id) ON DELETE CASCADE,
  equipment_id INT NOT NULL REFERENCES radio_equipments(id),
  is_present BOOLEAN DEFAULT TRUE NOT NULL,
  is_working BOOLEAN DEFAULT TRUE NOT NULL,
  remark TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_radio_items_inspection ON radio_inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_radio_items_equipment ON radio_inspection_items(equipment_id);

-- 4. Master seed (44 units from legacy Excel, idempotent)
INSERT INTO radio_equipments (asset_number, asset_name, brand, model, serial_number, reference_image_url, status, site_id) VALUES
('310000036154', 'Walky Talky Icom 30Fx', 'Icom', 'IC-30FX', '1209018', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000047130', 'Walky Talky Icom 30Fx', 'Icom', 'IC-30FX', '1209029', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000051848', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '10069275', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000069448', 'WALKY TALKY ICOM IC-50FX', 'Icom', 'IC-50FX', '67002764', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000069449', 'WALKY TALKY ICOM IC-50FX', 'Icom', 'IC-50FX', '67002765', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000069450', 'WALKY TALKY ICOM IC-50FX', 'Icom', 'IC-50FX', '67002766', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000051329', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '110034449', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000039313', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '01001823-5', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000039371', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '01001842-2', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000049161', 'Walky Talky Icom 50 Fx', 'Icom', 'IC-50FX', '01001960-9', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000049461', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '01002595-4', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000055784', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '01007488-6', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000033434', 'Walky Talky Icom 80Fx', 'Icom', 'IC-80FX', '01058237-2', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000033414', 'Walky Talky Icom 80Fx', 'Icom', 'IC-80FX', '01058241-7', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000055428', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '02001709-3', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000055429', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '02001710-7', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000055731', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '02004137-9', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000056534', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '02005399-6', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000056508', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '03004741-3', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000030777', 'Walky Talky Icom 80Fx', 'Icom', 'IC-80FX', '1052152-2', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000050865', 'Walky Talky Motorola CP246', 'Motorola', 'CP-246', '1335RT4916', '/report_assets/radio/motorola-cp246.jpg', 'active', 1),
('310000050993', 'Walky Talky Motorola CP246', 'Motorola', 'CP-246', '1335RV0730', '/report_assets/radio/motorola-cp246.jpg', 'active', 1),
('310000052678', 'Walky Talky Motorola CP246', 'Motorola', 'CP-246', '1335SC8540', '/report_assets/radio/motorola-cp246.jpg', 'active', 1),
('310000051328', 'Walky Talky Motorola CP246', 'Motorola', 'CP-246', '1338N13887', '/report_assets/radio/motorola-cp246.jpg', 'active', 1),
('310000044448', 'Walky Talky Motorola CP246', 'Motorola', 'CP-246', '1338PH2980', '/report_assets/radio/motorola-cp246.jpg', 'active', 1),
('310000030753', 'Walky Talky Motorola CP246', 'Motorola', 'CP-246', '1338PH2982', '/report_assets/radio/motorola-cp246.jpg', 'active', 1),
('310000044450', 'Walky Talky Motorola CP246', 'Motorola', 'CP-246', '1338PH2987', '/report_assets/radio/motorola-cp246.jpg', 'active', 1),
('310000041437', 'Walky Talky Motorola CP246', 'Motorola', 'CP-246', '1338PW5012', '/report_assets/radio/motorola-cp246.jpg', 'active', 1),
('310000047316', 'Walky Talky Motorola CP246', 'Motorola', 'CP-246', '1338QV2603', '/report_assets/radio/motorola-cp246.jpg', 'active', 1),
('310000014315', 'Walky Talky Motorola CP246', 'Motorola', 'CP-246', '1338QV2614', '/report_assets/radio/motorola-cp246.jpg', 'active', 1),
('920000017736', 'WALKY TALKY HYTERA P30(1SIM) W/1 BATTERY', 'Hytera', 'P30', '23D15A1689', '/report_assets/radio/hytera-p30.jpg', 'active', 1),
('920000017737', 'WALKY TALKY HYTERA P30(1SIM) W/1 BATTERY', 'Hytera', 'P30', '23D15A1690', '/report_assets/radio/hytera-p30.jpg', 'active', 1),
('310000058943', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '56006769-3', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000058945', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '56006771-4', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000063940', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '56010476-3', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000063941', 'Walky Talky Icom IC-50FX', 'Icom', 'IC-50FX', '56010477-0', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000063945', 'Walky Talky Icom IC-50FX', 'Icom', 'IC-50FX', '56010481-5', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000063960', 'Walky Talky Icom IC-50FX', 'Icom', 'IC-50FX', '56010496-7', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000068481', 'WALKY TALKY ICOM IC-50FX', 'Icom', 'IC-50FX', '58001151-7', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000065648', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '61004111-8', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000065649', 'Walky Talky Icom 50FX', 'Icom', 'IC-50FX', '61004112-5', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000066623', 'Walky Talky ICOM IC-50FX', 'Icom', 'IC-50FX', '61006216-4', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000066625', 'Walky Talky ICOM IC-50FX', 'Icom', 'IC-50FX', '61006218-8', '/report_assets/radio/icom-fx.jpg', 'active', 1),
('310000047442', 'Walky Talky Spender TM-581 DTV', 'Spender', 'TM-581DTV', 'T1530509S12164', '/report_assets/radio/spender-tm581dtv.jpg', 'active', 1)
ON CONFLICT (asset_number) DO UPDATE SET asset_name = EXCLUDED.asset_name, brand = EXCLUDED.brand, model = EXCLUDED.model, serial_number = EXCLUDED.serial_number, reference_image_url = EXCLUDED.reference_image_url;
