# Module 5 — The Data Layer (Your Home Turf)

**Goal:** see how this app talks to MySQL. Good news: it's raw SQL with a
thin driver — closer to ADO.NET/Dapper than to Entity Framework. Your SQL
knowledge transfers directly.

## The connection pool

[src/lib/db.ts](../src/lib/db.ts) — the whole file is ~20 lines:

```ts
import mysql from "mysql2/promise";

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    ...
    connectionLimit: 10,
  });
}

export const db = globalForDb.pool || createPool();
```

- `mysql2` ≈ `MySqlConnection` + connection pooling built in.
- `process.env.DB_HOST` reads [.env](../.env) — your
  `IConfiguration["DB_HOST"]`.
- The `globalForDb` dance exists because Next.js hot-reloads modules in
  dev; without it you'd leak a new pool on every code save. It's the
  singleton pattern, JavaScript-style.

## Executing queries

The core call, used everywhere:

```ts
const [rows] = await db.execute(
  "SELECT * FROM users WHERE email = ?",
  [email]
);
```

- `?` placeholders = parameterised queries (`@email` in SqlCommand).
  **Never** string-interpolate values into SQL — same rule as .NET.
- `execute` returns `[rows, fields]`; the destructuring `const [rows]`
  grabs just the rows.
- Rows come back as plain objects: `rows[0].email`. Like Dapper's
  `dynamic` results — which is why
  [queries.ts](../src/lib/queries.ts) maps them into typed shapes.

## The query layer

[src/lib/queries.ts](../src/lib/queries.ts) is the repository class of the
app: every SELECT the pages need, in one file. Skim it top to bottom — you
can read all of it because it's just SQL. Highlights worth studying:

**Aggregation with JOINs** (`getWorkoutSummaries`):

```sql
SELECT w.id, w.name, w.date, w.notes,
       COUNT(DISTINCT we.id) AS exerciseCount,
       COUNT(s.id)           AS setCount,
       COALESCE(SUM(s.reps * s.weight), 0) AS totalVolume
FROM workouts w
LEFT JOIN workout_exercises we ON we.workout_id = w.id
LEFT JOIN sets s ON s.workout_exercise_id = we.id
WHERE w.user_id = ?
GROUP BY w.id, w.name, w.date, w.notes
ORDER BY w.date DESC
```

**A window function** (`getPersonalRecords`) — the heaviest set per
exercise:

```sql
SELECT ... FROM (
  SELECT we.name AS exercise, s.weight, s.reps, w.date,
         ROW_NUMBER() OVER (PARTITION BY we.name
                            ORDER BY s.weight DESC, s.reps DESC) AS rn
  FROM sets s
  JOIN workout_exercises we ON we.id = s.workout_exercise_id
  JOIN workouts w ON w.id = we.workout_id
  WHERE w.user_id = ? AND s.weight > 0
) ranked
WHERE rn = 1
```

**Reshaping flat rows into a hierarchy** (`getWorkoutDetail`): SQL returns
one row per set; the code groups them into
`workout → exercises[] → sets[]` using a `Map` (≈ `Dictionary<K,V>`).
That's the hand-rolled version of what EF's `.Include()` does for you.

**Every query filters by `user_id`.** That's the authorisation model: SQL
scoping, not row-level security. A user literally cannot query another
user's rows because the id comes from the session, never from the request
body.

## The schema

[scripts/schema.sql](../scripts/schema.sql) — plain DDL, you can read all
of it. Design notes:

- UUIDs (`VARCHAR(36)`) for keys, generated in code
  (`crypto.randomUUID()`), not auto-increment — avoids exposing row counts
  and works before INSERT.
- `ON DELETE CASCADE` everywhere: delete a workout, its exercises and sets
  go too. The DELETE endpoint relies on this.
- Denormalised exercise info on `workout_exercises` (name, body_part,
  equipment) — history is self-contained even if the exercise catalogue
  changes.
- Weights stored in **lbs** always (module: [units.ts](../src/lib/units.ts)),
  converted only for display.

[scripts/init-db.ts](../scripts/init-db.ts) runs the schema file —
`npm run db:init`. That's your database migration story: intentionally
primitive (no EF Migrations equivalent), fine for a single-developer app.

## Where EF Core would have been

This app deliberately skips ORMs. The trade-offs, honestly:

| Raw SQL (this app) | EF Core / Prisma equivalent |
|---|---|
| You see every query | Queries generated, sometimes surprising |
| Reshaping rows by hand | `.Include()` / relations do it |
| Schema drift is on you | Migrations tracked automatically |
| Zero magic to debug | More layers when things go wrong |

The Node ecosystem's EF-alike is **Prisma** — worth exploring after this
course; you'd define the schema in its DSL and get typed queries generated.

## Try it

1. **Read your own data.** Open a terminal:
   `& "C:\Program Files\MariaDB 12.3\bin\mysql.exe" -u root workout_app2`
   then `SELECT * FROM workouts;`. It's just a database.
2. **Add a query.** In [queries.ts](../src/lib/queries.ts), write
   `getMostFrequentExercise(userId)`: the exercise name with the most
   sets. (SQL: join sets→workout_exercises→workouts, GROUP BY name,
   ORDER BY COUNT DESC, LIMIT 1.) Call it from the dashboard page and
   render the result in a new stat card. This exercise touches the whole
   stack — SQL → typed function → server component → JSX.
3. **Break a parameter.** Change a `?` to a string-interpolated value and
   feel bad about it. Change it back. (Seriously: note how the `?` style
   made SQL injection a non-issue across the entire app.)

**Next:** [Module 6 — API routes →](06-api-routes.md)
