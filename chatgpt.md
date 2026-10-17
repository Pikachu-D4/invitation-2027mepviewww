# MEP 2027 — Complete Project Architecture & Technical Guide

Welcome to the comprehensive technical documentation for the **MEP 2027 New Year Celebration Leader Invitation & Application System**. This document provides an in-depth reference for architecture, tech stack, database resilience, API contracts, security guarantees, performance optimizations, and deployment operations.

---

## 📌 1. Project Overview

- **Project Name**: MEP 2027 Leader Invitation & Administration System
- **Initiative**: A collaborative platform uniting 30 video editors into structured squads for a New Year 2027 Mega AMV/MEP (Multi Editor Project).
- **Core Functionality**:
  1. **Public Showcase & Invitation**:
     - Liquid-glass aesthetic with animated ambient backgrounds and particles.
     - Live countdown targeting **January 1, 2027** (`2027-01-01T00:00:00+05:30` - Asia/Kolkata).
     - Responsive manifesto, participation guidelines, and FAQ.
  2. **6 Real Leader Slots**:
     - **Positions 1–3**: Squad Leaders
     - **Positions 4–6**: Squad Co-Leaders
  3. **Application Intake**:
     - Name, Email, WhatsApp number, optional Bio, and Profile Photo.
     - Client-side auto-compression converts multi-megabyte photos to ~40 KB before upload.
  4. **Concurrency-Safe Slot Assignment**:
     - Atomic database reservation prevents race conditions when multiple users apply simultaneously.
  5. **Upgraded Admin Dashboard (`/admin`)**:
     - Real database metrics (Total, Pending, Approved, Rejected, Filled Slots, Open Slots).
     - Search by Name, Email, or WhatsApp.
     - Filter by Status and sort by date or name.
     - Profile photo zoom modal & detailed application inspector.
     - Status updates (Approve, Reject, Pending) and full deletion with linked slot recovery.
     - CSV export of applicant records.

---

## 🛠️ 2. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js | 15.5.28 | App Router, Server Components & Route Handlers |
| **Language** | TypeScript | 5.x | Strict type safety across frontend and backend |
| **UI Library** | React | 19.0.0 | Concurrent React components |
| **Styling** | Tailwind CSS | 4.x | Design tokens, liquid-glass effects, responsive grid |
| **Animations** | Framer Motion | 12.x | Scroll parallax, micro-interactions, spring animations |
| **Database** | Turso (libSQL) | 0.15.x | Distributed cloud SQLite engine |
| **ORM** | Drizzle ORM | 0.44.x | Type-safe schema definition and query builder |
| **UI Icons** | Lucide React | 0.475.x | Accessible modern icon system |
| **Notifications** | Sonner | 2.0.x | Toast feedback |
| **Security** | Node.js Crypto | Built-in | `timingSafeEqual`, HMAC-SHA256 tokens, sliding-window rate limiting |

---

## 🗄️ 3. Database Architecture & Concurrency Strategy

### Cloud Persistence (Turso / libSQL)
All production data is persisted in a Turso cloud database instance. The database module is implemented in `src/db/index.ts` with lazy proxy initialization:
- **Build Phase Safety**: Importing database modules during `next build` does not trigger premature network calls or `URL_INVALID` errors if environment variables are not supplied during bundling.
- **Strict Production Enforcement**: When executing in production (`process.env.NODE_ENV === 'production'`), operations strictly require `TURSO_CONNECTION_URL` and `TURSO_AUTH_TOKEN`. If missing, clear 503 errors are returned rather than silently losing user data.
- **Local Dev Resiliency**: In local development and testing, an in-memory SQLite store provides fallback capabilities for offline work.

### Database Schema (`src/db/schema.ts`):

#### Table: `leaders`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Slot identifier |
| `name` | TEXT | NULLABLE | Name of assigned leader |
| `role` | TEXT | NULLABLE | `'Leader'` (1-3) or `'Co-Leader'` (4-6) |
| `avatar` | TEXT | NOT NULL | Base64 image URL or default DiceBear avatar |
| `status` | TEXT | NOT NULL DEFAULT `'open'` | `'open'` or `'filled'` |
| `position` | INTEGER | NOT NULL | Slot position (1 to 6) |
| `created_at` | INTEGER | Timestamp | Record creation time |
| `updated_at` | INTEGER | Timestamp | Last status change time |

#### Table: `applications`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Application identifier |
| `name` | TEXT | NOT NULL | Applicant full name |
| `email` | TEXT | NOT NULL | Contact email address |
| `whatsapp` | TEXT | NOT NULL | WhatsApp contact number |
| `bio` | TEXT | NULLABLE | Applicant background & motivation |
| `profile_image` | TEXT | NOT NULL | Base64 JPEG data URL (~40 KB) |
| `status` | TEXT | NOT NULL DEFAULT `'pending'` | `'pending'`, `'approved'`, or `'rejected'` |
| `admin_notes` | TEXT | NULLABLE | Private notes added by administrators |
| `leader_id` | INTEGER | REFERENCES `leaders(id)` | Linked leader slot ID (or NULL) |
| `created_at` | INTEGER | Timestamp | Submission time |
| `updated_at` | INTEGER | Timestamp | Last status change time |

### Concurrency & Race-Condition Protection
When an application is submitted via `POST /api/applications`:
1. The database executes an atomic UPDATE statement:
   ```sql
   UPDATE leaders
   SET status = 'filled', name = ?, avatar = ?, updated_at = ?
   WHERE id = (
     SELECT id FROM leaders
     WHERE status = 'open'
     ORDER BY position ASC
     LIMIT 1
   )
   RETURNING *;
   ```
2. If no rows are returned, all 6 positions are filled and the request returns `409 Conflict` (`NO_OPEN_SLOTS`).
3. If a slot is claimed, the application record is created and linked to that slot.
4. If an unexpected error occurs during application insertion, the claimed slot is automatically rolled back to `open` so it is not permanently locked.

---

## ⚡ 4. Client-Side Image Optimization & Cache Control

### 1. Canvas-Based In-Browser Compression
Uploading high-resolution mobile photos (3–5 MB) directly to serverless endpoints causes request timeouts and slow client rendering. In `src/app/page.tsx`:
- Selected images are processed through an offscreen HTML5 Canvas.
- Dimensions are proportionally constrained to a maximum of 450×450 px.
- Output is encoded as an 85% quality JPEG.
- Payload size drops from **3–5 MB to ~40 KB** (98% reduction), enabling sub-second submissions and instantaneous rendering across devices.

### 2. Multi-Device Real-Time Sync
To ensure every client sees live slot changes without CDN stale caching, all API routes return aggressive no-cache headers:
```http
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
CDN-Cache-Control: no-store
Vercel-CDN-Cache-Control: no-store
```
Client fetches append cache-busting timestamp queries (`?t=${Date.now()}`).

---

## 🔒 5. Security & Authentication Architecture

1. **Admin Credentials**:
   - `ADMIN_PASSWORD`: Production administrator login password (configured in environment).
   - `ADMIN_SECRET`: Cryptographically random 32+ character key used to sign HMAC-SHA256 session tokens.
2. **Brute-Force Rate Limiting**:
   - An in-memory sliding window tracks failed login attempts by client IP.
   - 5 failed attempts within 15 minutes triggers temporary rate-limiting (`429 Too Many Requests`).
3. **Timing-Safe Password Evaluation**:
   - Compares user inputs using `crypto.timingSafeEqual` with zero-padded buffers to eliminate timing leak vulnerabilities.
4. **Encrypted Session Cookie (`mep_admin_session`)**:
   - Issued with `HttpOnly: true`, `SameSite: 'strict'`, and `Secure: true` (in production).
   - Valid for 12 hours.
5. **Private Applicant Data Protection**:
   - The `/api/applications` GET endpoint and `/api/applications/[id]` routes require authenticated admin sessions. Sensitive personal data (email, WhatsApp, bio) is never exposed publicly.
6. **Credential Rotation Requirement**:
   - Previous placeholder credentials (e.g. `2554`) must be replaced with strong, unique values in production deployments.

---

## 🌐 6. API Route Specification

### Applications
- `GET /api/applications`
  - **Auth**: Admin only
  - **Query Params**: `limit`, `offset`, `status` (`pending`|`approved`|`rejected`), `search`
  - **Returns**: Array of application objects with contact info and slot associations.
- `POST /api/applications`
  - **Auth**: Public
  - **Format**: `multipart/form-data`
  - **Fields**: `name`, `email`, `whatsapp`, `bio`, `profileImage`
  - **Returns**: `201 Created` with created application and assigned slot.
- `PATCH /api/applications/[id]`
  - **Auth**: Admin only
  - **Body**: `{ status?: 'pending'|'approved'|'rejected', adminNotes?: string }`
  - **Returns**: `200 OK` with updated application record.
- `DELETE /api/applications/[id]`
  - **Auth**: Admin only
  - **Action**: Permanently deletes application record and resets associated leader slot back to `open`.
  - **Returns**: `200 OK`.

### Leaders
- `GET /api/leaders`
  - **Auth**: Public
  - **Returns**: Array of all 6 slots ordered by position 1–6.
- `POST /api/leaders`
  - **Auth**: Admin only
  - **Action**: Seeds the 6 default leader slots if the table is uninitialized.
- `PATCH /api/leaders`
  - **Auth**: Admin only
  - **Body**: `{ position: number }` (1 to 6)
  - **Action**: Resets specified slot back to open and clears applicant linkage.

### Admin Auth
- `POST /api/admin/login`
  - **Body**: `{ password: string }`
  - **Returns**: `200 OK` with `Set-Cookie: mep_admin_session=...`
- `POST /api/admin/logout`
  - **Action**: Clears `mep_admin_session` cookie (`maxAge: 0`).

---

## ⚙️ 7. Environment Variables Reference

| Variable | Required in Production | Description | Example |
|---|---|---|---|
| `TURSO_CONNECTION_URL` | Yes | Turso database URL | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Yes | Turso authentication token | `your-turso-jwt-token` |
| `ADMIN_PASSWORD` | Yes | Administrator login password | `YourStrongPassword2027!` |
| `ADMIN_SECRET` | Yes | HMAC session signing key (32+ chars) | `32+random-characters-secret` |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical production URL | `https://mep.eomeg.in` |

---

## 💻 8. Local Development & Build Commands

```bash
# Clean install
npm install

# Start local dev server (http://localhost:3000)
npm run dev

# TypeScript type check
npx tsc --noEmit

# Production build
npm run build

# Start production build
npm run start
```
