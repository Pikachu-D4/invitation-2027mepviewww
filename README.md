# MEP 2026 Leader Invitation

A Next.js application for the MEP 2026 leader/co-leader invitation and application workflow.

## Local setup

1. Install Bun 1.x. The project uses the committed `bun.lock` to keep package versions reproducible.
2. Copy `.env.example` to `.env.local`.
3. Fill in `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, and a unique `ADMIN_SECRET` (at least 32 random characters).
4. Install and run:

```bash
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`. The admin dashboard is at `/admin` and requires `ADMIN_SECRET` as the login password.

## Deploy to Vercel

- Commit `bun.lock` and `package.json`. Do not add a `package-lock.json`; Vercel should detect Bun from `bun.lock`.
- Add `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_SECRET`, and `NEXT_PUBLIC_SITE_URL` under Vercel Project Settings → Environment Variables.
- Use a newly rotated Turso auth token; never commit `.env` or any live credentials.
- Set `NEXT_PUBLIC_SITE_URL` to the site's canonical HTTPS origin. The default metadata/sitemap domain is `https://mep.eomeg.in`.

## Security notes

The public application submission route accepts applicant data, while reading the applications list and modifying leader slots require an admin session. The admin session uses an HTTP-only, same-site cookie signed with `ADMIN_SECRET`.
