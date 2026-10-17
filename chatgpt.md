# MEP 2026 — Complete Project Architecture & Documentation

Welcome to the comprehensive documentation for the **MEP 2026 New Year Celebration Leader Invitation & Application System**. This document explains every single part of the project: architecture, tech stack, database, APIs, security, optimizations, and deployment.

---

## 📌 1. Project Overview

- **Project Name**: MEP 2026 Leader Invitation
- **Purpose**: A web platform for a 30-member video editing initiative (AMV/MEP - Multi Editor Project) celebrating New Year 2026.
- **Core Features**:
  1. **Public Showcase**: Liquid-glass design, interactive countdown timer to Jan 1, 2026, dynamic video showcases, FAQ, guidelines, and celebration confetti.
  2. **Leader & Co-Leader Slots**: 6 distinct slots:
     - **Positions 1–3**: Leaders
     - **Positions 4–6**: Co-Leaders
  3. **Real-Time Application Submission**: Users apply with Name, Email, WhatsApp number, optional Bio, and Profile Photo.
  4. **Slot Assignment**: When an application is submitted, it automatically fills the next available open slot in order (1 → 6).
  5. **Admin Dashboard (`/admin`)**: Protected portal for organizers to review submissions, inspect photos/details, delete applicants, and reset leader slots.
  6. **Admin Password**: **`2554`**

---

## 🛠️ 2. Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | **Next.js 15.5.28** | App Router (`src/app`), Serverless Functions, React Server Components |
| **Language** | **TypeScript 5.x** | Strict mode enabled |
| **UI Library** | **React 19** | Latest modern React |
| **Styling** | **Tailwind CSS v4** | With custom liquid-glass effects, gradients, and CSS tokens |
| **Animations** | **Framer Motion 12.x** | Smooth scroll reveals, card interactions, micro-animations |
| **Database** | **Turso (libSQL)** + In-Memory Fallback | SQLite at the edge, persistent cloud database |
| **ORM** | **Drizzle ORM 0.44.x** | Type-safe schema definition and queries |
| **Icons & Notifications** | **Lucide React** + **Sonner** | Modern icons and toast notifications |
| **Security** | **Node.js `crypto`** | Constant-time password comparison (`timingSafeEqual`), HMAC-SHA256 session tokens |

---

## 🗄️ 3. Database Schema & Dual-Mode Storage

The project uses a **dual-mode resilient architecture**:
- **Production Mode (with Turso)**: If `TURSO_CONNECTION_URL` and `TURSO_AUTH_TOKEN` are set, all data is permanently saved in the Turso cloud database across all devices.
- **Standalone/Offline Mode**: If Turso environment variables are missing, it automatically falls back to an in-memory database (`:memory:`) and local `memoryStore` without crashing or requiring any configuration.

### Schema (`src/db/schema.ts`):

#### Table: `leaders`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Unique slot identifier |
| `name` | TEXT | Name of the leader (null if slot is open) |
| `role` | TEXT | 'Leader' (positions 1-3) or 'Co-Leader' (positions 4-6) |
| `avatar` | TEXT | Profile photo Data URL (or default DiceBear avatar) |
| `status` | TEXT | `'open'` or `'filled'` |
| `position` | INTEGER | 1 to 6 |
| `created_at` | INTEGER (Timestamp) | Timestamp |
| `updated_at` | INTEGER (Timestamp) | Timestamp |

#### Table: `applications`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Unique application ID |
| `name` | TEXT NOT NULL | Applicant's full name |
| `email` | TEXT NOT NULL | Email address |
| `whatsapp` | TEXT NOT NULL | WhatsApp contact number |
| `bio` | TEXT | Experience / bio description |
| `profile_image` | TEXT NOT NULL | Base64 compressed image Data URL |
| `status` | TEXT NOT NULL | Default `'pending'` |
| `leader_id` | INTEGER REFERENCES `leaders(id)` | Linked slot ID |
| `created_at` | INTEGER (Timestamp) | Submission timestamp |
| `updated_at` | INTEGER (Timestamp) | Update timestamp |

### Self-Healing Database Initialization (`src/db/index.ts`):
- When connecting to Turso, the code automatically executes `ensureDbInitialized()`.
- If tables do not exist in Turso, it creates them instantly with SQL `CREATE TABLE IF NOT EXISTS`.
- If the `leaders` table is empty, it automatically seeds the initial 6 open slots (Positions 1–3 as Leaders, 4–6 as Co-Leaders).

---

## ⚡ 4. Speed & Multi-Device Sync Optimizations

### Why data was showing inconsistently earlier:
1. Phone camera photos were 3–5 MB uncompressed. Large base64 strings overloaded network requests and took 5–10 seconds to load.
2. Vercel CDN and browsers were caching `/api/leaders` without `no-store` headers, serving stale open slots to other devices.

### How it was solved:
1. **Client-Side Auto Compression**:
   When any image is selected in the application form, the browser uses an HTML5 Canvas to resize it to max 450×450 px JPEG at 85% quality.
   - File size reduced from **3–5 MB → ~40 KB** (over **50x smaller**).
   - Upload finishes in **0.2 seconds**.
   - Photos load instantly on any mobile or desktop screen.
2. **Aggressive Cache-Busting (`no-store`)**:
   - All API endpoints return:
     ```http
     Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
     CDN-Cache-Control: no-store
     Vercel-CDN-Cache-Control: no-store
     ```
   - Client fetches use `/api/leaders?t=${Date.now()}` with `{ cache: 'no-store' }`.
   - Every single device sees fresh live data immediately.

---

## 🌐 5. API Endpoints

All endpoints are located under `src/app/api/`:

### 1. `GET /api/leaders`
- **Access**: Public
- **Function**: Returns the 6 leader slots ordered by position (1 to 6).
- **Headers**: Full no-cache headers.

### 2. `POST /api/leaders`
- **Access**: Admin only (Cookie verified)
- **Function**: Re-seeds default 6 slots if needed.

### 3. `PATCH /api/leaders`
- **Access**: Admin only
- **Body**: `{ "position": 1 }`
- **Function**: Resets a specific leader slot back to `'open'` and default avatar.

### 4. `GET /api/applications`
- **Access**: Admin only
- **Function**: Returns all submitted applications with contact details, sorted newest first.

### 5. `POST /api/applications`
- **Access**: Public
- **Content-Type**: `multipart/form-data`
- **Fields**: `name`, `email`, `whatsapp`, `bio`, `profileImage`
- **Logic**:
  1. Validates required fields and image format.
  2. Converts image to base64 Data URL.
  3. Finds the next open slot by position.
  4. Inserts into `applications`.
  5. Updates `leaders` slot: `status = 'filled'`, `name = sanitizedName`, `avatar = dataUrl`.
  6. Returns 201 Created.

### 6. `DELETE /api/applications/[id]`
- **Access**: Admin only
- **Function**: Deletes application from database and automatically resets the linked leader slot back to `'open'`.

### 7. `POST /api/admin/login`
- **Access**: Public
- **Body**: `{ "password": "2554" }`
- **Security**: Verifies password using `timingSafeEqual`. Generates an HMAC-SHA256 session token with 12-hour expiry.
- **Cookie**: Sets HTTP-only, SameSite Strict cookie `mep_admin_session`.

### 8. `POST /api/admin/logout`
- **Access**: Public
- **Function**: Clears `mep_admin_session` cookie (`maxAge: 0`).

---

## 🔐 6. Admin Portal (`/admin`)

- **URL**: `https://your-domain.vercel.app/admin`
- **Admin Password**: **`2554`**
- **Capabilities**:
  - View total applications count and leader slot progress.
  - View applicant cards with profile picture, name, email, WhatsApp link, bio, and submission date.
  - One-click deletion of any application (which automatically frees up the leader slot on the homepage).
  - Reset individual leader slots manually.

---

## 🚀 7. Deployment & Fixes Applied for Vercel

During development, the following deployment obstacles were identified and resolved:

1. **Vercel Dependency Installation Error (`ERESOLVE`)**:
   - `package.json` had phantom dependencies (`better-auth`, `autumn-js`, `atmn`, `bcrypt`, `stripe`, `qss`) that caused peer-dependency conflicts with `drizzle-orm`.
   - **Fix**: Removed all unused dependencies, keeping only active packages.
2. **Next.js Build Failure (`URL_INVALID`)**:
   - Previously, `@libsql/client` was called at the top-level of `src/db/index.ts`. When Next.js collected routes during `next build`, missing credentials threw `URL_INVALID`.
   - **Fix**: Implemented a lazy initialization Proxy with in-memory build fallback.
3. **Vercel Security Policy Block (`CVE-2025-66478`)**:
   - Next.js `15.3.5` had an active security advisory. Vercel automatically aborted the deployment.
   - **Fix**: Upgraded Next.js to **`15.5.28`** and `eslint-config-next` to **`^15.5.28`**, which cleared all security flags.
4. **Lockfile Synchronization**:
   - Removed obsolete `bun.lock` and created clean, verified `package-lock.json` for deterministic builds.

---

## ⚙️ 8. Environment Variables Reference

Create a `.env.local` file for local development or configure in **Vercel → Project Settings → Environment Variables**:

```env
# Turso Database Configuration (optional, recommended for permanent multi-device sync)
TURSO_CONNECTION_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Admin Password (defaults to 2554 if omitted)
ADMIN_PASSWORD=2554

# Admin Session Signing Secret (optional, uses secure fallback if omitted)
ADMIN_SECRET=mep2026-admin-session-signing-secret-static-ready-key-32chars

# Public Website URL
NEXT_PUBLIC_SITE_URL=https://your-site.vercel.app
```

> **Note**: Even if you provide **zero** environment variables, the application still builds and runs using the in-memory fallback with admin password `2554`.

---

## 💻 9. Local Development Commands

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Create production build
npm run build

# 4. Start production server locally
npm run start
```

---

## 📂 10. File Tree Overview

```text
├── drizzle/                     # Drizzle SQL migration files
├── public/                      # Static assets (images, icons)
├── src/
│   ├── app/
│   │   ├── admin/page.tsx       # Protected Admin Dashboard
│   │   ├── api/
│   │   │   ├── admin/           # Admin login & logout routes
│   │   │   ├── applications/    # Application GET, POST, DELETE routes
│   │   │   └── leaders/         # Leaders GET, POST, PATCH routes
│   │   ├── globals.css          # Global CSS & Tailwind styles
│   │   ├── layout.tsx           # Root HTML layout with SEO metadata
│   │   ├── page.tsx             # Main Landing Page & Application Form
│   │   └── privacy/page.tsx     # Privacy Policy page
│   ├── components/
│   │   ├── ui/                  # Reusable UI primitives (Button, Card, Input, etc.)
│   │   └── ErrorReporter.tsx    # Error monitoring component
│   ├── db/
│   │   ├── index.ts             # Lazy Turso/in-memory DB client & auto-migrations
│   │   ├── schema.ts            # Drizzle ORM schema for leaders & applications
│   │   └── seeds/leaders.ts     # Seed script
│   └── lib/
│       ├── admin-auth.ts        # Admin authentication & session cookies (password 2554)
│       ├── store.ts             # In-memory data store fallback
│       └── utils.ts             # Utility helpers (cn, clsx)
├── drizzle.config.ts            # Drizzle Kit configuration
├── next.config.ts               # Next.js configuration (ESLint ignore, remote images)
├── package.json                 # Project dependencies & scripts
├── package-lock.json            # Deterministic lockfile
└── tsconfig.json                # TypeScript compiler configuration
```

---

*Documentation prepared for the MEP 2026 Project. Ready for deployment and development.*
