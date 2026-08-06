# Module 6 — API Routes

**Goal:** understand the app's JSON API — how a `route.ts` file becomes an
HTTP endpoint, how requests are read and responses built, and the rule for
when a page uses the API versus querying the database directly.

---

## Part 1 — What an API route is for

Module 1 established that server components can query the database
directly, which raises a fair question: why does this app have an HTTP API
at all?

Because **client components can't reach the database.** Once code is
running in the browser, the only way to get server data is to ask the
server over HTTP. Something has to answer.

That's the entire justification. Everything in this module exists to serve
code running in the browser:

- The exercise picker searches as you type → needs an endpoint.
- The progress chart loads a new series when you change the dropdown →
  needs an endpoint.
- The logger saves a workout → needs an endpoint.
- The lbs/kg toggle persists your choice → needs an endpoint.

---

## Part 2 — `route.ts`: one file, one URL, one function per verb

A file named `route.ts` under `src/app/` makes that path an HTTP endpoint
instead of a page. You export one **async function per HTTP method**, named
after the method in capitals:

```ts
// src/app/api/workouts/route.ts  →  /api/workouts

export async function GET()                 { … }
export async function POST(request: NextRequest) { … }
export async function DELETE(request, ctx)  { … }
```

Next.js finds the export whose name matches the incoming method. A method
with no matching export returns 405 automatically.

Rules:

- A folder can have a `page.tsx` **or** a `route.ts`, never both — they'd
  both claim the same URL.
- The `api/` folder name is a convention for readability, not a
  requirement. Dynamic segments work exactly as they do for pages:
  `src/app/api/workouts/[id]/route.ts` → `/api/workouts/<id>`.

### An endpoint in full

```ts
export async function GET() {
  const session = await auth();                                  // 1. who is this?
  if (!session?.user?.id) {                                      // 2. reject anonymous
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [rows] = await db.execute(`SELECT …`, [session.user.id]); // 3. scoped query
  return NextResponse.json(rows);                                // 4. serialize
}
```

Four steps: identify, authorise, query, respond. Every handler in this app
follows that shape.

Notice what's **absent**: no attribute-based authorisation, no dependency
injection, no controller class, no registration in a startup file. The
session check is ordinary code at the top of every handler. Less magic,
more repetition — and if the repetition ever bothers you, the fix is a
small helper function, not a framework feature.

> **Coming from C#:** the same handler as a Web API controller —
>
> ```csharp
> [HttpGet, Authorize]
> public async Task<IActionResult> GetWorkouts() {
>     var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
>     var rows = await _db.QueryAsync("SELECT …", new { userId });
>     return Ok(rows);
> }
> ```
>
> The moves are identical. Differences: no class (the file is the
> controller), no attribute routing (the folder is the route), no
> `[Authorize]` (the check is written out), and no DI container (you
> `import` the things you need).

---

## Part 3 — Reading the request

The `request` parameter is a **`NextRequest`** — a small superset of the
web-standard `Request` object that browsers also use. That's why `fetch` on
the client and handlers on the server feel symmetrical: they're the same
underlying types.

### The body

```ts
const body = (await request.json()) as WorkoutInput;
```

`request.json()` is async because the body arrives as a stream that may not
have finished uploading. Other readers exist — `request.text()`,
`request.formData()` — but this API is JSON throughout.

**The `as WorkoutInput` is the important part of this line.** It is a
compile-time assertion and nothing else (module 2). No validation occurs.
The body could be `{ "lol": true }` and TypeScript would still let you
write `body.name`, cheerfully, and you'd get `undefined` at runtime.

### The query string

```ts
const p = request.nextUrl.searchParams;
const search = p.get("search");       // string | null
const limit  = Number(p.get("limit") ?? 20);
```

`searchParams` is a `URLSearchParams` object. `.get()` returns `null` when
absent, and **every value is a string** — `?limit=20` gives you `"20"`, so
convert explicitly.

### Route params

Dynamic segments arrive in the handler's **second** argument:

```ts
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  …
}
```

Same promise-wrapping as pages (module 4). The `_request` underscore prefix
is a convention meaning "required by the signature, unused here."

---

## Part 4 — Building the response

```ts
NextResponse.json(rows);                                    // 200 + JSON
NextResponse.json({ id }, { status: 201 });                 // created
NextResponse.json({ error: "Unauthorized" }, { status: 401 });
NextResponse.json({ error: "Not found" }, { status: 404 });
new NextResponse(null, { status: 204 });                    // no content
```

`NextResponse.json()` serialises the value, sets `Content-Type:
application/json`, and defaults to status 200.

The status codes this app uses and what they mean:

| Code | Meaning | Used when |
|---|---|---|
| 200 | OK | successful GET |
| 201 | Created | POST created a record — body carries the new id |
| 400 | Bad Request | the client sent something invalid |
| 401 | Unauthorized | not logged in (misnamed — it means unauthenticated) |
| 404 | Not Found | no such record, *or* not yours |
| 500 | Server Error | unhandled exception |

The 404-for-other-people's-records choice is deliberate: returning 403
would confirm the record exists. 404 reveals nothing.

One caution on serialisation: `JSON.stringify` turns a `Date` into an ISO
string, so dates always cross the wire as strings and must be re-parsed on
the other side. `undefined` properties are dropped entirely; `null` ones
are kept.

---

## Part 5 — Validation is your job

This deserves its own section because it's the biggest practical gap
compared to .NET.

There is **no model binding and no validation layer**. TypeScript types
don't exist at runtime, so nothing checks the incoming body against
`WorkoutInput`. Whatever JSON was posted is what you have.

So the POST handler validates by hand:

```ts
if (!body.name?.trim()) {
  return NextResponse.json({ error: "Workout name is required" }, { status: 400 });
}
if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
  return NextResponse.json({ error: "Add at least one exercise" }, { status: 400 });
}
```

and then sanitises values as it inserts them:

```ts
Math.floor(sets[j].reps),              // no fractional reps
Math.max(0, sets[j].weight || 0),      // no negative weights
body.notes?.trim() || null,            // empty string → null
```

Read those three lines closely — they're doing real defensive work. But
note what they *don't* do: `Math.floor("banana")` is `NaN`, and `NaN` will
happily reach the database. The validation is pragmatic, not complete.
(One of the Try-its below has you find exactly this.)

**The proper fix** is a runtime validation library, and the standard choice
is **zod**. You define a schema once and get both runtime checking and a
TypeScript type from it:

```ts
const WorkoutSchema = z.object({
  name: z.string().min(1),
  date: z.string().optional(),
  exercises: z.array(z.object({
    name: z.string().min(1),
    sets: z.array(z.object({
      reps: z.number().int().positive(),
      weight: z.number().nonnegative(),
    })),
  })).min(1),
});

const parsed = WorkoutSchema.safeParse(await request.json());
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
}
const body = parsed.data;   // fully typed AND actually verified
```

That single change closes the gap between "TypeScript says it's a
`WorkoutInput`" and "it really is one." It's the highest-value addition you
could make to this codebase.

> **Coming from C#:** you're used to `[FromBody] WorkoutInput input`
> deserialising, type-checking, and running DataAnnotations before your
> method body starts, with `ModelState.IsValid` summarising the result.
> None of that exists here — it can't, because there's no runtime type to
> bind to. zod is how you rebuild it: a schema object replaces the
> attributes, and it's the *schema*, not the type, that does the checking.

---

## Part 6 — The app's API surface

| Route file | Endpoints | Used by |
|---|---|---|
| [api/workouts/route.ts](../src/app/api/workouts/route.ts) | GET list, POST create | logger's save |
| `api/workouts/[id]/route.ts` | GET one, DELETE | delete button |
| [api/templates/route.ts](../src/app/api/templates/route.ts) | GET, POST | "Save as template" |
| `api/templates/[id]/route.ts` | GET, DELETE | template cards |
| [api/exercises/route.ts](../src/app/api/exercises/route.ts) | GET (search/filter) | the picker modal |
| `api/exercises/[id]/route.ts` | GET one | detail lookups |
| [api/stats/progress/route.ts](../src/app/api/stats/progress/route.ts) | GET time series | progress charts |
| [api/settings/route.ts](../src/app/api/settings/route.ts) | POST | lbs/kg toggle |
| `api/auth/[...nextauth]/route.ts` | NextAuth internals | login machinery |

That last one uses `[...nextauth]` — a **catch-all segment**, matching any
number of path parts. NextAuth needs several sub-paths (`/signin`,
`/callback`, `/session`) and handles them all from one file.

---

## Part 7 — When does a page use the API, and when not?

The asymmetry is deliberate and worth stating as a rule:

- The **dashboard page** calls `getWorkoutSummaries()` directly. It's a
  server component; the database is one `await` away. Going through HTTP
  would mean the server making a network call to itself — pure overhead.
- The **progress chart** calls `fetch("/api/stats/progress?…")`. It's a
  client component; HTTP is its only option.

> **Server components import query functions. Client components fetch API
> routes.**

Both paths call the same functions in [queries.ts](../src/lib/queries.ts),
so the SQL exists once regardless of which door the caller came through.
That layering is what keeps the duplication at zero.

The GET endpoints for workouts and templates aren't used by any page — the
pages go direct. They exist for symmetry and future clients (a phone app,
a script, curl). That's a reasonable thing to keep; it's also reasonable to
delete unused endpoints. Just know which you're doing and why.

---

## Part 8 — Calling the API from the browser

`fetch` is the browser's built-in HTTP client. From the logger's save:

```ts
const res = await fetch("/api/workouts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, date, notes, exercises }),
});

if (!res.ok) {                             // ok = status in 200–299
  const { error } = await res.json();
  setError(error ?? "Something went wrong");
  return;
}
const { id } = await res.json();
```

Four things worth knowing about `fetch`:

1. **It does not throw on HTTP errors.** A 500 response resolves
   successfully with `res.ok === false`. Only network failures reject. If
   you forget to check `res.ok`, a failed save looks like a successful one.
2. **The body must be a string.** `JSON.stringify(...)` is mandatory; the
   `Content-Type` header is how the server knows to parse it.
3. **Reading the body is async** — `await res.json()` — and can only be
   done **once** per response.
4. **Cookies ride along automatically** for same-origin requests. That's
   why the endpoint's `auth()` call works without the client doing anything
   about tokens. (Cross-origin requests would need `credentials: "include"`
   plus CORS headers — not a concern here, since the API and the pages are
   the same origin.)

> **Coming from C#:** `fetch` ≈ `HttpClient.SendAsync`. The trap is
> different, though: `HttpClient` also doesn't throw by default, which is
> why `EnsureSuccessStatusCode()` exists. `res.ok` is the manual version of
> that call, and forgetting it is the single most common `fetch` bug.

---

## Try it

1. **Hit the API by hand.** With the app open and logged in, visit
   http://localhost:3000/api/workouts — raw JSON of your workouts. Now open
   the same URL in a private window: `{"error":"Unauthorized"}`. That
   difference is entirely the session cookie.

2. **Write an endpoint.** Create `src/app/api/stats/summary/route.ts`:

   ```ts
   import { NextResponse } from "next/server";
   import { auth } from "@/lib/auth";
   import { getDashboardStats } from "@/lib/queries";

   export async function GET() {
     const session = await auth();
     if (!session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }
     return NextResponse.json(await getDashboardStats(session.user.id));
   }
   ```

   Visit `/api/stats/summary`. You've written a Web API controller in a
   Next.js app.

3. **Find the validation hole.** Paste this into the browser console while
   logged in:

   ```js
   fetch("/api/workouts", { method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ name: "Garbage test",
       exercises: [{ name: "y", sets: [{ reps: -5, weight: "banana" }] }] })
   }).then(r => r.json()).then(console.log)
   ```

   Then check the database: `SELECT * FROM sets ORDER BY id DESC LIMIT 5;`
   Which guard caught the `-5`? What happened to `"banana"`, and is the
   stored value what you'd want? Trace it through the POST handler and
   decide what a zod schema would have rejected. (Delete the junk workout
   afterwards.)

4. **Watch `res.ok` matter.** In the logger's save, temporarily comment out
   the `if (!res.ok)` block, then trigger a failure by saving a workout with
   an empty name via the console. The UI reports success while the server
   rejected it — the exact bug that check prevents.

---

## Checkpoint

- Why does this app need an HTTP API when pages can query SQL directly?
- What does `as WorkoutInput` actually do to the incoming request body?
- Which two status codes distinguish "not logged in" from "not yours", and
  why does the app use 404 for the second?
- Why does `fetch` not throw when the server returns a 500?
- How does an API route know which user is calling it?

**Next:** [Module 7 — Authentication →](07-auth.md)
