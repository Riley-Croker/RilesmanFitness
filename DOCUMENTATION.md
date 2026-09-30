# Rilesman Fitness — Full Documentation

An interactive web application for logging workouts, browsing an exercise
library of 1,285 movements with animated demonstrations, and tracking
strength progress over time. Built by finishing the `WorkoutApp` skeleton.
The exercise catalogue comes from the free tier of
[ExerciseDB](https://oss.exercisedb.dev), saved into the project (see
section 9 for why it left and came back).

---

## 1. What was built

The original `WorkoutApp` folder contained a Next.js skeleton: placeholder
pages with TODO comments, an empty workout API, and OAuth-based login that
required Google/GitHub credentials. WorkoutApp2 completes it with these
changes:

| Area | Before (WorkoutApp) | After (WorkoutApp2) |
|---|---|---|
| Login | Google/GitHub OAuth (needed external setup) | Email + password, stored locally with bcrypt hashing |
| Sessions | Database sessions (MySQL adapter) | Stateless JWT cookies — no session table |
| Workout logging | Empty stub page | Full logger: pick exercises, add sets/reps/weight, notes, date |
| Exercise info | None | Browser + detail pages with animated demos, instructions, muscles |
| Search | None | Fuzzy search plus filters by body part, equipment, and target muscle |
| Templates | None | Save any workout as a reusable routine, start workouts from it |
| Progress | None | Line/bar charts per exercise (max weight, est. 1RM, volume) |
| Calendar | None | Month grid showing training days |
| Personal records | None | Auto-detected heaviest set per exercise with estimated 1RM |
| Styling | Minimal CSS modules | Tailwind CSS 4, dark "gym" theme with lime accent |

## 2. Tech stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- **MySQL / MariaDB** accessed with raw SQL via `mysql2` (no ORM — every query is visible in the code)
- **NextAuth v5** (Credentials provider, JWT sessions) + **bcryptjs** for password hashing
- **Tailwind CSS 4** for styling
- **Recharts** for the progress charts
- **ExerciseDB free tier** for the exercise catalogue: data saved locally in `src/data/exercisedb.json`, GIFs served from ExerciseDB's CDN

## 3. Running the app

### Prerequisites (installed during setup on this PC)

- **Node.js LTS (v24)** — installed via winget
- **MariaDB Server 12.3** (drop-in MySQL replacement) — installed via
  winget and registered as an auto-starting Windows service named
  `MariaDB` on port 3306, root user with empty password (fine for local
  development; set a password before exposing it to anything).
  If the service ever needs re-registering, run
  [scripts/install-mariadb-service.cmd](scripts/install-mariadb-service.cmd)
  as administrator.

### First-time setup

```powershell
cd C:\Users\rcrok\Desktop\Dev\RilesmanFitness
npm install          # install dependencies
npm run db:init      # create the rilesman_fitness database and tables
npm run data:exercises  # optional: re-download the ExerciseDB catalogue (few minutes)
```

### Every time

```powershell
npm run dev          # start the dev server → http://localhost:3000/workout
```

Then open http://localhost:3000/workout, click **Sign up**, create an account, and
start logging.

Configuration lives in [.env](.env): database host/port/user/password/name,
and the `AUTH_SECRET` used to sign session cookies.

## 4. How the application works

### 4.1 Architecture overview

```
Browser
  │  pages (React server components render HTML;
  │  client components handle interactive bits)
  ▼
Next.js server
  ├── src/app/**/page.tsx      ← pages (UI)
  ├── src/app/api/**/route.ts  ← JSON API (auth-guarded)
  ├── src/lib/auth.ts          ← NextAuth login/session logic
  ├── src/lib/queries.ts       ← all SQL queries in one place
  ├── src/lib/exercise-library.ts ← local exercise catalogue (1,285 exercises)
  ├── src/data/exercisedb.json ← saved ExerciseDB catalogue
  └── src/lib/db.ts            ← MySQL connection pool
        │
        ▼
   MySQL (your data)      (GIFs load from ExerciseDB's CDN)
```

Two data sources are deliberately kept separate:

- **Your training data** (accounts, workouts, sets, templates) lives in your
  local MySQL database. It never leaves your machine.
- **The exercise catalogue** (names, GIFs, instructions, muscles) is
  ExerciseDB's free tier, downloaded once and saved in the project at
  `src/data/exercisedb.json`. Browsing, filtering, and search all run
  locally with no API calls; only the animated GIFs load from ExerciseDB's
  CDN, in the browser.

When you log a workout, the exercise's name, body part, equipment, and
target muscle are **copied into your database** alongside the catalogue id.
That way your history is fully self-contained, while the id lets pages link
back to the GIF and instructions.

### 4.2 Authentication flow

1. **Sign up** (`/register`): the form posts to a server action
   (`registerAction` in [src/lib/actions.ts](src/lib/actions.ts)). It
   validates input, hashes the password with bcrypt (12 rounds), inserts the
   user row, and signs you in.
2. **Log in** (`/login`): `loginAction` calls NextAuth's Credentials
   provider ([src/lib/auth.ts](src/lib/auth.ts)), which looks the user up by
   email and compares the bcrypt hash.
3. **Session**: on success NextAuth issues a **JWT cookie** signed with
   `AUTH_SECRET`. Every protected page/API calls `auth()` and reads
   `session.user.id` from that cookie — no database hit needed.
4. **Sign out**: the nav button calls `logoutAction`, which clears the cookie.

Passwords are never stored or logged in plain text.

### 4.3 The exercise library (ExerciseDB)

[src/lib/exercise-library.ts](src/lib/exercise-library.ts) loads
[src/data/exercisedb.json](src/data/exercisedb.json) (1,285 exercises) and
provides browsing, filtering, fuzzy search, and pagination — all in-process,
no network calls:

- Each exercise has **one animated GIF** with the target muscles
  highlighted. Free-tier GIFs are 180×180, so cards show them at about
  natural size and the detail page caps them at ~2× to stay sharp.
- **Refreshing the data:** `npm run data:exercises` runs
  [scripts/fetch-exercises.ts](scripts/fetch-exercises.ts). The free API is
  rate limited, so it takes a few minutes. The script also cleans the raw
  catalogue: about 1 in 9 GIFs returned 404 (Sep 2026), and ~200 names
  appeared more than once, differing only in GIF — every broken one had a
  working twin — so it keeps one working copy per name (1,500 → 1,285).
  It lowercases names, strips the "Step:1" prefixes from instructions,
  and applies `NAME_OVERRIDES` (e.g. ExerciseDB's "cable standing rear
  delt row (with rope)" is ours as "face pull"). **Edit names there, not
  in the JSON** — a refresh would undo a hand edit.
- Body parts come straight from ExerciseDB (upper legs, back, chest, …).
- Search normalises the query and requires every word to appear in the
  exercise name, muscles, or equipment, ranking exact/prefix name matches
  first.
- **/exercises** (the Library page) is server-rendered. Filters are a plain
  GET form, so the URL always reflects the current search — shareable and
  bookmarkable. Pagination uses a simple offset cursor.
- **/exercises/[id]** shows the animated demo, step-by-step instructions,
  target/secondary muscles, and equipment — plus *your* recent
  sets of that exercise pulled from MySQL, and a "Log this exercise"
  shortcut.
- The **exercise picker** inside the workout logger is a client component
  that calls our `/api/exercises` route (debounced as you type), which
  reads from the same local catalogue.

#### Renaming an exercise

Use this when ExerciseDB's name isn't what you call it, e.g. its
"cable standing rear delt row (with rope)" is our "face pull". (To log
something that isn't in the list at all, you don't need any of this: type
it into "Or type a custom exercise name…" at the bottom of the picker.)

**Why it takes more than editing one file:**

- `src/data/exercisedb.json` is *generated*. `npm run data:exercises`
  rebuilds it from ExerciseDB, so a name typed straight into it gets
  silently undone by the next refresh. Renames live in the download script
  instead, which re-applies them every time.
- Personal records and progress charts group logged sets by **name**. If
  you've already logged the exercise, the rows in your database still carry
  the old name, and old and new sets would split into two separate
  exercises. Those rows need updating too (step 6).

**Steps**

1. **Find the exercise's ID.** Open it in the app. The ID is the last part
   of the URL: `rcroker.dev/workout/exercises/ZfyAGhK` → `ZfyAGhK`.

2. **Add one line to `NAME_OVERRIDES`** at the top of
   [scripts/fetch-exercises.ts](scripts/fetch-exercises.ts):

   ```ts
   const NAME_OVERRIDES: Record<string, string> = {
     ZfyAGhK: "face pull", // ExerciseDB: "cable standing rear delt row (with rope)"
     AbC1234: "your new name", // ExerciseDB: "<its original name>"
   };
   ```

   - **Lowercase.** The app capitalises for display.
   - **Unique.** If another exercise already has that name, the script
     stops with an error naming it, because keeping both would silently drop
     one. Pick a different name.
   - Keep the comment with the original name. It's the only record of what
     ExerciseDB calls it.

3. 💻 **Rebuild the saved list.** Takes a few minutes (the free API is rate
   limited):

   ```powershell
   cd C:\Users\rcrok\Desktop\Dev\RilesmanFitness; npm run data:exercises
   ```

   A refresh also picks up anything ExerciseDB changed since last time, so
   the diff may include more than your rename. Glance at the exercise count
   the script prints; a big drop is worth a question before committing.

4. 💻 **Check it locally.** Run the app and search the new name at
   http://localhost:3000/workout/exercises.

5. 💻 **Check, commit, push, deploy** as usual (see `CLAUDE.md`):

   ```powershell
   cd C:\Users\rcrok\Desktop\Dev\RilesmanFitness; npm run lint; npx tsc --noEmit; npm run build
   ```
   ```powershell
   cd C:\Users\rcrok\Desktop\Dev\RilesmanFitness; git add -A; git commit -m "Rename <old> to <new>"; git push
   ```
   🖥️ Then the usual `git pull` / `docker compose build workout` / `up -d workout`
   on the droplet.

6. **Only if you've already logged it:** rename the stored rows so your
   history stays in one piece.

   🖥️ Back up first:
   ```bash
   cd /opt/rcroker && ./backup-db.sh
   ```
   Then in HeidiSQL, connected to production as `editor` (SSH tunnel setup is
   in `rcroker-infra/README.md`), run against `rilesman_fitness`:

   ```sql
   UPDATE workout_exercises  SET name = 'your new name' WHERE exercise_id = 'AbC1234';
   UPDATE template_exercises SET name = 'your new name' WHERE exercise_id = 'AbC1234';

   -- Check: should return exactly one row, with the new name.
   SELECT name, COUNT(*) FROM workout_exercises WHERE exercise_id = 'AbC1234' GROUP BY name;
   ```

   Matching on `exercise_id` rather than the old name means the update can
   only touch that one exercise.

**To undo a rename:** delete its line, rerun step 3, deploy, and run step 6
with ExerciseDB's original name (from the comment).

### 4.4 Logging a workout

`/workouts/new` renders the client-side logger
([src/components/workout-logger.tsx](src/components/workout-logger.tsx)).
There are two ways to use it:

- **Live:** press **▶ Start** when you begin. A timer pins below the nav
  with **Finish** and **Discard**. The workout's date becomes the moment you
  started, and the start and finish times are saved with it.
- **After the fact:** skip Start, pick the date, and **Save Workout**. No
  times are recorded; the summary just shows no duration.

Then:

1. Name the session (optional for a live workout: an unnamed one is saved
   as e.g. "Tuesday Workout") and optionally add notes.
2. **+ Add exercise** opens the picker (search the catalogue, filter by body
   part, or type a custom exercise name for anything not in the catalogue).
3. Each exercise gets a set table — reps and weight per set in your
   preferred unit (lbs by default); leave weight blank/0 for bodyweight
   movements.
4. **Finish** / **Save Workout** POSTs the whole structure to
   `/api/workouts`, which writes one `workouts` row, one `workout_exercises`
   row per exercise, and one `sets` row per set, then opens the workout's
   summary (4.5).
5. **Save as template** instead stores the exercise list (with set/rep
   targets taken from what you entered) as a reusable routine.

**The timer** stores the moment Start was pressed and shows `now − start`
every second. It is never a running counter, so it stays correct when a
phone sleeps between sets and pauses the page.

**The workout in progress survives reloads.** Every change is saved to the
browser's localStorage ([src/lib/workout-draft.ts](src/lib/workout-draft.ts)),
per user. If the tab reloads, closes, or the phone discards it, reopening
Log Workout resumes it, timer included, with a "Picked up where you left
off" note. Saving or discarding clears it. A logger you only opened and
didn't touch saves nothing, so looking at a template doesn't leave a
workout "in progress". Because localStorage exists only in the browser, the
logger is rendered browser-only
([workout-logger-loader.tsx](src/components/workout-logger-loader.tsx)) to
avoid a hydration mismatch between the server's HTML and the restored
workout.

The server accepts the start/finish times only if both are valid, finish
isn't before start, and the workout lasted under 24 hours; otherwise it
saves the workout without times rather than rejecting it.

Pre-seeding: `/workouts/new?exercise=<id>` starts with that exercise loaded
(used by the "Log this exercise" button), and `/workouts/new?template=<id>`
loads a full template (used by "Start workout" on the Templates page). A
workout already in progress takes priority over either.

### 4.5 Workout summary

`/workouts/[id]/summary`
([src/app/workouts/[id]/summary/page.tsx](src/app/workouts/[id]/summary/page.tsx))
opens after every save, and from **View summary** on any workout's detail
page. One phone-sized card holds:

- **Totals:** duration (live workouts; otherwise the exercise count), sets,
  and volume.
- **Every exercise** with its set count and **best set**: heaviest weight,
  more reps breaking a tie (the Records page's rule). Bodyweight-only
  exercises show their most reps as `BW × 25`. It's a real `<table>`, so
  the Sets numbers and the × of every best set line up whatever the name or
  weight length, with the unit in the column header. Names wrap to at most
  three lines, which cuts off only the 1–3 longest of the 1,285 catalogue
  names on a phone. A long workout won't fit one screen; Save image still
  captures the whole card as a single tall picture.
- **PR badge** when a best set beats every set of that exercise logged
  *before* this workout (an earlier date, or the same date saved earlier).
  Like the Records page it counts weighted sets only, and a first attempt is
  never a PR. `getPreviousBests` in [queries.ts](src/lib/queries.ts) uses the
  same ranking as `getPersonalRecords`, so the two can't disagree.
- **Muscles worked:** a front/back body map shaded lime by effort, plus the
  top five muscle groups with bars. [src/lib/muscles.ts](src/lib/muscles.ts)
  scores each set as 1 for the exercise's target muscles and 0.5 for its
  secondaries (looked up in the catalogue; custom exercises fall back to
  their one stored target muscle), and maps ExerciseDB's anatomical names
  onto body-map regions. The outlines are adapted from the MIT-licensed
  react-body-highlighter ([body-map-data.ts](src/components/body-map-data.ts)
  carries the attribution).

**Save image** ([save-image-button.tsx](src/components/save-image-button.tsx))
renders the card to a PNG at 2× with `modern-screenshot`. On phones it opens
the share sheet (iPhone: "Save Image" puts it in Photos); on computers it
downloads. The card has no exercise GIFs on purpose: ExerciseDB's server
doesn't allow other sites to export its images, and one such image would
block the whole export. The card also screenshots cleanly as-is.

### 4.6 Stats features

All computed with SQL in [src/lib/queries.ts](src/lib/queries.ts):

- **Dashboard** — workouts and volume (Σ reps × weight) this week, all-time
  totals, five most recent sessions, top five PRs.
- **Progress** (`/progress`) — pick any exercise you've logged; charts show
  max weight and estimated one-rep max (Epley formula: `weight × (1 + reps/30)`)
  per session, plus a volume bar chart. Data comes from
  `/api/stats/progress?exercise=<name>`.
- **Calendar** (`/calendar`) — a Monday-first month grid; days you trained
  are highlighted with links to each workout. Arrows navigate months via
  the `?month=YYYY-MM` param.
- **Records** (`/records`) — for every exercise, the single heaviest set
  you've ever done (weight, reps, date, est. 1RM), ranked by weight. Found
  with a window function (`ROW_NUMBER() OVER (PARTITION BY exercise ...)`).

## 5. Database schema

Database: `rilesman_fitness` (created by `npm run db:init` from
[scripts/schema.sql](scripts/schema.sql)).

```
users                 — id, name, email (unique), password_hash,
                        weight_unit ('lbs' default | 'kg')
workouts              — id, user_id → users, name, date, notes,
                        started_at, finished_at (both NULL unless timed live)
workout_exercises     — id, workout_id → workouts, exercise_id (catalogue id,
                        nullable for custom), name, body_part, equipment,
                        target_muscle, sort_order
sets                  — id, workout_exercise_id → workout_exercises,
                        reps, weight (stored in lbs, 0 = bodyweight),
                        sort_order
templates             — id, user_id → users, name, description
template_exercises    — id, template_id → templates, exercise_id, name,
                        body_part, equipment, target_muscle,
                        target_sets, target_reps, sort_order
```

All foreign keys use `ON DELETE CASCADE`, so deleting a workout removes its
exercises and sets automatically, and deleting a user would remove all of
their data.

## 6. API reference (the app's own routes)

All routes except `/api/exercises` require a signed-in session and only
ever touch the signed-in user's rows.

| Method & path | Purpose |
|---|---|
| `GET /api/workouts` | List your workouts (summaries with counts + volume) |
| `POST /api/workouts` | Create a workout `{name, date, notes, startedAt?, finishedAt?, exercises:[{exerciseId, name, ..., sets:[{reps, weight}]}]}`. The ISO start/finish times are sent only for live workouts; when kept, `startedAt` becomes the workout's date |
| `GET /api/workouts/[id]` | Full workout with exercises and sets |
| `DELETE /api/workouts/[id]` | Delete a workout |
| `GET /api/templates` | List your templates |
| `POST /api/templates` | Create a template |
| `GET /api/templates/[id]` | One template |
| `DELETE /api/templates/[id]` | Delete a template |
| `GET /api/exercises` | Query the local catalogue: `?search=&bodyPart=&equipment=&muscle=&after=&limit=` |
| `GET /api/exercises/[id]` | One exercise from the catalogue |
| `POST /api/settings` | Update preferences: `{ "weightUnit": "lbs" \| "kg" }` |
| `GET /api/stats/progress` | Time series for one exercise: `?exercise=<name>` |
| `GET|POST /api/auth/*` | NextAuth internals (login, session, logout) |

## 7. Project structure

```
RilesmanFitness/
├── .env                        # DB credentials, AUTH_SECRET
├── scripts/
│   ├── schema.sql              # full database schema
│   ├── init-db.ts              # creates the DB from schema.sql (npm run db:init)
│   ├── fetch-exercises.ts      # downloads + cleans the ExerciseDB catalogue (npm run data:exercises)
│   └── migrations/             # one-off SQL migrations, run by hand on the server
├── src/
│   ├── app/
│   │   ├── layout.tsx          # root layout: fonts, nav, session fetch
│   │   ├── page.tsx            # landing page (redirects to /dashboard when logged in)
│   │   ├── login/ register/    # auth forms
│   │   ├── dashboard/          # stats cards, recent workouts, top PRs
│   │   ├── exercises/          # library browser + [id] detail page
│   │   ├── workouts/           # history list, new/ logger, [id] detail, [id]/summary
│   │   ├── templates/          # saved routines
│   │   ├── progress/           # charts
│   │   ├── calendar/           # month grid
│   │   ├── records/            # PR table
│   │   └── api/                # JSON routes (see API reference)
│   ├── components/
│   │   ├── nav.tsx             # top nav (responsive, active-link aware)
│   │   ├── exercise-card.tsx   # library grid card
│   │   ├── exercise-image.tsx  # exercise GIF, with 🏋️ fallback
│   │   ├── exercise-picker.tsx # search modal used by the logger
│   │   ├── workout-logger.tsx  # the interactive logging form, with the live timer
│   │   ├── workout-logger-loader.tsx # renders the logger browser-only (localStorage draft)
│   │   ├── body-map.tsx        # front/back muscle map on the summary
│   │   ├── body-map-data.ts    # its polygon outlines (MIT, see file header)
│   │   ├── save-image-button.tsx # summary card → PNG → share sheet / download
│   │   ├── progress-charts.tsx # recharts line/bar charts
│   │   └── delete-button.tsx   # confirm-then-delete
│   ├── data/
│   │   └── exercisedb.json     # saved ExerciseDB catalogue (1,285)
│   ├── lib/
│   │   ├── db.ts               # mysql2 connection pool
│   │   ├── auth.ts             # NextAuth credentials config
│   │   ├── actions.ts          # login/register/logout server actions
│   │   ├── queries.ts          # every SQL query used by pages and APIs
│   │   ├── exercise-library.ts # local catalogue: browse/filter/search
│   │   ├── muscles.ts          # "muscles worked" scoring for the summary
│   │   ├── workout-draft.ts    # saves the workout in progress to localStorage
│   │   ├── duration.ts         # timer clock / summary duration formatting
│   │   ├── units.ts            # lbs ↔ kg conversion (storage is always lbs)
│   │   └── base-path.ts        # the /workout prefix and withBasePath()
│   └── types/
│       ├── index.ts            # shared TypeScript types
│       └── next-auth.d.ts      # adds user.id to the session type
```

## 8. Design decisions worth knowing

- **Raw SQL over an ORM** — kept from the original skeleton so every query
  is readable and editable directly; `queries.ts` is the single place to
  look.
- **JWT sessions over DB sessions** — required by NextAuth's Credentials
  provider and removes three tables from the schema.
- **Denormalised exercise info** — workout history is self-contained; the
  external API is an enhancement, not a dependency, for viewing old data.
- **lbs canonical, kg optional** — weights are always stored in lbs; each
  user has a `weight_unit` preference (default lbs) toggled from the nav
  (lbs/kg pill). Conversion happens only at the display/input boundary
  ([src/lib/units.ts](src/lib/units.ts)), so toggling never corrupts data —
  it just re-renders the same stored numbers in the other unit. A weight of
  0 displays as "Bodyweight".
- **Server-rendered filters on /exercises** — search state lives in the
  URL, which plays nicely with the back button and needs no client state.
- **The server runs in the user's time zone** — pages format dates and times
  on the server, in the server's zone, and mysql2 reads and writes
  `DATETIME` columns in it too. The production container sets
  `TZ: America/New_York` (in `rcroker-infra/docker-compose.yml`); without
  it, the image's UTC default would show an 11:43 PM workout as 3:43 AM the
  next day, on the wrong calendar day. Local dev simply uses the PC's zone.
  Untimed workouts are stored at noon, so they can't cross a day boundary
  whichever zone reads them.

## 9. History: ExerciseDB → free-exercise-db → ExerciseDB

The app originally integrated the free ExerciseDB API
(https://oss.exercisedb.dev) that was scouted for this project. It worked
for names, instructions, and search — but its image CDN
(`static.exercisedb.dev`) turned out to be a dead domain (DNS NXDOMAIN),
so no exercise had a visible demo. Rather than depend on a broken external
service, the catalogue was switched to the public-domain
**free-exercise-db** dataset: slightly fewer exercises (873 vs ~1,500),
but every single one has photos, and the whole catalogue now lives inside
the project — no API keys, no rate limits, nothing external to break.
Photos are served from jsDelivr; if that CDN is ever unreachable a 🏋️
placeholder appears instead
([src/components/exercise-image.tsx](src/components/exercise-image.tsx)).

**September 2026: back to ExerciseDB.** Its CDN came back online, and the
animated, muscle-highlighted GIFs plus the larger catalogue (1,285 vs 873)
won out over the photos. This time the catalogue is **saved in the
project** rather than called live: the free API is rate limited and its
README says it is not meant for production, so the app never calls it at
runtime. Only the GIFs load from ExerciseDB, and the 🏋️ fallback still
covers an outage. If the free CDN proves unreliable again, ExerciseDB sells
a self-hosted pack (Starter, $199 one-time, 360px GIFs).

Saved workouts store the catalogue id, and personal records and progress
charts group by exercise **name**, so the switch shipped with a one-off
migration ([scripts/migrations/2026-09-29-exercisedb.sql](scripts/migrations/2026-09-29-exercisedb.sql))
that moves every logged exercise to its ExerciseDB id and name. Without the
name change, old and new sets of the same lift would split into two records.

## 10. Ideas for later

- Edit existing workouts (currently log/view/delete)
- Rest-timer and per-set completion checkboxes during a live session
- Body-weight and measurement tracking
- Deploy: Vercel + a hosted MySQL (PlanetScale/Railway); set the env vars
  and run `schema.sql` against the hosted database
