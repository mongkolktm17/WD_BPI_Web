-- AlterTable
ALTER TABLE "building_reports" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "camera_checks" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "car_parkings" ADD COLUMN     "lot_counts" JSONB;

-- AlterTable
ALTER TABLE "cctv_inspections" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "cctv_reports" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "guard_counts" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "handheld_checks" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "patrol_reports" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "walkthrough_checks" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "car_parking_reports" (
    "id" SERIAL NOT NULL,
    "inspection_date" DATE NOT NULL,
    "inspector_code" VARCHAR(255) NOT NULL,
    "inspector_name" VARCHAR(255) NOT NULL,
    "shift" VARCHAR(50) NOT NULL,
    "parking_lot" VARCHAR(255) NOT NULL,
    "total_cars" INTEGER NOT NULL DEFAULT 0,
    "spare_tire_status" VARCHAR(50) NOT NULL,
    "license_plates" TEXT,
    "motorcycle_parking_lot" VARCHAR(255),
    "motorcycle_count_1" INTEGER,
    "motorcycle_count_2" INTEGER,
    "motorcycle_count_3" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_parking_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_lot_counts" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "lot_name" VARCHAR(255) NOT NULL,
    "vehicle_type" VARCHAR(10) NOT NULL,
    "vehicle_count" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parking_lot_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hand_held_checks" (
    "id" SERIAL NOT NULL,
    "inspection_date" DATE NOT NULL,
    "building" VARCHAR(255) NOT NULL,
    "guard_post" VARCHAR(255) NOT NULL,
    "inspector_code" VARCHAR(255) NOT NULL,
    "inspector_name" VARCHAR(255) NOT NULL,
    "shift" VARCHAR(50) NOT NULL,
    "battery_status" VARCHAR(255) NOT NULL,
    "led_status" VARCHAR(255) NOT NULL,
    "detection_test_status" VARCHAR(255) NOT NULL,
    "alarm_status" VARCHAR(255) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hand_held_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metal_detector_checks" (
    "id" SERIAL NOT NULL,
    "inspection_date" DATE NOT NULL,
    "shift" VARCHAR(50) NOT NULL,
    "employee_id" VARCHAR(255) NOT NULL,
    "employee_name" VARCHAR(255) NOT NULL,
    "building" VARCHAR(255) NOT NULL,
    "guard_post" VARCHAR(255) NOT NULL,
    "scanner_brand" VARCHAR(255) NOT NULL,
    "zone1_status" VARCHAR(255) NOT NULL,
    "zone2_status" VARCHAR(255) NOT NULL,
    "zone3_status" VARCHAR(255) NOT NULL,
    "zone4_status" VARCHAR(255) NOT NULL,
    "zone5_status" VARCHAR(255) NOT NULL,
    "zone6_status" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metal_detector_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nvr_recording_reports" (
    "id" SERIAL NOT NULL,
    "building" VARCHAR(10) NOT NULL,
    "submission_id" VARCHAR(50),
    "submitted_by_id" INTEGER NOT NULL,
    "report_time" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nvr_recording_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nvr_recording_details" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "nvr_name" VARCHAR(50) NOT NULL,
    "recording_days" INTEGER NOT NULL,
    "target_days" INTEGER NOT NULL DEFAULT 62,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nvr_recording_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nvr_status_reports" (
    "id" SERIAL NOT NULL,
    "report_time" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_channels" INTEGER NOT NULL,
    "online_channels" INTEGER NOT NULL,
    "offline_channels" INTEGER NOT NULL,
    "online_percentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "nvr_status_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nvr_status_report_details" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "nvr_id" INTEGER NOT NULL,
    "online_channels" INTEGER NOT NULL,

    CONSTRAINT "nvr_status_report_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cctv_angle_reports" (
    "id" SERIAL NOT NULL,
    "report_date" DATE NOT NULL,
    "building" VARCHAR(255) NOT NULL,
    "nvr" INTEGER NOT NULL,
    "total_cameras" INTEGER NOT NULL,
    "correct_cameras" INTEGER NOT NULL,
    "incorrect_cameras" INTEGER NOT NULL,
    "checked_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cctv_angle_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cctv_report_details" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "nvr_name" VARCHAR(255) NOT NULL,
    "online_channels" INTEGER NOT NULL,
    "total_channels" INTEGER NOT NULL DEFAULT 0,
    "channel_statuses_json" TEXT,

    CONSTRAINT "cctv_report_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrol_checks" (
    "id" SERIAL NOT NULL,
    "inspection_date" DATE NOT NULL,
    "patrol_status" VARCHAR(255) NOT NULL,
    "shift" VARCHAR(50) NOT NULL,
    "employee_id" VARCHAR(255) NOT NULL,
    "inspector_name" VARCHAR(255) NOT NULL,
    "patrol_time" VARCHAR(50) NOT NULL,
    "building" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patrol_checks_pkey" PRIMARY KEY ("id")
);
