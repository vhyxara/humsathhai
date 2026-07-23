# HumSathHai

A small crisis-relief coordination app. Volunteers at checkpoints report
what supplies they're low on; anyone can check a public "Need Board" to see
what's needed where, and where to hand off donations.

## Features

- **Need Board** (`/`) — public, read-only. Every checkpoint's supply items,
  sorted most-urgent-first, with a relative "updated X ago" timestamp.
- **Checkpoint Support Page** (`/checkpoint/[id]`) — public, read-only.
  A single checkpoint's supply items, plus a hand-off contact (Telegram) for
  the Entry Volunteer routing donations there. The contact link only appears
  once that volunteer has explicitly consented to being contacted
  (`consent_given`) — otherwise it shows "Delivery contact not yet available."
- **Login** (`/login`) — credentials-based (email + password), for both
  Admins and Volunteers. Sessions are stored in the database (a `Session`
  table), not as signed/stateless JWTs, and set as an `httpOnly` cookie.
- **Checkpoint Volunteer Dashboard** (`/dashboard`) — the only protected
  page today. A Checkpoint Volunteer sees their own checkpoint's supply
  items and can update each one's status (Enough / Low / Urgent) with an
  independent save-per-item control. The UI never reflects a change until
  the server confirms it (no optimistic updates) — on save it shows exactly
  the status/timestamp the server returned. Admins and Entry Volunteers who
  reach `/dashboard` get a plain "not available to you" message instead of
  the checkpoint UI. A Checkpoint Volunteer with no checkpoint assigned yet
  sees a calm empty state instead of an error.
- **Authorization boundary on supply-status updates** — enforced twice,
  independently: `proxy.ts` gates `/dashboard` on "is there a session" only;
  the actual `PATCH /api/supply-status` mutation does its own from-scratch
  check on every request — re-reads the caller's Volunteer row and the
  target row's real `checkpoint_id` from the database and compares them,
  never trusting anything the client asserts (including a spoofed
  `updated_at` in the body, which is always ignored — Prisma's `@updatedAt`
  is the only thing that ever sets it).

## Tech stack

- **Next.js 16** (App Router). Note: this version renames `middleware.ts` to
  `proxy.ts` (`middleware.ts` is deprecated) — see `proxy.ts` at the repo
  root.
- **Prisma 7** + `@prisma/adapter-pg`, on **Neon Postgres**.
- **Zod** for request validation on every API route (shape-checked before
  any auth/business logic runs).
- **bcryptjs** for password hashing.
- **Tailwind CSS 4** for styling.
- **Vitest** + **React Testing Library** for tests, run against an isolated
  database (never the dev database — see [Testing](#testing)).

## Data model

| Model | What it is |
|---|---|
| `User` | Login identity (email + password hash). Has exactly one of `Admin` or `Volunteer` attached, via `type`. |
| `Admin` | Staff account. `role` is `super` or `checkpoint`. |
| `Volunteer` | `role` is `entry` (staffs an Entry Point, routes donations) or `checkpoint` (staffs a Checkpoint, reports supply status). `checkpoint_id` is nullable — an unassigned volunteer is a valid, handled state. |
| `EntryPoint` | A donation drop-off point. Has at most one Entry Volunteer, and routes to one or more Checkpoints. |
| `Checkpoint` | Where supplies actually get used. Has any number of `SupplyStatus` rows and any number of Checkpoint Volunteers. |
| `SupplyStatus` | One item's status (`urgent` / `low` / `enough`) at one checkpoint. `updated_at` is server-controlled only. |
| `Session` | A logged-in session, keyed by an opaque token cookie. |
| `VolunteerApplication` | Someone applying to volunteer (`pending` / `approved` / `rejected`). Seeded for completeness — no UI reads this yet. |

## Getting started

### 1. Environment

You need a Postgres database (this project is built against Neon, but any
Postgres works). Set it in `.env`:

```bash
DATABASE_URL="postgresql://..."
```

Never point `DATABASE_URL` at anything you don't want reset — the seed flow
below is destructive by design (see [Seeding](#3-apply-the-schema-and-seed-dummy-data)).

### 2. Install

```bash
npm install
```

### 3. Apply the schema and seed dummy data

```bash
npx prisma migrate reset --force
```

This drops and recreates the schema, then is *supposed* to run
`prisma/seed.ts` automatically (it's wired up in `prisma.config.ts`) — in
practice the seed step doesn't always fire in this environment, so if
`npx prisma migrate reset` finishes without a `Seed complete.` line, run it
explicitly:

```bash
npx tsx --env-file=.env prisma/seed.ts
```

`migrate reset` is genuinely destructive (wipes all data), so treat it with
the same caution you would any `DROP` — don't run it against a database
that has real data you care about.

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Demo accounts

Every seeded account uses the same password: **`TestPassword123!`** (a fake,
test-only credential — see the comment in `prisma/seed.ts`).

| Email | Type / role | What it demonstrates |
|---|---|---|
| `admin@example.test` | Admin, `super` | Logs in fine; `/dashboard` shows "not available to you" (Admins have no Volunteer profile). |
| `admin2@example.test` | Admin, `checkpoint` | Same as above — note `checkpoint` here is an *Admin* role, unrelated to Volunteer's `checkpoint` role, even though they share the string value. |
| `volunteer1@example.test` | Volunteer, `entry`, Entry Point 1 | Consented contact — appears on Point A/B's support pages. `/dashboard` shows "not available to you" (Entry Volunteers don't get the checkpoint dashboard). |
| `volunteer2@example.test` | Volunteer, `checkpoint`, Point A | The main demo account — full dashboard with 3 items (Food/Water/Masks). |
| `volunteer3@example.test` | Volunteer, `entry`, Entry Point 2 | Consented contact for Point C/D's support pages. |
| `volunteer4@example.test` | Volunteer, `checkpoint`, Point B | A second working dashboard, useful for the cross-checkpoint authorization demo below. |
| `volunteer5@example.test` | Volunteer, `checkpoint`, **unassigned** | `/dashboard` shows the "not currently assigned to a checkpoint" empty state. |

## Playbook

**See the public Need Board.** Visit `/` — no login needed. Items are
sorted most-urgent-first.

**See a Checkpoint Support Page.** Click any checkpoint name from the Need
Board (or visit `/checkpoint/<id>` directly). You'll see that checkpoint's
items and, if the routing Entry Volunteer has consented, a Telegram link.

**Update supply status as a Checkpoint Volunteer.**
1. Go to `/login`, sign in as `volunteer2@example.test`.
2. You land on `/dashboard` with Point A's 3 items.
3. Pick a different status pill on any item, then hit **Save**. The button
   is disabled until you've actually changed something, and shows
   "Saving…" while the request is in flight.
4. Refresh `/` — the Need Board reflects the change.

**See the role-gated rejection.** Log out, log back in as
`admin@example.test` or `volunteer1@example.test`, and visit `/dashboard` —
you'll get a plain rejection message instead of the checkpoint UI.

**See the unassigned-volunteer empty state.** Log in as
`volunteer5@example.test` and visit `/dashboard`.

**See the authorization boundary reject a cross-checkpoint update.** This is
the part that's *not* just a UI restriction — the API enforces it
independently of what the dashboard shows you:
1. Log in as `volunteer2@example.test` (Point A) in a browser.
2. Find a `SupplyStatus` id belonging to Point B (e.g. via Prisma Studio:
   `npx prisma studio`).
3. Send a direct request using that browser's real session cookie:
   ```bash
   curl -i -b "session_token=<your real cookie value>" \
     -X PATCH http://localhost:3000/api/supply-status \
     -H "Content-Type: application/json" \
     -d '{"id":"<a Point B supply-status id>","status":"enough"}'
   ```
4. Expect `403 {"error":"Not authorized to update this item"}`, and the
   Point B row unchanged — the mutation re-derives both the caller's
   checkpoint and the target row's checkpoint from the database on every
   request, it doesn't trust anything about which checkpoint the client
   claims to be updating.

**Log out.** `POST /api/logout` (there's a Log out link on `/dashboard`) —
deletes the `Session` row and clears the cookie. A stale cookie stops
working immediately (`getSession` looks the token up in the database on
every request).

## Testing

Tests run against a **separate, isolated database** — never the one in
`DATABASE_URL`. Set `.env.test`:

```bash
TEST_DATABASE_URL="postgresql://..."
```

This must point at a genuinely different database (e.g. a separate Neon
branch) from your dev `DATABASE_URL`. `vitest.config.ts` reads
`TEST_DATABASE_URL` from `.env.test` and points the Prisma client at it for
the whole test run — it never reads or falls back to `.env`'s
`DATABASE_URL`.

Apply the schema to the test database once (it needs its own migration
history, separate from dev):

```bash
DATABASE_URL="$(grep '^TEST_DATABASE_URL=' .env.test | cut -d= -f2- | tr -d '\"')" npx prisma migrate deploy
```

Then run the suite:

```bash
npm test          # single run
npm run test:watch  # watch mode
```

Tests create and tear down their own fixture rows per-test (see
`lib/shared/testHelpers.ts`) — they don't depend on `prisma/seed.ts`'s dummy
data, and they clean up after themselves.

## Project structure

```
app/
  page.tsx                    Need Board (public)
  checkpoint/[id]/page.tsx    Checkpoint Support Page (public)
  login/page.tsx              Login form
  dashboard/page.tsx          Checkpoint Volunteer dashboard (protected)
  api/login/route.ts          POST -- creates a session
  api/logout/route.ts         POST -- destroys a session
  api/supply-status/route.ts  PATCH -- the authorized mutation

lib/
  auth/session.ts             createUserSession / getSession / destroySession
  checkpoints/checkpointVolunteer.ts   Volunteer context + the authorization check
  shared/                     prisma client, relativeTime util, test helpers

components/checkpoints/       StatusBadge, SupplyStatusList (dashboard UI)

proxy.ts                      Session-only auth gate for /dashboard
prisma/schema.prisma          Data model
prisma/seed.ts                Dummy data (see Demo accounts above)
```

Free-standing modules (`lib/`, `components/`) are grouped by feature domain,
not technical layer. Page and API route files stay wherever Next.js's
file-based routing requires them.

## Notable gotchas

- **`proxy.ts`, not `middleware.ts`.** This Next.js version deprecated
  `middleware.ts` in favor of `proxy.ts` (same mechanism, renamed, defaults
  to the Node.js runtime now instead of Edge). Don't reintroduce a
  `middleware.ts` file expecting it to do anything.
- **Sessions are database-backed, not JWTs.** `getSession()` does a real DB
  lookup on every call. There's no stateless/optimistic-only check available
  in this app's session model.
- **`proxy.ts` only checks "is there a session."** Role and
  checkpoint-ownership checks live in the dashboard page and the mutation
  route, respectively — on purpose, so a bug in one layer doesn't silently
  remove the other.
- **`prisma migrate reset` requires typed confirmation** in this environment
  when run by an AI agent (Prisma's own safety gate) — it's destructive, so
  treat it that way even when running it yourself.
  
