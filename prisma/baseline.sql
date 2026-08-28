node.exe : Loaded Prisma config from prisma.config.ts.
At line:1 char:1
+ & "C:\Program Files\nodejs/node.exe" "C:\Program Files\nodejs/node_mo ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Loaded Prisma c...isma.config.ts.:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "module_name" VARCHAR(50) NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT false,
    "can_write" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "role_id" INTEGER NOT NULL,
    "department" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officers" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "title_name" VARCHAR(20),
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "position" VARCHAR(100),
    "company" VARCHAR(100),
    "site_location" VARCHAR(100),
    "shift" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" SERIAL NOT NULL,
    "building_code" VARCHAR(20) NOT NULL,
    "building_name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cameras" (
    "id" SERIAL NOT NULL,
    "building_id" INTEGER NOT NULL,
    "camera_no" VARCHAR(20) NOT NULL,
    "camera_name" VARCHAR(100) NOT NULL,
    "location" VARCHAR(200),
    "status" VARCHAR(20) NOT NULL DEFAULT 'normal',

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camera_checks" (
    "id" SERIAL NOT NULL,
    "camera_id" INTEGER NOT NULL,
    "check_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "remark" TEXT,
    "checked_by" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camera_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nvr_devices" (
    "id" SERIAL NOT NULL,
    "building_id" INTEGER NOT NULL,
    "nvr_name" VARCHAR(100) NOT NULL,
    "ip_address" VARCHAR(45),
    "total_channels" INTEGER NOT NULL DEFAULT 16,

    CONSTRAINT "nvr_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nvr_recording_days" (
    "id" SERIAL NOT NULL,
    "nvr_id" INTEGER NOT NULL,
    "record_date" DATE NOT NULL,
    "days_recorded" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nvr_recording_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cctv_reports" (
    "id" SERIAL NOT NULL,
    "report_date" DATE NOT NULL,
    "total_normal" INTEGER NOT NULL DEFAULT 0,
    "total_abnormal" INTEGER NOT NULL DEFAULT 0,
    "reporter_name" VARCHAR(100) NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cctv_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_parkings" (
    "id" SERIAL NOT NULL,
    "record_date" DATE NOT NULL,
    "slot_no" VARCHAR(20) NOT NULL,
    "car_license" VARCHAR(50) NOT NULL,
    "driver_name" VARCHAR(100),
    "time_in" TIMESTAMPTZ(6),
    "time_out" TIMESTAMPTZ(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'parked',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_parkings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guard_duty_logs" (
    "id" SERIAL NOT NULL,
    "log_date" DATE NOT NULL,
    "shift" VARCHAR(20) NOT NULL,
    "guard_name" VARCHAR(100) NOT NULL,
    "duty_post" VARCHAR(100) NOT NULL,
    "event_log" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guard_duty_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handheld_equipment" (
    "id" SERIAL NOT NULL,
    "device_code" VARCHAR(50) NOT NULL,
    "device_name" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "location" VARCHAR(100),

    CONSTRAINT "handheld_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handheld_checks" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "check_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "remark" TEXT,
    "inspector" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handheld_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walkthrough_detectors" (
    "id" SERIAL NOT NULL,
    "detector_code" VARCHAR(50) NOT NULL,
    "location" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'normal',

    CONSTRAINT "walkthrough_detectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walkthrough_checks" (
    "id" SERIAL NOT NULL,
    "detector_id" INTEGER NOT NULL,
    "check_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "remark" TEXT,
    "inspector" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "walkthrough_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metal_detectors" (
    "id" SERIAL NOT NULL,
    "device_code" VARCHAR(50) NOT NULL,
    "location" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "last_check" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metal_detectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cctv_inspections" (
    "id" SERIAL NOT NULL,
    "inspection_date" DATE NOT NULL,
    "inspector_name" VARCHAR(100) NOT NULL,
    "total_checked" INTEGER NOT NULL,
    "total_passed" INTEGER NOT NULL,
    "total_failed" INTEGER NOT NULL,
    "summary" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cctv_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guard_counts" (
    "id" SERIAL NOT NULL,
    "record_date" DATE NOT NULL,
    "shift" VARCHAR(20) NOT NULL,
    "total_guards" INTEGER NOT NULL,
    "present_guards" INTEGER NOT NULL,
    "absent_guards" INTEGER NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guard_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrol_reports" (
    "id" SERIAL NOT NULL,
    "patrol_date" DATE NOT NULL,
    "patrol_route" VARCHAR(100) NOT NULL,
    "officer_name" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patrol_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" SERIAL NOT NULL,
    "config_key" VARCHAR(100) NOT NULL,
    "config_value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "details" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_visuals" (
    "id" SERIAL NOT NULL,
    "report_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "data_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_visuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_reports" (
    "id" SERIAL NOT NULL,
    "report_date" DATE NOT NULL,
    "employee_id" VARCHAR(8) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "shift" VARCHAR(10) NOT NULL,
    "building" VARCHAR(10) NOT NULL,
    "guard_post" VARCHAR(100) NOT NULL,
    "report_time" VARCHAR(5) NOT NULL,
    "incident_report" TEXT NOT NULL,
    "special_incident" TEXT,
    "emergency_incident" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "building_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "officers_employee_id_key" ON "officers"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_building_code_key" ON "buildings"("building_code");

-- CreateIndex
CREATE UNIQUE INDEX "handheld_equipment_device_code_key" ON "handheld_equipment"("device_code");

-- CreateIndex
CREATE UNIQUE INDEX "walkthrough_detectors_detector_code_key" ON "walkthrough_detectors"("detector_code");

-- CreateIndex
CREATE UNIQUE INDEX "metal_detectors_device_code_key" ON "metal_detectors"("device_code");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_config_key_key" ON "system_configs"("config_key");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_checks" ADD CONSTRAINT "camera_checks_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "cameras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nvr_devices" ADD CONSTRAINT "nvr_devices_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nvr_recording_days" ADD CONSTRAINT "nvr_recording_days_nvr_id_fkey" FOREIGN KEY ("nvr_id") REFERENCES "nvr_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handheld_checks" ADD CONSTRAINT "handheld_checks_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "handheld_equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walkthrough_checks" ADD CONSTRAINT "walkthrough_checks_detector_id_fkey" FOREIGN KEY ("detector_id") REFERENCES "walkthrough_detectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

