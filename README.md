# MEP 2027 Leader Invitation & Application System

A production-ready Next.js application for the **MEP 2027 New Year Celebration** leader and co-leader invitation, application workflow, and administration dashboard.

---

## 🌟 Overview

The MEP (Multi-Editor Project) 2027 platform unites 30 creators and editors organized into squads to create a collaborative New Year celebration project. The website features:
- **Liquid-Glass Modern UI**: Ambient animated backgrounds, glassmorphism panels, countdown timer to January 1, 2027 (Asia/Kolkata timezone: `2027-01-01T00:00:00+05:30`).
- **Dynamic Website Content Manager & Admin CMS (`/admin`)**:
  - Fully editable **About MEP** section: headings, subheadings, editable reorderable paragraphs, squad counts, leader/co-leader responsibilities, and callout blocks.
  - **Hero & Headline**: Main hero title, subtitle, introduction, CTA destinations, and visibility toggle.
  - **Event & Countdown**: Configurable target date, timezone, countdown description, and visibility.
  - **Announcement Banner**: Dynamic announcement banner with start/end scheduling and safe color presets (Gold, Cyan, Purple, Emerald).
  - **FAQs Manager**: Add, edit, delete, and reorder accordion FAQ items with instant mobile & desktop preview.
  - **Contact & Social Destinations**: Safe HTTPS, WhatsApp, and mailto destination links.
  - **Live Preview Modal**: Test edits on simulated Desktop (1024px) and Mobile (375px) viewports before saving.
  - **Revision History & Non-Destructive Reset**: Content change logs with version tracking and safe reset-to-default that never touches applicant records or leader slots.
- **6 Dedicated Leadership Positions**:
  - Positions 1–3: Squad Leaders
  - Positions 4–6: Squad Co-Leaders
- **Instant Image Compression**: In-browser client-side canvas compression converts mobile photos from 3–5 MB to ~40 KB for fast uploads and instant rendering across devices.
- **Race-Condition Safe Slot Allocation**: Atomic database slot reservation prevents duplicate allocations during concurrent submissions.
- **Secured Admin Dashboard (`/admin`)**: Protected management portal for reviewing applicants, zoomable photo preview, status transitions (Pending, Approved, Rejected), slot resets, and CSV export.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.28 (App Router, Server Components & Dynamic Route Handlers)
- **Frontend**: React 19, Tailwind CSS v4, Framer Motion
- **Database**: Turso (libSQL SQLite engine) + Drizzle ORM 0.44.x
- **Icons & UI**: Lucide React, Sonner Toaster
- **Package Manager**: npm (reproducible builds via `package-lock.json`)

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Node.js 20.x or later
- npm 10.x or later

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your variables in `.env.local`:
```env
# Turso / libSQL (Persistent Cloud Database)
TURSO_CONNECTION_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Admin Dashboard Authentication (Required in Production)
ADMIN_PASSWORD=your-strong-production-admin-password
ADMIN_SECRET=your-random-32-plus-character-secret-key-for-session-signing

# Site Canonical URL
NEXT_PUBLIC_SITE_URL=https://mep.eomeg.in
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser. The admin portal is accessible at `http://localhost:3000/admin`.

---

## 🧪 Testing & Verification Commands

```bash
# Type check with TypeScript compiler
npx tsc --noEmit

# Production build check
npm run build

# Start production server locally
npm run start
```

---

## 🔒 Security Architecture

1. **Strict Production Credential Enforcement**:
   - In production (`NODE_ENV === 'production'`), strong `ADMIN_PASSWORD` and `ADMIN_SECRET` are mandatory. The system refuses to fall back to insecure default passwords in production.
2. **Brute-Force Rate Limiting**:
   - Login endpoint (`/api/admin/login`) tracks IP-based login attempts and temporarily throttles after 5 failed attempts within 15 minutes.
3. **Constant-Time Verification**:
   - Passwords are validated using `crypto.timingSafeEqual` to eliminate timing attack vectors.
4. **Encrypted Session Cookies**:
   - Admin sessions use HMAC-SHA256 tokens issued with `HttpOnly`, `SameSite=Strict`, and `Secure` attributes in production.
5. **Private Applicant Data**:
   - The `/api/applications` GET endpoint and `/api/applications/[id]` routes strictly require an authenticated administrator session. Public clients never have access to phone numbers, emails, or notes.
6. **Credential Rotation**:
   - Any historical demo passwords (such as `2554`) or test secrets must be rotated prior to public release.

---

## 🗄️ Database & Concurrency Handling

- **Lazy Initialization**: Database connections are lazily evaluated via `getClient()` and `getDb()` in `src/db/index.ts`. This guarantees that Next.js static analysis and build phases do not fail when cloud database credentials are not present during bundling.
- **Dedicated Content Storage**: `site_content` stores published JSON configuration under key `'main'` with automatic version tracking. `content_revisions` retains timestamped snapshots of all administrative updates.
- **Atomic Slot Assignment**: Leader slots are reserved via atomic `UPDATE leaders ... WHERE id = (SELECT id FROM leaders WHERE status = 'open' ORDER BY position ASC LIMIT 1) RETURNING *;`. This prevents concurrent applicant submissions from being assigned the same position.
- **Rollback Protection**: If an application database insert fails after reserving a slot, the system automatically rolls back the claimed slot to `open`.
- **Automatic Schema Migration**: `ensureDbInitialized()` verifies and creates required tables (`leaders`, `applications`, `site_content`, `content_revisions`) and seeds initial default content if absent without overwriting existing administrator content.

---

## 📡 API Endpoints Summary

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/content` | `GET` | Public | Returns published website content with expired announcements filtered out. |
| `/api/admin/content` | `GET` | Admin Session | Returns current editable content configuration, version metadata, and revision logs. |
| `/api/admin/content` | `PATCH` | Admin Session | Validates, saves new site content, increments version, and creates a revision snapshot. |
| `/api/admin/content/reset` | `POST` | Admin Session | Safely resets website content back to default without modifying applications or leader slots. |
| `/api/leaders` | `GET` | Public | Returns current leader slots and assignment status. |
| `/api/applications` | `POST` | Public | Submits new applicant with canvas-compressed photo and atomic slot assignment. |
| `/api/applications` | `GET` | Admin Session | Lists all applications with filtering and search. |
| `/api/applications/[id]` | `PATCH` / `DELETE` | Admin Session | Admin status change, leader reassignment, or deletion with linked slot recovery. |
| `/api/admin/login` | `POST` | Public (Rate-limited) | Verifies admin credentials and sets secure session cookie. |
| `/api/admin/logout` | `POST` | Public | Clears admin session cookie. |

---

## ☁️ Deployment to Vercel

1. Push your repository to GitHub.
2. Import the project into your Vercel Dashboard.
3. Set the following Environment Variables in **Project Settings → Environment Variables**:
   - `TURSO_CONNECTION_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_PASSWORD`
   - `ADMIN_SECRET`
   - `NEXT_PUBLIC_SITE_URL`
4. Deploy. Vercel automatically runs `npm install` and `npm run build`.
