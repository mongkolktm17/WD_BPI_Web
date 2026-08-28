# Docker System Optimization & PHP Functionality Comparison Report

## Date: 2026-07-28

---

## Part 1: PHP Legacy vs Docker Functionality Comparison

### Legacy PHP Routes Mapped to Docker API Endpoints

| Legacy PHP Page | Docker API Endpoint | Status |
|---|---|---|
| `login.php` | `POST /api/auth/login` | ✅ Complete |
| `logout.php` | `POST /api/auth/logout` | ✅ Complete |
| `check_session.php` | JWT auth middleware | ✅ Functional equivalent |
| `check_permissions.php` | PermissionGuard | ✅ Functional equivalent |
| `dashboard.php` | `GET /api/stats` + `GET /api/stats/dashboard` | ✅ Complete |
| `cctv_report.php` | `GET/POST /api/cctv/reports` | ✅ Complete |
| `cctv_angle_check.php` | `GET /api/cctv/image-map` | ✅ Complete |
| `cctv_inspection_form.php` | `GET/POST/PUT/DELETE /api/cctv/inspections` | ✅ Complete |
| `car_parking.php` | `GET/POST/PUT/DELETE /api/parking` | ✅ Complete |
| `guard_duty_log.php` | `GET/POST/PUT/DELETE /api/guards/duty-logs` | ✅ Complete |
| `check_hand_held.php` | `GET /api/metal-detector/handheld-checks` | ✅ Complete |
| `walkthrough_metal_detector.php` | `GET /api/metal-detector/walkthrough-checks` | ✅ Complete |
| `nvr_recording_days.php` | `GET/POST/PUT/DELETE /api/cctv/nvr-recordings` | ✅ Complete |
| `check_list_patrol.php` | `GET/POST/PUT/DELETE /api/patrol` | ✅ Complete |
| `check_list_patrol_new.php` | `GET/POST/PUT/DELETE /api/patrol` | ✅ Complete |
| `manage_officers.php` | `GET/POST/PUT/DELETE /api/officers` | ✅ Complete |
| `edit_officer.php` | `PUT /api/officers/{id}` | ✅ Complete |
| `manage_roles.php` | `GET/POST/PUT/DELETE /api/roles` | ✅ Complete |
| `edit_role.php` | `PUT /api/roles/{id}` | ✅ Complete |
| `report.php` | `GET/POST/PUT/DELETE /api/reports` | ✅ Complete |
| `view_report.php` | `GET /api/reports/{id}` | ✅ Complete |
| `edit_report.php` | `PUT /api/reports/{id}` | ✅ Complete |
| `delete_report.php` | `DELETE /api/reports/{id}` | ✅ Complete |
| `report_page.php` | `GET /api/reports` (with filters) | ✅ Complete |
| `report_visual.php` | `GET /api/reports/visual` | ✅ Complete |
| `report_building.php` | `GET/POST/PUT/DELETE /api/reports/building-reports` | ✅ Complete |
| `get_camera_status.php` | `GET /api/cctv/cameras` + camera-checks | ✅ Complete |
| `get_handheld_status.php` | `GET /api/metal-detector/handheld/status` | ✅ Complete |
| `get_hand_held_detector_status.php` | `GET /api/metal-detector/walkthrough/status` | ✅ Complete |
| `get_nvr_status.php` | `GET /api/cctv/nvr-devices` | ✅ Complete |
| `get_nvr_recording_status.php` | `GET /api/cctv/nvr-recordings/status` | ✅ Complete |
| `get_nvr_recording_data.php` | `GET /api/cctv/nvr-recordings` (with filters) | ✅ Complete |
| `get_parking_status.php` | `GET /api/parking/status/summary` | ✅ Complete |
| `get_security_status.php` | `GET /api/guards/status` | ✅ Complete |
| `get_stats_data.php` | `GET /api/stats` | ✅ Complete |
| `get_staff_list.php` | `GET /api/officers` | ✅ Complete |
| `get_users_autocomplete.php` | `GET /api/users/autocomplete/search` | ✅ Complete |
| `import_officers.php` | `POST /api/officers` (import) | ✅ Complete |
| `export_users_csv.php` | `GET /api/users/export/csv` | ✅ Complete |
| `edit_guard_count.php` | `GET/POST/PUT/DELETE /api/guards/counts` | ✅ Complete |
| `edit_metal_detector.php` | `GET/POST/PUT/DELETE /api/metal-detector` | ✅ Complete |
| `edit_patrol.php` | `GET/POST/PUT/DELETE /api/patrol` | ✅ Complete |
| `save_cctv_report.php` | `POST /api/cctv/reports` | ✅ Complete |
| `access_denied.php` | HTTP 403 from guards | ✅ Handled |

### Previously Missing API Endpoints (Now Added)

| Legacy PHP Page | New Docker API Endpoint | Action Taken |
|---|---|---|
| `get_server_time.php` | `GET /api/system/server-time` | ✅ **Added** in `system.controller.ts` |
| `update_profile.php` | `PUT /api/system/profile` | ✅ **Added** in `system.controller.ts` |
| `get_schema.php` | `GET /api/system/schema` | ✅ **Added** in `system.controller.ts` |

### No Direct API Equivalent Needed

| Legacy PHP Page | Reason |
|---|---|
| `select_building.php` | Covered by `GET /api/cctv/buildings` |
| `save_angle_check.php` | Covered by `POST /api/cctv/camera-checks` |
| `reset.php` | Admin-only debug tool, not needed in API |
| `performance_config.php` | Server-level config, not application API |
| `test_stats.php` / `test_stats_v2.php` | Debug/test pages |
| `compare_parking.php` | Standalone comparison page |
| `edit_car_parking.php` | Covered by `PUT /api/parking/{id}` |
| `edit_cctv_angle.php` | Covered by `POST /api/cctv/camera-checks` |
| `edit_cctv_inspection.php` | Covered by `PUT /api/cctv/inspections/{id}` |

---

## Part 2: Docker Optimization Changes

### Files Created

| File | Purpose |
|---|---|
| `.dockerignore` | Root-level ignore for build artifacts, legacy code, and sensitive data |
| `apps/api/.dockerignore` | API-specific ignore for tests, coverage, and build outputs |
| `apps/web/.dockerignore` | Web-specific ignore for build outputs and config |
| `apps\api\src\system\system.controller.ts` | New controller for missing legacy PHP endpoints |
| `apps\api\src\system\system.module.ts` | Module registration for system controller |

### Files Modified

| File | Changes |
|---|---|
| `docker-compose.yml` | Added nginx, web, api as separate services (replacing single app+supervisord); added healthchecks, resource limits, proper env vars, report_assets volume |
| `docker-compose.prod.yml` | Fixed `target: production`, added `API_INTERNAL_URL`, added `report_assets` volume, fixed `DATABASE_URL`/`REDIS_URL` env var patterns, added `POSTGRES_PASSWORD` to web container |
| `docker-compose.staging.yml` | Fixed `target: production`, added `API_INTERNAL_URL`, fixed healthcheck for redis (uses `-a` flag with password), added `start_period` to postgres healthcheck, added `report_assets` volume |
| `docker-compose.dev.yml` | Added `API_INTERNAL_URL=http://api:4000` for inter-container communication |
| `docker\app.Dockerfile` | Switched from `npm i` to `npm ci` for reproducible builds, added `curl`, added healthcheck, added `STOPSIGNAL SIGTERM`, optimized layer caching |
| `docker\api.Dockerfile` | Added `development` target, switched to `npm ci`, added `production` target (renamed from `runner`), added non-root user (`appuser`), added healthcheck, added `STOPSIGNAL SIGTERM`, optimized layer caching |
| `docker\web.Dockerfile` | Added `development` target, switched to `npm ci`, added `production` target (renamed from `runner`), added non-root user (`appuser`), added healthcheck, added `STOPSIGNAL SIGTERM`, optimized layer caching |
| `docker\supervisord.conf` | Replaced hardcoded credentials with environment variable references (`${DATABASE_URL}`, `${REDIS_URL}`, `${JWT_SECRET}`) |
| `docker\nginx\nginx.conf` | Increased worker_connections to 4096, added `use epoll` and `multi_accept`, added gzip_vary, increased gzip_min_length to 256, added font mime types, added client body size limits, added proxy buffering config, added security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy), changed error_log level from `notice` to `warn` |
| `docker\nginx\conf.d\default.conf` | Added upstream blocks for web and api, added rate limiting zones, added SSL redirect structure, added caching for `/_next/static/`, added proxy timeout settings, added WebSocket support, improved security headers |
| `docker\nginx\conf.d\app.conf` | Added proxy timeout settings, optimized for combined container |
| `docker\postgres\postgresql.conf` | Optimized for containerized environment: reduced max_connections to 100, reduced shared_buffers to 128MB, reduced effective_cache_size to 384MB, reduced maintenance_work_mem to 64MB, reduced work_mem to 8MB, added wal_level=replica, added hot_standby, added autovacuum tuning, reduced min_wal_size to 512MB, reduced max_parallel_workers to 4 |
| `docker\redis\redis.conf` | Added lazyfree-lazy-eviction, added lazyfree-lazy-server-del, added hz 10, added client-output-buffer-limit, added maxclients 10000 |
| `apps\web\next.config.ts` | Changed API_INTERNAL_URL default from `http://127.0.0.1:4000` to `http://api:4000` for Docker network resolution |
| `apps\api\src\app.module.ts` | Added `SystemModule` import |
| `.env.example` | Added `API_INTERNAL_URL` environment variable |
| `docker\nginx\conf.d\prod.conf.example` | Renamed to `prod.conf` (was missing, referenced by compose files) |

### Key Performance Optimizations

1. **Build Cache Optimization**: Changed `npm i` to `npm ci` in all Dockerfiles for reproducible, faster builds with better caching
2. **Layer Caching**: Reordered COPY commands to maximize Docker layer cache hits - package.json copied before source code
3. **Non-Root User**: All production containers now run as `appuser` (UID 1000) instead of root for security
4. **Graceful Shutdown**: Added `STOPSIGNAL SIGTERM` to all containers for proper shutdown handling
5. **Healthchecks**: Added healthchecks to all services with appropriate intervals and start periods
6. **Resource Limits**: Added CPU and memory limits to all services in all compose profiles
7. **Nginx Tuning**: Increased worker_connections to 4096, added epoll, increased proxy buffers, added rate limiting
8. **PostgreSQL Tuning**: Reduced connection limits and memory buffers to fit containerized environments
9. **Redis Tuning**: Added lazy eviction, increased maxclients, tuned hz for container environments
10. **Gzip Compression**: Enhanced nginx gzip config with more mime types and `gzip_vary`
11. **Security Headers**: Added X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy to nginx
12. **Separated Services**: Root docker-compose.yml now uses separate web/api/nginx containers instead of single supervisord container (anti-pattern fix)

---

## Usage

### Development
```bash
docker compose -f docker-compose.dev.yml up --build
```

### Production
```bash
docker compose -f docker-compose.yml up --build
```

### Staging
```bash
docker compose -f docker-compose.staging.yml up --build
```

### Production (with SSL)
```bash
docker compose -f docker-compose.prod.yml up --build
```