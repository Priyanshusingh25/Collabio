# Changelog

## v2.0.0 — Production-Grade Upgrade

Full architectural overhaul of Collabio. Existing functionality preserved;
everything below is additive or internal refactoring.

### Architecture

- Layered backend: `routes/v1 (controllers) → services → database repository`.
  Route handlers no longer contain SQL or business logic; `crudFactory`
  generates list/get/create/update/delete services with ownership scoping,
  pagination, soft delete and audit-activity hooks.
- Versioned API under `/api/v1` with a consistent
  `{ success, data, meta }` / `{ success, error }` envelope.
- Central configuration module with startup validation (fails fast).
- Global error architecture: `AppError` subclasses + central handler +
  structured request logger (request id, route, user, duration).
- Frontend reorganized: `features/` domain hooks, `lib/` (api client, query
  client, realtime), Zustand stores, lazy-loaded routes.

### New Features

1. Global search + command palette (`Ctrl/Cmd+K`) with categorized results,
   keyboard navigation, recent searches.
2. Advanced pipeline: drag & drop with stage-transition validation, filters,
   sorting, priority, due dates, overdue indicators, weighted value.
3. Deal health scores (explainable: Healthy / Attention / At Risk).
4. Deal timeline (chronological audit events per deal).
5. Activity / audit log (WHO/WHAT/WHEN/FROM→TO) with cursor pagination.
6. Tasks & follow-ups with priorities, linked deals, reminder lead time.
7. Server-side follow-up reminder job → notification generation.
8. Notification center: categories, unread count, mark read/all, live push.
9. Global toast system (success/error/warning/info/loading, deduped).
10. Brand CRM fields (industry, socials, relationship status, tags).
11. Contact management with duplicate prevention and interaction history.
12. Communication log (email/call/meeting/DM/WhatsApp/LinkedIn).
13. Invoice lifecycle (Draft→Sent→Viewed→Partial→Paid/Overdue/Cancelled)
    with auto numbering and subtotal/tax/discount/total math.
14. Invoice validation (duplicate numbers, negative amounts, invalid dates,
    over-payment protection).
15. Payment tracking with methods, references, partial payments.
16. Revenue analytics from real data (monthly/quarterly, by brand/platform,
    conversion rate, outstanding/overdue).
17. Explainable revenue forecasting (weighted pipeline + conversion rate).
18. Creator rate card (packages, turnaround, revisions, active flag).
19. Proposal generator with `{{variables}}`, preview and copy.
20. Saved message templates (outreach/follow-up/negotiation/invoice).
21. Tags on deals/brands/contacts/tasks + tag filtering.
22. Advanced filtering + saved filter views.
23. Bulk operations with confirmation.
24. CSV/JSON import with validation, duplicate detection, preview,
    transactional commit and summary.
25. Full workspace JSON backup.
26. Validated restore with schema checks and rollback.
27. Command palette actions (create/navigate/export).
28. Keyboard shortcuts (`Ctrl+K`, `N`, `D`, `B`, `I`, `T`, `Esc`).
29. Offline/network resilience: online detection, banner, query retries,
    realtime fallback to refetch.
30. User preferences (theme, density, pipeline view, currency, defaults)
    persisted server-side.

### Security

- JWT with per-user token version (logout revokes all sessions), expiry.
- Role middleware (`requireRole`) — authorization enforced server-side.
- Zod validation on every endpoint (body/params/query).
- Ownership scoping on all queries (multi-tenant safe).
- Rate limiting (global + stricter auth limiter), security headers,
  restricted CORS, no secret logging, parameterized SQL.

### Real-Time

- Authenticated WebSocket gateway (`/ws`) with reconnect + exponential
  backoff, duplicate-safe cache patching, connection indicator, and
  events for deals, invoices, payments, tasks, brands, contacts,
  notifications, activity and stats.

### Database

- Migration framework (tracked, idempotent, auto-run on boot) + CLI
  (`db:migrate`, `db:seed`, `db:status`, `db:reset`).
- New tables: tasks, communications, templates, notifications, activity,
  preferences, payments, tags, saved views; audit columns + indexes +
  soft deletes on core entities.
- Foreign keys with ON DELETE rules; transactions for multi-step mutations
  (import, restore, invoice+payment).
- Realistic idempotent demo seed.

### Performance & UX

- Lazy-loaded routes + code splitting; TanStack Query caching with stale
  times, request dedup, retries and background refetch; debounced search;
  skeleton/empty/error states everywhere; confirmation dialogs for
  destructive actions; mobile drawer navigation; responsive tables/Kanban
  down to 320px; accessibility (ARIA, focus states, keyboard access).

### Testing & Tooling

- Unit suites (`node:test`): Zod validators, invoice math, error classes.
- HTTP smoke suite covering auth, deals, brands, contacts, invoices,
  payments, tasks, search, stats, notifications, backup/export.
- ESLint 9 flat config; GitHub Actions CI (lint → unit → smoke → build).
- Docs: README, ARCHITECTURE, API, DEVELOPMENT, CHANGELOG, `.env.example`.
