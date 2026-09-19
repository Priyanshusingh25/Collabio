# Collabio API Reference (v1)

All endpoints are served under the `/api/v1` prefix. Every response uses the same
envelope so clients can handle success and failure uniformly.

## Response Envelope

**Success**

```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "total": 142, "hasMore": true } }
```

**Error**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "fields": { "email": "Invalid email address" },
    "requestId": "a1b2c3d4"
  }
}
```

### Error Codes

| HTTP | `error.code` | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Zod schema rejected the body/query/params |
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `AUTHENTICATION_ERROR` | Missing, expired or revoked token |
| 403 | `AUTHORIZATION_ERROR` | Role is insufficient for the action |
| 404 | `RESOURCE_NOT_FOUND` | Entity missing **or not owned by the caller** |
| 409 | `CONFLICT` | Unique constraint / invalid state transition |
| 413 | `PAYLOAD_TOO_LARGE` | Body exceeded the 10 MB limit |
| 429 | `RATE_LIMITED` | Rate limit exceeded (`Retry-After` header set) |
| 500 | `INTERNAL_ERROR` | Unexpected server error (stack never leaked) |

### Authentication

```
Authorization: Bearer <jwt>
```

Tokens are HS256 JWTs signed with `JWT_SECRET`, carrying `sub` (user id), `ver`
(token version) and an expiry. `POST /auth/logout` bumps `token_version`, which
invalidates **every** token issued to that account.

### Roles

`viewer < member < manager < admin < owner`. Write endpoints require `member` or
above; enforced server-side by `requireRole()` — never by hiding UI buttons.

### Pagination, Sorting & Filtering

Every list endpoint accepts:

| Param | Example | Notes |
| --- | --- | --- |
## Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | – | Create account, returns `{ token, user }` |
| `POST` | `/auth/login` | – | Email + password login |
| `POST` | `/auth/demo` | – | Sign in to the seeded demo workspace |
| `POST` | `/auth/logout` | ✔ | Revoke all tokens for the account |
| `GET` | `/auth/me` | ✔ | Current user profile |
| `PUT` | `/auth/me` | ✔ | Update display name / avatar / email |
| `POST` | `/auth/change-password` | ✔ | Change password (requires current password) |

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "creator@collabio.app", "password": "••••••••" }
```

---

## Deals

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/deals` | viewer | Paginated list (`status`, `stage`, `brand_id`, `priority`, `tags`, `overdue`) |
| `POST` | `/deals` | member | Create deal |
| `GET` | `/deals/:id` | viewer | Single deal with joined brand/contact |
| `PUT` | `/deals/:id` | member | Partial update |
| `POST` | `/deals/:id/move` | member | Stage transition (validated against the stage graph) |
| `GET` | `/deals/:id/health` | viewer | Explainable health score + reasons |
| `GET` | `/deals/:id/timeline` | viewer | Chronological audit timeline |
| `DELETE` | `/deals/:id` | member | Soft delete |
| `POST` | `/deals/:id/notes` | member | Attach a note |
| `DELETE` | `/deals/:id/notes/:noteId` | member | Remove a note |
| `POST` | `/deals/:id/attachments` | member | Register attachment metadata |

**Stage graph**

```
outreach → negotiating → contract_sent → in_progress → in_review
        → published → invoiced → paid
```

Any transition absent from the graph returns `409 CONFLICT`; `archived` is
reachable from every stage.

**Health score** is derived from deadline proximity, stage age, invoice/payment
state, missing contract, overdue tasks and recent activity. Each factor is
returned as a weighted reason so the UI can explain the number.

---

## Brands

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/brands` | viewer | List (`search`, `industry`, `relationship_status`, `tags`, sorting) |
| `GET` | `/brands/:id` | viewer | Brand profile |
| `POST` | `/brands` | member | Create (duplicate name → `409`) |
| `PUT` | `/brands/:id` | member | Partial update |
| `DELETE` | `/brands/:id` | member | Soft delete |

## Contacts

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/contacts` | viewer | List (`search`, `brand_id`) |
| `GET` | `/contacts/:id` | viewer | Profile + interaction history |
| `POST` | `/contacts` | member | Create (case-insensitive duplicate email → `409`) |
| `PUT` | `/contacts/:id` | member | Partial update |
| `DELETE` | `/contacts/:id` | member | Soft delete |

## Communications (interaction log)

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/communications` | viewer | Filter by `contact_id`, `brand_id`, `deal_id`, `channel` |
| `POST` | `/communications` | member | Log an email / call / meeting / DM / other |
## Invoices & Payments

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/invoices` | viewer | List (`status`, `overdue`, `brand_id`) |
| `POST` | `/invoices` | member | Create; numbers auto-generated, totals server-computed |
| `GET` | `/invoices/:id` | viewer | Invoice + payments |
| `PUT` | `/invoices/:id` | member | Update (blocked once fully paid) |
| `POST` | `/invoices/:id/payments` | member | Record a payment (partial allowed) |
| `DELETE` | `/invoices/:id` | member | Delete |

**Lifecycle:** `draft → sent → viewed → partially_paid → paid`, plus `overdue`
(derived from `due_date`) and `cancelled`.

**Server-side validation rules**

- amounts must be `>= 0`; tax rate `0–100`
- discount cannot exceed the subtotal
- `subtotal` = sum of line items; `total = subtotal − discount + tax`
- a payment may never push `amount_paid` above `total`
- invoice numbers are unique per user and generated atomically
- `issue_date` must not be after `due_date`

## Services (rate card)

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/services` | viewer | List packages (`search`, `active_only`) |
| `POST` | `/services` | member | Create package |
| `PUT` | `/services/:id` | member | Update |
| `DELETE` | `/services/:id` | member | Delete |

## Notes

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/notes` | viewer | List (`search`, `deal_id`, `brand_id`) |
| `POST` | `/notes` | member | Create |
| `PUT` | `/notes/:id` | member | Update |
| `DELETE` | `/notes/:id` | member | Delete |

## Tasks & Follow-ups

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/tasks` | viewer | List (`status`, `priority`, `deal_id`, `overdue`) |
| `POST` | `/tasks` | member | Create with `due_date`, `reminder_days_before` |
| `POST` | `/tasks/:id/status` | member | Move status (`todo` / `in_progress` / `completed` / `cancelled`) |
| `PUT` | `/tasks/:id` | member | Partial update |
| `DELETE` | `/tasks/:id` | member | Delete |

## Templates (saved message templates)

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/templates` | viewer | List by `category` (outreach, follow_up, negotiation, proposal, invoice_note, payment_reminder) |
| `POST` | `/templates` | member | Create with `{{brand}}`, `{{price}}`, … placeholders |
| `PUT` | `/templates/:id` | member | Update |
| `DELETE` | `/templates/:id` | member | Delete |

---

## Notifications

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/notifications` | viewer | Cursor-paginated feed (`category`, `unread`) |
| `GET` | `/notifications/unread-count` | viewer | `{ count }` for the bell badge |
| `POST` | `/notifications/:id/read` | viewer | Mark one read |
| `POST` | `/notifications/read-all` | viewer | Mark everything read |

Categories: `deal`, `invoice`, `payment`, `task`, `deadline`, `follow_up`, `system`.

## Activity / Audit Log

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/activity` | viewer | Cursor-paginated audit trail (`entity_type`, `entity_id`, `action`) |

Each entry records **who / what / when / from → to**.

## Search

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/search?q=` | viewer | Cross-entity search (deals, brands, contacts, invoices, notes, services) |

Results are grouped by category and capped per category so the command palette
stays fast.

## Stats & Analytics

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/stats/overview` | viewer | Dashboard KPIs, pipeline value, revenue series, upcoming deadlines |
| `GET` | `/stats/revenue` | viewer | Revenue by month / brand / platform, outstanding & overdue |
| `GET` | `/stats/forecast` | viewer | Weighted-pipeline forecast (explicitly labelled as an estimate) |

Every number is aggregated from live rows with SQL — nothing is randomised.

## Preferences

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/preferences` | viewer | Theme, currency, timezone, date format, density, notification flags |
| `PUT` | `/preferences` | member | Update preferences |
| `GET` | `/preferences/views` | viewer | Saved filter/pipeline presets |
| `POST` | `/preferences/views` | member | Save a view |
| `DELETE` | `/preferences/views/:id` | member | Delete a view |

---

## Workspace (backup / restore / import / export)

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/workspace/export` | viewer | Full JSON backup of every owned entity |
| `POST` | `/workspace/restore` | member | Transactional restore (schema-validated, rolls back on failure) |
| `GET` | `/workspace/export/:entity` | viewer | CSV export (`deals`, `brands`, `contacts`, `invoices`, `services`) |
| `POST` | `/workspace/import/preview` | member | Parse + validate + duplicate detection → summary |
| `POST` | `/workspace/import/commit` | member | Transactional insert of the confirmed rows |

Import preview returns an explicit tally — never a silent partial import:

```json
{ "valid": 42, "duplicates": 3, "invalid": 2, "errors": [{ "row": 12, "message": "Invalid email" }] }
```

## Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | – | Liveness + version + uptime |
| `GET` | `/health/database` | – | SQLite reachability, WAL mode, table row counts |

Health output never contains secrets or connection credentials.

---

## Realtime (WebSocket)

Connect to `ws://<host>/ws?token=<jwt>` (or `wss://` behind TLS).

```json
{ "type": "deal:moved", "payload": { "dealId": 12, "to": "negotiating" }, "seq": 1712345678901 }
```

| Event | Emitted when |
| --- | --- |
| `deal:created` / `deal:updated` / `deal:moved` / `deal:deleted` | Deal mutation |
| `invoice:updated` | Invoice status/amounts changed |
| `payment:recorded` | Payment logged against an invoice |
| `task:updated` | Task created / moved / edited |
| `notification:created` | New notification for the user |
| `activity:logged` | Audit entry written |
| `brand:updated` / `contact:updated` | CRM record changed |
| `stats:changed` | Aggregates invalidated |
| `presence` | User online/offline heartbeat |

Frames are versioned with `seq`. Clients reconnect with exponential backoff
(1s → 30s) and fall back to TanStack Query polling while disconnected. A `4001`
close code means the token was revoked — the client stops retrying and
re-authenticates.

---

| `PUT` | `/communications/:id` | member | Update an interaction |
| `DELETE` | `/communications/:id` | member | Delete an interaction |

---

| `page` | `1` | 1-based, default `1` |
| `limit` | `20` | max `100`, default `20` |
| `sort` | `-created_at` | prefix `-` for descending |
| `search` | `glow` | case-insensitive substring match |
| `cursor` | `1712345678` | Activity/notification feeds only |

---