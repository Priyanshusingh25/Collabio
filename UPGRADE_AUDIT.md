# Collabio — Production Upgrade Audit

**Date:** 2026-09-18 · **Phase:** 1 (Audit) · **Scope:** full repository review before any modification

---

## 1. Current State Summary

| Layer | Files | Verdict |
|---|---|---|
| Server | `server/index.js` (monolith: security headers, rate limiter, CORS, health, 404, error handler all inline) | Needs split into config / middleware / routes / services / websocket |
| DB | `server/db/database.js` (schema + promisified helpers + 200-line seed in one file) | Needs migration system, indexes, soft deletes, audit fields |
| Routes | 9 route files, each containing HTTP + business logic + SQL inline | Needs controller/service/repository separation |
| Client | Vite + React 18, 10 pages, 5 components, hand-rolled `fetch` wrapper, 2 contexts | Needs centralized state (server + client), feature modules |
| Tests / CI / Docs | none | Must be added |

## 2. Bugs / Correctness Issues Found

1. **IDOR (high):** `POST /api/deals/:id/notes` never verifies the target deal belongs to `req.userId` — any authenticated user can attach notes to another user's deal.
2. **Cross-tenant read (high):** `GET /api/brands/:id` loads deals with `WHERE brand_id = ?` and **no `user_id` filter**; `DELETE /api/deals/:id/notes/:noteId` also filters only by `user_id` of the note.
3. **Secret fallback (high):** `JWT_SECRET` falls back to a hard-coded string, enabling token forgery in any deployment without the env var. Tokens valid **30 days**, no refresh/rotation/revocation.
4. **Raw error leakage:** every route returns `res.status(500).json({ error: err.message })` — leaks SQL/schema details to clients.
5. **No input validation anywhere:** deal values, dates, enums, emails accepted as-is; `status` accepts arbitrary strings; invoice `total_amount` can be negative; payments exceed totals (no payment system at all).
6. **Health endpoint info disclosure:** `/api/health` exposes DB file path and internals to unauthenticated callers.
7. **Rate limiter memory leak:** `authAttempts` map entries never expire (only reset on access).
8. **Demo seeding on register:** every new signup gets "Sample Brand / Sample Integration" placeholder data (fake-looking) — replaced by clean starter data.
9. **Duplicate-submit & double-click hazards:** modals disable buttons (good) but no request de-duplication at API layer; `ToastContext` uses `Date.now()` ids (collision on rapid calls) and cannot dedupe.
10. **`date-fns` present in node_modules but unused** in client `package.json` — dead dependency from earlier history.
11. **Contacts↔deals link by string match** (`d.contact_email = c.email OR d.contact_name = c.name`) — fragile N+1-prone join.
12. **Client passes `paid_at: undefined`** in drag update — harmless but semantically wrong; paid_at set client-side rather than derived server-side from actual payment records.

## 3. Architecture Problems

- Business logic (stage transitions, revenue math, invoice totals) lives inside route handlers.
- No pagination anywhere (`SELECT * FROM deals`), no sorting/filtering contracts, no consistent response envelope.
- No real-time layer; every page refetches on mount; duplicate API calls (Dashboard + CommandPalette both load all deals/brands/contacts/invoices).
- No migration system — schema drift is invisible; `CREATE TABLE IF NOT EXISTS` only.
- No indexes beyond implicit PKs; `LIKE '%q%'` searches are full scans.
- No soft deletion, no audit fields (`created_by/updated_by/deleted_at`), no activity log.
- State: all server data in local component state, refetched ad hoc; no cache, no dedupe, no optimistic updates except Pipeline drag (hand-rolled).
- Styling: one large global CSS with strong design tokens (good bones — preserved), but no responsive mobile drawer for sidebar, tables/Kanban degrade below 768px.

## 4. Missing Functionality (gap vs. target feature list)

Tasks, notifications, activity/audit log, communications log, payments, invoice lifecycle (sent/viewed/partial/overdue), templates, tags, global search, preferences, backup/restore, import/export, forecasting, deal health score, weighted pipeline, attachments, follow-up automation, keyboard shortcuts beyond Cmd+K, offline handling, RBAC-ready data model.

## 5. Decisions

| Decision | Rationale |
|---|---|
| Keep JavaScript (no TS migration) | Full TS migration of ~30 files risks regressions; type-critical modules get JSDoc types. Documented as follow-up. |
| Keep SQLite via `sqlite3` | Existing production DB file preserved; migrations are additive (ALTER/CREATE) and never destructive. |
| Add `zod`, `ws`, `dotenv` (server) and `@tanstack/react-query`, `zustand`, `zod` (client) | All explicitly required by the brief; no other new runtime deps. |
| Version API at `/api/v1/*`, keep legacy `/api/*` mounted on the same routers | Existing client keeps working during migration; new client uses v1. |
| Realtime via `ws` (not Socket.IO) | Same HTTP server, zero external service, full control of reconnect/versioning. |
| Tags stored as JSON columns | Personal-scale CRM; normalized tag tables deferred (documented). |
| Revenue = real invoice payments | Moves stats from `deals.status='paid'` to actual `payments` rows while keeping deal-status signals for pipeline metrics. |
