# JobFlow — Distributed Job Scheduler Platform

A production-inspired distributed job scheduling platform built with TypeScript, Express, Prisma, PostgreSQL, and React.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   React      │────▶│  Express API │────▶│   PostgreSQL     │
│   Dashboard  │ JWT │  Server      │     │   (Supabase /    │
│   (Vite)     │     │              │     │    Docker)       │
└──────────────┘     └──────┬───────┘     └────────┬─────────┘
                            │                      │
                     ┌──────┴───────┐              │
                     │  Background  │              │
                     │  Services:   │              │
                     │  - Stale     │              │
                     │    Sweeper   │              │
                     │  - Cron      │              │
                     │    Checker   │              │
                     └──────────────┘              │
                                                   │
                     ┌──────────────┐              │
                     │  Worker      │──────────────┘
                     │  Service(s)  │  SKIP LOCKED
                     │  (N instances)│
                     └──────────────┘
```

## Quick Start

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose (for local PostgreSQL)
- A Clerk account (free tier) for authentication

### 1. Clone & Install

```bash
git clone <repo-url>
cd job-scheduler
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
# Edit .env with your Clerk keys and database URL
```

### 3. Start Local PostgreSQL

```bash
docker-compose up -d
```

### 4. Run Database Migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Build Shared Package

```bash
npm run build:shared
```

### 6. Start All Services

In separate terminals:

```bash
# Terminal 1 — API Server
npm run dev:api

# Terminal 2 — Worker
npm run dev:worker

# Terminal 3 — Dashboard
npm run dev:dashboard
```

- **API**: http://localhost:4000
- **API Docs (Swagger)**: http://localhost:4000/api/docs
- **Dashboard**: http://localhost:5173
- **Health Check**: http://localhost:4000/api/health

## Project Structure

```
job-scheduler/
├── apps/
│   ├── api/                 # Express API server
│   │   └── src/
│   │       ├── middleware/  # Auth (Clerk), RBAC, validation
│   │       ├── routes/      # REST endpoints
│   │       ├── services/    # Stale sweeper, cron checker
│   │       └── lib/         # Prisma client
│   ├── worker/              # Worker service
│   │   └── src/
│   │       ├── claim.ts     # Atomic SKIP LOCKED claiming
│   │       ├── executor.ts  # Job execution + retry/DLQ
│   │       ├── handlers.ts  # Simulated job handlers
│   │       └── heartbeat.ts # Worker heartbeat sender
│   └── dashboard/           # React frontend
│       └── src/
│           ├── pages/       # Overview, Queues, Jobs, Workers, Metrics
│           ├── components/  # Layout, StatusBadge
│           └── lib/         # API client
├── packages/
│   └── shared/              # Shared types, schemas, retry logic
├── prisma/
│   └── schema.prisma        # 13 models, all indexes
├── docs/
│   └── design-decisions.md
├── docker-compose.yml
└── .env.example
```

## Key Features

- **Atomic Job Claiming**: `SELECT FOR UPDATE SKIP LOCKED` ensures no double-claiming
- **5 Job Types**: Immediate, delayed, scheduled, recurring (cron), batch
- **Smart Retries**: FIXED, LINEAR, EXPONENTIAL backoff with configurable max delay
- **Dead Letter Queue**: Failed jobs automatically move to DLQ after max attempts
- **Stale Worker Recovery**: Background sweeper detects dead workers and re-queues their jobs
- **RBAC**: Organization roles (OWNER/ADMIN/MEMBER) with enforced permissions
- **Real-time Dashboard**: React Query polling with 5s refresh interval
- **Swagger API Docs**: Auto-generated OpenAPI documentation

## Simulated Job Handlers

| Type | Duration | Failure Rate | Purpose |
|---|---|---|---|
| `send_email` | ~2s | 10% | Tests retry flow |
| `process_image` | ~5s | 15% | Tests retry + DLQ flow |
| `generate_report` | ~3s | 0% | Happy path baseline |

## Environment Variables

See [.env.example](.env.example) for all required variables.

## Testing

```bash
npm test                    # All tests
npm run test:unit           # Retry calculators, health formula
npm run test:integration    # API lifecycle flows
npm run test:concurrency    # Parallel claim safety
```

## Deployment

- **Database**: Supabase (PostgreSQL free tier)
- **API + Worker**: Render or Railway (free tier)
- **Dashboard**: Vercel (free tier)

## License

MIT
