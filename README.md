# RegTech Compliance OS

A multi-tenant AML/KYC/Sanctions compliance platform for banks and fintechs.  
Monolith-first architecture: single FastAPI backend + React 18 frontend, with clear internal module boundaries for future microservice extraction.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Docker | ≥ 24.x |
| Docker Compose | ≥ 2.x (plugin) |
| Python | 3.12 (for local backend dev without Docker) |
| Node.js | ≥ 20.x (for local frontend dev without Docker) |
| OpenSSL | any recent version (for generating JWT keys) |

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/regtech-compliance-os.git
cd regtech-compliance-os
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` and fill in real values for every variable (see [Environment Variables](#environment-variables) below).  
Generate RS256 keys with:

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Paste the PEM content into `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` in `.env`, replacing literal newlines with `\n`.

### 3. Start the full stack

```bash
docker compose up --build
```

Services will start in dependency order (PostgreSQL and Redis must pass healthchecks before the backend starts).

| Service  | URL                        |
|----------|----------------------------|
| Backend  | http://localhost:8000      |
| API Docs | http://localhost:8000/docs |
| Frontend | http://localhost:3000      |
| PostgreSQL | localhost:5432           |
| Redis    | localhost:6379             |

### 4. Apply database migrations

```bash
docker compose exec backend alembic upgrade head
```

This creates all tables in the `public` schema and seeds the four built-in roles.

---

## Environment Variables

All variables are loaded from `.env` at the project root (see `.env.example` for the full list with descriptions).

### Required — no defaults

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL async connection string, e.g. `postgresql+asyncpg://user:pass@db:5432/regtech` |
| `REDIS_URL` | Redis connection string, e.g. `redis://redis:6379/0` |
| `JWT_PRIVATE_KEY` | RS256 private key PEM (newlines as `\n`) |
| `JWT_PUBLIC_KEY` | RS256 public key PEM (newlines as `\n`) |
| `SECRET_KEY` | Long random string for additional signing needs |
| `ENVIRONMENT` | `development`, `staging`, or `production` |
| `APP_VERSION` | Semantic version string, e.g. `0.1.0` |

### Optional — with defaults

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Structlog log level |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | JWT access token TTL in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL in days |
| `BCRYPT_COST` | `12` | bcrypt cost factor (≥ 12) |
| `RATE_LIMIT_ATTEMPTS` | `5` | Failed login attempts before rate-limit |
| `RATE_LIMIT_WINDOW_SECONDS` | `900` | Rate-limit window in seconds (15 min) |

The backend validates all required variables at startup and exits with a non-zero status code if any are missing or invalid.

---

## How to Run Tests

### Backend

```bash
# Inside Docker
docker compose exec backend pytest

# Locally (requires a running PostgreSQL + Redis, or use fakeredis for unit tests)
cd backend
pip install -e ".[dev]"
pytest --cov=backend --cov-report=term-missing
```

Run only property-based tests:

```bash
pytest backend/tests/properties/ -v
```

Run only unit tests:

```bash
pytest backend/tests/unit/ -v
```

Run only integration tests (requires live DB + Redis):

```bash
pytest backend/tests/integration/ -v
```

### Frontend

```bash
# Inside Docker
docker compose exec frontend npm run test -- --run

# Locally
cd frontend
npm install
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
regtech-compliance-os/
├── backend/
│   ├── api/v1/          # FastAPI routers and dependencies
│   ├── core/            # Config, security, logging, middleware
│   ├── db/              # Async engine, session factory, Base model
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic request/response schemas
│   ├── services/        # Business logic (auth, tenant)
│   ├── crud/            # Database CRUD helpers
│   ├── workers/         # Background task placeholders
│   ├── migrations/      # Alembic migration scripts
│   └── tests/           # Unit, integration, property, and smoke tests
├── frontend/
│   └── src/
│       ├── api/         # Typed API clients
│       ├── components/  # Shared UI components
│       ├── pages/       # Route-level pages
│       ├── hooks/       # Custom React hooks
│       ├── store/       # State management
│       └── utils/       # Pure utility functions
├── .env.example         # Template for required environment variables
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## Architecture Notes

- **Multi-tenant**: Each tenant gets a dedicated PostgreSQL schema (`tenant_{slug}`). The `X-Tenant-ID` header is required on all non-excluded API paths.
- **Authentication**: RS256 JWT access tokens (15-min TTL) + Redis-backed refresh tokens (7-day TTL).
- **RBAC**: Four built-in roles — `admin`, `analyst`, `auditor`, `viewer` — with a fixed permission matrix.
- **Observability**: Structured JSON logs via `structlog` on every request, including `request_id` (UUID v4) echoed in the `X-Request-ID` response header.
