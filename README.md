<div align="center">

# 🛡️ WD BPI Security Management System
### Next-Gen Security & Facility Operations Platform

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg?style=for-the-badge&logo=semver)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.0-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?style=for-the-badge&logo=php&logoColor=white)](legacy/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](docker-compose.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<p align="center">
  ระบบบริหารจัดการและติดตามความปลอดภัยแบบเรียลไทม์ (Real-Time Security & Facility Operations Management System)<br>
  สำหรับ <strong>Western Digital Storage Technologies (Thailand) Ltd. - BPI Site</strong>
</p>

[✨ คุณสมบัติหลัก](#-คุณสมบัติหลัก-key-features) •
[🏛️ สถาปัตยกรรมระบบ](#️-สถาปัตยกรรมระบบ-architecture) •
[🚀 การติดตั้งและใช้งาน](#-การเริ่มต้นใช้งาน-getting-started) •
[🐳 Docker](#-การรันด้วย-docker) •
[📝 ประวัติการอัปเดต](#-ประวัติการอัปเดต-changelog)

---

</div>

## 🌟 คุณสมบัติหลัก (Key Features)

- 👮 **Smart Guard Duty Log (บันทึกเวร รปภ.)**:
  - บันทึกแยกกะได้อย่างอิสระ: เลือกบันทึก **กะเช้า (07:00–19:00)** หรือ **กะดึก (19:00–07:00)** หรือ **ทั้งสองกะ**
  - ระบบ Auto-Prefill ดึงค่ายอดล่าสุดมาเป็นค่าเริ่มต้น ช่วยให้กรอกข้อมูลได้อย่างรวดเร็ว
  - ระบบ Carry-Forward คงค่าเดิมอัตโนมัติหากไม่ได้กรอก พร้อมระบุเวลาที่รายงานเข้ามาล่าสุดของแต่ละกะ
- 🅿️ **Real-Time Parking Lot Monitoring**:
  - ติดตามความหนาแน่นและที่จอดรถยนต์ (Car Lots) และรถจักรยานยนต์ (Motorcycle Lots) แยกตามอาคาร/โซน
- 📹 **NVR 62-Day Compliance & CCTV Online Status**:
  - ตรวจสอบความพร้อมของระบบบันทึกภาพย้อนหลัง 62 วันตามมาตรฐานความปลอดภัย และสถานะกล้องออนไลน์แบบเรียลไทม์
- 🔍 **Metal Detector Health Checks**:
  - บันทึกและวิเคราะห์ผลการทดสอบเครื่องตรวจจับโลหะแบบเดินผ่าน (Walkthrough) และแบบมือถือ (Handheld)
- 📊 **Visual Analytics & Sparklines**:
  - กราฟแนวโน้มย้อนหลัง 7 วัน พร้อมตัวบ่งชี้ทิศทางข้อมูล (Trends) และการส่งออกรายงานเป็น CSV รองรับภาษาไทย (UTF-8 BOM)

---

## 🏛️ สถาปัตยกรรมระบบ (Architecture)

โครงการถูกออกแบบในรูปแบบ **Modern Monorepo** พร้อมระบบ **Legacy PHP Support** เพื่อการทำงานที่ต่อเนื่อง:

```text
wdbpi/
├── apps/
│   ├── web/               # Next.js 16 (App Router) + React 19 + Tailwind CSS
│   └── api/               # NestJS 11 + Prisma ORM 7 + PostgreSQL + Redis
├── legacy/                # PHP 8.2 + MySQL (Original Core System)
│   ├── dashboard.php      # Legacy Dashboard View
│   ├── guard_duty_log.php # Enhanced Shift Guard Duty Log
│   └── get_security_status.php
├── docker/                # Multi-stage Dockerfiles & Nginx Reverse Proxy Configs
├── prisma/                # Prisma Schema & Database Migrations
└── docker-compose.yml     # Unified Multi-container Orchestration
```

---

## 🚀 การเริ่มต้นใช้งาน (Getting Started)

### 1. ความต้องการของระบบ (Prerequisites)
- **Node.js**: `>= 20.0.0`
- **npm** หรือ **pnpm**
- **PHP**: `>= 8.1` (สำหรับ Legacy System)
- **PostgreSQL**: `>= 16`
- **Docker & Docker Compose** (แนะนำสำหรับ Production/Containerized)

### 2. การติดตั้งแบบ Monorepo (Next.js + NestJS)

```bash
# โคลนโปรเจกต์
git clone https://github.com/PCS-IOT/WD_BPI_Web.git
cd WD_BPI_Web

# ติดตั้ง Dependencies ทั้งหมดผ่าน Turborepo
npm install

# กำหนดค่าตัวแปรสภาพแวดล้อม
cp .env.example .env

# รันโหมด Development (รันพร้อมกันทั้ง Web & API)
npm run dev
```

- 🌐 **Web Frontend**: `http://localhost:3000`
- ⚙️ **NestJS API**: `http://localhost:3001/api`
- 📚 **Swagger Docs**: `http://localhost:3001/api/docs`

---

## 🐳 การรันด้วย Docker (Unified Stack)

สามารถเปิดใช้งานทั้งระบบ (Next.js, NestJS, Legacy PHP, Nginx, PostgreSQL, Redis) ด้วยคำสั่งเดียว:

```bash
# สั่ง Build และรันคอนเทนเนอร์ทั้งหมด
docker compose up -d --build
```

---

## 📝 ประวัติการอัปเดต (Changelog)

ดูรายละเอียดการอัปเดตและประวัติเวอร์ชันทั้งหมดได้ที่ [CHANGELOG.md](CHANGELOG.md)

---

## 📄 ใบอนุญาต (License)

This project is licensed under the [MIT License](LICENSE).

<div align="center">
  <sub>Developed & Maintained for <strong>Western Digital BPI Site</strong></sub>
</div>
