-- Restore legacy attribution that the rewrite dropped.
--
-- 1. users.employee_id  — the join key legacy uses for report ownership
--    (reports.employee_id, $_SESSION['employee_id'] in report_page.php).
--    Nullable so the existing user-creation flow keeps working; UNIQUE because
--    all 156 production users have a distinct 8-char value.
--
-- 2. submitted_by_id ("who filed it") — near-fully populated in production:
--    cctv_inspections 678/678, cctv_reports 80/80, security_guard_counts
--    201/201, metal_detector_checks 5604/5638. Real data to preserve.
--
-- 3. updated_by / updated_at ("who last edited it") — barely used in legacy
--    (~51 rows across ~130k), so this is forward-looking rather than a backfill.
--
-- Deliberately NOT a foreign key: 5,279 of 114,414 legacy reports carry an
-- employee_id with no matching user row. A hard FK would reject them.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "employee_id" VARCHAR(8);
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- AlterTable: updated_by / updated_at
ALTER TABLE "building_reports"       ADD COLUMN "updated_by" VARCHAR(100), ADD COLUMN "updated_at" TIMESTAMPTZ(6);
ALTER TABLE "guard_counts"           ADD COLUMN "updated_by" VARCHAR(100), ADD COLUMN "updated_at" TIMESTAMPTZ(6);
ALTER TABLE "car_parking_reports"    ADD COLUMN "updated_by" VARCHAR(100), ADD COLUMN "updated_at" TIMESTAMPTZ(6);
ALTER TABLE "patrol_reports"         ADD COLUMN "updated_by" VARCHAR(100), ADD COLUMN "updated_at" TIMESTAMPTZ(6);
ALTER TABLE "cctv_inspections"       ADD COLUMN "updated_by" VARCHAR(100), ADD COLUMN "updated_at" TIMESTAMPTZ(6);
ALTER TABLE "cctv_reports"           ADD COLUMN "updated_by" VARCHAR(100), ADD COLUMN "updated_at" TIMESTAMPTZ(6);
ALTER TABLE "cctv_angle_reports"     ADD COLUMN "updated_by" VARCHAR(100), ADD COLUMN "updated_at" TIMESTAMPTZ(6);
ALTER TABLE "hand_held_checks"       ADD COLUMN "updated_by" VARCHAR(100), ADD COLUMN "updated_at" TIMESTAMPTZ(6);
ALTER TABLE "metal_detector_checks"  ADD COLUMN "updated_by" VARCHAR(100), ADD COLUMN "updated_at" TIMESTAMPTZ(6);

-- AlterTable: submitted_by_id (nvr_recording_reports already has it)
ALTER TABLE "cctv_inspections"       ADD COLUMN "submitted_by_id" INTEGER;
ALTER TABLE "cctv_reports"           ADD COLUMN "submitted_by_id" INTEGER;
ALTER TABLE "metal_detector_checks"  ADD COLUMN "submitted_by_id" INTEGER;
ALTER TABLE "guard_counts"           ADD COLUMN "submitted_by_id" INTEGER;
ALTER TABLE "patrol_checks"          ADD COLUMN "submitted_by_id" INTEGER;

-- Index the ownership join path used by report listing/filtering.
CREATE INDEX "building_reports_employee_id_idx" ON "building_reports"("employee_id");
