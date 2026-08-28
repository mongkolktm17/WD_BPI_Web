# Legacy MySQL -> PostgreSQL Migration Mapping

## Mapped Tables

| Legacy Table | New Model | Notes |
| --- | --- | --- |
| `reports` | `BuildingReport` | Direct mapping |
| `cctv_inspections` | `CctvInspection` | Need to compute total/pass/fail from columns |
| `cctv_devices` | `NvrDevice` | Requires building mapping |
| `cctv_camera_names` | `Camera` | Requires building mapping |
| `cctv_angle_checks` | `CameraCheck` | Requires camera mapping |
| `patrol_reports` | `PatrolReport` | Collapse checklist fields into notes |
| `users` | existing | Skip; already seeded |
| `roles` | existing | Skip; already seeded |
| `role_permissions` | existing | Skip; already seeded |

## Skipped Tables (no matching model)

- `cctv_angle_reports`
- `cctv_report_details`
- `parking_lot_counts`
- `security_guard_counts`
- `nvr_recording_reports`
- `nvr_recording_details`
- `nvr_status_reports`
- `nvr_status_report_details`
- `patrol_checks`
- `metal_detector_checks`
- `car_parking_reports` (schema differs; current `CarParking` is slot-level, not daily summary)
- `hand_held_checks` (new schema uses equipment code relation)
- `nvr_devices` (legacy data already covered by `cctv_devices` mapping)
