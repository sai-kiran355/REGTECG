# RegTech ComplianceOS — Technical Codebase Walkthrough

This document provides a pro-level, deep-dive walkthrough of the entire **RegTech ComplianceOS** repository. It explains the purpose, design decisions, and mechanics of every folder and key code file in both the Backend and Frontend.

---

## 1. Project Directory Mapping Overview

```
regtech-compliance-os/
├── backend/                  # Python & FastAPI Application
│   ├── api/                  # REST API controllers & router endpoints
│   ├── core/                 # Core configs, database helpers, logging, security, telemetry
│   ├── crud/                 # Database Query Operations (Create, Read, Update, Delete)
│   ├── db/                   # Database session initialization
│   ├── migrations/           # Alembic schema migration versions
│   ├── models/               # SQLAlchemy ORM Database Schemas
│   ├── schemas/              # Pydantic payloads and validation models
│   ├── services/             # Background loops and simulator tasks
│   └── workers/              # Asynchronous worker setups
└── frontend/                 # React & Vite Application
    ├── src/
    │   ├── api/              # Axios instance and type-safe API services
    │   ├── components/       # Reusable components & widgets (Sidebar, Navbar, LobbyAssistant)
    │   ├── lib/              # Core helper scripts (cn, tailwind helpers)
    │   ├── pages/            # Page layouts and routers (Dashboard, KYC, AML, Fintech, Onboarding)
    │   └── store/            # Zustand global state client profiles
```

---

## 2. Backend Architecture Details

### `backend/core/` — The Core Infrastructure Engine
Contains the global systems that manage database configurations, credentials, security layers, logging, and asynchronous rate limiters.
* **`config.py`**:
  * **What it does**: Validates all configuration keys loaded from `backend/.env` using Pydantic's `BaseSettings`.
  * **Why we use it**: It performs startup validation checks. If a required environment variable is missing (e.g., `DATABASE_URL` or `SECRET_KEY`), the app crashes instantly with exit code `1`, preventing runtime errors.
* **`logging.py`**:
  * **What it does**: Sets up structured, computer-readable JSON logging in production and colorized text logging in development.
  * **Why we use it**: Ensures logs can be easily searched and parsed by automated log collectors (e.g. Datadog, ELK).
* **`security.py`**:
  * **What it does**: Enforces password hashing using **bcrypt** and tokens using **PyJWT** (HS256 symmetric signing).
  * **Why we use it**: Enforces standard cryptography, preventing credentials from being saved in raw text and verifying signatures on headers.
* **`redis.py`**:
  * **What it does**: Instantiates the asynchronous connection pool using `redis-py`.
  * **Why we use it**: Shared globally for rate-limiting, simulator tracking, and ephemeral session checks.
* **`middleware.py`**:
  * **What it does**: Regulates request streams. Includes `RequestIDMiddleware` (attaches a unique `X-Request-ID` tracing header to every request) and `TenantMiddleware` (extracts the `X-Tenant-ID` header and scopes active database operations to that tenant).
  * **Why we use it**: Scopes multitenancy safely. Public paths like `/api/v1/chat/lobby-assistant` are explicitly excluded from tenant header checks.
* **`telemetry.py`**:
  * **What it does**: Sets up **OpenTelemetry** providers to track spans and network traces, letting you debug bottlenecks in API query pipelines.

### `backend/db/` — Database Connectivity
* **`session.py`**:
  * **What it does**: Creates the asynchronous database engine (`create_async_engine`) and configures the session factory (`AsyncSessionLocal`).
  * **Why we use it**: Uses PostgreSQL's `asyncpg` driver to prevent database calls from blocking the FastAPI process loop.

### `backend/models/` — SQLAlchemy ORM Metadata Mappings
Defines the database schema as Python classes. Compiles table constraints, columns, and relations.
* **`__init__.py`**: Imports all models (Users, Tenants, KYC, AML, Candidate, Job) to register them in the global metadata object.
* **`tenant.py`**: Maps client companies (e.g., `american-bank`, `tfg`). Each tenant gets a unique schema scope to isolate user profiles, logs, and compliance cases.
* **`user.py`**: Represents backend users (Auditors, Compliance Officers, HR Managers, Developers). Holds emails, hashed password strings, and references their role permissions.
* **`case.py`**: Represents a compliance evaluation application raised by a fintech for a customer. Stores the overall case verification status.
* **`kyc_record.py`**: Stores parsed customer details (names, PAN, Aadhaar) extracted via OCR and files links.
* **`aml_alert.py`**: Captures flagged transaction breaches (e.g., structuring, layering) and logs resolving reasons.
* **`candidate.py` & `job.py`**: Models candidate recruitment and resume details used by the Gemini screening engine.
* **`employee.py`, `attendance_log.py`, `payroll_log.py`**: Represents fintech operational records (geofenced clock-in logs, salary plans, and professional tax breakdowns).

### `backend/crud/` — Database Query Executions
Houses raw database access queries. Avoids putting SQL query logic directly inside HTTP request handlers.
* **`user.py`**: Checks login credentials and updates user profile information in the database.
* **`kyc.py`**: Queries, updates, and reviews KYC records, handling status changes.
* **`aml.py`**: Manages AML alerts. It handles assigning reviews, closing alerts, marking false positives, and permanently deleting alert logs.
* **`payroll.py`**: Generates salary logs, calculates statutory deductions (EPF, TDS, Professional Tax), and creates monthly disbursals.
* **`attendance.py`**: Logs clock-in details and flags geofence coordinates violations.

### `backend/schemas/` — Pydantic Payload Validations
* Defines request validation rules (e.g., matching email regexes, string min/max lengths, type checks) and structures JSON API responses.
* **`auth.py`**: Formats registration parameters, logins, and token payloads.
* **`cases.py`**: Dictates case listings schemas, details responses, and status overrides.
* **`payroll.py`**: Validates payroll logs and payslip parameters.

### `backend/api/v1/` — REST API Endpoints & Controllers
FastAPI controllers that handle HTTP requests, validate payloads, query the database, and return JSON responses.
* **`router.py`**: Aggregates all versioned endpoints under `/api/v1/` (auth, cases, KYC, AML, recruitment, payroll, chat, integrations).
* **`deps.py`**: Houses FastAPI dependencies like `get_db` (yields a database session), `get_current_user` (verifies the JWT token), and `require_permission` (enforces RBAC permission matches).
* **`chat.py`**:
  * **What it does**: Handles direct messenger logs between officers and candidates.
  * **Why we use it**: Houses the public `/lobby-assistant` route, which handles landing page AI assistant queries, runs the local sales fallback checks, and coordinates context checks to refuse off-topic prompts.
* **`recruitment.py`**:
  * **What it does**: Handles job creation and resume screening.
  * **Why we use it**: Connects to the Gemini API (`_run_gemini_screening`) to screen resumes against job descriptions, returning a match score, strengths, and gaps.
* **`kyc.py` & `cases.py`**: Manages verification workflows and handles document re-upload checks.
* **`aml.py`**: Exposes routes to alert risk officers, resolve flags, and perform data audits.
* **`payroll.py` & `attendance.py`**: Manages workforce check-ins and monthly salary calculations.
* **`integrations.py`**: Generates API credentials, registers webhook configurations, and triggers third-party integrations (Slack/Teams).

### `backend/services/` — Background Task Tasks
* **`aml_simulator.py`**:
  * **What it does**: A background task loop that runs continuously.
  * **Why we use it**: Simulates real banking transactions, raising structured cash-intensity and layering flags dynamically to populate the compliance dashboard.

---

## 3. Frontend Architecture Details

### `frontend/src/` — Core Frontend
* **`main.tsx`**: Renders the React DOM, wraps it in the router, and mounts it to the root wrapper element.
* **`App.tsx`**:
  * **What it does**: The central router registry.
  * **Why we use it**: Maps endpoints (e.g. `/dashboard`, `/login`, `/signup`, `/info/:topic`) and handles authentication guards (`ProtectedRoute`), redirecting unauthenticated visitors to `/login`.
* **`index.css`**: Configures custom styling utilities and base fonts.

### `frontend/src/store/` — Zustand Global Stores
* **`authStore.ts`**:
  * **What it does**: Manages tokens, session lifetimes, and active user profile details (such as full name and roles).
  * **Why we use it**: Keeps authentication state synchronized across components (Sidebar, Topbar, Profile panel) and handles token rotation and automatic token refreshes.

### `frontend/src/api/` — API Handlers
* Houses the Axios instance (`client.ts`), automatically attaching the `Authorization` header and the active tenant ID header (`X-Tenant-ID`) to backend API calls.
* **`auth.ts`, `compliance.ts`, `fintech.ts`**: Clean, type-safe API helper functions for communication with backend routers.

### `frontend/src/components/` — Reusable Core Widgets
* **`Sidebar.tsx` & `TopBar.tsx`**: Standardizes navigation layouts. Parses name fields to display clean initials in user avatars instead of raw database UUIDs.
* **`ProfilePanel.tsx`**: Controls profile details edits and updates user details in the backend.
* **`LobbyAssistant.tsx`**:
  * **What it does**: The floating landing page AI chatbot.
  * **Why we use it**: Implements multi-tier chip navigation, parses user text input to update recommended topics, and parses markdown text (`**bold**`, lists) into clean visual elements.

### `frontend/src/pages/` — User Views
* **`LandingPage.tsx`**: The main corporate showcase landing page.
* **`ProductSelectPage.tsx`**: The portal dispatcher page (Bank Cockpit vs Fintech Hub).
* **`LoginPage.tsx` & `SignUpPage.tsx`**: Forms for user sign-in and sign-up.
* **`DashboardPage.tsx`, `CasesPage.tsx`, `KYCPage.tsx`, `AMLPage.tsx`, `SanctionsPage.tsx`**: The **Bank Portal** workspace dashboards. They poll the backend every 5 seconds to show real-time, auto-updating alerts, case queues, and statistics.
* **`FintechDashboardPage.tsx`, `EmployeesPage.tsx`, `AttendancePage.tsx`, `PayrollPage.tsx`, `IntegrationsPage.tsx`**: The **Fintech Portal** workspace dashboards. They handle workforce rosters, GPS-geofenced clock-ins, automated tax payroll calculations, and developer webhook configurations.
* **`applicant/ApplicantHomePage.tsx` & `ApplicantChatPage.tsx`**: The **Applicant Portal** workspace dashboards. Applicants monitor verification status, chat with compliance officers, and re-upload documents using inline action buttons.
