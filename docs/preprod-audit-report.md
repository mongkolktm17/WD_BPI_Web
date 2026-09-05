# Pre-Production Audit — ผลการตรวจสอบ + สิ่งที่ซ่อม (รอบ A+B+C)

วันที่: 2026-09-05 | สภาพแวดล้อม: dev compose (`docker-compose.dev.yml`) | legacy: ไม่แตะ

## รอบ A — ผลตรวจ (ยืนยันด้วยการรันจริงทุกข้อ)

| # | ประเด็น | ผล |
|---|---|---|
| A0 | dev compose เปิดไม่ขึ้น | เจอจริง: postgres:18 ปฏิเสธ mount `/var/lib/postgresql/data` + volume เก่าค้าง → ลบ volume เก่า + เปลี่ยน mount เป็น `/var/lib/postgresql` (dev compose) |
| A1 | public endpoints | ยืนยัน: `/api/docs` เปิด public (200), ที่เหลือ 401 ถูกต้อง (cctv 401 หลังใส่ guard) |
| A1 | params ผิดๆ | เจอจริง: `history?limit=abc` → 500 (`column "nan"`), `all-reports?page=-5` → fallback ผิดๆ (`OFFSET must not be negative`) |
| A1 | brute-force login 50 ครั้ง | ยืนยัน: ไม่มี rate-limit (50 ครั้งผ่านหมด) + login ผิดตอบ 500 ตอน DB ว่าง (ตารางไม่มี) |
| A2 | health ตอน DB down | ยืนยัน: ตอบ HTTP 200 ทั้งที่ `database:disconnected` (health หลอก) |
| A2 | migration chain | เจอจริง: `migrate deploy` ได้ DB ใช้ไม่ได้ — baseline ขาดคอลัมน์ (`users.phone/email`, `car_parkings.*` 11 คอลัมน์), `seed-roles.sql` เคยรันไม่ได้ |
| D1 | format รหัสผ่าน | seeded bcrypt `$2b$` login ได้ปกติ; เส้น legacy dump ยังไม่ได้เทส (ไม่มี dump ใน env นี้) |

## รอบ B — สิ่งที่ซ่อมแล้ว (verify รันจริงทุกข้อ)

| # | งาน | ไฟล์หลัก | ผลตรวจซ้ำ |
|---|---|---|---|
| B1 | ล้าง default secrets + fail-fast + rotate `.env` | `auth.module.ts`, `jwt.strategy.ts`, `docker-compose.yml`, `.env` | compose เรียก secret ที่ไม่ตั้งแล้วล้มดังๆ; token เก่าใช้ไม่ได้หลัง rotate |
| B2 | helmet + global ThrottlerGuard + login 10/15นาที + ปิด Swagger prod + trust proxy + ซ่อน X-Powered-By | `main.ts`, `app.module.ts`, `auth.controller.ts` | มี CSP, ไม่มี X-Powered-By; login เกิน 10/15นาที → 429; `/api/docs` มีเฉพาะ non-prod |
| B3 | health 503 + `/live`/`/ready` + เช็ค redis | `health.controller.ts`, `redis.service.ts` | DB down → `/health`+`/ready` 503, `/live` 200 |
| B4 | AdminGuard (migration ทั้งหมด + `system/schema`) + upload จำกัด 100MB/นามสกุล + lock `customFilePath` ใน tmp/uploads/legacy-Backup | `admin.guard.ts`, `migration.controller.ts`, `system.controller.ts`, `migration.service.ts` | officer → 403 ทุกเส้น; `.exe` → 400; `/etc/passwd` → 400 |
| B5 | JWT เช็ค `isActive` ทุก request + ถอน `next-auth`/`@auth/core` | `jwt.strategy.ts`, `auth.module.ts`, `web/package.json` | disable user → token เดิม 401 ทันที |
| B6 | prod volume path + `prod.conf` แยก template `${DOMAIN}` (https/bootstrap) + entrypoint เลือก config ตาม cert | `docker-compose.prod.yml/.staging.yml`, `docker/nginx/templates/*`, `entrypoint.sh` | `compose config` ผ่าน; render แล้ว server_name/cert ครบ |
| B7 | `prisma/seed.ts` + `migrate-prod.sh` + backup/restore scripts + `prod-runbook.md` + CI ใช้ `migrate deploy` | `prisma/seed.ts`, `scripts/*`, `deploy.yml` | migration ใหม่ 2 ตัว (`add_missing_parking_user_columns`, `widen_role_name_thai`) สร้าง+apply ผ่าน |
| เสริม | `counts/latest` สลับลำดับ route; clamp page/limit (reports+parking) | `guards.controller.ts`, `reports.*`, `parking.controller.ts` | ค่าผิดๆ → 200 ปกติ ไม่มี error ใน log |

## หมายเหตุสำคัญ
1. **secret เก่าหลุดใน git history** (`.env` ถูก commit พร้อม default) — rotate แล้วใน working copy แต่ต้อง rewrite history / เปลี่ยน credential ที่เกี่ยวข้องแยก
2. **`prisma/seed-roles.sql` ต้องรันด้วย `PGCLIENTENCODING=UTF8`** (psql นับ byte ทำให้ชื่อไทยยาวเกิน) — ใส่ไว้ใน runbook แล้ว
3. **dev container ไม่ hot-reload** (`nest start --watch` ไม่ rebuild) — ทุกครั้งที่แก้ API ต้อง `restart api` หรือ `up -d --build api`
4. **ยังไม่ทำ (รอรอบถัดไป):** WAL/PITR + S3 offsite, log aggregation/monitoring stack, PermissionGuard ทุก module, `deletedBy/At`, เกณฑ์กราฟ UAT-13, restore drill จริง, rewrite git history
