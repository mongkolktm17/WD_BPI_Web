# UAT Setup — สภาพแวดล้อมทดสอบระบบใหม่ (Staging)

> ทำครั้งเดียวก่อนเริ่มตั๋ว UAT-01. ใช้ PowerShell ที่โฟลเดอร์ `C:\xampp\htdocs\wdbpi`
> ไม่แตะ `legacy/` และ DB จริง — ทุกอย่างรันบน container dev แยกต่างหาก

## 0. สิ่งที่ต้องมีก่อนเริ่ม

- Docker Desktop เปิดอยู่, Node.js >= 20
- พอร์ตว่าง: 3000 (web), 4000 (api), 5432 (postgres), 6379 (redis)

## 1. เปิดระบบ dev

```powershell
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml ps
```

ต้องเห็น `web / api / postgres / redis` สถานะ healthy (รอ 1-2 นาทีรอบแรก)

ตรวจ:
- หน้าเว็บ: http://localhost:3000
- API: http://localhost:4000/api/health → ต้องได้ JSON มี `status` และ `database`

## 2. Migrate + seed roles

```powershell
$env:DATABASE_URL="postgresql://wdbpi_user:wdbpi_pass@localhost:5432/wdbpi_db?schema=public"
npx prisma migrate deploy
docker exec -i wdbpi_postgres_dev psql -U wdbpi_user -d wdbpi_db -f - < prisma\seed-roles.sql
```

## 3. สร้างบัญชีเทส 3 บัญชี

ระบบไม่มีปุ่มสมัครสมาชิก บัญชีแรกต้องยิงตรง DB

**ขั้น 3.1 — สร้าง hash รหัสผ่าน** (รหัส: `admin123` / `officer123`):

```powershell
node scripts\make-uat-hashes.js
```

จะได้ `ADMIN_HASH=...` และ `OFFICER_HASH=...` ให้คัดลอกไปใส่ในไฟล์
`docs\uat\seed-uat-users.sql` แทน `__ADMIN_HASH__` / `__OFFICER_HASH__`

**ขั้น 3.2 — ยิง SQL:**

```powershell
docker exec -i wdbpi_postgres_dev psql -U wdbpi_user -d wdbpi_db -f - < docs\uat\seed-uat-users.sql
```

จะได้บัญชี:

| username | รหัสผ่าน | ชื่อ | role |
|---|---|---|---|
| `admin` | `admin123` | ผู้ดูแลระบบ | ผู้ดูแลระบบ (ทุกสิทธิ์อัตโนมัติ) |
| `100001` | `officer123` | สมชาย ใจดี | รปภ. (สิทธิ์ตาม seed) |
| `100002` | `officer123` | สมหญิง ใจงาม | รปภ. (สิทธิ์ตาม seed) |

## 4. ข้อมูลตั้งต้นขั้นต่ำ (ทำผ่าน UI หลัง login admin)

1. `/manage-officers` — เพิ่มเจ้าหน้าที่รหัส `100001`, `100002` (ให้ตรงบัญชี login ไว้เทส owner-check)
2. `/cctv-angle-check` — ตรวจว่า dropdown อาคารมี 2,3,4,6,9 (ถ้าว่าง = บั๊ก setup แจ้งมาได้เลย)

## 5. ไฟล์ตัวอย่างสำหรับเทส import

อยู่ใน `docs\uat\samples\`: `officers.csv`, `cameras.csv`, `users.csv`

## ล้างเริ่มใหม่ (ถ้าข้อมูลเละระหว่างเทส)

```powershell
docker compose -f docker-compose.dev.yml down -v   # ลบ DB dev ทิ้งทั้งหมด
# แล้วทำข้อ 1-4 ใหม่ตั้งแต่ต้น
```
