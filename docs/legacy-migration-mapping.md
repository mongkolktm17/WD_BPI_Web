# Legacy MySQL -> PostgreSQL Migration Mapping

Source of truth: `legacy/` (PHP/MySQL) vs `prisma/schema.prisma` (PostgreSQL).

**Every legacy table now has a Prisma model.** There are no unmapped tables.
Row counts below are exact `COUNT(*)` values from the live production MySQL
database (`wdbpi_db` on the `wd` VPS), taken 2026-09-07.

Migration is driven by `scripts/migration/` — `table-map.ts` (the mapping) and
`migrate.ts` (the runner). It reads MySQL directly over an SSH tunnel; there is
no SQL-dump parsing.

## Two-track design

The schema deliberately runs two tracks. Read this before assuming a table is
duplicated by mistake:

- **Normalized track** — the models the NestJS API actually reads and writes
  (`BuildingReport`, `GuardCount`, `CarParking`, `Camera`, `NvrDevice`, ...).
  These reshape the legacy data into the new domain model.
- **Legacy-mirror track** — models that preserve the original MySQL table shape
  1:1 so historical rows can be imported and read without loss
  (`CarParkingReport`, `ParkingLotCount`, `PatrolCheckLegacy`,
  `HandHeldCheckLegacy`, `MetalDetectorCheckLegacy`, `NvrRecordingReport`,
  `NvrRecordingDetail`, `NvrStatusReport`, `NvrStatusReportDetail`,
  `CctvAngleReport`, `CctvReportDetail`).

A mirror model keeps the legacy table name via `@@map`; a normalized model
usually maps to a new table name.

## Mapped Tables

| Legacy Table | Prod Rows | Prisma Model | Postgres Table | Track | Notes |
| --- | ---: | --- | --- | --- | --- |
| `reports` | 114,414 | `BuildingReport` | `building_reports` | normalized | Largest table. See narrowing note below. |
| `security_guard_counts` | 201 | `GuardCount` | `guard_counts` | normalized | Reshaped: legacy stores both shifts per row; new stores **one row per shift**. `presentGuards`=actual, `totalGuards`=contract. Legacy `morning_reported_at`/`evening_reported_at` are replaced by per-row `createdAt`. |
| `car_parking_reports` | 3,294 | `CarParkingReport` | `car_parking_reports` | mirror | Live parking UI uses the separate `CarParking` (slot-level) model. |
| `parking_lot_counts` | 10,247 | `ParkingLotCount` | `parking_lot_counts` | mirror | Child of `car_parking_reports` via `report_id`. |
| `patrol_reports` | 1,450 | `PatrolReport` | `patrol_reports` | normalized | Reshaped: 24 checklist columns collapse into `notes`. See gap #2. |
| `patrol_checks` | 0 | `PatrolCheckLegacy` | `patrol_checks` | mirror | Empty in production (`check_list_patrol.php` is superseded by `check_list_patrol_new.php`). Nothing to migrate. |
| `cctv_inspections` | 678 | `CctvInspection` | `cctv_inspections` | normalized | Total/pass/fail are computed from legacy columns. |
| `cctv_reports` | 80 | `CctvReport` | `cctv_reports` | normalized | |
| `cctv_report_details` | 377 | `CctvReportDetail` | `cctv_report_details` | mirror | |
| `cctv_angle_checks` | 1,014 | `CameraCheck` | `camera_checks` | normalized | Requires camera mapping. |
| `cctv_angle_reports` | 22 | `CctvAngleReport` | `cctv_angle_reports` | mirror | |
| `cctv_camera_names` | 815 | `Camera` | `cameras` | normalized | Requires building mapping. |
| `cctv_devices` | 19 | `NvrDevice` | `nvr_devices` | normalized | Requires building mapping. |
| `nvr_devices` | 6 | `NvrDevice` | `nvr_devices` | normalized | Same target as `cctv_devices`; de-duplicate on import. |
| `nvr_recording_reports` | 1,176 | `NvrRecordingReport` | `nvr_recording_reports` | mirror | |
| `nvr_recording_details` | 5,569 | `NvrRecordingDetail` | `nvr_recording_details` | mirror | |
| `nvr_status_reports` | 1 | `NvrStatusReport` | `nvr_status_reports` | mirror | |
| `nvr_status_report_details` | 6 | `NvrStatusReportDetail` | `nvr_status_report_details` | mirror | |
| `hand_held_checks` | 5,478 | `HandHeldCheckLegacy` | `hand_held_checks` | mirror | New track uses `HandheldCheck` + `HandheldEquipment` (equipment-code relation). |
| `metal_detector_checks` | 5,638 | `MetalDetectorCheckLegacy` | `metal_detector_checks` | mirror | New track uses `WalkthroughCheck` + `WalkthroughDetector`. |
| `users` | 156 | `User` | `users` | normalized | Already seeded; skip on import. |
| `roles` | 4 | `Role` | `roles` | normalized | Already seeded; skip on import. |
| `role_permissions` | 141 | `RolePermission` | `role_permissions` | normalized | Already seeded; skip on import. |

## Known migration gaps

Status as of 2026-09-07. Items marked RESOLVED are done; the rest still need
attention before cutover.

1. **Audit columns — RESOLVED 2026-09-07.** `submittedById` and
   `updatedBy`/`updatedAt` were restored across the affected models (migration
   `20260907080000_restore_legacy_audit_and_employee_id`), along with
   `User.employeeId`. Fill rates in production are worth knowing:
   - `submitted_by_id` is **near-complete** — `cctv_inspections` 678/678,
     `cctv_reports` 80/80, `security_guard_counts` 201/201,
     `nvr_recording_reports` 1176/1176, `metal_detector_checks` 5604/5638.
     Real attribution data to carry over.
   - `updated_by` is **almost empty** — roughly 51 populated rows across
     ~130k. Restoring it is forward-looking, not a backfill.

2. **Patrol checklist is stored as a JSON blob.** `PatrolReport.notes` holds all
   24 checklist items as JSON, packed and unpacked by
   `apps/web/app/patrol-checklist/page.tsx`. The UI has full parity, but the
   data is unqueryable, unindexable, and unvalidated at the database layer.
   Note that `PatrolReport` is `@@map("patrol_reports")` — it reuses the legacy
   table name with an incompatible shape, so a raw table-to-table copy cannot
   work. The migrator handles this explicitly: its `patrol_reports` transform
   packs the 24 columns into the same JSON keys the web page reads back.
   Decision 2026-09-07: keep the JSON blob for now; only 1,450 rows, so
   normalizing later stays cheap.

3. **Column narrowing on `BuildingReport` — not a practical risk.** The
   declared widths are narrower than legacy (`full_name` 255->200,
   `guard_post` 255->100, `report_time` `TIME`->`VarChar(5)`), but production
   data is well inside them: max `full_name` is 25 characters, max `guard_post`
   is 24, and `report_time` values are always `HH:MM:00`. No truncation will
   occur. Left as-is.

4. **The checked-in SQL dumps are stale.**
   `legacy/src/wdbpi_backup_20260129.sql` predates the v2.1.0 legacy guard-duty
   change: it lacks `security_guard_counts.morning_reported_at` /
   `evening_reported_at`, which `legacy/guard_duty_log.php` writes (it adds the
   columns at runtime and falls back if the insert fails). Do not treat the
   checked-in dumps as the current production schema — take a fresh dump.

5. **B.9 parking capacity — RESOLVED 2026-09-07: 44 slots.** Production
   `edit_car_parking.php` says `B.9 (44 Slot)` and the repo's `legacy/` copy
   says `112`. Production is authoritative (the server also carries an
   `update_b9_slots_production.php` script). Seed parking capacity with **44**;
   the repo's legacy copy is stale on this value.

6. **5,279 orphan reports.** Of 114,414 rows in `reports`, 5,279 carry an
   `employee_id` with no matching `users` row. `building_reports.employee_id`
   is therefore an indexed plain column, **not** a foreign key — a hard FK
   would reject those rows. Reports filed by since-deleted accounts still need
   to be readable.

7. **Legacy collation mismatch (MySQL only).** `reports`, `users` and friends
   mix `utf8mb4_general_ci` and `utf8mb4_unicode_ci`, so joining
   `reports.employee_id` to `users.employee_id` in MySQL raises
   *Illegal mix of collations* — which is why `legacy/report_page.php` carries
   a `$collate` variable in its SQL. This disappears in PostgreSQL; no action
   needed beyond not copying the workaround.

## Blocked: six normalized CCTV targets

~2,612 rows are not yet migratable. Each is marked `blocked` in
`scripts/migration/table-map.ts` and the runner refuses them:

| Source | Rows | Blocker |
| --- | ---: | --- |
| `cctv_camera_names` -> `cameras` | 815 | `Camera.buildingId` is an FK to `buildings`, which is never seeded. Legacy stores a building *name* string. Needs a building seed plus a name->id map. Legacy `nvr_name` has no target column. |
| `cctv_devices` -> `nvr_devices` | 19 | Same `buildings` FK problem. Legacy `area`, `drive_capacity`, `total_capacity_tb` and `target_days` have no target columns — and `target_days` encodes the 62-day retention rule. |
| `nvr_devices` -> `nvr_devices` | 6 | Shares its target with `cctv_devices` (19 rows) and legacy ids collide. Needs a de-duplication rule. |
| `cctv_angle_checks` -> `camera_checks` | 1,014 | `CameraCheck.cameraId` is an FK to `cameras`; legacy identifies a camera by `(building, nvr_number, camera_number)`. Depends on `cctv_camera_names` landing first. |
| `cctv_inspections` | 678 | Needs a pass/fail rollup over 7 legacy status columns into `total_checked`/`total_passed`/`total_failed`. Legacy `cctv_room`, `shift` and `employee_id` have no target columns. |
| `cctv_reports` | 80 | Target wants `report_date` + `reporter_name`; legacy has `report_time` and `submitted_by_id` (needs a users lookup). Legacy `building`, `total_channels`, `online_percentage` have no target columns. |

The common root cause is that the `buildings` table has no seed and the CCTV
models were designed around FKs the legacy data cannot supply. Seeding
`buildings` from the distinct building strings in the legacy CCTV tables
unblocks the first four.
