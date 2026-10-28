# MEP 2027 — Leadership Application Platform & CMS

A full-stack Next.js web application built for the **MEP 2027 Multi-Editor Project**. The platform handles public project invitations, leadership application intake with position preferences, applicant asset validation, an administrative moderation system, and a database-backed CMS for dynamic site updates.

---

## Architecture & System Overview

```
                      ┌──────────────────────────────────────────┐
                      │             Public Homepage              │
                      │  - Interactive Invitation UI             │
                      │  - Countdown Timer (1 Jan 2027)          │
                      │  - Live Squad Slot Tracker               │
                      │  - Leadership Application Form           │
                      └────────────────────┬─────────────────────┘
                                           │
                        POST /api/applications (multipart/form-data)
                        GET  /api/leaders
                        GET  /api/content
                                           │
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │            API Route Handlers            │
                      │  - Input sanitization & Zod/Regex guards │
                      │  - Image type & size constraints (5MB)   │
                      │  - Constant-time admin auth (HMAC-SHA256)│
                      │  - IP rate-limiting on login             │
                      └────────────────────┬─────────────────────┘
                                           │
                         Drizzle ORM + Turso / libSQL (SQLite)
                                           │
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │              Database Layer              │
                      │  - `leaders`: Public slots (1-6)         │
                      │  - `applications`: Pending candidate data│
                      │  - `site_content`: Dynamic CMS state     │
                      │  - `content_revisions`: Audit history    │
                      └──────────────────────────────────────────┘
```

### Core Workflows

1. **Decoupled Application & Slot Assignment**:
   - Applicants choose their preferred role (**Squad Leader** for positions 1–3, or **Squad Co-Leader** for positions 4–6) and can specify an exact position or opt for **Flexible** placement (position `0`).
   - Submissions do **not** immediately occupy public slots. Applications are queued with status `pending` to ensure fair review and prevent front-running.
   - Administrators review candidates in the `/admin` portal and explicitly confirm slot assignments.

2. **Dynamic CMS & Safe Content Versioning**:
   - Public page content (Hero, About MEP, Event Details, Announcement Banner, FAQs, Contact) is served via `/api/content` from the `site_content` table.
   - Content updates made in `/admin` increment the document version and persist an immutable snapshot to `content_revisions`.
   - CMS resets or updates are strictly isolated; they modify text keys without touching application records, slot assignments, or administrator credentials.

3. **In-Browser Image Optimization & Strict Validation**:
   - The application form accepts standard image types (`image/jpeg`, `image/png`, `image/webp`).
   - Client-side canvas compression downscales heavy mobile camera uploads prior to submission.
   - The API enforces a strict 5 MB payload ceiling, MIME-type verification, and base64 storage.

---

## Mobile Responsive Layout & Viewport Architecture

The platform is fortified against mobile viewport stretching, horizontal scrolling, and text truncation across all screen sizes (tested at 360px, 390px, 412px, 768px, 1280px, and 1440px):

1. **Next.js 15 Viewport Specification**:
   - Explicit `export const viewport: Viewport` in `src/app/layout.tsx` enforcing `width: 'device-width'`, `initialScale: 1`, and `maximumScale: 5`.
2. **Defensive Layout Containment**:
   - `html` and `body` in `src/app/globals.css` enforce `max-width: 100%` and `overflow-x: clip` (using modern `clip` instead of `hidden` to avoid interrupting mobile vertical scroll velocity).
   - Root page wrappers (`src/app/page.tsx`, `src/app/privacy/page.tsx`, `src/app/admin/page.tsx`) enforce `w-full max-w-full overflow-x-clip`.
3. **Flexbox Intrinsic Minimum Width Guard (`min-w-0`)**:
   - Flex children without explicit `min-w-0` default to `min-width: auto`, preventing truncation and expanding forms beyond the mobile screen.
   - Form upload rows, avatar badges, and position preference buttons are constrained with `min-w-0` and responsive padding (`p-4 sm:p-6`).
4. **Encapsulated Dynamic Animation Lifecycle**:
   - Burst celebration particles are generated inside an isolated, non-scrolling overlay container rather than directly on `document.body`, eliminating synthetic horizontal scroll width expansions.
   - Parallax background radial spheres dynamically scale between mobile (`h-72 w-72`) and desktop (`h-[28rem] w-[28rem]`).

---

## Project Specifications

| Detail | Specification |
|---|---|
| **Release Date** | 1 January 2027 (00:00:00 HST / Hawaii Standard Time) |
| **Member Submission Cutoff** | 15 December 2026 |
| **Squad Merge Cutoff** | 20 December 2026 |
| **Project Structure** | 30 Total Editors across 3 Squads |
| **Squad Leadership** | 3 Squad Leaders (Positions 1–3) + 3 Squad Co-Leaders (Positions 4–6) |
| **Video Format** | 1080p, 23.976 / 30 FPS, stereo audio |

---

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components, Route Handlers)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/)
- **Primitives & Feedback**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/), [Sonner Toaster](https://sonner.emilkowal.ski/)
- **Database**: [Turso](https://turso.tech/) (libSQL SQLite engine) + [Drizzle ORM](https://orm.drizzle.team/)
- **Runtime & Tooling**: Node.js 20+, TypeScript 5+, Turbopack

---

## Directory Structure

```
.
├── src/
│   ├── app/
│   │   ├── admin/                 # Admin authentication and dashboard pages
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── content/       # CMS configuration and rollback endpoints
│   │   │   │   ├── login/         # Constant-time auth with rate limiting
│   │   │   │   └── logout/        # Session invalidation
│   │   │   ├── applications/      # Public submission and admin application queries
│   │   │   │   └── [id]/          # Status changes, assignment, and deletion
│   │   │   ├── content/           # Public read endpoint for site content
│   │   │   └── leaders/           # Public slot availability queries
│   │   ├── globals.css            # Design tokens, custom animations, layer overrides
│   │   ├── layout.tsx             # Root layout, metadata, and error boundary
│   │   └── page.tsx               # Main landing page with all interactive sections
│   ├── components/
│   │   ├── admin/                 # ContentManager, ApplicationsTable, SlotAssigner
│   │   └── ui/                    # Reusable Radix UI components (Button, Dialog, etc.)
│   ├── db/
│   │   ├── index.ts               # Database connection factory & idempotent migrations
│   │   └── schema.ts              # Drizzle table schemas (leaders, applications, etc.)
│   └── lib/
│       ├── admin-auth.ts          # Session tokens, timingSafeEqual, HMAC validation
│       ├── content.ts             # Default site content fallback object and types
│       ├── store.ts               # In-memory development fallback store
│       └── utils.ts               # Tailwind class merge utilities
├── public/                        # Static assets and icons
├── drizzle.config.ts              # Drizzle ORM configuration
├── next.config.ts                 # Next.js build configuration
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # Strict TypeScript configuration
```

---

## Database Schema Design

The schema is defined using Drizzle ORM in [`src/db/schema.ts`](file:///c:/Users/pikac/OneDrive/Documents/GitHub/invitation%202027mepviewww/src/db/schema.ts):

### `leaders` Table
Stores the 6 designated leadership seats displayed on the public site:
- `id` (integer, primary key)
- `position` (integer, 1–6): Positions 1–3 = Leader, 4–6 = Co-Leader
- `role` (text): `'Leader'` or `'Co-Leader'`
- `status` (text): `'open'` or `'filled'`
- `name`, `email`, `whatsapp`, `instagramUsername`, `bio`, `profileImage` (text, nullable)
- `assignedAt` (integer, timestamp)

### `applications` Table
Stores all incoming candidate submissions:
- `id` (integer, primary key, auto-increment)
- `name` (text, min 2 chars)
- `email` (text, validated email)
- `whatsapp` (text, international format)
- `instagramUsername` (text, optional sanitized handle without `@`)
- `requestedRole` (text): `'Leader'` or `'Co-Leader'`
- `requestedPosition` (integer): `0` = Flexible, `1–3` = Leader positions, `4–6` = Co-Leader positions
- `bio` (text, optional)
- `profileImage` (text, data URL)
- `status` (text): `'pending'`, `'approved'`, or `'rejected'`
- `leaderId` (integer, nullable foreign reference to `leaders.id`)
- `createdAt`, `updatedAt` (integer timestamps)

### `site_content` & `content_revisions` Tables
Manages persistent homepage content and revision tracking:
- `id` (text, primary key, e.g. `'main'`)
- `data` (text, serialized JSON matching `SiteContent` interface)
- `version` (integer, incremented on every save)
- `updatedBy`, `updatedAt` (metadata)

---

## Getting Started

### Prerequisites
- Node.js 20.x or later
- npm 10.x or later

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Pikachu-D4/invitation-2027mepviewww.git
cd invitation-2027mepviewww
npm install
```

### 2. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env.local
```

Populate the required keys in `.env.local`:
```env
# Database (Turso / libSQL)
TURSO_CONNECTION_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Admin Security (Required for production environments)
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_SECRET=your-32-plus-char-random-signing-secret

# Public Canonical URL
NEXT_PUBLIC_SITE_URL=https://mep.eomeg.in
```

> **Note for Local Development**: If `TURSO_CONNECTION_URL` is omitted, the application automatically boots using an in-memory dev store (`src/lib/store.ts`). This allows frontend and workflow testing without setting up external cloud infrastructure.

### 3. Running Locally
Start the development server with Turbopack:
```bash
npm run dev
```
Navigate to `http://localhost:3000` to view the homepage. Access the management portal at `http://localhost:3000/admin`.

---

## Verification & Build Commands

Before pushing code or deploying to production, run the project checks:

```bash
# 1. Type verification
npx tsc --noEmit

# 2. Lint check
npm run lint

# 3. Production bundle compilation
npm run build

# 4. Run production build locally
npm run start
```

---

## Security Model

1. **Authentication & Session Tokens**:
   - Admin sessions utilize HMAC-SHA256 signed session tokens issued inside `HttpOnly`, `SameSite=Strict`, and `Secure` cookies.
   - Password comparisons use `crypto.timingSafeEqual` to protect against timing analysis attacks.
2. **Brute-Force Rate Limiting**:
   - The `/api/admin/login` endpoint tracks client IP addresses and enforces an automatic lockout period after repeated failed attempts.
3. **Data Isolation**:
   - Applicant contact details (emails, phone numbers, bios) are strictly protected. `/api/applications` rejects any request lacking a valid administrator session.
4. **Input Sanitization**:
   - Role/position alignment is strictly validated server-side. Applications with invalid mappings (e.g., requesting a Leader role for position 5) are rejected with HTTP 400.
   - Instagram handles are sanitized to strip leading `@` symbols and validate allowed character sets.

---

## API Reference

### Public Endpoints
| Endpoint | Method | Payload / Params | Description |
|---|---|---|---|
| `/api/content` | `GET` | — | Returns active website content JSON. Expired announcements are automatically filtered. |
| `/api/leaders` | `GET` | — | Returns public leadership slot status (positions 1–6). |
| `/api/applications` | `POST` | `multipart/form-data` | Submits candidate application with profile image, role preference, and contact information. |

### Admin Endpoints (Session Required)
| Endpoint | Method | Payload / Params | Description |
|---|---|---|---|
| `/api/admin/login` | `POST` | `{ password }` | Authenticates administrator and sets session cookie. |
| `/api/admin/logout` | `POST` | — | Clears administrator session cookie. |
| `/api/admin/content` | `GET` | — | Fetches editable site content JSON along with revision history. |
| `/api/admin/content` | `PATCH` | `{ content }` | Validates, persists site content changes, increments version, and logs a revision. |
| `/api/admin/content/reset` | `POST` | — | Reverts CMS content to default settings without altering applicants or slots. |
| `/api/applications` | `GET` | `?status=&role=&search=` | Lists submitted applications with pagination and filters. |
| `/api/applications/[id]` | `PATCH` | `{ status, leaderId }` | Updates application status or assigns candidate to a specific leader slot. |
| `/api/applications/[id]` | `DELETE` | — | Removes application and frees any assigned leader slot. |

---

## Deployment (Vercel)

1. Push your repository to GitHub.
2. Connect the repository in the **Vercel Dashboard**.
3. Add the following **Environment Variables** under Project Settings:
   - `TURSO_CONNECTION_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_PASSWORD`
   - `ADMIN_SECRET`
   - `NEXT_PUBLIC_SITE_URL`
4. Deploy. Next.js handles static pre-rendering and dynamic route compilation automatically.

---

## License

This project is maintained for the MEP 2027 collaboration. Distributed under the [MIT License](LICENSE).
