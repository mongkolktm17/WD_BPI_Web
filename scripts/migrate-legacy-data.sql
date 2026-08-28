-- Final migration: Legacy data to new schema
-- Fixes: Use correct building IDs, handle nvr building mapping, preserve Thai text

-- ============================================================
-- 1. MIGRATE USERS (skip if exists)
-- ============================================================
INSERT INTO public.users (username, password, full_name, role_id, department, is_active)
SELECT 
  username,
  password,
  TRIM(BOTH ' ' FROM first_name || ' ' || last_name) as full_name,
  CASE 
    WHEN role_id = 1 THEN 1
    WHEN role_id = 2 THEN 2
    WHEN role_id IN (3, 4) THEN 3
    ELSE 3
  END as role_id,
  phone_number as department,
  CASE WHEN user_type = 'admin' THEN true ELSE false END as is_active
FROM legacy.users
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.username = legacy.users.username)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- 2. MIGRATE REPORTS -> building_reports (skip conflicts)
-- ============================================================
INSERT INTO public.building_reports (id, report_date, employee_id, full_name, shift, building, guard_post, report_time, incident_report, special_incident, emergency_incident)
SELECT 
  id,
  report_date,
  employee_id,
  full_name,
  shift,
  building,
  guard_post,
  LEFT(CAST(report_time AS TEXT), 5) as report_time,
  incident_report,
  special_incident,
  emergency_incident
FROM legacy.reports
WHERE is_deleted = 0 AND NOT EXISTS (SELECT 1 FROM public.building_reports br WHERE br.id = legacy.reports.id);

-- ============================================================
-- 3. MIGRATE PATROL REPORTS (skip conflicts)
-- ============================================================
INSERT INTO public.patrol_reports (patrol_date, patrol_route, officer_name, status, notes)
SELECT 
  report_date,
  building as patrol_route,
  inspector_name as officer_name,
  report_condition as status,
  ARRAY_TO_STRING(ARRAY[
    fence_lighting, fence_objects, no_gathering, no_flyers, fence_normal,
    no_suspicious_parking, no_suspicious_boxes, no_unauthorized_persons_area,
    door_system_normal, electrical_system_normal, no_room_abnormalities,
    no_unauthorized_persons_room, no_chemical_obstruction, no_container_leaks,
    no_unauthorized_persons_chemical, chemical_door_normal,
    no_unauthorized_persons_electrical, electrical_door_normal,
    no_electrical_abnormalities, equipment_normal, no_fire_door_obstruction
  ], '; ') as notes
FROM legacy.patrol_reports
WHERE is_deleted = 0 AND NOT EXISTS (SELECT 1 FROM public.patrol_reports pr WHERE pr.id = legacy.patrol_reports.id);

-- ============================================================
-- 4. MIGRATE CAR PARKING REPORTS
-- ============================================================
INSERT INTO public.car_parkings (record_date, slot_no, car_license, driver_name, time_in, status)
SELECT 
  inspection_date as record_date,
  LEFT(parking_lot, 20) as slot_no,
  license_plates as car_license,
  inspector_name as driver_name,
  created_at as time_in,
  'parked' as status
FROM legacy.car_parking_reports
WHERE is_deleted = 0 AND total_cars > 0
  AND NOT EXISTS (SELECT 1 FROM public.car_parkings cp WHERE cp.id = legacy.car_parking_reports.id);

-- ============================================================
-- 5. MIGRATE CCTV REPORTS
-- ============================================================
INSERT INTO public.cctv_reports (id, report_date, total_normal, total_abnormal, reporter_name, remark)
SELECT 
  id,
  DATE(report_time) as report_date,
  online_channels as total_normal,
  offline_channels as total_abnormal,
  'System User' as reporter_name,
  'Online: ' || online_percentage || '%' as remark
FROM legacy.cctv_reports
WHERE is_deleted = 0 AND NOT EXISTS (SELECT 1 FROM public.cctv_reports cr WHERE cr.id = legacy.cctv_reports.id);

-- ============================================================
-- 6. MIGRATE HANDHELD CHECKS
-- ============================================================
INSERT INTO public.handheld_equipment (device_code, device_name, status)
SELECT DISTINCT 
  'HH-' || inspector_code as device_code,
  'Hand-Held Detector ' || inspector_code as device_name,
  'normal' as status
FROM legacy.hand_held_checks
WHERE is_deleted = 0 AND NOT EXISTS (SELECT 1 FROM public.handheld_equipment hhe WHERE hhe.device_code = 'HH-' || legacy.hand_held_checks.inspector_code);

INSERT INTO public.handheld_checks (equipment_id, check_date, status, remark, inspector)
SELECT 
  hhe.id as equipment_id,
  hhc.inspection_date as check_date,
  CASE 
    WHEN hhc.battery_status = 'พร้อมใช้งาน' 
      AND hhc.led_status = 'ผ่านการทดสอบ' 
      AND hhc.detection_test_status = 'ผ่านการทดสอบ' 
      AND hhc.alarm_status = 'ผ่านการทดสอบ'
    THEN 'normal'
    ELSE 'abnormal'
  END as status,
  'แบต: ' || hhc.battery_status || ', LED: ' || hhc.led_status || ', ตรวจ: ' || hhc.detection_test_status || ', เสียง: ' || hhc.alarm_status as remark,
  hhc.inspector_name as inspector
FROM legacy.hand_held_checks hhc
JOIN public.handheld_equipment hhe ON hhe.device_code = 'HH-' || hhc.inspector_code
WHERE hhc.is_deleted = 0 AND NOT EXISTS (SELECT 1 FROM public.handheld_checks hhc2 WHERE hhc2.id = hhc.id);

-- ============================================================
-- 7. MIGRATE METAL DETECTOR CHECKS
-- ============================================================
INSERT INTO public.metal_detectors (device_code, location, status, last_check)
SELECT 
  building || '-' || guard_post || '-' || id as device_code,
  LEFT(building || ' - ' || guard_post, 100) as location,
  CASE 
    WHEN zone1_status = 'พร้อมใช้งาน'
      AND zone2_status = 'พร้อมใช้งาน'
      AND zone3_status = 'พร้อมใช้งาน'
      AND zone4_status = 'พร้อมใช้งาน'
      AND zone5_status = 'พร้อมใช้งาน'
      AND zone6_status = 'พร้อมใช้งาน'
    THEN 'normal'
    ELSE 'abnormal'
  END as status,
  inspection_date as last_check
FROM legacy.metal_detector_checks
WHERE is_deleted = 0 AND NOT EXISTS (SELECT 1 FROM public.metal_detectors md WHERE md.device_code = building || '-' || guard_post || '-' || legacy.metal_detector_checks.id);

-- ============================================================
-- 8. MIGRATE NVR RECORDING DAYS
-- ============================================================
-- Map NVR names to buildings using legacy nvr_recording_reports
INSERT INTO public.nvr_devices (building_id, nvr_name, ip_address, total_channels)
SELECT DISTINCT 
  COALESCE(b.id, 10) as building_id,
  nrd.nvr_name,
  '0.0.0.0' as ip_address,
  32 as total_channels
FROM legacy.nvr_recording_details nrd
JOIN legacy.nvr_recording_reports nrr ON nrr.id = nrd.report_id
LEFT JOIN public.buildings b ON b.building_code = nrr.building
WHERE nrd.nvr_name NOT IN (SELECT nvr_name FROM public.nvr_devices)
  AND nrd.nvr_name IS NOT NULL
ON CONFLICT (nvr_name) DO NOTHING;

INSERT INTO public.nvr_recording_days (nvr_id, record_date, days_recorded, status, remark)
SELECT 
  nd.id as nvr_id,
  nrd.created_at as record_date,
  nrd.recording_days as days_recorded,
  CASE WHEN nrd.recording_days >= nrd.target_days THEN 'pass' ELSE 'fail' END as status,
  'Target: ' || nrd.target_days || ' days' as remark
FROM legacy.nvr_recording_details nrd
JOIN public.nvr_devices nd ON nd.nvr_name = nrd.nvr_name
WHERE NOT EXISTS (SELECT 1 FROM public.nvr_recording_days nrd2 WHERE nrd2.id = nrd.id);

-- ============================================================
-- 9. MIGRATE CCTV ANGLE CHECKS
-- ============================================================
-- Map building codes to building IDs, create cameras
INSERT INTO public.cameras (building_id, camera_no, camera_name, location, status)
SELECT 
  COALESCE(b.id, 10) as building_id,
  CAST(ac.camera_number AS TEXT) as camera_no,
  'Camera ' || ac.camera_number as camera_name,
  ac.building || ' - NVR ' || ac.nvr_number as location,
  'normal' as status
FROM legacy.cctv_angle_checks ac
LEFT JOIN public.buildings b ON b.building_code = ac.building
WHERE NOT EXISTS (
  SELECT 1 FROM public.cameras c 
  WHERE c.building_id = COALESCE(b.id, 10) AND c.camera_no = CAST(ac.camera_number AS TEXT)
)
ON CONFLICT (id) DO NOTHING;

-- Migrate angle checks using camera_id from the newly created cameras
INSERT INTO public.camera_checks (camera_id, check_date, status, remark, checked_by)
SELECT 
  c.id as camera_id,
  ac.checked_date as check_date,
  CASE WHEN ac.angle_correct = 1 THEN 'normal' ELSE 'abnormal' END as status,
  ac.notes as remark,
  ac.checked_by
FROM legacy.cctv_angle_checks ac
JOIN public.buildings b ON b.building_code = ac.building
JOIN public.cameras c ON c.building_id = b.id AND c.camera_no = CAST(ac.camera_number AS TEXT)
WHERE NOT EXISTS (SELECT 1 FROM public.camera_checks cc WHERE cc.id = ac.id);

-- ============================================================
-- 10. MIGRATE SECURITY GUARD COUNTS
-- ============================================================
INSERT INTO public.guard_counts (record_date, shift, total_guards, present_guards, absent_guards, remark)
SELECT 
  record_date,
  'เช้า' as shift,
  total as total_guards,
  (morning_shift + COALESCE(morning_shift_contract, 0)) as present_guards,
  total - (morning_shift + COALESCE(morning_shift_contract, 0)) as absent_guards,
  'Evening: ' || evening_shift || '+' || COALESCE(evening_shift_contract, 0) as remark
FROM legacy.security_guard_counts
WHERE is_deleted = 0 AND NOT EXISTS (SELECT 1 FROM public.guard_counts gc WHERE gc.id = legacy.security_guard_counts.id);

-- ============================================================
-- 11. MIGRATE CCTV INSPECTIONS
-- ============================================================
INSERT INTO public.cctv_inspections (inspection_date, inspector_name, total_checked, total_passed, total_failed, summary)
SELECT 
  inspection_date,
  employee_name as inspector_name,
  7 as total_checked,
  (CASE WHEN radio_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN report_books_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN nvr_screen_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN nvr_machine_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN keys_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN access_control_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN incident_report_status = 'ปกติ' THEN 1 ELSE 0 END) as total_passed,
  7 - (CASE WHEN radio_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN report_books_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN nvr_screen_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN nvr_machine_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN keys_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN access_control_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN incident_report_status = 'ปกติ' THEN 1 ELSE 0 END) as total_failed,
  'CCTV Room: ' || cctv_room || ', Radio: ' || radio_status || ', NVR Screen: ' || nvr_screen_status as summary
FROM legacy.cctv_inspections
WHERE is_deleted = 0 AND NOT EXISTS (SELECT 1 FROM public.cctv_inspections ci WHERE ci.id = legacy.cctv_inspections.id);

-- ============================================================
-- 12. MIGRATE ROLE PERMISSIONS
-- ============================================================
INSERT INTO public.role_permissions (role_id, module_name, can_read, can_write, can_delete)
SELECT 
  role_id,
  page_name as module_name,
  true as can_read,
  true as can_write,
  true as can_delete
FROM legacy.role_permissions
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.id = legacy.role_permissions.id);

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'users' as table_name, COUNT(*)::text as count FROM public.users
UNION ALL
SELECT 'building_reports', COUNT(*)::text FROM public.building_reports
UNION ALL
SELECT 'patrol_reports', COUNT(*)::text FROM public.patrol_reports
UNION ALL
SELECT 'car_parkings', COUNT(*)::text FROM public.car_parkings
UNION ALL
SELECT 'cctv_reports', COUNT(*)::text FROM public.cctv_reports
UNION ALL
SELECT 'handheld_checks', COUNT(*)::text FROM public.handheld_checks
UNION ALL
SELECT 'metal_detectors', COUNT(*)::text FROM public.metal_detectors
UNION ALL
SELECT 'nvr_recording_days', COUNT(*)::text FROM public.nvr_recording_days
UNION ALL
SELECT 'camera_checks', COUNT(*)::text FROM public.camera_checks
UNION ALL
SELECT 'guard_counts', COUNT(*)::text FROM public.guard_counts
UNION ALL
SELECT 'cctv_inspections', COUNT(*)::text FROM public.cctv_inspections
UNION ALL
SELECT 'role_permissions', COUNT(*)::text FROM public.role_permissions;
