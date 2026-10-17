# MEP 2027 Leader Invitation & Application System

A production-ready Next.js application for the **MEP 2027 New Year Celebration** leader and co-leader invitation, application workflow, and administration dashboard.

---

## 🌟 Overview

The MEP (Multi-Editor Project) 2027 platform unites 30 creators and editors organized into squads to create a collaborative New Year celebration project. The website features:
- **Liquid-Glass Modern UI**: Ambient animated backgrounds, glassmorphism panels, countdown timer to January 1, 2027 (Asia/Kolkata timezone: `2027-01-01T00:00:00+05:30`).
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
- **Atomic Slot Assignment**: Leader slots are reserved via atomic `UPDATE leaders ... WHERE id = (SELECT id FROM leaders WHERE status = 'open' ORDER BY position ASC LIMIT 1) RETURNING *;`. This prevents concurrent applicant submissions from being assigned the same position.
- **Rollback Protection**: If an application database insert fails after reserving a slot, the system automatically rolls back the claimed slot to `open`.
- **Automatic Schema Migration**: `ensureDbInitialized()` verifies and creates required tables (`leaders`, `applications`) and missing columns on startup.

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
