# Collabio — Development Guide

Conventions, workflow and commands for working on Collabio.

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9

## Local Workflow

```bash
npm run install:all   # root + client deps
npm run dev           # API (:3001) + Vite client (:5173) with /api + /ws proxy
```

The Vite dev server proxies `/api` and `/ws` to the Express server, so the
client uses same-origin relative URLs in dev and production.

### Database

SQLite lives at `server/db/collabio.db` (WAL mode, foreign keys ON).
Schema changes are **migrations** — never edit `schema.js` expectations
without adding a migration in `server/src/database/migrations.js`.

```bash
npm run db:migrate    # apply pending migrations (idempotent, tracked)
npm run db:seed       # idempotent demo seed (Alex Rivera workspace)
npm run db:status     # show DB path, applied migrations, row counts
npm run db:reset      # local dev only: wipe & recreate
```

Migrations run automatically on server boot; `db:migrate` is for CI/explicit use.

## Architecture Rules

1. **Routes are controllers.** Parse → validate (Zod) → call a service →
   respond via `ok()/created()` helpers. No SQL, no business rules in routes.
2. **Services own business logic** and publish domain events via
   `events/bus`. `crudFactory.js` generates list/get/create/update/delete
   services with ownership scoping, pagination and soft delete.
3. **All persistence goes through `database/db.js`** helpers (`all`, `get`,
   `run`, `tx`). SQL is always parameterized.
4. **Every table query filters by `user_id`** (ownership scoping) unless the
   middleware chain guarantees it.
5. **Validation** lives in `server/src/validators/schemas.js` (Zod). Body,
   params and query are validated via `middleware/validate.js`.
6. **Client pages never call `fetch`** — they use feature hooks
   (`features/<domain>/hooks.js`) built on TanStack Query.
7. **Server state lives only in the Query cache.** Client-only state
   (modals, theme, density, filters) lives in Zustand stores.
8. **Realtime**: services publish; `websocket/index.js` fans out to the
   owning user's sockets; `useRealtimeCacheSync` patches the query cache.

## Naming Conventions

- JS modules: `camelCase.js`; React components: `PascalCase.jsx`.
- Constants: `UPPER_SNAKE_CASE`. Database tables/columns: `snake_case`.
- API paths: `/api/v1/<resource>`, plural, kebab-case for multiword segments.

## Error Handling

- Throw `AppError` (see `server/src/utils/AppError.js`) subclasses —
  `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`,
  `ConflictError`, `RateLimitError`. The global handler maps them to HTTP
  status + the standard envelope:
  `{ success:false, error:{ code, message, fields? } }`.
- Never leak stack traces or driver messages to clients; they are logged
  server-side with request id, route, user id and duration.

## Testing

```bash
npm run test:unit     # node --test server/tests/unit/*.test.js
npm run test:smoke    # boots a throwaway DB on a random port, hits the API
npm test              # both
```

- Unit suites cover Zod schemas, invoice math and error classes — no DB
  needed, run in milliseconds.
- The smoke suite covers register/login, deal CRUD + stage moves, brands,
  contacts, invoices + payments, tasks, search, stats, notifications,
  backup/export and validation failures against a real HTTP server.
- When adding a feature, add at least one smoke test per new endpoint and
  unit tests for any new pure logic.

## Linting

ESLint 9 (flat config, `eslint.config.js`) covers `server/` and `client/`.

```bash
npm run lint          # errors only (CI gate)
npm run lint:report   # full stylish output
```

## Adding a New Domain Entity (checklist)

1. Migration: table with `id`, `user_id`, timestamps, `deleted_at`, indexes.
2. Zod create/update schemas in `validators/schemas.js`.
3. Service (extend `crudFactory` if it's a standard resource) + event bus
   publishes on mutations.
4. Route file in `routes/v1/` using `validate()` + service; register it in
   `server/index.js`.
5. Client: endpoints in `lib/api.js`, hooks in `features/<domain>/hooks.js`,
   page in `pages/`, nav entry in `components/Sidebar.jsx`.
6. Smoke test + unit test where applicable; update `API.md`.
