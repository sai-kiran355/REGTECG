# RegTech ComplianceOS — Technical & Functional Documentation

This document provides a comprehensive end-to-end technical overview, functional architecture, and operational runbook for **RegTech ComplianceOS**. It is designed to explain the system's architecture, operational flows, database seed credentials, port mapping structures, and deployment configurations for clients and stakeholders.

---

## 1. Executive Summary & Value Proposition

**RegTech ComplianceOS** is a secure, enterprise-grade Software-as-a-Service (SaaS) platform built to bridge the gap between bank regulatory compliance requirements and fast-growing fintech company operations. 

```mermaid
graph LR
    subgraph Banks ["🏦 Banking Desk (RegTech Suite)"]
        B1["KYC Cockpit"] --> B2["AML Simulator"]
        B2 --> B3["Sanctions Desk"]
    end
    subgraph Fintechs ["💼 Fintech Workspace (Operations Suite)"]
        F1["Workforce Directory"] --> F2["GPS Attendance"]
        F2 --> F3["Automated Payroll"]
    end
    Banks <-->|"Secure Handshake API"| Fintechs
```

### Core Portals
1. **Bank Portal (RegTech Suite)**: Designed for bank risk officers, compliance analysts, and auditors to automate applicant verification, screen financial transaction metrics, and prevent onboarding penalties.
2. **Fintech Portal (Workforce Hub)**: Designed for fintech HR managers and operations teams to automate self-service employee onboarding, track GPS-geofenced attendance, run local statutory payroll calculations, and configure developer APIs.

---

## 2. Platform Architecture & Stack

ComplianceOS is built on a modern, asynchronous, developer-first technology stack designed to handle high transaction volumes and sensitive document storage safely.

* **Frontend**: Built with **React** (Vite environment), styled using **Tailwind CSS** for responsive design, and animated with **Framer Motion** for a premium user experience. Utilizes **Lucide React** for visual iconography and a centralized, token-based Axios client for API communications.
* **Backend**: Powered by **FastAPI** (Python), executing asynchronous controllers. Uses **SQLAlchemy** for database object-relational mapping (ORM) and **Alembic** for schema migrations.
* **Database**: **PostgreSQL** handles structured storage (accounts, logs, transactions, payroll metrics).
* **Caching & Queueing**: **Redis** processes real-time API rate limiting and runs background simulators.
* **AI Engine**: Integrated with **Google Gemini AI** (API model `gemini-1.5-flash`) for automated recruitment resume screening and the landing page interactive onboarding chat assistant.
* **Observability**: Exposes structured JSON logging and supports **OpenTelemetry** for application performance tracking.

---

## 3. End-to-End Application Flow

The system coordinates applicant onboarding, bank compliance reviews, and fintech workforce logs through a connected operational loop:

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Fintech Candidate
    actor HR as Fintech HR Manager
    actor Officer as Bank Compliance Officer
    
    Candidate->>Fintech Portal: Submit Signup & Onboarding Details (Aadhaar/PAN OCR)
    Note over Fintech Portal: Onboarding data is stored under Fintech Tenant scope
    Fintech Portal->>Bank Portal: Raise Verification Case (Pending KYC Status)
    
    Note over Bank Portal: Documents parsed via AI OCR Engine
    Officer->>Bank Portal: Open KYC Case Cockpit & Review Scans
    alt Document details blurry or incorrect
        Officer->>Bank Portal: Send message requesting re-upload
        Bank Portal->>Candidate: Display request message & inline upload button in chat
        Candidate->>Bank Portal: Upload correct scan (Previews refresh instantly)
    end
    Officer->>Bank Portal: Approve Case (Status -> Verified)
    
    Note over Fintech Portal: Background Polling detects status verified
    Fintech Portal->>HR: Activate Employee Record in Workforce Directory
    HR->>Fintech Portal: Setup Base Salary and Shift Schedules
    
    rect rgb(240, 245, 255)
        Note right of Candidate: Daily Operations
        Candidate->>Fintech Portal: Clock-in (GPS location verified against geofence coordinates)
        Fintech Portal->>Bank Portal: Stream Transaction Flows (AML engine flags anomalies)
    end
    
    HR->>Fintech Portal: Run Month-End Payroll (Calculate statutory tax, download ledger, distribute payslips)
```

---

## 4. Feature Breakdown & Operational Workspaces

### 🏦 The Bank Environment (RegTech Suite)

Designed to streamline high-volume compliance tasks for banking risk desks:

#### 1. KYC (Know Your Customer) Case Cockpit
* **AI OCR Document Parsing**: Automatically reads and extracts names, ID numbers, addresses, and dates of birth from uploaded image files (Aadhaar, PAN, Passport scans) using Optical Character Recognition, matching them against database schemas.
* **Interactive Analyst Workspace**: A consolidated view showing verification scores, uploaded files, extraction logs, and a direct messaging channel.
* **Real-time Re-upload Handshake**: If verification fails, the officer requests an update in chat. The candidate's portal immediately displays a warning banner and an inline document upload button configured to update the target files directly.
* **Flicker-Free Detail Sync**: Background polling refreshes document previews and case parameters instantly upon update.

#### 2. AML (Anti-Money Laundering) Screening Simulator
* **Transaction Metrics Monitor**: Continuously screens deposit and withdrawal requests.
* **Anomalous Patterns Detector**: Simulates and flags suspicious laundering behaviors:
  * **Structuring**: Splitting single large amounts into multiple small transfers to bypass threshold checks.
  * **Layering**: Moving funds rapidly across multiple candidate accounts.
* **Alert Workspace**: Analysts resolve flags by transitioning them through `open`, `in_review`, `closed`, or `false_positive` states. Resolving alerts records written justification tags to prevent untraceable overrides.

#### 3. Sanctions Phonetic Match Desk
* **Watchlist Checking**: Automatically checks applicant profiles against active international databases (like Politically Exposed Persons (PEPs) and the US Office of Foreign Assets Control (OFAC)).
* **Phonetic Algorithms**: Uses phonetic index matches (Soundex and Double Metaphone) to catch names that sound identical to flagged entities despite spelling typos, aliases, or formatting variations.

---

### 💼 The Fintech Environment (Workforce Operations)

Handles employee registries, attendance validation, and statutory payroll:

#### 1. Workforce Directory & Recruitment
* **Self-Service Hires Portal**: Standardizes onboarding collections, collecting credentials, contact info, and tax declaration logs securely.
* **Job Posting & Resume Screening**: Built-in applicant tracking system (ATS) that screens resumes against job descriptions, grading candidates using background keyword matches.

#### 2. GPS Geofenced Attendance
* **Location Boundaries**: HR managers register latitude/longitude coordinates and a permitted radial geofence boundary for workspace locations.
* **Coordinates Verification**: Employees clock-in via the web app. The backend calculates geographic distance between the browser GPS coordinates and the office location.
* **Breach Alerts**: Clock-in attempts outside the designated boundary are flagged as geofence breaches, raising dashboard alerts and sending webhooks.

#### 3. Automated Payroll Runs
* **Statutory Calculations**: Computes employee salaries and calculates statutory deductions, including Employee Provident Fund (EPF), Tax Deducted at Source (TDS), and Professional Tax logs automatically under Indian tax schemas.
* **Bulk Bank Disbursal**: HR teams run payroll and download a consolidated Excel/CSV ledger spreadsheet to send to corporate banks for disbursements.
* **Payslip Distribution**: Generates detailed digital PDF payslips, available for employees to download securely from their accounts.

---

### 💻 Developer APIs & Webhooks

* **API Keys Management**: Enables developers to generate sandboxed and production API keys to programmatically sync directories, logs, or payroll databases with back-office programs.
* **Webhook Dispatches**: Real-time HTTP POST callbacks notifying external servers immediately when events trigger (e.g., `employee.activated`, `attendance.breach`, `kyc.verified`). Handles signed handshake validation and registers delivery logs.
* **Third-Party Integrations**: Streams real-time compliance events, onboarding metrics, and AML alert notifications into Slack channels, Microsoft Teams, Zoho, or Google Workspace.

---

### 🤖 Landing Page Floating AI Assistant Chatbot

An interactive, responsive assistant widget in the bottom-right corner of the landing page:
* **Interactive Multi-Tier Chips**: Suggested topic navigation (Bank Portal, Fintech Portal, APIs, Security) dynamically expands into specific sub-topics, including a `🔙 Back to Main Topics` reset control.
* **Keyword Auto-Routing**: If visitors type questions directly, the chatbot automatically detects the keywords and updates the recommended topic chips to the matching category.
* **Premium Text Render**: Uses a custom markdown parser rendering bold tags, numbered lists, and bullets into neatly styled elements.
* **Strict Scoping Boundaries**: Implements a politeness filter to reject off-topic inputs (e.g., general code advice or recipes), focusing conversation entirely on RegTech ComplianceOS capabilities.

---

## 5. Security & Administrative Controls

* **Tamper-Proof Audit Logs**: Every administrative log, analyst case transition, document override, and payroll release is logged to an immutable audit ledger, recording timestamp, user ID, IP address, and changes for audit readiness.
* **Role-Based Access Control (RBAC)**: Enforces access restrictions across account profiles:
  * **Admin**: Unrestricted database access, user registrations, and integrations.
  * **Compliance Officer**: Bank desk operations, KYC reviews, and AML resolutions.
  * **HR Manager**: Fintech directories, attendance logs, payroll calculations, and shift overrides.
  * **Developer**: API key generation, webhooks setup, and integrations logs.
  * **Applicant**: Profile details collection, upload wizard, and compliance chat.

---

## 6. Access Credentials & Port Configurations

### Default Seed Accounts
For local demonstration and manual testing, use the following credentials:

| Portal Target | Login URL | Email Username | Default Password | Target Tenant ID | Role Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **🏦 Bank/Compliance Desk** | `/login/compliance` | `saikiranvakada079@gmail.com` | `saikiran` | `american-bank` | `admin` (Compliance Specialist) |
| **💼 Fintech Workspace** | `/login/fintech` | `saikiranvakada079@gmail.com` | `saikiran` | `tfg` | `admin` (HR Operations Manager) |
| **🏢 Alternate Admin** | `/login` | `admin@onboardcorp.com` | `saikiran` | `onboard-verification-corp` | `admin` (General Platform Specialist) |

---

### Mapped Port Structures
Local dev operations are configured across these active ports:

```
                  +----------------------------------------------+
                  |           Vite Client (Port 5173)            |
                  +----------------------+-----------------------+
                                         |
                                         v API Calls
                  +----------------------------------------------+
                  |          FastAPI Backend (Port 8000)         |
                  +-------+-----------------------------+--------+
                          |                             |
                          v                             v
+-------------------------+----+             +----------+----------------+
|    PostgreSQL (Port 5432)    |             |      Redis (Port 6379)     |
|   (Data & Audit Registries)  |             |  (Rate limits / simulator) |
+------------------------------+             +----------------------------+
```

* **Frontend Client (Vite Dev Server)**: `http://localhost:5173/` (also aliases on port `3000`)
* **Backend FastAPI (Uvicorn Server)**: `http://localhost:8000/`
* **Swagger API Documentation**: `http://localhost:8000/docs`
* **Local Postgres Database Instance**: Port `5432` (database schema named `regtech`)
* **Local Redis Cache Broker**: Port `6379` (DB index `0` for session and telemetry checks)
* **Live Deployment Frontend (Vercel)**: `https://regtecg.vercel.app/`

---

## 7. Operational Runbook (Deployment & Setup)

### Local Dev Environment Setup

#### 1. Backend Application Setup
1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install the dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Verify database configurations in `backend/.env`:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:postgres_pwd@localhost:5432/regtech
   REDIS_URL=redis://localhost:6379/0
   SECRET_KEY=your_hs256_symmetric_jwt_key
   GEMINI_API_KEY=your_gemini_api_credentials
   ENVIRONMENT=development
   ```
5. Apply database schema upgrades using Alembic migrations:
   ```powershell
   alembic upgrade head
   ```
6. Start the API server via Uvicorn hot-reload:
   ```powershell
   py -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

#### 2. Frontend Application Setup
1. Navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
2. Install npm package dependencies:
   ```powershell
   npm install
   ```
3. Verify dev proxy / backend URL configuration in `frontend/src/api/client.ts`.
4. Start the frontend developer hot-reload server:
   ```powershell
   npm run dev
   ```

---

### Live Environments & Continuous Integration (CI)

* **Frontend Deployments (Vercel)**:
  * Automatically synced to the Vercel Git integration. Every push to `main` triggers a production build.
  * Environment variables (like `VITE_API_URL` targeting the production backend) are configured in the Vercel Dashboard.
* **Backend Deployments (Render)**:
  * Web Service configured to deploy automatically on code updates.
  * Start command runs Uvicorn pointing to production ports:
    ```bash
    uvicorn main:app --host 0.0.0.0 --port $PORT
    ```
  * Build command includes database schema upgrades to ensure no schema drift:
    ```bash
    alembic upgrade head
    ```
