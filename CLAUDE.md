# Rilesman Fitness — notes for Claude

Workout tracker (Next.js 16, TypeScript, raw-SQL MariaDB via mysql2, NextAuth v5
credentials, Tailwind 4, Recharts). **Live at https://rcroker.dev/workout** as one app
on Riley's multi-project platform. Infra (Docker Compose, Caddy, DB init scripts) lives
in the separate private repo `rcroker-infra`, cloned beside this one in `Dev/`.

Full feature docs: `DOCUMENTATION.md`. Teaching course: `learning/` — keep it accurate
when architecture changes.

## Working with Riley

- SQL and C#/.NET developer learning Next.js/TypeScript. Explain the concept on its own
  terms first; a C# comparison is a marked aside, never the explanation.
- New to Linux/servers: label every command 💻 PC (PowerShell 5.1 — chain with `;`, no
  `&&`), 🖥️ SERVER (bash) or 🌐 BROWSER.
- Give runnable one-liners that start with an absolute `cd`. If Riley is to commit, include
  the commit with a written message:
  `cd C:\Users\rcrok\Desktop\Dev\RilesmanFitness; git add -A; git commit -m "..."; git push`
- US conventions in the UI: dates mm/dd/yyyy (`en-US`), weights default lbs.

## Running locally

```powershell
cd C:\Users\rcrok\Desktop\Dev\RilesmanFitness; npm run dev
```

Open **http://localhost:3000/workout** — plain `localhost:3000` is a 404 by design.
Local MariaDB, root with empty password; settings in `.env`. `npm run db:init` creates
the schema from `scripts/schema.sql`.

**Before every commit:** `npm run lint; npx tsc --noEmit; npm run build` — all must pass.
Verify UI changes in the browser, not just by compiling.

## Rules that are easy to break

**URLs — the app is served under `/workout` (`basePath` in `next.config.ts`).**
- `<Link href>`, `redirect()` and `router.push()` get the prefix automatically — write
  plain `/dashboard`.
- `fetch()` URLs do NOT. Always `fetch(withBasePath("/api/..."))` from `src/lib/base-path.ts`.
- NextAuth `redirectTo` / `pages` values also need `withBasePath()` (NextAuth rebuilds them
  from the origin alone).
- NextAuth's own `basePath` stays at its default `/api/auth`, and `AUTH_URL` must be an
  origin with no path. A path breaks every auth route with `UnknownAction`.

**Data — identity is shared across rcroker.dev apps.**
- `common.users` holds id, name, email, password_hash (shared with future apps).
  `rilesman_fitness.users` holds only id + weight_unit. Same `id` in both; no cross-database
  foreign key, so the code keeps them in step: signup inserts both in one transaction,
  login does `INSERT IGNORE INTO users (id)`.
- Unqualified `users` in queries means `rilesman_fitness.users` (via `DB_NAME`).
- Weights are always **stored in lbs**; convert only at display/input (`src/lib/units.ts`).
- workouts → workout_exercises → sets, and templates → template_exercises, all
  `ON DELETE CASCADE`.

**Schema changes** must be made in BOTH `scripts/schema.sql` (local) and
`rcroker-infra/sql/002-workout-schema.sql` (production) — they are meant to be identical.
Production has real data now: a schema change needs an explicit `ALTER TABLE` migration
run on the server, not a rebuild. Plan it with Riley before touching production.

## Deploying a change

1. 💻 Commit and push (one-liner above).
2. 🖥️ On the droplet:
   ```bash
   cd /opt/rcroker/workout && git pull && cd /opt/rcroker && docker compose build workout && docker compose up -d workout
   ```
   `build` doesn't touch the live site; only `up -d` swaps the container.
3. 🌐 Check in a **private window** (rules out browser cache), then test the changed feature.

Database access and backups (SSH tunnel, HeidiSQL, `readonly`/`editor` users,
`./backup-db.sh`): see `rcroker-infra/README.md`. Back up before any manual data edit.
