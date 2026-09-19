# Collabio — Architecture

> System design for the production-grade Collabio Creator CRM / Deal Management platform.

---

## 1. System Architecture

Collabio is a layered, decoupled client–server application. Every request travels
through the same disciplined path; no route handler touches the database directly.

```text
                    +-------------------------------------------+
                    |  React 18 SPA  (Vite, port 5173)          |
                    |  Pages -> Features -> Hooks -> Query/Api  |
                    +-------------------+-----------------------+
                                        |
                     HTTPS . REST (/api/v1)  .  WebSocket (/ws)
                                        |
                    +-------------------v-----------------------+
                    |  Express 4 API  (port 3001)               |
                    |                                           |
                    |  middleware  ->  rate limit, security      |
                    |                  headers, CORS, request    |
                    |                  logging, structured errors|
                    |  routes      ->  controllers (thin)        |
                    |  validators  ->  Zod schemas               |
                    |  services    ->  business logic            |
                    |  repositories->  src/database/db.js        |
                    +-------------------+-----------------------+
                                        |  SQL (parameterised)
                    +-------------------v-----------------------+
                    |  SQLite 3  (WAL, foreign keys ON)         |
                    |  server/db/collabio.db                    |
                    +-------------------------------------------+
```

Real-time is orthogonal: services publish domain events on an in-process bus;
the WebSocket gateway fans them out to the owning user's sockets.

```text
service mutation --> events/bus.publish() --> websocket/index.js
                                                   |
                                    broadcastToUser(ownerId, event)
                                                   |
                          client lib/realtime.js --> useRealtimeCacheSync()
                                                   |
                                        TanStack Query cache patch
```

---

## 2. Frontend Architecture

```text
client/src/
  features/      domain hooks: deals, brands, contacts, invoices,
                 tasks, notifications, analytics, workspace
  components/    layout + shared UI (Sidebar, TopHeader, modals,
                 ErrorBoundary, States, ConnectionIndicator,
                 NotificationBell, CommandPalette)
  hooks/         cross-cutting hooks (useRealtime, useDebouncedValue,
                 useOnlineStatus, useRealtimeCacheSync)
  lib/           api.js (fetch client), queryClient.js (cache config),
                 realtime.js (socket lifecycle)
  pages/         route-level screens (lazy-loaded)
  stores/        Zustand stores (authStore, uiStore)
  context/       React contexts that still carry provider contracts
                 (AuthContext over the Zustand store, ToastContext)
  utils/         formatting helpers (currency, dates, deadline logic)
```

**Data flow**

```text
Page  --uses-->  feature hook (useDeals / useCreateDeal / ...)
                        |
                        +-- reads  --> TanStack Query cache --> lib/api.js
                        +-- writes --> useMutation --> optimistic patch
                                                  --> invalidate/rollback
```

Rules that hold throughout the client:

- Pages never call `fetch` directly; they use feature hooks.
- Server data lives **only** in the TanStack Query cache.
- UI-only state (sidebar, modals, filters, theme, density) lives in Zustand.
- Every async view has loading, empty, and error states.
