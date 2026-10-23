# MarsNova — Architecture & System Design

## 1. System Architecture Overview

MarsNova is architected as a decoupled, high-performance web platform consisting of a **React + TypeScript SPA frontend**, a **C++ Drogon REST API backend**, and a **PostgreSQL relational database** as the authoritative source of truth.

```mermaid
graph TD
    User["Client Browser"]
    
    subgraph Frontend["Frontend (React 19 + TypeScript + Vite)"]
        Router["React Router (BrowserRouter)"]
        UI["UI Pages & Modals"]
        APIClient["API Client (src/api.ts)"]
    end

    subgraph Backend["Backend (C++ Drogon REST Server :8080)"]
        HTTPRouter["Drogon HTTP Dispatcher"]
        CorsMW["CORS & Headers Middleware"]
        Val["Validation & Sanitization"]
        Controllers["Drogon Controllers (Enquiry, Recovery, Health)"]
        DBPool["Drogon Async DB Connection Pool"]
    end

    subgraph Storage["Database (PostgreSQL :5432)"]
        EnqTable[("enquiries")]
        CaseTable[("data_recovery_cases")]
        TimeTable[("recovery_case_timeline")]
        QuoteTable[("quotations")]
        PrjTable[("projects")]
        AuditTable[("audit_logs")]
    end

    User --> Router
    Router --> UI
    UI --> APIClient
    APIClient -->|JSON REST Requests| CorsMW
    CorsMW --> HTTPRouter
    HTTPRouter --> Val
    Val --> Controllers
    Controllers --> DBPool
    DBPool --> Storage
```

---

## 2. Communication & Handoff Pipeline

### Customer Enquiry Flow (Guaranteed Database-First Rule)
A core architectural requirement is that **no external notification or WhatsApp dispatch may be triggered until the enquiry is successfully committed to the database**.

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Client / Visitor
    participant Browser as React Frontend
    participant Drogon as Drogon C++ Server
    participant Postgres as PostgreSQL DB
    actor WhatsApp as WhatsApp Application

    Visitor->>Browser: Fill Name, Email, Service & Message
    Browser->>Browser: Client-side validation
    Browser->>Drogon: POST /api/v1/enquiries (JSON payload)
    Drogon->>Drogon: Server-side validation & IP capture
    Drogon->>Postgres: INSERT INTO enquiries (...) RETURNING id
    Postgres-->>Drogon: Return enquiry UUID
    Drogon->>Postgres: INSERT INTO audit_logs (action='ENQUIRY_CREATED')
    Drogon-->>Browser: 201 Created (enquiry_id, whatsapp_ready=true)
    Browser->>Browser: Display persistence confirmation banner
    Browser->>WhatsApp: Open wa.me link with encoded enquiry payload
```

---

## 3. Data Models & Relational Schema

The PostgreSQL schema is structured to ensure referential integrity, parameterized safety, and auditability.

```mermaid
erDiagram
    ENQUIRIES ||--o{ QUOTATIONS : "may receive"
    ENQUIRIES {
        uuid id PK
        varchar full_name
        varchar email
        varchar phone
        varchar service_interest
        text message
        varchar status
        boolean whatsapp_notified
        varchar ip_address
        timestamptz created_at
    }

    DATA_RECOVERY_CASES ||--o{ RECOVERY_CASE_TIMELINE : "logs"
    DATA_RECOVERY_CASES {
        uuid id PK
        varchar case_id UK
        varchar customer_name
        varchar customer_phone
        varchar device_type
        varchar issue_type
        varchar current_stage
        int progress_percentage
        int files_recovered_count
        numeric data_size_recovered_mb
        text diagnostic_notes
        timestamptz created_at
    }

    RECOVERY_CASE_TIMELINE {
        uuid id PK
        varchar case_id FK
        varchar stage
        varchar status_title
        text status_description
        timestamptz recorded_at
    }

    QUOTATIONS {
        uuid id PK
        varchar quote_number UK
        uuid enquiry_id FK
        varchar client_name
        varchar service_type
        jsonb scope_details
        numeric total_amount_inr
        date valid_until
        varchar status
        timestamptz created_at
    }

    PROJECTS {
        uuid id PK
        varchar project_code UK
        varchar title
        varchar client_name
        varchar client_email
        varchar vertical
        varchar current_stage
        int progress_percentage
        timestamptz created_at
    }

    AUDIT_LOGS {
        uuid id PK
        varchar action
        varchar entity_table
        varchar entity_id
        varchar actor
        jsonb details
        timestamptz created_at
    }
```

---

## 4. Drogon REST API Specification

### 4.1 Health Check
- **Endpoint**: `GET /api/v1/health`
- **Response**: `200 OK`
  ```json
  {
    "status": "online",
    "service": "MarsNova C++ Drogon API",
    "version": "1.0.0",
    "timestamp": "2026-10-23 05:20:00"
  }
  ```

### 4.2 Customer Enquiry Submission
- **Endpoint**: `POST /api/v1/enquiries`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Aarav Sharma",
    "email": "aarav@example.com",
    "phone": "+91 98765 43210",
    "service": "Video Editing",
    "message": "Need complete post-production for 12 YouTube episodes."
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "enquiry_id": "8d3e9114-1e09-4672-995b-09c33bb35ce2",
      "message": "Enquiry saved to database before WhatsApp dispatch",
      "whatsapp_ready": true
    }
    ```
  - `400 Bad Request`: Validation failure message (e.g., invalid email, short name).
  - `500 Internal Server Error`: Database connection or insertion fault.

### 4.3 Data Recovery Case Status Lookup
- **Endpoint**: `GET /api/v1/recovery/:caseId`
- **Responses**:
  - `200 OK`:
    ```json
    {
      "case_id": "MN-REC-8291",
      "customer_name": "Aditya Verma",
      "device_type": "SanDisk Ultra 64GB USB 3.0",
      "issue_type": "Corrupted Master Boot Record & RAW Partition",
      "current_stage": "file_recovery",
      "stage_title": "Deep File Structure Reconstruction",
      "progress_percentage": 75,
      "files_recovered_count": 1420,
      "data_size_recovered_mb": 18450.5,
      "diagnostic_notes": "Controller healthy. Raw NAND sectors mirrored.",
      "created_at": "2026-10-21T09:30:00Z",
      "updated_at": "2026-10-23T04:15:00Z",
      "timeline": [...]
    }
    ```
  - `404 Not Found`: If no case matches the specified identifier.

---

## 5. Security & Data Integrity Principles

1. **SQL Injection Defense**: Strict use of parameterized positional placeholders (`$1, $2, ...`) via `drogon::orm::DbClient::execSqlAsync`.
2. **Audit Trails**: Critical state modifications (new enquiries, quotation generation, case stage updates) record an entry in `audit_logs` capturing the entity ID, action name, actor, and JSON details.
3. **CORS Policy**: Configured in `backend/config.json` and enforced in Drogon post-handling advice hooks to restrict cross-origin access in production.
4. **Client-Side Graceful Degradation**: If the backend service is offline, the React frontend buffers enquiries in `localStorage` under `marsnova_enquiries` to ensure no prospective client inquiry is lost.
