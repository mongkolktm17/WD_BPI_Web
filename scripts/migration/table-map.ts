/**
 * Legacy MySQL -> PostgreSQL table map. Single source of truth for migration.
 *
 * Replaces the five competing migrators previously in scripts/ (migrate-data.ts,
 * migrate-legacy-data.ts, migrate-legacy-to-pg.ts, migrate-mysql-to-pg.js,
 * reimport-legacy.js). None covered all 23 tables, and migrate-data.ts routed
 * the 114k-row `reports` table into `report_visuals`.
 *
 * Column lists and row counts verified against production MySQL (wdbpi_db)
 * on 2026-09-07.
 */

export type Row = Record<string, any>;

export interface TableSpec {
  source: string;
  target: string;
  /** Production row count on 2026-09-07, used by the verification report. */
  expected: number;
  /** MySQL column -> Postgres column. Omitted columns are dropped. */
  columns?: Record<string, string>;
  /** Per-row transform, applied after renaming. Return null to skip the row. */
  transform?: (row: Row) => Row | null;
  /** One source row may expand into several target rows. */
  expand?: (row: Row) => Row[];
  /** Set when this table must not run yet. */
  blocked?: string;
  /** Set when this table is intentionally not migrated. */
  skip?: string;
}

const bool = (v: any) => (v === null || v === undefined ? null : Number(v) === 1);

/** MySQL TIME 'HH:MM:SS' -> the VarChar(5) 'HH:MM' the schema stores. */
const hhmm = (v: any) => {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const AUDIT = {
  is_deleted: 'is_deleted',
  deleted_by: 'deleted_by',
  deleted_at: 'deleted_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at',
};

/** The 24 checklist columns the legacy patrol form writes. */
export const PATROL_CHECKLIST_KEYS = [
  'fence_lighting', 'fence_objects', 'no_gathering', 'no_flyers', 'fence_normal',
  'no_suspicious_parking', 'no_suspicious_boxes', 'no_unauthorized_persons_area',
  'door_system_normal', 'electrical_system_normal', 'no_room_abnormalities',
  'no_unauthorized_persons_room', 'no_chemical_obstruction', 'no_container_leaks',
  'no_unauthorized_persons_chemical', 'chemical_door_normal',
  'no_unauthorized_persons_electrical', 'electrical_door_normal',
  'no_electrical_abnormalities', 'equipment_normal', 'no_fire_door_obstruction',
];

export const TABLES: TableSpec[] = [
  // ─── Already seeded — do not overwrite ──────────────────────────────────
  { source: 'roles', target: 'roles', expected: 4, skip: 'seeded by prisma/seed.ts' },
  { source: 'role_permissions', target: 'role_permissions', expected: 141, skip: 'seeded by prisma/seed.ts' },
  { source: 'patrol_checks', target: 'patrol_checks', expected: 0, skip: 'empty in production' },

  // ─── Users ──────────────────────────────────────────────────────────────
  // employee_id is the ownership join key; all 156 rows have a distinct value.
  {
    source: 'users',
    target: 'users',
    expected: 156,
    columns: {
      id: 'id', username: 'username', password: 'password',
      employee_id: 'employee_id', phone_number: 'phone',
      user_type: 'department', role_id: 'role_id',
      first_name: '_firstName', last_name: '_lastName',
    },
    transform: (r) => {
      const { _firstName, _lastName, ...rest } = r;
      return {
        ...rest,
        full_name: [_firstName, _lastName].filter(Boolean).join(' ').trim() || rest.username,
        is_active: true,
      };
    },
  },

  // ─── Main dataset: 114,414 rows -> building_reports (NOT report_visuals) ──
  {
    source: 'reports',
    target: 'building_reports',
    expected: 114414,
    columns: {
      id: 'id', report_date: 'report_date', employee_id: 'employee_id',
      full_name: 'full_name', shift: 'shift', building: 'building',
      guard_post: 'guard_post', report_time: 'report_time',
      incident_report: 'incident_report', special_incident: 'special_incident',
      emergency_incident: 'emergency_incident',
      submission_time: 'created_at', ...AUDIT,
    },
    transform: (r) => ({ ...r, report_time: hhmm(r.report_time), is_deleted: bool(r.is_deleted) }),
  },

  // ─── Guard counts: legacy packs both shifts per row; new schema is one row
  //     per shift, so each source row expands into up to two target rows.
  {
    source: 'security_guard_counts',
    target: 'guard_counts',
    expected: 201,
    expand: (r) => {
      const base = {
        record_date: r.record_date,
        is_deleted: bool(r.is_deleted),
        deleted_by: r.deleted_by,
        deleted_at: r.deleted_at,
        updated_by: r.updated_by,
        updated_at: r.updated_at,
        submitted_by_id: r.submitted_by_id,
      };
      const out: Row[] = [];
      const shifts: Array<['morning' | 'evening', any, any, any]> = [
        ['morning', r.morning_shift, r.morning_shift_contract ?? r.morning_contract, r.morning_reported_at],
        ['evening', r.evening_shift, r.evening_shift_contract ?? r.evening_contract, r.evening_reported_at],
      ];
      for (const [shift, actual, contract, reportedAt] of shifts) {
        if (actual === null || actual === undefined) continue;
        const present = Number(actual) || 0;
        const total = Number(contract ?? actual) || 0;
        out.push({
          ...base,
          shift,
          present_guards: present,
          total_guards: total,
          absent_guards: Math.max(0, total - present),
          // Legacy's split morning/evening_reported_at become per-row created_at.
          created_at: reportedAt ?? r.created_at ?? r.record_date,
        });
      }
      return out;
    },
  },

  // ─── Patrol: 24 checklist columns are packed into notes JSON, matching what
  //     apps/web/app/patrol-checklist/page.tsx reads back. ─────────────────
  {
    source: 'patrol_reports',
    target: 'patrol_reports',
    expected: 1450,
    transform: (r) => {
      const notes: Record<string, string> = {
        report_condition: r.report_condition ?? '',
        shift: r.shift ?? '',
        patrol_time: r.patrol_time ?? '',
        buildings: r.building ?? '',
        employee_id: r.employee_id ?? '',
      };
      for (const k of PATROL_CHECKLIST_KEYS) notes[k] = r[k] ?? '';
      return {
        id: r.id,
        patrol_date: r.report_date,
        patrol_route: (r.building ?? '').slice(0, 100),
        officer_name: (r.inspector_name ?? '').slice(0, 100),
        status: (r.report_condition ?? '').slice(0, 20),
        notes: JSON.stringify(notes),
        is_deleted: bool(r.is_deleted),
        deleted_by: r.deleted_by,
        deleted_at: r.deleted_at,
        updated_by: r.updated_by,
        updated_at: r.updated_at,
        created_at: r.created_at,
      };
    },
  },

  // ─── Legacy-mirror tables: shape is preserved 1:1 ───────────────────────
  {
    source: 'car_parking_reports',
    target: 'car_parking_reports',
    expected: 3294,
    columns: {
      id: 'id', inspection_date: 'inspection_date', inspector_code: 'inspector_code',
      inspector_name: 'inspector_name', shift: 'shift', parking_lot: 'parking_lot',
      total_cars: 'total_cars', spare_tire_status: 'spare_tire_status',
      license_plates: 'license_plates', motorcycle_parking_lot: 'motorcycle_parking_lot',
      motorcycle_count_1: 'motorcycle_count_1', motorcycle_count_2: 'motorcycle_count_2',
      motorcycle_count_3: 'motorcycle_count_3', created_at: 'created_at', ...AUDIT,
    },
    transform: (r) => ({ ...r, is_deleted: bool(r.is_deleted) }),
  },
  {
    source: 'parking_lot_counts',
    target: 'parking_lot_counts',
    expected: 10247,
    columns: {
      id: 'id', report_id: 'report_id', lot_name: 'lot_name',
      vehicle_type: 'vehicle_type', vehicle_count: 'vehicle_count',
      created_at: 'created_at',
    },
  },
  {
    source: 'cctv_angle_reports',
    target: 'cctv_angle_reports',
    expected: 22,
    columns: {
      id: 'id', report_date: 'report_date', building: 'building', nvr: 'nvr',
      total_cameras: 'total_cameras', correct_cameras: 'correct_cameras',
      incorrect_cameras: 'incorrect_cameras', checked_by: 'checked_by',
      created_at: 'created_at', updated_by: 'updated_by', updated_at: 'updated_at',
    },
  },
  {
    source: 'hand_held_checks',
    target: 'hand_held_checks',
    expected: 5478,
    columns: {
      id: 'id', inspection_date: 'inspection_date', building: 'building',
      guard_post: 'guard_post', inspector_code: 'inspector_code',
      inspector_name: 'inspector_name', shift: 'shift',
      battery_status: 'battery_status', led_status: 'led_status',
      detection_test_status: 'detection_test_status', alarm_status: 'alarm_status',
      remarks: 'remarks', created_at: 'created_at',
      updated_by: 'updated_by', updated_at: 'updated_at',
    },
  },
  {
    source: 'metal_detector_checks',
    target: 'metal_detector_checks',
    expected: 5638,
    columns: {
      id: 'id', inspection_date: 'inspection_date', shift: 'shift',
      employee_id: 'employee_id', employee_name: 'employee_name',
      building: 'building', guard_post: 'guard_post', scanner_brand: 'scanner_brand',
      zone1_status: 'zone1_status', zone2_status: 'zone2_status',
      zone3_status: 'zone3_status', zone4_status: 'zone4_status',
      zone5_status: 'zone5_status', zone6_status: 'zone6_status',
      submitted_by_id: 'submitted_by_id', created_at: 'created_at',
      updated_by: 'updated_by', updated_at: 'updated_at',
    },
  },
  {
    source: 'nvr_recording_reports',
    target: 'nvr_recording_reports',
    expected: 1176,
    columns: {
      id: 'id', building: 'building', submission_id: 'submission_id',
      submitted_by_id: 'submitted_by_id', report_time: 'report_time',
    },
  },
  {
    source: 'nvr_recording_details',
    target: 'nvr_recording_details',
    expected: 5569,
    columns: {
      id: 'id', report_id: 'report_id', nvr_name: 'nvr_name',
      recording_days: 'recording_days', target_days: 'target_days',
      created_at: 'created_at',
    },
  },
  {
    source: 'nvr_status_reports',
    target: 'nvr_status_reports',
    expected: 1,
    columns: {
      id: 'id', report_time: 'report_time', total_channels: 'total_channels',
      online_channels: 'online_channels', offline_channels: 'offline_channels',
      online_percentage: 'online_percentage',
    },
  },
  {
    source: 'nvr_status_report_details',
    target: 'nvr_status_report_details',
    expected: 6,
    columns: {
      id: 'id', report_id: 'report_id', nvr_id: 'nvr_id',
      online_channels: 'online_channels',
    },
  },
  {
    source: 'cctv_report_details',
    target: 'cctv_report_details',
    expected: 377,
    columns: {
      id: 'id', report_id: 'report_id', nvr_name: 'nvr_name',
      online_channels: 'online_channels', total_channels: 'total_channels',
      channel_statuses_json: 'channel_statuses_json',
    },
  },

  // ─── BLOCKED: normalized CCTV targets ───────────────────────────────────
  // These six need decisions before they can run. Each either requires a
  // lookup table that is not seeded yet, or drops legacy columns that have no
  // home in the new schema. Total ~2,612 rows. See docs/legacy-migration-mapping.md.
  {
    source: 'cctv_camera_names', target: 'cameras', expected: 815,
    blocked: 'Camera.buildingId is an FK to buildings, which is not seeded. ' +
             'Legacy stores a building name string. Needs a building seed + name->id map. ' +
             'Legacy nvr_name has no target column.',
  },
  {
    source: 'cctv_devices', target: 'nvr_devices', expected: 19,
    blocked: 'Same buildings FK problem. Legacy area, drive_capacity, ' +
             'total_capacity_tb and target_days have no target columns ' +
             '(target_days is the 62-day retention rule) — confirm the loss.',
  },
  {
    source: 'nvr_devices', target: 'nvr_devices', expected: 6,
    blocked: 'Shares the nvr_devices target with cctv_devices (19 rows) and ' +
             'legacy ids collide. Needs a de-duplication rule.',
  },
  {
    source: 'cctv_angle_checks', target: 'camera_checks', expected: 1014,
    blocked: 'CameraCheck.cameraId is an FK to cameras; legacy identifies a ' +
             'camera by (building, nvr_number, camera_number). Depends on ' +
             'cctv_camera_names landing first.',
  },
  {
    source: 'cctv_inspections', target: 'cctv_inspections', expected: 678,
    blocked: 'Needs the pass/fail rollup over 7 legacy status columns ' +
             '(radio, report_books, nvr_screen, nvr_machine, keys, ' +
             'access_control, incident_report) into total_checked/passed/failed. ' +
             'Legacy cctv_room, shift and employee_id have no target columns.',
  },
  {
    source: 'cctv_reports', target: 'cctv_reports', expected: 80,
    blocked: 'Target expects report_date + reporter_name; legacy has report_time ' +
             'and submitted_by_id only (needs a users lookup). Legacy building, ' +
             'total_channels and online_percentage have no target columns.',
  },
];
