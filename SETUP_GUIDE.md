# Collabio 🛠️ — Developer Setup & Database Guide

Welcome to the Collabio developer guide. This document provides complete instructions on running, configuring, inspecting, and scaling Collabio's backend, frontend, and database layers.

---

## Table of Contents
1. [Environment & Prerequisites](#1-environment--prerequisites)
2. [Step-by-Step Run Setup Guide](#2-step-by-step-run-setup-guide)
3. [Database Architecture & Persistence](#3-database-architecture--persistence)
4. [Why It Was Asking to Sign Up Every Time](#4-why-it-was-asking-to-sign-up-every-time)
5. [Database Comparison: SQLite vs PostgreSQL vs MongoDB](#5-database-comparison-sqlite-vs-postgresql-vs-mongodb)
6. [How to Migrate to PostgreSQL (Production)](#6-how-to-migrate-to-postgresql-production)
7. [How to Migrate to MongoDB](#7-how-to-migrate-to-mongodb)
8. [Inspection, Backup & Troubleshooting](#8-inspection-backup--troubleshooting)

---

## 1. Environment & Prerequisites

Ensure the following tools are installed on your host system:
- **Node.js**: `v18.x` or `v20.x+` (LTS recommended). Check with `node -v`.
- **npm**: `v9.x+` or `v10.x+`. Check with `npm -v`.
- **Operating System**: macOS, Linux, or Windows (PowerShell / Command Prompt).

---

## 2. Step-by-Step Run Setup Guide

### Step 1: Clone or Navigate to the Repository
```bash
cd Collabio
```

### Step 2: Install All Dependencies
Collabio contains both root (server) and `client/` (React SPA) packages. A helper script installs both:
```bash
npm run install:all
```
*(Alternatively: run `npm install` in the root, followed by `npm install --prefix client`).*

### Step 3: Run Development Servers
Launch both the Express backend API and the Vite frontend dev server with a single command:
```bash
npm run dev
```
Behind the scenes, this executes `concurrently`:
- **Backend API**: Running on port `3001` (`node server/index.js`).
- **Frontend App**: Running on port `5173` via Vite with HMR (`npm --prefix client run dev`).

### Step 4: Open the Application
Open your browser and navigate to:
```
http://localhost:5173
```

---

## 3. Database Architecture & Persistence

Collabio is powered by **SQLite 3** (`sqlite3` driver) located at:
```
server/db/collabio.db
```

### How Data Is Persisted:
- **ACID Compliant**: Transactions are durable and written straight to disk in the `server/db/` directory.
- **WAL Mode (Write-Ahead Logging)**: Configured with `PRAGMA journal_mode = WAL;`, allowing concurrent readers without blocking writes.
- **Foreign Key Constraints**: Enabled with `PRAGMA foreign_keys = ON;`, ensuring relational integrity with cascading deletes across deals, brands, and invoices.
- **Table Schemas**:
  - `users`: ID, username, email, bcrypt password hash, avatar emoji, timestamp.
  - `brands`: Partner company directory, contacts, websites, notes.
  - `deals`: Sponsorship pipeline records, deal value, currencies, platforms, stages, deadlines.
  - `invoices`: Itemized invoices, due dates, statuses (`draft`, `sent`, `paid`), line item JSON.
  - `contacts`: Brand partnership leads, platform sources, email/phone.
  - `services`: Creator rate card packages.
  - `quick_notes`: Pitch scripts and sponsorship playbooks.
  - `user_settings`: Creator bio, portfolio links, registered business entity details.

---

## 4. Why It Was Asking to Sign Up Every Time

If you noticed the app prompting for registration on repeated visits, here is the technical explanation of what caused that behavior:

1. **No Default Seeded Demo Account**: Initially, the app did not have a standard pre-configured demo account with known credentials.
2. **Misleading Login Banner**: The login page contained a note saying *"🎯 Demo — register a new account to get sample data loaded automatically"*. This led users to believe registration was mandatory each time they tested the app.
3. **Email Collision (409 Conflict)**: When trying to register an already-used email, the backend rejected it (`409: User with that email or username already exists`), forcing you to invent dummy emails repeatedly.
4. **Missing Navigation Auto-Redirect**: Visiting `/login` did not automatically check if a valid JWT token was already active in `localStorage`, rendering the login form instead of forwarding to `/dashboard`.

### How This Has Been Fixed:
- ✅ **1-Click Demo Login**: Added instant one-click login for **Alex Rivera** (`demo@collabio.app` / `creator123`), pre-populated with realistic deals, brands, and invoices.
- ✅ **Auto-Redirect**: If an active session exists, visiting `/login` routes immediately to `/dashboard`.
- ✅ **Remember Me**: Email caching and robust session restoration in `AuthContext`.
- ✅ **Real-time DB Status Badge**: Live status indicator in the sidebar and login page confirming persistent SQLite disk connection.

---

## 5. Database Comparison: SQLite vs PostgreSQL vs MongoDB

| Feature | SQLite 3 (Current) | PostgreSQL (Recommended for Cloud) | MongoDB |
|---|---|---|---|
| **Setup Complexity** | Zero-config, single file on disk | Requires local server or cloud URI | Requires local daemon or Atlas URI |
| **Best Used For** | Local dev, desktop apps, single-instance CRM | Multi-tenant SaaS, production cloud, strict relational reporting | Unstructured logs, event streams, content trees |
| **Relational Integrity** | ✅ Full SQL & foreign keys | ✅ Enterprise-grade SQL, ACID, joins | ⚠️ Document joins require `$lookup` aggregation |
| **Pipeline & Analytics** | Fast indexed SQL queries | High-performance aggregations & window functions | Document-based pipeline |
| **Backup Simplicity** | 1-file copy (`collabio.db`) | `pg_dump` or managed snapshots | `mongodump` |

**Verdict for a Creator CRM:**
Because a deal manager is inherently relational (*Users -> Deals -> Brands -> Invoices -> Line Items*), **SQL engines (SQLite or PostgreSQL) are technically superior to document stores like MongoDB**.

---

## 6. How to Migrate to PostgreSQL (Production)

If you plan to deploy Collabio to production (e.g. AWS, Render, Supabase, Neon):

### 1. Install PostgreSQL Client
```bash
npm install pg
```

### 2. Configure Environment Variable
In `server/.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/collabio
JWT_SECRET=your-production-secret-key
PORT=3001
```

### 3. Replace the Query Adapter in `server/db/database.js`
Replace the SQLite `run`, `get`, and `all` helpers with `pg.Pool`:
```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const query = (text, params) => pool.query(text, params);
const get = async (text, params) => (await pool.query(text, params)).rows[0];
const all = async (text, params) => (await pool.query(text, params)).rows;
```

---

## 7. How to Migrate to MongoDB

If your organization prefers a MongoDB / Mongoose stack:

### 1. Install Mongoose
```bash
npm install mongoose
```

### 2. Define Mongoose Schemas (e.g. `Deal.js`)
```javascript
const mongoose = require('mongoose');

const DealSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brandName: { type: String, required: true },
  title: { type: String, required: true },
  platform: { type: String, required: true },
  status: { type: String, default: 'outreach' },
  dealValue: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  deadline: String,
  priority: { type: String, default: 'medium' }
}, { timestamps: true });

module.exports = mongoose.model('Deal', DealSchema);
```

---

## 8. Inspection, Backup & Troubleshooting

### Direct SQLite Inspection via CLI
You can inspect the database directly using Node:
```bash
node -e "const { all, db } = require('./server/db/database'); all('SELECT id, username, email FROM users').then(console.log).then(() => db.close());"
```

Or using the standard `sqlite3` CLI:
```bash
sqlite3 server/db/collabio.db ".tables"
```

### Exporting Workspace Data
In the application:
1. Navigate to **Settings** (`/settings`).
2. Click **"Export Workspace (JSON)"** in the top-right header.
3. Automatically downloads a complete JSON snapshot of all your deals, brands, contacts, invoices, and profile configurations.

### Troubleshooting Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| `Port 3001 already in use` | Another process is holding port 3001 | Kill process via `npx kill-port 3001` or set `PORT=3002` |
| `Port 5173 already in use` | Vite dev server already running | Vite will automatically try `5174` or specify `--port 5173` |
| `Failed to initialize database` | Write permissions on `server/db/` | Ensure write permissions on `server/db/` directory |
| Session drop on refresh | Browser blocking `localStorage` | Verify cookies/localStorage permissions in browser settings |

---

## Summary
Collabio gives you a zero-config, persistent, developer-friendly creator business suite ready for development, self-hosting, or cloud deployment!
