# Module 11 — How This App Was Actually Built

**Goal:** the engineering story — the order things were built, the
decisions and their reasons, and the real problems hit along the way.
Tutorials skip this part; it's where most of the craft lives.

## Starting point

`Dev/WorkoutApp` was a skeleton: Next.js + TypeScript wired up, a MySQL
adapter for OAuth login (Google/GitHub), and stub pages full of TODO
comments. The finish-line spec: log workouts, browse/search exercises via
an API, plus charts, calendar, PRs, templates — dark theme, and docs.

## Decision 1: auth — OAuth out, credentials in

The skeleton's OAuth needed Google/GitHub developer accounts, client IDs,
and secrets before anyone could log in. For a local single-user app that's
pure friction, so it became email/password:

- **Consequence chain:** NextAuth's Credentials provider requires JWT
  sessions (it can't use DB sessions) → the sessions/accounts/verification
  tables became dead weight → schema shrank by three tables. One decision,
  cascading simplifications. Watch for these chains in your own designs —
  the best simplifications come in chains.

## Decision 2: keep raw SQL, skip the ORM

The skeleton already used `mysql2` with hand-written SQL. Tempting to
introduce Prisma, but raw SQL was kept because (a) the queries are simple,
(b) you can read every line, (c) — honestly — the app's owner knows SQL.
**Play to the maintainer's strengths** is a legitimate architectural
criterion.

## Decision 3: two data sources, strictly separated

Training data (MySQL, yours) vs exercise catalogue (external, read-only).
The seam between them is the denormalised copy: when you log a workout,
the exercise's name/body-part/equipment are **copied into your DB** next
to the catalogue id. History never depends on the catalogue being alive.
This decision looked like paranoia — until it wasn't (see below).

## Problem 1: the documented API wasn't the real API

The plan was the ExerciseDB API. Its `/docs` page blocked automated
access (HTTP 403), so instead of trusting guesses, the underlying OpenAPI
spec (`/swagger`) was fetched — revealing the real contract differed from
first probes: filter endpoints that 404'd, a search param that silently
did nothing (`q=` vs `search=`), cursor pagination via `after=`.

**Lesson:** probe the actual API, don't trust docs or examples. A param an
API ignores *silently* is worse than an error — first tests looked
successful while returning unfiltered data.

## Problem 2: the GIF domain didn't exist

Every exercise's `gifUrl` pointed at `static.exercisedb.dev` —
NXDOMAIN. Not slow, not flaky: *gone*. Diagnosis steps worth copying:

1. Browser showed failed image loads → checked from PowerShell too
   (rules out a browser/sandbox quirk)
2. `Resolve-DnsName` failed locally → queried Cloudflare's DNS-over-HTTPS
   directly (rules out the local resolver): status 3, NXDOMAIN. Publicly
   dead.
3. Probed sibling hosts (`cdn.` existed!) and a dozen path patterns — 404s.
4. Tried to read the API's source on GitHub — repo was README-only.

Dead end, properly confirmed. Short-term fix: a fallback component so
broken images showed a 🏋️ placeholder instead of browser error icons —
**degrade gracefully, ship, revisit**.

## Problem 3 (same root): the pictures, solved properly

When placeholders weren't good enough, options were evaluated *by
probing, not by reading marketing pages*: free-exercise-db (873 exercises,
public domain, photos verified loading), RapidAPI ExerciseDB (real GIFs,
but API key + quotas), wger (only ~360 images), scraping (licensing mess —
rejected). The full switch to free-exercise-db won because it eliminated
the failure mode entirely: **the catalogue became a local JSON file**.
An interface-compatible rewrite ([exercise-library.ts](../src/lib/exercise-library.ts)
kept the same function signatures as the old API client) meant pages
barely changed. Two photos per exercise became a fake-GIF by alternating
frames every 1.2 s — a feature invented from a constraint.

One migration hazard caught in time: catalogue ids went from 7 chars
(`EIeI8Vf`) to long slugs (`Barbell_Bench_Press_-_Medium_Grip`) — the
`exercise_id VARCHAR(20)` column would have silently truncated them.
**When swapping a data source, audit column widths.**

## Problem 4: the off-by-one-day bug

First saved workout displayed "Saturday 4 July" — logged on Sunday the
5th. Classic: `new Date("2026-07-05")` parses a date-only string as **UTC
midnight**, which is the previous day in negative-offset timezones. Fix in
[api/workouts/route.ts](../src/app/api/workouts/route.ts): pin date-only
strings to local noon. Every developer meets this bug once; you've now met
it in your own codebase.

## Problem 5: the crash that wasn't a bug — then was

Mid-testing, the exercise picker died with a client-side exception. First
suspicion: hot-reload glitch (files were being edited while the modal was
open). Reload → worked → *almost* dismissed. Re-tested cleanly and it
crashed again: the fuzzy-search endpoint returned **slim objects** —
no `bodyParts` array — and the picker called `.join()` on `undefined`.

**Lesson pair:** (1) an error that vanishes on reload may still be real —
reproduce before dismissing; (2) never assume two endpoints of the same
API return the same shape.

## Decision 4: units, done the boring-correct way

The lbs request (originally kg) could have been a display find-replace.
Instead: **one canonical storage unit (lbs), conversion only at the
display/input boundary** ([units.ts](../src/lib/units.ts)), a per-user
preference column, and a migration converting existing rows
(`weight * 2.20462`). Why it matters: with "interpret the number by
current setting", toggling would silently relabel 60 kg as 60 lbs —
data corruption via UI. Canonical units make the toggle *unable* to lie.
This is the same discipline as storing UTC timestamps.

## The rhythm to steal

Each feature followed the same loop:

1. Probe the unknown thing first (API shapes, dataset, DNS)
2. Schema → data layer → API route → page → styling
3. **Verify in the running app immediately** — every feature was
   click-tested in a real browser before moving on; that's how problems
   4 and 5 were caught within minutes of existing
4. Update the docs in the same sitting (DOCUMENTATION.md never drifted)

Nothing here required brilliance. It required checking assumptions,
verifying constantly, and letting decisions cascade.

**Next:** [Module 12 — Challenges →](12-challenges.md)
