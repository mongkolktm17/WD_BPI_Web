<div align="center">

# 🛡️ WD BPI Security Operations & Facility Management Platform
### Real-Time Security Monitoring, Facility KPIs & Operations Dashboard

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg?style=for-the-badge&logo=semver)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.0-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](docker-compose.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<p align="center">
  Enterprise-grade security personnel tracking, CCTV/NVR compliance, and facility management platform<br>
  built for <strong>Western Digital Storage Technologies (Thailand) Ltd. - Bang Pa-in (BPI) Site</strong>
</p>

[✨ Key Features](#-key-features) •
[🏛️ Architecture](#️-system-architecture) •
[🚀 Quick Start](#-getting-started) •
[🐳 Docker Deployment](#-docker-deployment) •
[📝 Changelog](#-changelog) •
[📄 License](#-license)

---

</div>

## 🌟 Key Features

### 👮 Intelligent Guard Duty Logging
- **Shift-Separated Recording**: Flexible entry options for **Day Shift (`07:00–19:00`)**, **Night Shift (`19:00–07:00`)**, or **Both shifts** simultaneously.
- **Smart Time Detection**: Automatically pre-selects the appropriate shift based on real-time clock.
- **Historical Prefill**: Automatically pre-populates previous Actual & Contract counts as initial defaults.
- **Carry-Forward Intelligence**: Retains the last known shift headcount without overwriting individual shift report timestamps.
- **Independent Timestamps**: Displays distinct "Last Reported" timestamps for Day and Night shifts on the dashboard.

### 🅿️ Real-Time Parking Lot Monitoring
- Live tracking of vehicle occupancy and availability across Car Lots (1,075 capacity) and Motorcycle Lots (757 capacity).
- Building-level and zone-level breakdown with visual utilization progress bars.

### 📹 CCTV & NVR Compliance (62-Day Retention)
- Real-time online/offline camera monitoring across the facility.
- 62-day video retention compliance auditing per NVR device with instant threshold warnings.

### 🔍 Metal Detector Health Checks
- Regular operational health checks and status tracking for Walkthrough Metal Detectors and Handheld Metal Detectors.
- Zone pass/fail compliance indicators.

### 📊 Modern Visual Analytics & Reporting
- 7-day sparkline trend charts with directional change indicators.
- One-click CSV export with UTF-8 BOM encoding for seamless Microsoft Excel compatibility.

---

## 🏛️ System Architecture

This repository is structured as a **Modern Monorepo** powered by Turborepo.

> The original PHP/MySQL system lives on the **`legacy-php`** branch, which has its own
> deployment pipeline (`.github/workflows/deploy-legacy.yml`).

```text
wdbpi/
├── apps/
│   ├── web/               # Next.js 16 (App Router) + React 19 + TailwindCSS v4
│   └── api/               # NestJS 11 + Prisma ORM 7 + PostgreSQL + Redis Cache
│   ├── dashboard.php      # Legacy Dashboard View
│   ├── guard_duty_log.php # Enhanced Shift-Separated Guard Duty Log
│   └── get_security_status.php
├── docker/                # Multi-stage Dockerfiles & Nginx Reverse Proxy Configs
├── prisma/                # Prisma Schema & Database Migrations
└── docker-compose.yml     # Unified Multi-container Orchestration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **npm** or **pnpm**
- **PHP**: `>= 8.1` *(for Legacy PHP service)*
- **PostgreSQL**: `>= 16`
- **Docker & Docker Compose** *(recommended for production deployment)*

### Local Monorepo Setup (Next.js + NestJS)

```bash
# 1. Clone the repository
git clone https://github.com/PCS-IOT/WD_BPI_Web.git
cd WD_BPI_Web

# 2. Install monorepo dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Start the development server (runs Web & API concurrently)
npm run dev
```

- 🌐 **Web Frontend**: `http://localhost:3000`
- ⚙️ **NestJS API**: `http://localhost:3001/api`
- 📚 **Swagger API Docs**: `http://localhost:3001/api/docs`

---

## 🐳 Docker Deployment

Run the complete unified stack (Next.js, NestJS, Legacy PHP, Nginx reverse proxy, PostgreSQL, and Redis) with a single command:

```bash
# Build and launch all containers
docker compose up -d --build

# View container logs
docker compose logs -f
```

---

## 📝 Changelog

Detailed release notes and version history are available in [CHANGELOG.md](CHANGELOG.md).

---

## 📄 License

Distributed under the [MIT License](LICENSE).

<div align="center">
  <sub>Developed & Maintained for <strong>Western Digital BPI Site</strong></sub>
</div>
