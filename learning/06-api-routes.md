# Module 6 — API Routes

**Goal:** understand the app's JSON API — the equivalent of your Web API
controllers — and when a page uses it versus querying the DB directly.

## route.ts = a controller

A file named `route.ts` under `src/app/api/...` handles HTTP requests to
that path. You export a function per HTTP verb:

```ts
// src/app/api/workouts/route.ts
export async function GET() { ... }          // [HttpGet]
export async function POST(request) { ... }  // [HttpPost]
```

Compare a full handler to its C# twin:

```ts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [rows] = await db.execute(`SELECT ...`, [session.user.id]);
  return NextResponse.json(rows);
}
```

```csharp
[HttpGet, Authorize]
public async Task<IActionResult> GetWorkouts() {
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    var rows = await _db.QueryAsync("SELECT ...", new { userId });
    return Ok(rows);
}
```

Same moves: auth check, query, serialize. There's no `[Authorize]`
attribute — the session check is explicit code at the top of every
handler. Less magic, more repetition; a middleware could DRY it up later.

## The app's API surface

| Route file | Endpoints | Used by |
|---|---|---|
| [api/workouts/route.ts](../src/app/api/workouts/route.ts) | GET list, POST create | logger saves here |
| [api/workouts/[id]/route.ts](../src/app/api/workouts/[id]/route.ts) | GET one, DELETE | delete button |
| [api/templates/route.ts](../src/app/api/templates/route.ts) | GET, POST | "Save as template" |
| [api/templates/[id]/route.ts](../src/app/api/templates/[id]/route.ts) | GET, DELETE | template cards |
| [api/exercises/route.ts](../src/app/api/exercises/route.ts) | GET (search/filter) | the picker modal |
| [api/exercises/[id]/route.ts](../src/app/api/exercises/[id]/route.ts) | GET one | detail lookups |
| [api/stats/progress/route.ts](../src/app/api/stats/progress/route.ts) | GET time series | progress charts |
| [api/settings/route.ts](../src/app/api/settings/route.ts) | POST | lbs/kg toggle |
| api/auth/[...nextauth]/route.ts | NextAuth internals | login machinery |

## Reading the request

```ts
// JSON body (like [FromBody])
const body = (await request.json()) as WorkoutInput;

// query string (like [FromQuery])
const p = request.nextUrl.searchParams;
const search = p.get("search");

// route param (like [FromRoute]) — second argument:
export async function DELETE(_request, { params }) {
  const { id } = await params;
```

Note the `as WorkoutInput` cast: **no model binding validation happens**.
TypeScript types don't exist at runtime (module 2), so the POST handler
validates by hand — name required, at least one exercise, clamp numbers.
In .NET you'd get DataAnnotations; here validation is code. (Libraries
like `zod` fill this gap — a good post-course topic.)

## Why do pages sometimes skip the API?

Notice the asymmetry:

- The **dashboard page** calls `getWorkoutSummaries()` directly — no HTTP,
  it's a server component, the DB is right there.
- The **progress charts** fetch `/api/stats/progress` over HTTP — they're
  a client component in the browser; the only way to data is an endpoint.

This is the rule from module 3 playing out: **server components import
query functions; client components fetch API routes.** Both paths reuse
the same [queries.ts](../src/lib/queries.ts) functions, so the SQL isn't
duplicated.

The GET endpoints for workouts/templates exist mostly for symmetry and
future use (a mobile app could use them) — the pages themselves go direct.

## Calling the API from the browser

`fetch` is `HttpClient`. From the logger's save:

```ts
const res = await fetch("/api/workouts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, date, notes, exercises }),
});
if (!res.ok) { ... }        // res.ok = 2xx, like EnsureSuccessStatusCode
const { id } = await res.json();
```

The session cookie rides along automatically (same-origin), which is how
the endpoint's `auth()` call works.

## Try it

1. **Poke the API directly.** With the app open (so you're logged in),
   visit http://localhost:3000/api/workouts in the browser — raw JSON of
   your workouts. Now open it in a private/incognito window:
   `{"error":"Unauthorized"}`. That's the session cookie doing its job.
2. **Add an endpoint.** Create `src/app/api/stats/summary/route.ts` with a
   GET that returns `getDashboardStats(session.user.id)` as JSON. Test it
   in the browser. You've just written a Web API controller in Next.js.
3. **Find the validation gap.** POST garbage to /api/workouts from the
   browser console:

   ```js
   fetch("/api/workouts", { method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ name: "x", exercises: [{ name: "y", sets: [{ reps: -5, weight: "banana" }] }] })
   }).then(r => r.json()).then(console.log)
   ```

   Look at what got stored (`SELECT * FROM sets`). Which guard caught the
   -5? What happened to "banana"? Read the POST handler and trace it.

**Next:** [Module 7 — Authentication →](07-auth.md)
