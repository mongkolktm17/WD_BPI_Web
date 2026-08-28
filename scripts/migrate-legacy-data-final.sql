-- ============================================================
-- LEGACY DATA MIGRATION SCRIPT
-- Focus: Preserve Thai language text exactly as stored in legacy tables
-- ============================================================

-- 1. USERS
INSERT INTO public.users (username, password, full_name, role_id, department, is_active)
SELECT 
  username,
  password,
  TRIM(BOTH ' ' FROM first_name || ' ' || last_name),
  CASE role_id WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 3 ELSE 3 END,
  phone_number,
  user_type = 'admin'
FROM legacy.users
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.username = legacy.users.username)
ON CONFLICT (username) DO NOTHING;

-- 2. BUILDING REPORTS
INSERT INTO public.building_reports (id, report_date, employee_id, full_name, shift, building, guard_post, report_time, incident_report, special_incident, emergency_incident)
SELECT id, report_date, employee_id, full_name, shift, building, guard_post,
  LEFT(CAST(report_time AS TEXT), 5), incident_report, special_incident, emergency_incident
FROM legacy.reports
WHERE is_deleted = 0
  AND NOT EXISTS (SELECT 1 FROM public.building_reports br WHERE br.id = legacy.reports.id);

-- 3. PATROL REPORTS
INSERT INTO public.patrol_reports (patrol_date, patrol_route, officer_name, status, notes)
SELECT report_date, building, inspector_name, report_condition,
  ARRAY_TO_STRING(ARRAY[
    fence_lighting, fence_objects, no_gathering, no_flyers, fence_normal,
    no_suspicious_parking, no_suspicious_boxes, no_unauthorized_persons_area,
    door_system_normal, electrical_system_normal, no_room_abnormalities,
    no_unauthorized_persons_room, no_chemical_obstruction, no_container_leaks,
    no_unauthorized_persons_chemical, chemical_door_normal,
    no_unauthorized_persons_electrical, electrical_door_normal,
    no_electrical_abnormalities, equipment_normal, no_fire_door_obstruction
  ], '; ')
FROM legacy.patrol_reports
WHERE is_deleted = 0
  AND NOT EXISTS (SELECT 1 FROM public.patrol_reports pr WHERE pr.id = legacy.patrol_reports.id);

-- 4. CAR PARKINGS
INSERT INTO public.car_parkings (record_date, slot_no, car_license, driver_name, time_in, status)
SELECT inspection_date, LEFT(parking_lot, 20), license_plates, inspector_name, created_at, 'parked'
FROM legacy.car_parking_reports
WHERE is_deleted = 0 AND total_cars > 0
  AND NOT EXISTS (SELECT 1 FROM public.car_parkings cp WHERE cp.id = legacy.car_parking_reports.id);

-- 5. CCTV REPORTS
INSERT INTO public.cctv_reports (id, report_date, total_normal, total_abnormal, reporter_name, remark)
SELECT id, DATE(report_time), online_channels, offline_channels, 'System User',
  'Online: ' || online_percentage || '%'
FROM legacy.cctv_reports
WHERE is_deleted = 0
  AND NOT EXISTS (SELECT 1 FROM public.cctv_reports cr WHERE cr.id = legacy.cctv_reports.id);

-- 6. HANDHELD CHECKS
INSERT INTO public.handheld_equipment (device_code, device_name, status)
SELECT DISTINCT 'HH-' || inspector_code, 'Hand-Held Detector ' || inspector_code, 'normal'
FROM legacy.hand_held_checks
WHERE is_deleted = 0
  AND NOT EXISTS (SELECT 1 FROM public.handheld_equipment hhe WHERE hhe.device_code = 'HH-' || legacy.hand_held_checks.inspector_code);

INSERT INTO public.handheld_checks (equipment_id, check_date, status, remark, inspector)
SELECT hhe.id, hhc.inspection_date,
  CASE WHEN hhc.battery_status = 'พร้อมใช้งาน' AND hhc.led_status = 'ผ่านการทดสอบ'
    AND hhc.detection_test_status = 'ผ่านการทดสอบ' AND hhc.alarm_status = 'ผ่านการทดสอบ'
    THEN 'normal' ELSE 'abnormal' END,
  'แบต: ' || hhc.battery_status || ', LED: ' || hhc.led_status || ', ตรวจ: ' || hhc.detection_test_status || ', เสียง: ' || hhc.alarm_status,
  hhc.inspector_name
FROM legacy.hand_held_checks hhc
JOIN public.handheld_equipment hhe ON hhe.device_code = 'HH-' || hhc.inspector_code
WHERE hhc.is_deleted = 0
  AND NOT EXISTS (SELECT 1 FROM public.handheld_checks hhc2 WHERE hhc2.id = hhc.id);

-- 7. METAL DETECTORS
INSERT INTO public.metal_detectors (device_code, location, status, last_check)
SELECT building || '-' || guard_post || '-' || id,
  LEFT(building || ' - ' || guard_post, 100),
  CASE WHEN zone1_status = 'พร้อมใช้งาน' AND zone2_status = 'พร้อมใช้งาน'
    AND zone3_status = 'พร้อมใช้งาน' AND zone4_status = 'พร้อมใช้งาน'
    AND zone5_status = 'พร้อมใช้งาน' AND zone6_status = 'พร้อมใช้งาน'
    THEN 'normal' ELSE 'abnormal' END,
  inspection_date
FROM legacy.metal_detector_checks
WHERE is_deleted = 0
  AND NOT EXISTS (SELECT 1 FROM public.metal_detectors md WHERE md.device_code = building || '-' || guard_post || '-' || legacy.metal_detector_checks.id);

-- 8. NVR DEVICES AND RECORDING DAYS
INSERT INTO public.nvr_devices (building_id, nvr_name, ip_address, total_channels)
SELECT DISTINCT COALESCE(b.id, 10), nrd.nvr_name, '0.0.0.0', 32
FROM legacy.nvr_recording_details nrd
JOIN legacy.nvr_recording_reports nrr ON nrr.id = nrd.report_id
LEFT JOIN public.buildings b ON b.building_code = nrr.building
WHERE nrd.nvr_name IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.nvr_devices nd WHERE nd.nvr_name = nrd.nvr_name);

INSERT INTO public.nvr_recording_days (nvr_id, record_date, days_recorded, status, remark)
SELECT nd.id, nrd.created_at, nrd.recording_days,
  CASE WHEN nrd.recording_days >= nrd.target_days THEN 'pass' ELSE 'fail' END,
  'Target: ' || nrd.target_days || ' days'
FROM legacy.nvr_recording_details nrd
JOIN public.nvr_devices nd ON nd.nvr_name = nrd.nvr_name
WHERE NOT EXISTS (SELECT 1 FROM public.nvr_recording_days nrd2 WHERE nrd2.id = nrd.id);

-- 9. CAMERAS AND CAMERA CHECKS
INSERT INTO public.cameras (building_id, camera_no, camera_name, location, status)
SELECT DISTINCT COALESCE(b.id, 10),
  CAST(ac.camera_number AS TEXT) || '-' || ac.nvr_number,
  'Camera ' || ac.camera_number || ' (NVR ' || ac.nvr_number || ')',
  ac.building || ' - NVR ' || ac.nvr_number,
  'normal'
FROM legacy.cctv_angle_checks ac
LEFT JOIN public.buildings b ON b.building_code = ac.building;

INSERT INTO public.camera_checks (camera_id, check_date, status, remark, checked_by)
SELECT c.id, ac.checked_date,
  CASE WHEN ac.angle_correct = 1 THEN 'normal' ELSE 'abnormal' END,
  ac.notes, ac.checked_by
FROM legacy.cctv_angle_checks ac
JOIN public.buildings b ON b.building_code = ac.building
JOIN public.cameras c ON c.building_id = b.id AND c.camera_no = CAST(ac.camera_number AS TEXT) || '-' || ac.nvr_number
WHERE NOT EXISTS (SELECT 1 FROM public.camera_checks cc WHERE cc.id = ac.id);

-- 10. GUARD COUNTS
INSERT INTO public.guard_counts (record_date, shift, total_guards, present_guards, absent_guards, remark)
SELECT record_date, 'เช้า', total,
  (morning_shift + COALESCE(morning_shift_contract, 0)),
  total - (morning_shift + COALESCE(morning_shift_contract, 0)),
  'Evening: ' || evening_shift || '+' || COALESCE(evening_shift_contract, 0)
FROM legacy.security_guard_counts
WHERE is_deleted = 0;

-- 11. CCTV INSPECTIONS
INSERT INTO public.cctv_inspections (inspection_date, inspector_name, total_checked, total_passed, total_failed, summary)
SELECT inspection_date, employee_name, 7,
  (CASE WHEN radio_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN report_books_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN nvr_screen_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN nvr_machine_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN keys_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN access_control_status = 'ปกติ' THEN 1 ELSE 0 END +
   CASE WHEN incident_report_status = 'ปกติ' THEN 1 ELSE 0 END),
  7 - (CASE WHEN radio_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN report_books_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN nvr_screen_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN nvr_machine_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN keys_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN access_control_status = 'ปกติ' THEN 1 ELSE 0 END +
        CASE WHEN incident_report_status = 'ปกติ' THEN 1 ELSE 0 END),
  'CCTV Room: ' || cctv_room || ', Radio: ' || radio_status || ', NVR Screen: ' || nvr_screen_status
FROM legacy.cctv_inspections
WHERE is_deleted = 0
  AND NOT EXISTS (SELECT 1 FROM public.cctv_inspections ci WHERE ci.id = legacy.cctv_inspections.id);

-- 12. ROLE PERMISSIONS
INSERT INTO public.role_permissions (role_id, module_name, can_read, can_write, can_delete)
SELECT role_id, page_name, true, true, true
FROM legacy.role_permissions
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.id = legacy.role_permissions.id);

-- VERIFICATION
SELECT 'users' as table_name, COUNT(*)::text as count FROM public.users
UNION ALL SELECT 'building_reports', COUNT(*)::text FROM public.building_reports
UNION ALL SELECT 'patrol_reports', COUNT(*)::text FROM public.patrol_reports
UNION ALL SELECT 'car_parkings', COUNT(*)::text FROM public.car_parkings
UNION ALL SELECT 'cctv_reports', COUNT(*)::text FROM public.cctv_reports
UNION ALL SELECT 'handheld_checks', COUNT(*)::text FROM public.handheld_checks
UNION ALL SELECT 'metal_detectors', COUNT(*)::text FROM public.metal_detectors
UNION ALL SELECT 'nvr_recording_days', COUNT(*)::text FROM public.nvr_recording_days
UNION ALL SELECT 'camera_checks', COUNT(*)::text FROM public.camera_checks
UNION ALL SELECT 'guard_counts', COUNT(*)::text FROM public.guard_counts
UNION ALL SELECT 'cctv_inspections', COUNT(*)::text FROM public.cctv_inspections
UNION ALL SELECT 'role_permissions', COUNT(*)::text FROM public.role_permissions;
