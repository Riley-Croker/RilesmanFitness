# Module 5 — The Data Layer

**Goal:** understand exactly how this app talks to MariaDB — the driver,
the connection pool, how results come back, and the dialect differences
from T-SQL.

Good news: there is no ORM here. It's raw SQL over a thin driver, so your
existing SQL knowledge transfers directly. The new material is the plumbing
around the SQL, and the ways JavaScript's type system distorts values on
the way out of the database.

---

## Part 1 — The driver and the connection pool

[src/lib/db.ts](../src/lib/db.ts) is the entire database setup — about 20
lines:

```ts
import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as { pool: mysql.Pool };

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "workout_app",
    waitForConnections: true,
    connectionLimit: 10,
  });
}

export const db = globalForDb.pool || createPool();

if (process.env.NODE_ENV !== "production") globalForDb.pool = db;
```

Three things are happening. Take them one at a time.

### `mysql2/promise` — the driver

`mysql2` is a MySQL/MariaDB client library. The `/promise` suffix selects
the promise-based API instead of the older callback style, so you can
`await` queries.

It is a **driver**, not an ORM. It sends SQL strings and returns rows. It
does not generate SQL, track entities, manage change state, or map to
classes.

### Why a pool, not a connection

Opening a TCP connection to a database and authenticating takes real time —
often longer than the query itself. Doing that per request would dominate
your latency.

A **pool** keeps a set of open connections alive and hands one out for each
query, returning it afterward. `connectionLimit: 10` means at most 10
concurrent conversations with MariaDB; `waitForConnections: true` means an
11th query waits in line rather than erroring out.

You never check connections in and out yourself — calling `db.execute(...)`
does it for you.

### The `globalThis` trick — and why it's necessary

This part looks like a hack because it is one, and the reason is worth
knowing.

In development, Next.js **hot-reloads**: when you save a file, it re-runs
the module rather than restarting the process. Modules are normally cached
after their first execution, but hot reload deliberately busts that cache.

So without protection, every save would run `createPool()` again, creating
another 10 connections. Edit twenty times and you have 200 open
connections, then MariaDB starts refusing them. It's a slow leak that only
appears after a productive afternoon of editing.

`globalThis` is the one object that survives module reloading. So the code
reads: *"if a pool is already parked on the global object, reuse it;
otherwise create one and park it there."* In production there's no hot
reload, so the parking step is skipped.

The `as unknown as { pool: mysql.Pool }` is a two-step cast telling
TypeScript to stop objecting to a property it doesn't know about on
`globalThis` — a pure type-level formality that generates no code.

### Configuration via `process.env`

`process.env.DB_HOST` reads an environment variable. In development
Next.js loads [.env](../.env) into `process.env` automatically. The
`|| "localhost"` gives a fallback when the variable isn't set.

`.env` is **not** committed to source control — it holds the DB password
and `AUTH_SECRET`.

> **Coming from C#:** `mysql2` ≈ `MySqlConnection`/ADO.NET, and the pool is
> the same concept ADO.NET gives you implicitly through the connection
> string. Because pooling is automatic in .NET you may never have thought
> about it; here it's explicit and you own its lifetime — hence the
> `globalThis` guard. `process.env` ≈ `IConfiguration`, and `.env` ≈
> `appsettings.Development.json` + user secrets.

---

## Part 2 — Running a query

One call does everything:

```ts
const [rows] = await db.execute(
  "SELECT * FROM users WHERE email = ?",
  [email]
);
```

### The `?` placeholders

`?` is a positional parameter, filled from the array in order. The values
are sent to the server separately from the SQL text, so a value can never
be interpreted as SQL. This is the same protection as `SqlParameter`, and
the same rule applies: **never build SQL by string interpolation.**

```ts
// ✓ safe — the value travels as data
await db.execute("SELECT * FROM workouts WHERE name LIKE ?", [`%${q}%`]);

// ✗ SQL injection — the value becomes SQL
await db.execute(`SELECT * FROM workouts WHERE name LIKE '%${q}%'`);
```

Note the safe version still uses a template string — but for the *value*,
not the query. The `%` wildcards belong in the parameter.

One limitation: placeholders only substitute **values**. You cannot
parameterise a table name, a column name, or `ASC`/`DESC`. Those must be
chosen from a hard-coded allow-list in your own code.

### Why `const [rows] = ...`

`db.execute` resolves to a two-element array: `[results, fieldMetadata]`.
The destructuring (module 2) grabs the first element and discards the
metadata, which you almost never need.

For a `SELECT`, `rows` is an array of plain objects — one per row, keyed by
column name:

```ts
rows[0].email          // "test@example.com"
rows.length            // row count
```

For an `INSERT`/`UPDATE`/`DELETE`, the first element is a result object
with `affectedRows` and `insertId` instead.

### `execute` vs `query`

`db.execute` uses **prepared statements**: the SQL text is sent once and
compiled by the server, then values are sent separately. The server caches
the compiled form, so repeated queries with the same text are cheaper. It's
the right default and it's what this app uses everywhere.

`db.query` sends the SQL and values together in one string, escaping the
values client-side. It's safe against injection too, but doesn't prepare.
Use it only when you need something a prepared statement can't do.

---

## Part 3 — Types coming out of the database (read this one carefully)

This is where the SQL world and the JavaScript world grind against each
other, and it explains code in [queries.ts](../src/lib/queries.ts) that
would otherwise look like noise.

**There is no type mapping layer.** The driver decodes MySQL wire types
into JavaScript values as best it can, and JavaScript's type vocabulary is
much smaller than SQL's. Specific hazards:

| MySQL type | Arrives in JS as | Watch out |
|---|---|---|
| `INT`, `SMALLINT` | `number` | fine |
| `DECIMAL`, `NUMERIC` | **`string`** | JS numbers can't hold decimals exactly, so the driver refuses to lose precision |
| `BIGINT` | `string` (when large) | exceeds JS's safe integer range |
| `DATE`, `DATETIME` | `Date` object | timezone hazards — see below |
| `SUM(...)`, `AVG(...)` | often `string` | aggregates over integers can come back as decimal-typed |
| `COUNT(...)` | `number` | fine |
| `NULL` | `null` | fine |

That `DECIMAL → string` row is the important one, because it's silent:

```ts
const total = rows[0].totalVolume;   // "12500.00" — a string!
total + 100                          // "12500.00100"  ← string concatenation
Number(total) + 100                  // 12600          ← correct
```

TypeScript will not catch this. Your interface says `totalVolume: number`,
and TypeScript believes you (module 2: types are promises, not checks). The
bug surfaces later as an absurd number on the dashboard.

This is why [queries.ts](../src/lib/queries.ts) wraps SQL values in
`Number(...)` and `Math.round(...)` so consistently. Those are **real
runtime conversions**, and they are load-bearing:

```ts
totalVolume: Math.round(Number(r.totalVolume ?? 0)),
```

Read that right-to-left: default nulls to 0, force to a number, round off
floating-point dust.

### The date hazard

JavaScript's `Date` is always an instant in time — it has no "date without
a timezone" concept. So a date-only string gets interpreted as **UTC
midnight**:

```js
new Date("2026-07-05")            // 2026-07-05T00:00:00Z
                                  // …which in US timezones is July 4th, evening
```

Render that with `toLocaleDateString()` and a workout logged on the 5th
displays as the 4th. This app actually hit that bug; the fix is in
[src/app/api/workouts/route.ts](../src/app/api/workouts/route.ts):

```ts
const date = body.date
  ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(body.date) ? `${body.date}T12:00:00` : body.date)
  : new Date();
```

Appending `T12:00:00` makes it parse as **local** noon, which is far enough
from both midnights that no timezone offset can shift the calendar day.

> **Coming from C#:** ADO.NET gives you `SqlDataReader.GetDecimal()` and a
> real `decimal` type; Dapper maps columns to typed properties and throws
> if it can't. Neither safety net exists here — the driver hands you
> whatever JavaScript type fits, and your interface is only a claim. Also
> note JS has no `decimal` at all, and `Date` has no `DateOnly`
> counterpart, which is precisely why both hazards above exist.

---

## Part 4 — The query layer

[src/lib/queries.ts](../src/lib/queries.ts) holds every `SELECT` the pages
need, each wrapped in a typed function. It's the repository layer, and
you can read all of it, because it's just SQL.

Three patterns worth studying.

### Aggregation with LEFT JOINs (`getWorkoutSummaries`)

```sql
SELECT w.id, w.name, w.date, w.notes,
       COUNT(DISTINCT we.id) AS exerciseCount,
       COUNT(s.id)           AS setCount,
       COALESCE(SUM(s.reps * s.weight), 0) AS totalVolume
FROM workouts w
LEFT JOIN workout_exercises we ON we.workout_id = w.id
LEFT JOIN sets s              ON s.workout_exercise_id = we.id
WHERE w.user_id = ?
GROUP BY w.id, w.name, w.date, w.notes
ORDER BY w.date DESC
```

The `COUNT(DISTINCT we.id)` is doing real work: the join to `sets`
multiplies exercise rows, so a plain `COUNT(we.id)` would count each
exercise once per set.

### A window function (`getPersonalRecords`)

Rank sets per exercise, keep the top one:

```sql
SELECT * FROM (
  SELECT we.name AS exercise, s.weight, s.reps, w.date,
         ROW_NUMBER() OVER (PARTITION BY we.name
                            ORDER BY s.weight DESC, s.reps DESC) AS rn
  FROM sets s
  JOIN workout_exercises we ON we.id = s.workout_exercise_id
  JOIN workouts w           ON w.id  = we.workout_id
  WHERE w.user_id = ? AND s.weight > 0
) ranked
WHERE rn = 1
```

Identical to how you'd write it in T-SQL. MariaDB has supported window
functions since 10.2, MySQL since 8.0.

### Reshaping flat rows into a hierarchy (`getWorkoutDetail`)

SQL returns a rectangle; the UI needs a tree
(`workout → exercises[] → sets[]`). The function groups rows using a `Map`
(JavaScript's `Dictionary<K,V>`) keyed by exercise id, appending each set to
the right bucket.

This is the part an ORM would do for you (`.Include()` in EF). Doing it by
hand costs about 15 lines and removes all the mystery about what query
actually ran.

### The authorisation model, hiding in plain sight

**Every query filters by `user_id`, and that id always comes from the
session — never from the request.** There is no other access control in the
app. No row-level security, no policy layer, no ownership check scattered
through the UI.

It's worth appreciating why this is robust: a malicious request can supply
any workout id it likes, but it cannot supply a user id, because that value
is read from a signed cookie on the server (module 7). A query for someone
else's workout returns zero rows, and `notFound()` renders — which also
avoids leaking whether the record exists.

---

## Part 5 — MySQL dialect vs T-SQL

You know SQL Server. The dialect differences you'll actually hit:

| Task | T-SQL | MySQL / MariaDB |
|---|---|---|
| Limit rows | `SELECT TOP 100 * FROM sets` | `SELECT * FROM sets LIMIT 100` |
| Paging | `OFFSET n ROWS FETCH NEXT m` | `LIMIT m OFFSET n` |
| Quote an identifier | `[order]` | `` `order` `` (backticks) |
| String concat | `a + b` | `CONCAT(a, b)` — `+` does numeric addition! |
| Null fallback | `ISNULL(x, 0)` | `IFNULL(x, 0)` or `COALESCE(x, 0)` |
| Current time | `GETDATE()` | `NOW()` |
| Date arithmetic | `DATEADD(day, -7, GETDATE())` | `DATE_SUB(NOW(), INTERVAL 7 DAY)` |
| Auto id | `IDENTITY` | `AUTO_INCREMENT` (unused here — UUIDs instead) |
| Temp table | `#tmp` | `CREATE TEMPORARY TABLE tmp` |
| Top-N per group | `ROW_NUMBER() OVER (…)` | same ✓ |
| CTEs | `WITH x AS (…)` | same ✓ |
| `CASE WHEN` | same | same ✓ |

The `+` row is the sharpest edge: `SELECT 'a' + 'b'` returns `0` in MySQL,
not `'ab'`, because `+` is strictly arithmetic and the strings coerce to
zero. Silent wrong answers, no error.

Also note MySQL's `GROUP BY` is historically laxer than T-SQL's about
non-aggregated columns. Don't rely on it — list every non-aggregated column,
as the queries here do.

---

## Part 6 — The schema

[scripts/schema.sql](../scripts/schema.sql) is plain DDL. The design
decisions worth noticing:

- **UUID primary keys** (`VARCHAR(36)`), generated in application code with
  `crypto.randomUUID()` rather than `AUTO_INCREMENT`. Two reasons: the id
  exists *before* the INSERT (so you can insert children in the same
  breath without a round trip to fetch the parent's id), and sequential ids
  in URLs leak how many records exist and invite enumeration.
- **`ON DELETE CASCADE` throughout.** Delete a workout and its exercises
  and sets go with it. The DELETE endpoint is a single statement precisely
  because the database handles the rest.
- **Denormalised exercise info on `workout_exercises`** — name, body part,
  and equipment are *copied* in alongside the catalogue id. This is
  deliberate: your training history must stay intact and readable even if
  the exercise catalogue changes, gets renamed, or disappears. History is a
  record of what happened, not a live join. (Module 11 tells the story of
  why this turned out to matter.)
- **Weights always stored in lbs.** Conversion happens only at the
  display/input boundary via [src/lib/units.ts](../src/lib/units.ts).

[scripts/init-db.ts](../scripts/init-db.ts) runs the schema file via
`npm run db:init`. That's the whole migration story — intentionally
primitive. There's no EF Migrations equivalent, no version table, no
rollback. For a single-developer app that's a reasonable trade; for a team
you'd want a real migration tool.

---

## Part 7 — What's deliberately missing: transactions

Look at the `POST` handler in
[src/app/api/workouts/route.ts](../src/app/api/workouts/route.ts). It
inserts the workout, then loops inserting each exercise, then loops
inserting each set — **as separate statements with no transaction**.

If the process died midway, you'd have a workout with some of its
exercises. Nothing would repair it.

Doing it properly means taking a single connection out of the pool for the
whole unit of work:

```ts
const conn = await db.getConnection();
try {
  await conn.beginTransaction();
  await conn.execute("INSERT INTO workouts …", […]);
  // …exercises, sets…
  await conn.commit();
} catch (e) {
  await conn.rollback();
  throw e;
} finally {
  conn.release();      // ALWAYS — or you leak a pool connection
}
```

The key detail: you must use **one connection** (`db.getConnection()`), not
the pool. Calling `db.execute` three times may use three different
connections, and `BEGIN` on one doesn't apply to the others — a genuinely
nasty bug, because it looks correct and silently isn't.

This is a real gap in the app rather than a teaching simplification.
Single-user, local, low-stakes — but if you want a high-value change to make
after this course, this is it.

> **Coming from C#:** the equivalent of `TransactionScope` /
> `SqlTransaction`. The pool-vs-connection subtlety is the same trap as
> using a different `SqlConnection` inside a transaction.

---

## Try it

1. **Query your own data.** In HeidiSQL (or the CLI), run:
   ```sql
   SELECT * FROM workouts;
   SELECT * FROM sets LIMIT 20;
   ```
   It's an ordinary database. Nothing about it is Next.js-specific.

2. **Catch a string pretending to be a number.** Add a temporary log inside
   `getWorkoutSummaries` in [queries.ts](../src/lib/queries.ts), before the
   mapping:
   ```ts
   console.log(typeof (rows as any[])[0]?.totalVolume, (rows as any[])[0]?.totalVolume);
   ```
   Load /workouts and read the **dev-server terminal** (not the browser
   console — this is server code). Now you've seen Part 3 with your own
   eyes. Remove the log.

3. **Write a query end to end.** Add `getMostFrequentExercise(userId)` to
   [queries.ts](../src/lib/queries.ts): the exercise name with the most
   logged sets. Join `sets → workout_exercises → workouts`, filter by user,
   `GROUP BY we.name`, `ORDER BY COUNT(*) DESC`, `LIMIT 1`. Then call it
   from the dashboard and render it in a stat card. This touches the whole
   stack: SQL → typed function → server component → JSX.

4. **Prove the parameter protection.** In HeidiSQL, create a workout named
   `'; DROP TABLE sets; --`. Then load the app. Everything renders it as
   plain text; nothing executes. Now look at any query in the codebase and
   note that no value is ever concatenated into the SQL string.

---

## Checkpoint

- Why does `db.ts` stash the pool on `globalThis`?
- What's returned by `await db.execute(...)`, and why the `[rows]`?
- Why does `SUM(s.reps * s.weight)` need a `Number(...)` around it?
- Why is `new Date("2026-07-05")` dangerous, and what's the fix used here?
- What single thing prevents one user from reading another's workouts?
- Why must a transaction use `getConnection()` instead of the pool?

**Next:** [Module 6 — API routes →](06-api-routes.md)
