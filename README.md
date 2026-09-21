<img width="1194" height="898" alt="image" src="https://github.com/user-attachments/assets/87c792ff-497d-465f-8c3c-95905063168c" />

# ReWear Community Clothing Exchange

Swap unused clothing directly or redeem items with points. A demo-ready,
full-stack Next.js app with **no external database** everything is
persisted to local JSON files.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Storage: local JSON files under `/data` via a generic adapter (`lib/db.ts`)
- Auth: JWT in an httpOnly cookie (`jose`), passwords hashed with `bcryptjs`
- Validation: `zod` on every API input
- Image uploads: saved to `/public/uploads`

## Getting started

```bash
npm install
copy .env.example .env      # Windows (or `cp .env.example .env` on macOS/Linux)
npm run seed                 # creates demo admin, users, items, swaps
npm run dev                  # http://localhost:3000
```

## Environment variables

See `.env.example`:

| Variable         | Description                                              |
|------------------|-----------------------------------------------------------|
| `JWT_SECRET`     | Secret used to sign session JWTs. Use a long random value. |
| `ADMIN_EMAIL`    | Admin login email, seeded into `data/users.json`.          |
| `ADMIN_PASSWORD` | Admin login password, seeded (hashed) by `npm run seed`.   |

Admin accounts can **only** be created via the seed script — there is no
public sign-up path to the `admin` role.

## Demo credentials (after `npm run seed`)

| Role  | Email             | Password      | Notes                              |
|-------|-------------------|---------------|-------------------------------------|
| Admin | admin@rewear.com  | Admin@12345   | Log in at `/admin/login`            |
| User  | alice@demo.com    | password123   | Has a pending points hold (-80 pts) |
| User  | bob@demo.com      | password123   | Owns a "reserved" item              |
| User  | clara@demo.com    | password123   | Has both incoming & outgoing swaps  |

The seed script creates 13 items (mostly approved, one pending, one
rejected) and 5 swaps in different states (pending points request, pending
direct-swap request, a completed historical swap, a rejected request, and a
cancelled request) so every screen has real data to show immediately.

## Project structure

```
app/                    Next.js App Router pages + API route handlers
  api/auth/...           signup / login / logout / me
  api/admin/...          admin login, items moderation, users, stats
  api/items/...          browse / detail / create / "my items"
  api/swaps/...          create / accept / reject / cancel
  items/, dashboard/, admin/, login/, signup/   pages
components/             Navbar, Footer, ItemCard (client/server components)
lib/
  db.ts                 Generic JSON storage adapter (atomic writes + mutex)
  auth.ts               JWT sign/verify + cookie helpers (Edge-safe)
  password.ts           bcrypt hashing (Node-only, kept out of middleware)
  session.ts            Server-side "current user" helpers
  swaps.ts              All swap/points business logic (single source of truth)
  schemas.ts            Zod schemas + shared enums (categories/sizes/conditions)
  upload.ts             Image upload validation + saving
  rateLimit.ts           In-memory login & swap-request rate limiting
data/                   users.json / items.json / swaps.json (gitignored)
public/uploads/         Uploaded + seeded images (gitignored)
scripts/seed.ts         Seed script (npm run seed)
```

## Architecture notes

### Storage adapter (`lib/db.ts`)

All API routes talk **only** to `lib/db.ts` (`readCollection`, `find`,
`findOne`, `findById`, `insert`, `update`, `remove`, `withTransaction`).
Writes go through a single global in-process mutex and are atomic
(write to a temp file, then `rename`), so concurrent requests can't corrupt
the JSON files. Multi-collection operations (accepting a swap touches
`users.json`, `items.json`, and `swaps.json` together) run inside
`withTransaction`, which holds the same global lock for the whole
operation.

Because every route goes through this one module, swapping the backend
later (e.g. to Upstash Redis or Vercel KV) only requires rewriting
`lib/db.ts` — no other file needs to change.

### Auth

- `lib/auth.ts` only contains JWT + cookie logic (via `jose`, which runs on
  the Edge Runtime) since it's imported by `middleware.ts`.
- `lib/password.ts` contains bcrypt hashing and is only imported by Node.js
  API routes (bcryptjs is not Edge-compatible).
- `middleware.ts` protects `/dashboard`, `/items/new`, `/admin/*`, and the
  corresponding write APIs (`POST /api/items`, `GET /api/items/mine`,
  `/api/swaps/*`, `/api/admin/*`). Every admin API route **also**
  re-checks `role === "admin"` itself, so protection doesn't rely solely on
  the middleware.

### Swap & points logic (`lib/swaps.ts`)

This is the single source of truth for all state transitions:

- **Create request**: validates ownership, item availability/approval,
  duplicate active requests, and (for points) sufficient balance. Points
  are **held** (deducted from the requester) immediately on request.
- **Accept** (owner only): completes the trade atomically —
  - Points kind: owner receives the held points, item → `swapped`.
  - Swap kind: both the target item and the offered item → `swapped`
    (re-validated at accept time in case the offered item changed state).
  - Every other pending request on the same item is **auto-rejected**,
    refunding any held points.
- **Reject / Cancel**: refunds held points back to the requester; item
  stays available.
- **Admin remove item**: cascades — cancels any pending swaps referencing
  the item (as either the target or the offered item) and refunds held
  points, then deletes the item.
- **Acceptance rate** = completed swaps / total swaps received, computed
  on the fly and shown on the dashboard and in the admin users table.

### Rate limiting

Login attempts (5 / 15 min per IP+email) and swap request creation
(10 / 24h per user) are limited via simple in-memory maps in
`lib/rateLimit.ts`. This is sufficient for a single-process demo; for a
multi-instance deployment, swap this for a shared store using the same
function signatures.

## Deploying

JSON file storage requires a **persistent, writable filesystem** — this
will **not** work on stateless/serverless platforms like standard Vercel
deployments, where the filesystem is ephemeral and read-only in production
(except `/tmp`, which doesn't persist between invocations).

Options:
1. Deploy to a host with a persistent disk (a VM, Railway, Render, Fly.io,
   a Docker container with a mounted volume, etc.) and point `/data` and
   `/public/uploads` at that persistent volume.
2. To deploy on Vercel, swap the implementation inside `lib/db.ts` for a
   real key-value/database backend (e.g. Upstash Redis or Vercel KV) and
   image storage in `lib/upload.ts` for a blob store (e.g. Vercel Blob or
   S3). Because every route only calls the generic functions exported from
   `lib/db.ts`, this is a localized change — no API route or page needs to
   be touched.

## Scripts

| Command         | Description                                   |
|-----------------|------------------------------------------------|
| `npm run dev`   | Start the dev server                          |
| `npm run build` | Production build (also type-checks)           |
| `npm run start` | Start the production server (after build)     |
| `npm run seed`  | Reset `/data` with demo admin/users/items/swaps |
| `npm run lint`  | Run ESLint                                    |
