# 🚀 Performance Optimization - Quick Start Guide

## ไฟล์ที่สร้างขึ้นสำหรับปรับปรุงประสิทธิภาพ

### 1. **PERFORMANCE_AUDIT.md**
   - รายงานการตรวจสอบประสิทธิภาพแบบละเอียด
   - แนวทางการแก้ไขปัญหา
   - แผนการปรับปรุงแบบ 3 phases

### 2. **.htaccess**
   - เปิดใช้งาน GZIP compression
   - ตั้งค่า browser caching
   - เพิ่ม security headers
   - **ใช้งานอัตโนมัติ** - ไม่ต้องทำอะไร

### 3. **optimize_database.php**
   - สร้าง database indexes
   - Optimize และ analyze tables
   - **ต้องรันครั้งเดียว**

### 4. **performance_config.php**
   - Output buffering & compression
   - Session timeout management
   - Caching functions
   - Helper functions

### 5. **cleanup_files.php**
   - ตรวจสอบไฟล์ debug/test
   - ย้ายไฟล์ไปโฟลเดอร์ dev/
   - ทำความสะอาดโปรเจค

---

## 📋 วิธีใช้งาน (Step-by-Step)

### Step 1: รัน Database Optimization (ครั้งเดียว)

```bash
# เปิดใน browser
http://localhost/wdbpi/optimize_database.php
```

**สิ่งที่จะเกิดขึ้น:**
- สร้าง indexes สำหรับตารางต่างๆ
- Optimize tables
- Analyze tables
- แสดงผลลัพธ์แบบละเอียด

**⚠️ คำเตือน:**
- Backup ฐานข้อมูลก่อนรัน
- ใช้เวลาประมาณ 1-2 นาที (ขึ้นอยู่กับขนาดข้อมูล)
- รันครั้งเดียวเท่านั้น

---

### Step 2: ทำความสะอาดไฟล์ (Optional)

```bash
# 1. ดูรายการไฟล์ที่จะย้าย
http://localhost/wdbpi/cleanup_files.php

# 2. ย้ายไฟล์ไปโฟลเดอร์ dev/
http://localhost/wdbpi/cleanup_files.php?action=move
```

**สิ่งที่จะเกิดขึ้น:**
- ย้ายไฟล์ check_*.php, debug_*.php, test_*.php ไปโฟลเดอร์ dev/
- ลดความยุ่งเหยิงในโฟลเดอร์หลัก

---

### Step 3: เพิ่ม Performance Config ในไฟล์ที่ต้องการ

เพิ่มบรรทัดนี้ในไฟล์ PHP ที่ต้องการเพิ่มประสิทธิภาพ:

```php
<?php
require_once 'config.php';
require_once 'performance_config.php'; // เพิ่มบรรทัดนี้
```

**ไฟล์ที่แนะนำให้เพิ่ม:**
- ✅ dashboard.php
- ✅ report_page.php
- ✅ get_*.php (API endpoints)

---

### Step 4: ใช้ Caching (สำหรับ Advanced Users)

**ตัวอย่างการใช้ cache ใน dashboard.php:**

```php
// แทนที่:
$security_status = get_security_personnel_status($conn);

// ด้วย:
$cache_key = 'security_status_' . date('Y-m-d-H');
$security_status = cache_get($cache_key);
if ($security_status === false) {
    $security_status = get_security_personnel_status($conn);
    cache_set($cache_key, $security_status, 300); // Cache 5 นาที
}
```

---

## 📊 ผลลัพธ์ที่คาดหวัง

### ก่อนปรับปรุง:
- ⏱️ Page Load Time: ~3-5 วินาที
- 🗄️ Database Queries: ~15-20 queries/page
- 📦 File Size: 144 KB (dashboard.php)

### หลังปรับปรุง:
- ✨ Page Load Time: ~1-2 วินาที (ลด 50-60%)
- ✨ Database Queries: ~5-8 queries/page (ลด 60%)
- ✨ File Size: ไม่เปลี่ยน แต่ load เร็วขึ้นจาก compression
- ✨ Server Response Time: ลด 40-50%

---

## 🔍 การตรวจสอบผลลัพธ์

### 1. ตรวจสอบ GZIP Compression

```bash
# ใช้ curl
curl -H "Accept-Encoding: gzip" -I http://localhost/wdbpi/dashboard.php

# ดูที่ header: Content-Encoding: gzip
```

### 2. ตรวจสอบ Browser Caching

```bash
# เปิด Developer Tools (F12)
# ไปที่ Network tab
# Reload หน้า (Ctrl+R)
# ดูที่ column "Size" ควรเห็น "(from disk cache)" หรือ "(from memory cache)"
```

### 3. ตรวจสอบ Database Indexes

```sql
-- ใน phpMyAdmin หรือ MySQL client
SHOW INDEX FROM users;
SHOW INDEX FROM cctv_reports;
```

### 4. ตรวจสอบ Query Performance

```sql
-- เพิ่ม EXPLAIN ข้างหน้า query
EXPLAIN SELECT * FROM users WHERE username = 'admin';

-- ดูที่ column "key" ควรมีชื่อ index (ไม่ใช่ NULL)
```

---

## 🛠️ Troubleshooting

### ปัญหา: .htaccess ไม่ทำงาน

**สาเหตุ:** mod_rewrite, mod_deflate, mod_expires ไม่ได้เปิดใช้งาน

**วิธีแก้:**
1. เปิดไฟล์ `C:\xampp\apache\conf\httpd.conf`
2. ค้นหาและเอา # ออกจากบรรทัดเหล่านี้:
   ```
   LoadModule deflate_module modules/mod_deflate.so
   LoadModule expires_module modules/mod_expires.so
   LoadModule headers_module modules/mod_headers.so
   ```
3. Restart Apache

---

### ปัญหา: APCu cache ไม่ทำงาน

**สาเหตุ:** APCu extension ไม่ได้ติดตั้ง

**วิธีแก้:**
1. เปิดไฟล์ `C:\xampp\php\php.ini`
2. เพิ่มบรรทัด:
   ```
   extension=apcu
   ```
3. Restart Apache

**หรือ:** ใช้ file-based caching แทน (ช้ากว่าแต่ใช้ได้)

---

### ปัญหา: optimize_database.php ใช้เวลานาน

**สาเหตุ:** ฐานข้อมูลมีข้อมูลเยอะ

**วิธีแก้:**
- ปกติครับ รอให้เสร็จ
- ถ้าใช้เวลานานกว่า 10 นาที ให้เช็ค MySQL slow query log

---

## 📈 การ Monitor Performance

### ใช้ Performance Config Functions

เพิ่มที่ท้ายหน้า (ก่อน `</body>`):

```php
<?php if (!$is_production): ?>
<!-- Performance Stats -->
<div style="position: fixed; bottom: 10px; right: 10px; background: #000; color: #0f0; padding: 10px; font-family: monospace; font-size: 12px; border-radius: 5px; z-index: 9999;">
    ⏱️ <?php echo number_format(get_execution_time(), 4); ?>s<br>
    🧠 <?php echo get_memory_usage(); ?><br>
    📊 <?php echo get_memory_usage(true); ?> (peak)
</div>
<?php endif; ?>
```

---

## 🎯 Next Steps

### Phase 2 (ถ้าต้องการปรับปรุงเพิ่ม):
1. ⏳ Optimize specific slow queries
2. ⏳ เพิ่ม pagination สำหรับ API
3. ⏳ เพิ่ม CSRF protection
4. ⏳ Refactor dashboard.php

### Phase 3 (Long Term):
1. 📋 Implement MVC architecture
2. 📋 Add automated testing
3. 📋 Add monitoring (New Relic, Datadog)
4. 📋 Add rate limiting

---

## 📞 Support

หากมีปัญหาหรือคำถาม:
1. อ่าน PERFORMANCE_AUDIT.md สำหรับรายละเอียดเพิ่มเติม
2. ตรวจสอบ PHP error log: `C:\xampp\php\logs\php_error_log`
3. ตรวจสอบ Apache error log: `C:\xampp\apache\logs\error.log`

---

**สร้างเมื่อ:** 2025-12-25  
**เวอร์ชัน:** 1.0  
**ผู้สร้าง:** Antigravity AI
