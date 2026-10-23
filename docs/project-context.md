# MarsNova — Project Context

## 1. Project Overview & Background

**MarsNova** is a modern creative and technology studio platform designed for creators, businesses, and learners. The brand bridges high-end media production, creative storytelling, technical computer education, and specialized hardware-level data recovery services.

### Core Brand Philosophy
- **Tagline**: *"Ideas reach further when creativity meets technology."*
- **Mission**: To make content creation, digital growth, and technology solutions simple and accessible for everyone.
- **Identity & Aesthetics**: Dark navy backgrounds (`#030912`, `#080F1D`, `#101B2B`), glowing purple gradients (`#7919F5` to `#A855F7`), restrained cyan accents (`#38BDF8`), and crisp white headings (`#F5F7FF`).

---

## 2. Technology Stack

### Frontend
- **Framework**: React 19
- **Language**: TypeScript (`ES2022`, strict typing)
- **Bundler & Dev Server**: Vite 8
- **Routing**: React Router (`react-router-dom` v7)
- **Icons**: Lucide React
- **Styling**: Vanilla CSS design system with custom properties (`src/index.css`), zero heavyweight CSS runtime dependencies.

### Backend
- **Framework**: C++ with **Drogon Web Framework** (High performance, non-blocking I/O, C++17)
- **Build System**: CMake (minimum version 3.15)
- **Architecture**: REST API microservices with JSON serialization (`jsoncpp`), asynchronous DB event loop, and CORS handling.

### Database
- **Engine**: PostgreSQL
- **Migration Strategy**: Versioned raw SQL migrations (`backend/migrations/001_marsnova_core_schema.sql` and mirrored in `supabase/migrations/` for tooling compatibility)
- **Source of Truth**: PostgreSQL stores all customer enquiries, quotations, project statuses, recovery cases, and immutable audit logs.

### Testing & Validation
- **Unit & Regression Testing**: Node.js built-in test runner (`node --test tests/*.test.js`)
- **Static Type Checking**: TypeScript compiler (`tsc --noEmit`)
- **Bundle Verification**: Production Vite build (`vite build`)

---

## 3. Repository File Structure

```text
d:/project/marsnova/project/
├── backend/                               # C++ Drogon Backend & Migrations
│   ├── CMakeLists.txt                     # CMake build configuration for Drogon
│   ├── config.json                        # Drogon listener, connection pool & CORS
│   ├── main.cc                            # Backend entry point and advice hooks
│   ├── controllers/
│   │   ├── EnquiryController.h / .cc      # POST & GET /api/v1/enquiries (DB + audit)
│   │   ├── RecoveryController.h / .cc     # GET & POST /api/v1/recovery (Case tracking)
│   │   └── HealthController.h / .cc       # GET /api/v1/health status
│   └── migrations/
│       └── 001_marsnova_core_schema.sql   # Core versioned PostgreSQL schema
├── dist/                                  # Built production artifacts
├── docs/                                  # Project specifications & architecture docs
│   ├── project-context.md
│   ├── requirements.md
│   ├── architecture.md
│   └── implementation-plan.md
├── node_modules/                          # Dependencies
├── public/                                # Public assets, robots.txt, sitemap
├── src/                                   # Frontend TypeScript & React Source
│   ├── components/
│   │   ├── Navbar.tsx                     # Top navigation bar with active links
│   │   ├── Footer.tsx                     # Studio footer with solutions directory
│   │   ├── VideoModal.tsx                 # Video preview modal for work items
│   │   └── RecoveryTrackerModal.tsx       # Live Pen Drive case tracking modal
│   ├── pages/
│   │   ├── HomePage.tsx                   # Hero, stats, services, work, Mars visual
│   │   ├── ServicesPage.tsx               # 8-card complete services breakdown
│   │   ├── LabPage.tsx                    # Education courses & why join MarsNova Lab
│   │   ├── AboutPage.tsx                  # Studio story, 4 pillars, mission
│   │   ├── ContactPage.tsx                # Enquiry intake form & direct contacts
│   │   └── AdminPage.tsx                  # Workspace for enquiries, quotes, projects
│   ├── api.ts                             # Client API client & WhatsApp formatter
│   ├── App.tsx                            # React Router root component
│   ├── data.ts                            # Catalog dataset (services, courses, work)
│   ├── index.css                          # Custom design system & theme tokens
│   ├── main.tsx                           # StrictMode DOM mount
│   ├── types.ts                           # Shared TypeScript type definitions
│   └── vite-env.d.ts                      # Vite client environment typing
├── supabase/                              # Compatibility migration store
│   └── migrations/
│       ├── 202610220001_initial_schema.sql
│       └── 202610230001_marsnova_core_schema.sql
├── tests/
│   └── validation.test.js                 # Regression and unit tests
├── index.html                             # HTML entry point with metadata
├── package.json                           # NPM dependencies and scripts
└── tsconfig.json                          # Strict TypeScript configuration
```

---

## 4. Current Routes & Navigation

| Route | View Component | Description |
| :--- | :--- | :--- |
| `/` | `HomePage` | Hero section, metric stats bar, featured service cards, filterable portfolio showcase, Mars planet visual, quote & signature. |
| `/services` | `ServicesPage` | Complete catalog of 8 services across Video, Social Media, Promotion, and Tech Services. |
| `/lab` | `LabPage` | MarsNova Lab education courses, beginner-friendly learning benefits, and enrollment enquiry CTA. |
| `/about` | `AboutPage` | Agency philosophy, dual-monitor studio showcase, 4 pillars (Creativity, Technology, Learning, Real Impact), and mission. |
| `/contact` | `ContactPage` | Customer intake form with backend validation, database-first saving, WhatsApp dispatch URL, and direct channels. |
| `/admin` | `AdminPage` | Internal studio operations dashboard: enquiries viewer, manual quotation generator, projects tracker, and data recovery tickets. |
| *Modal* | `RecoveryTrackerModal` | Accessible from Navbar and Tech Services; allows entering a Case ID (e.g., `MN-REC-8291`) to view diagnostic stages and files recovered. |
| *Modal* | `VideoModal` | Interactive pop-up video player for showreels and client work previews. |

---

## 5. Database State

The PostgreSQL schema is defined in [`backend/migrations/001_marsnova_core_schema.sql`](file:///d:/project/marsnova/project/backend/migrations/001_marsnova_core_schema.sql):

1. **`schema_migrations`**: Tracks versioned SQL migration executions (`version`, `applied_at`, `description`).
2. **`enquiries`**: Stores leads, contact briefs, services selected, status (`new`, `contacted`, `quoted`, `closed`), and audit flags (`whatsapp_notified`, `ip_address`).
3. **`data_recovery_cases`**: Physical media recovery cases with tracking fields (`case_id`, `customer_name`, `device_type`, `current_stage`, `progress_percentage`, `files_recovered_count`, `diagnostic_notes`).
4. **`recovery_case_timeline`**: Step-by-step diagnostic milestones for customer case progress transparency.
5. **`quotations`**: Manual quotations with structured line items (`scope_details` JSONB), currency, amounts, and validity dates.
6. **`projects`**: Internal creative project tracking with milestones (`kickoff`, `pre_production`, `production`, `post_editing`, `client_review`, `completed`).
7. **`audit_logs`**: Immutable record of system actions (`ENQUIRY_CREATED`, `CASE_UPDATED`, `WHATSAPP_DISPATCH`).

---

## 6. Baseline Verification Results

Baseline validation checks executed on the repository:

- **Node Unit Tests**:
  - Command: `npm test`
  - Result: `4 passed, 0 failed` (Duration: `97.5ms`)
  - Coverage: Enquiry input validation, email pattern verification, WhatsApp message URL builder encoding, Case ID format normalization.
- **TypeScript Static Analysis**:
  - Command: `npm run typecheck` (`tsc --noEmit`)
  - Result: `0 errors`
- **Vite Production Bundler**:
  - Command: `npm run build`
  - Result: Built in `299ms` (`dist/index.html` 0.90 kB, `dist/assets/index.css` 12.52 kB, `dist/assets/index.js` 324.64 kB).
