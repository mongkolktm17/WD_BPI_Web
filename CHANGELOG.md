# Changelog

All notable changes to this project will be documented in this file.

## [Released] - 2026-06-09

### Added
- **CSV Export Feature**: Added a "ส่งออกเป็น CSV" (Export to CSV) button to the historical tables across key report pages:
  - `car_parking.php`
  - `nvr_recording_days.php`
  - `cctv_report.php`
  - `guard_duty_log.php`
  - `report_page.php`
- **UTF-8 BOM Header**: Embedded `\uFEFF` byte order mark in all exported CSVs to prevent encoding issues when opening Thai text in Microsoft Excel.
- **Mock Database Fallback**: Added a lightweight, offline-resilient Mock mysqli fallback in `config.php` to prevent application crashes and page hangs if the local database connection fails.

### Changed
- **Single-Screen Wide Layout**: Revamped the history views from vertical cards to compact, responsive tables fitting on a single page width:
  - Shortened NVR names (e.g., `B2-N1`) on screen headers while retaining full descriptive tooltips.
  - Resolved horizontal scrolling issues across different display sizes.
- **Server-Side Render**: Ported CCTV and Guard Duty history components from client-side JS rendering to PHP server-side tables, resolving page state synchronization issues.
