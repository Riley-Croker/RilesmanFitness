# Module 12 — Challenges

Graded exercises that extend the real app. Each lists the files you'll
touch and a hint. No solutions provided on purpose — the docs, the
existing code, and the error messages are your resources, same as real
life. Do them in order within a tier; skip between tiers freely.

Rule of thumb for all of these: **find the closest existing feature and
imitate its structure.** Every challenge below has a sibling in the
codebase.

---

## Tier 1 — Warm-ups (30–60 min each)

### 1.1 Stat card
Add a "Sets this week" card to the dashboard.
- Touch: [queries.ts](../src/lib/queries.ts) (extend `getDashboardStats`),
  [dashboard/page.tsx](../src/app/dashboard/page.tsx)
- Hint: copy the `totalSets` subquery, add the same date filter
  `workoutsThisWeek` uses.

### 1.2 Rest-day encouragement
If `workoutsThisWeek === 0`, show a motivational banner on the dashboard.
- Touch: dashboard page only
- Hint: module 3's conditional rendering; style it like the error box in
  the login page but lime.

### 1.3 Show secondary muscles on cards
Exercise cards show body part + equipment chips. Add the first secondary
muscle as a third, grey chip.
- Touch: [exercise-card.tsx](../src/components/exercise-card.tsx)
- Hint: the data's already in the `Exercise` object — one line of JSX.

### 1.4 Page titles
Every page shows "Rilesman Fitness" as the tab title. Give the exercises
and dashboard pages their own titles.
- Touch: those `page.tsx` files
- Hint: `export const metadata = { title: "..." }` — same shape as
  layout.tsx. For the exercise *detail* page you'll need
  `generateMetadata` (look it up — first taste of the Next docs).

---

## Tier 2 — Full-stack features (2–4 h each)

### 2.1 Edit a workout's name and notes
The detail page can delete but not edit.
- Touch: [api/workouts/[id]/route.ts](../src/app/api/workouts/[id]/route.ts)
  (add `PATCH`), a new small client component with two inputs + save, the
  detail page.
- Hint: mirror the DELETE handler's ownership check (`WHERE id = ? AND
  user_id = ?`). For the UI, DeleteButton is your structural template.

### 2.2 Search your workout history
A search box on /workouts that filters by workout name.
- Touch: [workouts/page.tsx](../src/app/workouts/page.tsx),
  [queries.ts](../src/lib/queries.ts)
- Hint: the exercises page already does exactly this pattern — GET form →
  `searchParams` → SQL `LIKE ?` with `%${q}%` as the *parameter value*
  (keep the `?` placeholder!).

### 2.3 Favourite exercises
A star on exercise detail pages; a "Favourites" filter or section in the
library.
- Touch: schema.sql (new `favorites` table: user_id + exercise_id),
  migration by hand in MySQL, new api route (POST/DELETE), a small client
  star component, library page.
- Hint: this is the app's full vertical slice in miniature — schema →
  query → route → component. Budget most of the time for thinking about
  *where the favourite state lives* on the library page (server-fetched,
  passed down).

### 2.4 Duplicate a past workout
"Repeat this workout" button on the detail page that opens the logger
pre-filled with that workout's exercises and last weights.
- Touch: [workouts/new/page.tsx](../src/app/workouts/new/page.tsx) (new
  `?repeat=<id>` param), detail page button.
- Hint: the `?template=` seeding path is 90% of this feature. Reuse
  `getWorkoutDetail`.

---

## Tier 3 — Bosses (a weekend each)

### 3.1 Change password
Settings section with current-password verification.
- Touch: actions.ts (new server action: `bcrypt.compare` old,
  `bcrypt.hash` new), a `/settings` page (module 9's `useActionState`
  pattern), nav link.
- Watch out: don't log the user out accidentally — the JWT stays valid.

### 3.2 Body-weight tracking
Log your body weight over time; chart it on /progress.
- Touch: schema (new table), queries, api route, progress page (second
  chart), maybe a quick-log input on the dashboard.
- Hint: it's the exercise-progress feature with one fewer join. Respect
  the units system — store lbs, display via `toDisplayWeight`.

### 3.3 Rest timer in the logger
After ticking a set "done", show a countdown (default 90 s) with a beep.
- Touch: workout-logger.tsx (per-set `done` state), a new timer component
  (useEffect + setInterval — module 8's animation is your reference).
- Stretch: make the duration a user setting like `weight_unit`.

### 3.4 Deploy it
Get the app on the public internet: Vercel (free tier) + a hosted MySQL
(Railway/PlanetScale/Aiven).
- Touch: no code — env vars in Vercel's dashboard, run schema.sql against
  the hosted DB, set a *new* AUTH_SECRET.
- Watch out: `.env` is for local only; never commit real secrets. This
  challenge teaches you the config/deploy story .NET devs know as
  appsettings + App Service, translated.

---

## After the course

- **Official Next.js tutorial** (nextjs.org/learn) — you'll now recognise
  everything and fill gaps fast.
- **TypeScript handbook** (typescriptlang.org) — read "The Basics" through
  "Object Types" cover to cover once; it pays off daily.
- **Try Prisma** in a branch: model this exact schema and compare the
  queries you'd write. Best way to judge ORMs is porting SQL you know.
- Rebuild something small from scratch (`npx create-next-app`) — the
  scariest step is an empty folder; after this app it won't be.
