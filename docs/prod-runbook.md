# Production Runbook — WDBPI

## 1. Secrets (ครั้งแรก + ทุกครั้งที่ rotate)
- ห้ามใช้ค่า default เดิม (`wdbpi_super_secret...`, `wdbpi_pass`) — compose จะล้มดังๆ ถ้าไม่ตั้ง
- สร้างค่าใหม่: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- ต้องตั้งใน prod `.env`: `JWT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
  `DATABASE_URL`, `REDIS_URL` (แบบมี password: `redis://:${REDIS_PASSWORD}@redis:6379`),
  `REDIS_PASSWORD`, `POSTGRES_PASSWORD`, `CORS_ORIGIN`, `DOMAIN`
- หมายเหตุ: secret ชุดเก่าหลุดอยู่ใน git history แล้ว — ถ้า prod เคยใช้ค่า default
  ให้ rotate ทันที และพิจารณา rewrite history / เปลี่ยนทุก credential ที่เกี่ยวข้อง

## 2. Deploy ครั้งแรก (prod host)
```sh
cp .env.example .env   # แล้วกรอกค่าจริงทั้งหมด
docker compose -f docker-compose.prod.yml build
./scripts/migrate-prod.sh            # migrate deploy + seed roles
docker compose -f docker-compose.prod.yml up -d
curl -f http://localhost:4000/api/health/ready
```
- สร้าง admin คนแรกแบบ manual (ห้าม seed default password ใน prod):
```sql
-- hash รหัสด้วย scripts/make-uat-hashes.js แล้วแทน __HASH__
INSERT INTO users (username, password, full_name, role_id, is_active)
VALUES ('admin', '__HASH__', 'ผู้ดูแลระบบ', 1, true);
```

## 3. HTTPS / DOMAIN
- `DOMAIN` ต้องชี้ DNS มาที่ host ก่อน
- ครั้งแรก nginx จะบูตแบบ HTTP-only แล้ว log คำสั่ง certbot ให้:
```sh
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot -d $DOMAIN --agree-tos -m admin@$DOMAIN
docker compose -f docker-compose.prod.yml restart nginx
```
- ต่ออายุอัตโนมัติผ่าน service `certbot` (renew ทุก 12 ชม.)

## 4. Backup / Restore
- prod มี service `backup` รัน `scripts/backup-postgres.sh` ทุก 24 ชม. ลง volume `pg_backups`
  + WAL archive อยู่ที่ `/var/lib/postgresql/archive/` บน volume postgres — **ต้องก็อปทั้ง 2 ที่ออกนอกเครื่อง** (S3/rsync)
- สำรองแบบ manual: `BACKUP_DIR=/var/backups/wdbpi ./scripts/backup-postgres.sh`
- ทดสอบ restore อย่างน้อย 1 ครั้งก่อน go-live: `./scripts/restore-postgres.sh <file>`
  ลง DB ว่าง แล้ว smoke test `/api/health/ready` (ผ่าน drill แล้วบน dev: dump → restore → counts ตรง)
- หมายเหตุ seed: รัน `psql` กับไฟล์ SQL ภาษาไทยต้องตั้ง `PGCLIENTENCODING=UTF8`
  มิฉะนั้น varchar จะนับ byte แล้ว seed ล้ม (`value too long` ปลอม)

## 5. Deploy ครั้งถัดไป / Rollback
```sh
git pull && docker compose -f docker-compose.prod.yml build
./scripts/migrate-prod.sh            # additive เท่านั้น ห้าม destructive โดยไม่ backup
docker compose -f docker-compose.prod.yml up -d
curl -f http://localhost:4000/api/health/ready   # ไม่ผ่าน = หยุด
```
- Rollback: `git checkout <tag เก่า> && build && up -d` (+ restore backup ถ้า migration
  ทำลาย schema — ตรวจ SQL ใน `prisma/migrations` ก่อนเสมอ)

## 6. Monitoring ขั้นต่ำ (ยังไม่มี stack)
- ตรวจ `GET /api/health/ready` ทุก 1-5 นาที (200 = ปกติ, 503 = DB/redis มีปัญหา)
- เฝ้า disk (backup + `tmp/uploads` โตไม่จำกัด) และ memory ของ api (limit 512M)
