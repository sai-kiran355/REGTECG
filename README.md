# RegTech Compliance OS

A multi-tenant AML/KYC/Sanctions compliance platform for banks and fintechs.  
Single FastAPI backend + React 18 frontend with clear module boundaries.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.12 | Backend runtime |
| Node.js | ≥ 20.x | Frontend dev server |
| PostgreSQL | ≥ 15 | Primary database |
| Redis | ≥ 7 | Session store, rate limiting |

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/sai-kiran355/REGTECG.git
cd REGTECG
```

### 2. Set up the backend

```bash
cd backend
pip install -e ".[dev]"
```

Copy the env template and fill in your values:

```bash
cp .env.example .env
```

Edit `backend/.env` — set your PostgreSQL connection string and a random `SECRET_KEY` (minimum 32 characters).

### 3. Run database migrations

```bash
cd backend
alembic upgrade head
```

This creates all tables and seeds the four built-in roles (`admin`, `analyst`, `auditor`, `viewer`).

### 4. Start the backend

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Set up and start the frontend

```bash
cd frontend
npm install
npm run dev
```

### 6. Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (dev only) | http://localhost:8000/docs |

---

## Environment Variables

All variables are loaded from `backend/.env`. See `backend/.env.example` for the full list.

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL async connection string | `postgresql+asyncpg://postgres:password@localhost:5432/regtech` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | Random secret for JWT signing (HS256) | generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ENVIRONMENT` | `development`, `staging`, or `production` | `development` |
| `APP_VERSION` | Semantic version | `0.1.0` |

### Optional (with defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Log level |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | JWT access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL |
| `BCRYPT_COST` | `12` | bcrypt cost factor |
| `RATE_LIMIT_ATTEMPTS` | `5` | Failed logins before lockout |
| `RATE_LIMIT_WINDOW_SECONDS` | `900` | Lockout window (15 min) |

---

## How to Run Tests

### Backend

```bash
cd backend
pytest --cov=backend --cov-report=term-missing
```

Run specific test suites:

```bash
pytest backend/tests/unit/ -v           # Unit tests
pytest backend/tests/properties/ -v     # Property-based tests
pytest backend/tests/integration/ -v    # Integration tests (needs live DB + Redis)
```

### Frontend

```bash
cd frontend
npm run test -- --run
```

### Linting

```bash
# Backend
cd backend && ruff check . && mypy .

# Frontend
cd frontend && npm run lint
```

---

## Project Structure

```
REGTECG/
├── backend/
│   ├── api/v1/          # FastAPI routers
│   ├── core/            # Config, security, logging, middleware, Redis
│   ├── db/              # Async engine, session factory, Base model
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   ├── crud/            # Database helpers
│   ├── migrations/      # Alembic migrations
│   ├── tests/           # Unit, integration, property tests
│   ├── .env.example     # Environment variable template
│   └── main.py          # Application entry point
└── frontend/
    └── src/
        ├── api/         # Typed API clients
        ├── components/  # Shared UI components
        ├── pages/       # Route-level pages
        │   ├── portal/  # Customer KYC portal
        │   └── applicant/ # Customer account portal
        ├── store/       # Zustand state management
        └── App.tsx      # Route definitions
```

---

## Architecture

- **Multi-tenant** — each bank gets its own tenant. Staff log in at `/login`, customers use `/apply/login?tenant=your-bank`.
- **Authentication** — HS256 JWT access tokens (15-min TTL) + Redis-backed refresh tokens (7-day TTL). Automatic silent refresh.
- **RBAC** — four roles: `admin`, `analyst`, `auditor`, `viewer` with fixed permission matrix.
- **Customer portal** — banks share a link (`/portal/apply?tenant=slug`) with their customers for KYC submission.
- **Chat** — compliance officers and applicants can message each other per case.
- **Audit log** — every action is recorded permanently with no delete endpoint.

---

## User Flows

### Staff (bank/fintech)
1. Sign up at `/signup` → creates your organisation and admin account
2. Log in at `/login` → access compliance dashboard
3. Share customer portal links from the Dashboard → Customer Portal Links section
4. Review KYC applications, manage cases, screen for sanctions and AML

### Customer (applicant)
1. Open the link your bank shared: `/portal/apply?tenant=your-bank`
2. Or create an account at `/apply/signup?tenant=your-bank`
3. Submit KYC, track status, chat with compliance officer
