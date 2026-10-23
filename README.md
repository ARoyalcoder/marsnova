# marsnova

> Modern Creative Production Studio, Learning Platform & Tech Operations Platform

---

## Overview

MarsNova is a full-stack platform combining high-performance creative studio management, learning portal (MarsNova Lab), pen-drive diagnostic recovery workflows, and automated customer lead lifecycle management.

### Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Animations**: GSAP 3 with `@gsap/react`, Motion for React (`motion`)
- **Backend**: C++17 Drogon framework & standalone high-performance runtime
- **Database**: PostgreSQL 16+ / Neon Serverless PostgreSQL (`001` - `009` migrations)
- **Deployment**: Docker & Docker Compose with multi-stage hardened Nginx reverse proxy gateway

---

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy the template and configure your local or Neon cloud database credentials:
```bash
cp .env.example .env
```

### 3. Development Server
```bash
npm run dev
```

### 4. Verification & Testing
```bash
npm test            # Run 182 node test suites
npm run typecheck   # Validate TypeScript types
npm run build       # Generate production bundle
```

---

## Project Structure
```
├── backend/            # Drogon C++ backend controllers, models, and migrations (001-009)
├── docker/             # Container entrypoints, automated migration and backup scripts
├── docs/               # Architecture, requirements, and release checklist runbooks
├── public/             # Static public assets, robots.txt, sitemap.xml
├── src/                # React Vite SPA (pages, components, hooks, animations)
├── tests/              # 182 integration, security, and functional tests
└── DEPLOYMENT.md       # Production deployment and operations runbook
```
