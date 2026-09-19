# Collabio 🤝 — Creator CRM & Deal Management Platform

A production-grade Personal Deal Manager for creators: manage brand
collaborations, sponsorships, leads, deals, invoices, services, tasks and
payments — with real-time updates, analytics, audit logging, import/export
and offline resilience.

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite%203-WAL-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Tests](https://img.shields.io/badge/tests-node:test%20%2B%20smoke-3fb950)]()

## Highlights

- **Deal pipeline** — drag & drop Kanban with stage-transition validation,
  optimistic updates and real-time sync across tabs.
- **Deal health scores** — explainable scoring (deadline proximity, stage age,
  payment status, missing deliverables) → Healthy / Attention / At Risk.
- **Invoices & payments** — full lifecycle (Draft → Sent → Viewed → Partial →
  Paid / Overdue / Cancelled), auto numbering, tax/discount math, partial
  payments, outstanding tracking.
- **Tasks & follow-ups** — priorities, due dates, linked deals, reminder lead
  time; server-side reminder job generates notifications.
- **Real-time layer** — authenticated WebSocket (`/ws`) with reconnect +
  backoff, connection indicator (● Live / ● Reconnecting / ● Offline) and
  graceful fallback to query refetch.
- **Analytics & forecasting** — revenue by month/brand/platform, conversion
  rate, outstanding & overdue amounts, weighted-pipeline forecast (clearly
  labeled as estimates).
- **Global search & command palette** — `Ctrl/Cmd + K`, categorized results,
  keyboard navigation, recent searches; shortcuts (`N`, `D`, `B`, `I`, `T`).
- **Activity / audit log** — WHO / WHAT / WHEN / FROM → TO for every mutation.
- **Notification center** — categorized, unread counts, mark read/all,
  delivered live over WebSocket.
- **Import / export** — CSV + JSON import with validation, duplicate
  detection, preview and transactional commit; full workspace JSON backup and
  validated restore.
- **Security** — bcrypt hashing, JWT with token-version revocation, Zod
  validation on every endpoint, per-user ownership scoping, role middleware,
  rate limiting, security headers, parameterized SQL, structured logging
  without secrets.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, TanStack Query, Zustand, Recharts, `@hello-pangea/dnd`, Lucide |
| Backend | Node.js, Express 4, Zod, JWT, bcryptjs, `ws` |
| Database | SQLite 3 (WAL mode, foreign keys, migrations, seeds) |
| Tooling | ESLint 9, `node:test` unit suites, HTTP smoke suite |

## Quick Start

```bash
# 1. install everything
npm run install:all

# 2. configure (optional — sensible dev defaults are built in)
cp .env.example .env

# 3. run API + client together
npm run dev
# app  → http://localhost:5173
# api  → http://localhost:3001/api/v1/health
```

Or step by step:

```bash
npm run db:migrate     # apply schema migrations
npm run db:seed        # create the demo user + realistic demo data
npm start              # API only on :3001
npm run client         # Vite dev server on :5173
```

## 1-Click Demo

On the login screen click **“1-Click Demo (Alex Rivera)”** — the server
provisions a demo creator workspace with realistic brands (Notion, Sony,
Epidemic Sound, Figma, Skillshare, NordVPN), deals across every pipeline
stage, itemized invoices, payments, tasks, activity history and
notifications.

## Project Structure

```text
Collabio/
├── client/                        # Vite React SPA
│   └── src/
│       ├── features/              # domain hooks (deals, brands, contacts,
│       │                          # invoices, tasks, notifications, analytics,
│       │                          # workspace)
│       ├── components/            # layout + shared UI (Sidebar, TopHeader,
│       │                          # CommandPalette, modals, States…)
│       ├── hooks/                 # useRealtime, useDebouncedValue, …
│       ├── lib/                   # api.js, queryClient.js, realtime.js
│       ├── pages/                 # route screens (lazy-loaded)
│       ├── stores/                # Zustand (authStore, uiStore)
│       ├── context/               # AuthContext, ToastProvider
│       └── utils/                 # formatting helpers
├── server/
│   ├── index.js                   # app entry: middleware, routes, WS, jobs
│   └── src/
│       ├── config/                # validated env configuration
│       ├── routes/v1/             # versioned controllers (thin)
│       ├── services/              # business logic + crudFactory
│       ├── validators/            # Zod schemas (shared across routes)
│       ├── middleware/            # auth (JWT + roles), rate limit, errors,
│       │                          # request logging, validation
│       ├── database/              # db.js (repository layer), schema,
│       │                          # migrations, seeds, CLI
│       ├── websocket/             # authenticated WS gateway
│       ├── events/                # in-process event bus
│       └── utils/                 # AppError, apiResponse, logger
├── server/tests/                  # unit suites + HTTP smoke suite
├── .github/workflows/             # CI: lint → tests → build
├── API.md · ARCHITECTURE.md · DEVELOPMENT.md · CHANGELOG.md
└── .env.example
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + client together (concurrently) |
| `npm start` | API only (`:3001`) |
| `npm run client` | Vite dev server (`:5173`, proxies `/api` and `/ws`) |
| `npm run build` | Production client build |
| `npm run lint` | ESLint (quiet) |
| `npm run test:unit` | Node unit suites (validators, invoice math, errors) |
| `npm run test:smoke` | HTTP integration suite (boots a throwaway DB) |
| `npm test` | unit + smoke |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed demo user + realistic data |
| `npm run db:status` | Show DB path, migration + row status |
| `npm run db:reset` | Drop & recreate the local dev database |

## Environment Variables

See [.env.example](.env.example). Required in production:
`JWT_SECRET`, `CLIENT_URL`, `NODE_ENV=production`. In development the server
fails fast with a clear message when mandatory configuration is missing.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — system, frontend, backend, database,
  state-management and realtime architecture.
- [API.md](API.md) — every `/api/v1` endpoint, envelope, WebSocket events.
- [DEVELOPMENT.md](DEVELOPMENT.md) — local workflow, conventions, testing.
- [CHANGELOG.md](CHANGELOG.md) — what changed in this upgrade.
- [UPGRADE_AUDIT.md](UPGRADE_AUDIT.md) — Phase-1 audit of the legacy codebase.

## Testing & CI

```bash
npm test                      # unit + integration (HTTP smoke) suites
npm run lint                  # ESLint
npm run build                 # production build
```

GitHub Actions runs install → lint → unit tests → smoke tests → build on
every push/PR (`.github/workflows/ci.yml`).

## Security

- Parameterized SQL everywhere; no string-built queries.
- Every list/read/write is scoped to the authenticated user's data.
- Zod validation on body, params and query; consistent error envelope.
- JWT revoked server-side on logout via per-user token version.
- bcrypt password hashing with strength checks; rate-limited auth endpoints.
- Security headers, restricted CORS, structured logs that never log
  credentials or tokens.
