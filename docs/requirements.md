# MarsNova — Requirements Specification

## 1. Scope & Boundaries

### 1.1 In-Scope (v1 Release)
- **Creative Services**: Marketing showcases for Video Creation & Editing, Video to Shorts, Thumbnail & Title Design, and Social Media Consultation.
- **Portfolio & Showcases**: Categorized video and creative works (YouTube Videos, Shorts, Business Promotion, Social Media) with interactive modal playback.
- **MarsNova Lab**: Technology and media course catalog (Computer Fundamentals, AI Tools & Automation, Video Editing, Graphic Design, Social Media Growth, Practical Projects) with course inquiries.
- **Customer Enquiries**: Public intake form with strict backend validation and guaranteed database-first persistence prior to external notification handoff.
- **WhatsApp Notification Integration**: Pre-filled WhatsApp direct communication link built with verified enquiry details.
- **Pen-Drive Data Recovery Case Tracking**: Case inquiry registration and real-time public tracking of physical media diagnostics via Case ID (`MN-REC-XXXX`).
- **Admin Dashboard**: Internal operational workspace to view customer leads, generate manual quotations, manage client projects, and update recovery case stages.
- **Manual Quotations**: Generation and tracking of custom client proposals with scope line items and validity windows.
- **Project Management**: Internal stage-based progression (`kickoff` → `completed`) for media projects.

### 1.2 Explicitly Out-of-Scope (v1 Constraints)
- **No Payment Gateway / Online Checkout**: All financial agreements and quotations are manually handled in v1.
- **No Marketplace Commissions**: MarsNova operates as a direct agency/lab, not a third-party marketplace.
- **No Freelancer Marketplace**: All creative production and technical diagnostics are conducted by the MarsNova team.
- **No Website-Driven USB Recovery**: The website does not attempt in-browser USB hardware communication or automated extraction; it tracks physical lab tickets only.

---

## 2. Design System & Visual Requirements

The visual identity must strictly adhere to the MarsNova screenshot:

| Element | Specification | Hex / Value |
| :--- | :--- | :--- |
| **Deep Background** | Pitch navy / near black | `#030912` |
| **Card / Surface** | Dark Navy surface | `#080F1D` |
| **Elevated / Hover Surface** | Hover card elevation | `#0E1A2F` |
| **Muted Border** | Structural card borders | `#101B2B` |
| **Highlight Border** | Active / focus borders | `#1E2D4A` |
| **Primary Gradient** | Signature purple gradient | `linear-gradient(135deg, #7919F5, #A855F7)` |
| **Purple Glow** | Accent purple | `#A855F7` |
| **Cyan Accent** | Restrained highlight | `#38BDF8` |
| **Headings & Primary Text** | White / high-contrast | `#F5F7FF` |
| **Muted Text** | Subtitles, body copy | `#94A3B8` |
| **Dim Text** | Timestamps, micro-labels | `#64748B` |

### Interaction & Responsive Requirements
- **Mobile First to Desktop**: Navigation collapses to a mobile drawer below 768px; grids scale gracefully from 4 columns to 2 and 1 column.
- **Card Hover Effects**: Subtle vertical translation (`translateY(-4px)`), border highlight, and purple glow drop-shadow.
- **Mars Visual**: Glowing red/orange atmospheric sphere accompanied by quote: *"Ideas reach further when creativity meets technology."* and calligraphic *MarsNova* signature.

---

## 3. Functional Requirements

### FR-01: Public Navigation & Branding
- Topbar displaying brand icon, "MarsNova" gradient wordmark, and links: `Home`, `Services`, `Lab`, `About`, `Contact`.
- Action buttons: "Track Case" (opens case tracking modal) and "Get Started" (routes to `/contact`).

### FR-02: Home Page Presentation
- Hero copy: `CREATE · LEARN · GROW`, `Your Ideas Our Creation`.
- Two action buttons: `Explore Services →` and `▶ Watch Video`.
- Metrics row: `100+ Videos Created`, `35K+ Instagram Followers`, `99% Happy Creators`, `50+ Trusted by Brands`.
- 4 Featured Service highlights linking to full descriptions.
- Filterable Work Showcase tabs (`All`, `YouTube Videos`, `Shorts`, `Business Promotion`, `Social Media`).
- About MarsNova section featuring the Mars planet artwork, core value badges, and quote.

### FR-03: Services Catalog
- 8 services defined:
  1. **Topic to Video**: Research, script, voice-over, and full video production.
  2. **Video Editing**: Raw clip cutting, pacing, subtitles, music, sound design, and color grading.
  3. **Video to Shorts**: Long-form extraction into vertical 9:16 reels and shorts.
  4. **Thumbnail & Title**: High-CTR custom graphic thumbnails and viral title suggestions.
  5. **Social Media Consultation**: 1-on-1 strategy sessions for growth and monetization.
  6. **Business Promotion**: Commercial shoots, brand films, and local business marketing.
  7. **Pen Drive Data Recovery**: Hardware-assisted NAND flash recovery and corrupted partition repair.
  8. **Online Tech Support**: Remote troubleshooting for workstations and editing suites.
- Category filters: `All`, `Video`, `Social Media`, `Promotion`, `Tech`.

### FR-04: MarsNova Lab Education
- Educational portal highlighting computer, AI, and creative skills:
  - Computer Fundamentals, AI Tools & Automation, Video Editing, Graphic Design, Social Media Growth, Practical Projects.
- Value highlights: Beginner-friendly, practical hands-on projects, updated curriculum, dedicated mentor guidance.
- "Ready to Start Learning?" enrollment enquiry callout.

### FR-05: Customer Enquiry & WhatsApp Pipeline
- Intake form capturing: Full Name, Email Address, Phone Number (optional), Service Interest, and Detailed Brief.
- **Database-First Rule**: The form must asynchronously POST to `/api/v1/enquiries` and secure a database row ID before initiating external redirects.
- Automated creation of an audit log entry (`ENQUIRY_CREATED`).
- Generates a pre-formatted WhatsApp chat link for direct communication.

### FR-06: Pen-Drive Data Recovery Case Tracking
- Public case lookup by unique Case ID (e.g., `MN-REC-8291`).
- Displays: Device details, reported issue, current diagnostic stage, progress percentage, files recovered count, total MB salvaged, technician diagnostic notes, and timestamped milestone timeline.

### FR-07: Studio Administration & Operations
- Authenticated admin dashboard with 4 operational tabs:
  1. **Enquiries**: Real-time listing of incoming customer requests with DB status tags.
  2. **Quotations**: Creation and tracking of manual commercial quotations.
  3. **Projects**: Management of active production projects and stage progression.
  4. **Recovery Lab**: Intake logging and stage transitions for physical media repair cases.

---

## 4. Non-Functional & Architecture Requirements

- **PostgreSQL Source of Truth**: All operational records must reside in PostgreSQL. No external webhook or client session can bypass DB state.
- **Drogon REST APIs**: All browser actions communicate via clean HTTP/JSON endpoints hosted by the Drogon C++ server.
- **Parameterized Queries**: All SQL executions must use parameterized inputs (`$1`, `$2`, etc.) to prevent SQL injection.
- **Immutable Audit Logging**: System actions (enquiries, case updates, quotes) must write audit events with timestamps.
- **Resilience**: Frontend gracefully falls back to local storage persistence and simulation modes if the backend server is temporarily unreachable.

---

## 5. Gap Analysis & Missing Requirements

The following items should be addressed in subsequent implementation phases:

1. **Production Admin Authentication**:
   - *Current State*: Admin workspace is publicly routable at `/admin`.
   - *Requirement*: JWT-based or session-based admin authorization middleware in Drogon and protected route guards in React Router.
2. **Automated WhatsApp Business Webhook**:
   - *Current State*: Dispatches via `window.open` client-side WhatsApp link.
   - *Requirement*: Server-side Drogon integration with the official WhatsApp Cloud API for automated SMS/WhatsApp alerts.
3. **Database Seed Data Runner**:
   - *Current State*: Schema migrations defined; sample records exist in mock/test fallback.
   - *Requirement*: Standalone SQL seed script (`002_seed_demo_data.sql`) to populate baseline demo projects and cases.
4. **Drogon Binary Build Pipeline on Windows**:
   - *Current State*: C++ source and CMakeLists prepared; host lacks native `cmake` and `drogon` binaries in path.
   - *Requirement*: Containerized Dockerfile or vcpkg build workflow to build Drogon server on any OS.
