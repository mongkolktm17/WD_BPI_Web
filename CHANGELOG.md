# Changelog

All notable changes to the **WD BPI Security System** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-08-28

### 🌟 Added
- **Flexible Guard Shift Logging**:
  - Added support for recording Morning Shift (`07:00–19:00`) only, Night Shift (`19:00–07:00`) only, or Both shifts simultaneously.
  - Interactive shift toggle selector (`[☀️ Morning]`, `[🌙 Night]`, `[☀️🌙 Both]`) in both Next.js frontend and Legacy PHP UI.
  - Automatic shift pre-selection based on real-time clock (07:00-19:00 selects Day, 19:00-07:00 selects Night).
- **Default Prefilled Counts**:
  - Automatically loads the latest Actual count and Contract count as initial values in the duty log form.
- **Carry-Forward Intelligence**:
  - If a shift is not entered, the system automatically carries forward the last reported headcount without overriding that shift's original timestamp.
- **Shift-Specific Dashboard Last-Update Timestamps**:
  - Separate relative and localized timestamps (`🕒 รายงานล่าสุด: วันนี้ 07:30 น. (15 นาทีที่แล้ว)`) on Day Shift and Night Shift cards on both Modern and Legacy dashboards.

### ⚡ Changed
- Updated NestJS `guards.service.ts` and `stats.service.ts` to independently query and track morning/evening metrics and 7-day sparkline history with carry-forward support.
- Synchronized Legacy PHP API `get_security_status.php` and `guard_duty_log.php` to match the enhanced multi-shift specification.

---

## [2.0.0] - 2026-08-15

### 🚀 Added
- **Modern Fullstack Monorepo Architecture**:
  - **Frontend (`apps/web`)**: Next.js 16 + React 19 + TailwindCSS v4 + Recharts + Lucide Icons.
  - **Backend (`apps/api`)**: NestJS 11 + Prisma ORM + PostgreSQL + Redis caching + JWT Auth + Swagger.
  - **Monorepo Tooling**: Turborepo for fast, cached parallel builds.
- **Real-Time Security Dashboard**:
  - Real-time KPIs: Security Personnel, Parking Occupancy, CCTV Online Status, Walkthrough & Handheld Detectors, NVR 62-day Retention.
- **Containerization**:
  - Production-ready multi-stage Dockerfiles (`web.Dockerfile`, `api.Dockerfile`, `app.Dockerfile`) with Nginx reverse proxy and docker-compose configurations.

---

## [1.2.0] - 2026-06-09

### 📊 Added
- **CSV Export Feature**: Added "ส่งออกเป็น CSV" button across historical tables (`car_parking.php`, `nvr_recording_days.php`, `cctv_report.php`, `guard_duty_log.php`, `report_page.php`).
- **UTF-8 BOM Header Support**: Embedded `\uFEFF` in CSV exports to ensure clean Thai character rendering in Microsoft Excel.
- **Resilient Fallback**: Offline/Mock database fallback in `config.php` to prevent crashes during local database downtime.

### 🎨 Changed
- **Single-Screen Wide Layout**: Compacted history views into high-density, responsive tables fitting 100% viewport width without horizontal scrollbars.
- **Server-Side Render**: Converted CCTV and Guard Duty history components to PHP server-side tables for better reliability.

---

## [1.0.0] - 2026-01-29

### 🎉 Initial Release
- Initial release of the PHP & MySQL WD BPI Security Monitoring System.
