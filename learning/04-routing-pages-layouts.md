# Module 4 — Routing, Pages & Layouts

**Goal:** understand how URLs turn into rendered pages: file-based routing,
dynamic segments, query strings, layouts, navigation, and when Next.js
decides to render on every request versus once at build time.

---

## Part 1 — File-based routing

Most web frameworks have a **route table**: a place where you declare that
a URL pattern maps to a handler, either with attributes on methods or with
explicit registration calls.

Next.js has no route table. **The folder structure inside `src/app/` is the
routing configuration.** A folder creates a URL segment; a file named
`page.tsx` inside it makes that URL renderable.

| File | URL |
|---|---|
| `src/app/page.tsx` | `/` |
| `src/app/dashboard/page.tsx` | `/dashboard` |
| `src/app/workouts/page.tsx` | `/workouts` |
| `src/app/workouts/new/page.tsx` | `/workouts/new` |
| `src/app/workouts/[id]/page.tsx` | `/workouts/<anything>` |
| `src/app/exercises/[id]/page.tsx` | `/exercises/<anything>` |
| `src/app/api/workouts/route.ts` | `/api/workouts` (JSON, module 6) |

Two things follow that surprise people:

- **A folder without a `page.tsx` is not a route.** `src/app/api/` isn't a
  page; it only holds `route.ts` files. Folders are free to exist purely
  for organisation.
- **The file must default-export a component.** Next.js looks for the
  default export specifically. A named export won't be found.

### Dynamic segments: `[id]`

A folder in square brackets matches *any* value in that position and
captures it under that name.

```
src/app/workouts/[id]/page.tsx
              ↓
/workouts/abc-123    → id = "abc-123"
/workouts/whatever   → id = "whatever"
```

The name inside the brackets is yours to choose; `[id]` and `[slug]` are
conventions, not keywords.

> **Coming from C#:** `[id]` is `[Route("workouts/{id}")]`. The difference
> is purely where the declaration lives — in the filesystem instead of an
> attribute. Nothing is registered at startup; Next.js walks the folder
> tree.

---

## Part 2 — Reading route params and query strings

Both arrive as **props** to your page function.

### Route params

Open `src/app/workouts/[id]/page.tsx`:

```tsx
export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  …
}
```

Two things to notice.

First, `params` is typed as `{ id: string }` — the shape matches your
folder name. If the folder were `[workoutId]`, the type would be
`{ workoutId: string }`.

Second, **it's a `Promise`**, so you `await` it. This looks strange — the
URL is obviously already known by the time the page runs. The reason is
that Next.js wants to start rendering your page *before* it has necessarily
finished resolving everything about the request, so it hands you a promise
and lets the framework decide when to settle it. Practically: always
`await params`, always destructure after.

### Query strings

Same mechanism, different prop. From
[src/app/exercises/page.tsx](../src/app/exercises/page.tsx):

```tsx
export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; bodyPart?: string }>;
}) {
  const params = await searchParams;
  // ?search=squat&bodyPart=chest  →  { search: "squat", bodyPart: "chest" }
}
```

Every value is `string | undefined` — a query param may simply not be
there, so the types are optional and you must handle absence.

### The pattern worth stealing: the URL *is* the state

The exercises page has filters, but no JavaScript state driving them. The
filter form is a plain HTML `GET` form:

```tsx
<form method="GET">
  <input name="search" defaultValue={params.search} />
  <select name="bodyPart"> … </select>
  <button type="submit">Apply</button>
</form>
```

Submitting it navigates to `/exercises?search=squat&bodyPart=chest`. That
re-runs the server component with new `searchParams`, which re-runs the
filter, which returns new HTML.

The benefits are substantial and free:

- The filtered view is **bookmarkable and shareable** — the URL fully
  describes it.
- Back/forward buttons work correctly with no effort.
- It works with JavaScript disabled or still loading.
- There's no state to keep in sync, so there's no stale-state bug class.

The calendar uses the same idea with `?month=YYYY-MM`
([src/app/calendar/page.tsx](../src/app/calendar/page.tsx)), and
`src/app/workouts/new/page.tsx` reads `?template=` / `?exercise=` to
pre-fill the logger.

The general principle: **before reaching for client state, ask whether the
URL could hold it instead.**

> **Coming from C#:** `params` ≈ route values (`[FromRoute]`),
> `searchParams` ≈ `[FromQuery]`. The GET-form pattern is exactly a classic
> server-rendered ASP.NET search page — it's deliberately low-tech, and
> it's the right tool here.

---

## Part 3 — Layouts

A `layout.tsx` wraps every page beneath it in the folder tree. It receives
the page as the `children` prop (module 3) and decides where to put it.

[src/app/layout.tsx](../src/app/layout.tsx) is the **root layout**, which
wraps everything:

```tsx
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const weightUnit = session?.user?.id ? await getWeightUnit(session.user.id) : "lbs";
  return (
    <html lang="en">
      <body>
        <Nav userName={session?.user?.name ?? null} weightUnit={weightUnit} />
        <main>{children}</main>      {/* ← the page renders here */}
      </body>
    </html>
  );
}
```

Notes:

- The root layout is the only place `<html>` and `<body>` are written. It's
  required, and it's where global CSS and fonts are set up.
- It's a **server component**, so it can query the database — that's how
  the nav knows your name and unit preference without every page passing
  them in.
- `React.ReactNode` is the type meaning "anything renderable."

### Nesting

Layouts nest by folder depth. If you created
`src/app/dashboard/layout.tsx`, it would wrap only pages under
`/dashboard`, *inside* the root layout:

```
RootLayout
  └── DashboardLayout
        └── the page
```

This app doesn't need nesting, but that's the mechanism, and it's how you'd
add a sidebar to one section without touching the rest.

### The behaviour that makes layouts more than a wrapper

**Layouts do not re-render when you navigate between pages inside them.**
Navigate from `/dashboard` to `/workouts` and the root layout — including
the nav — is preserved. Only the `children` slot swaps out. Any state in a
layout (an open menu, a scroll position) survives navigation.

> **Coming from C#:** `{children}` is `@RenderBody()` and the layout is
> `_Layout.cshtml`. The difference is that Razor re-renders the layout on
> every request; here it persists across client-side navigations, which is
> why the nav doesn't flicker.

---

## Part 4 — Navigation

### `<Link>` — client-side navigation

```tsx
import Link from "next/link";
<Link href="/workouts">Workouts</Link>
```

This renders a real `<a>` tag — right-click, middle-click, and SEO all work
normally. But `Link` intercepts the click and, instead of a full page load,
it:

1. Asks the server for just the new page's content,
2. Swaps it into the layout's `children` slot,
3. Updates the address bar via the browser's History API.

Nothing else reloads — no re-downloading CSS or JavaScript, no re-running
the layout, no white flash. Next.js also **prefetches** linked pages when
they scroll into view, so the click often resolves instantly.

Use `<Link>` for internal navigation and a plain `<a>` for external URLs.

### `redirect()` — server-side

The guard on every private page:

```tsx
const session = await auth();
if (!session?.user?.id) redirect("/login");
// code below only runs when logged in
```

There's a genuinely surprising mechanic here: **`redirect()` works by
throwing.** It raises a special error that Next.js catches upstream and
converts into an HTTP redirect. Two consequences:

- You don't need `return redirect(...)` — nothing after it can run.
- If you call it inside a `try`, **your `catch` will swallow it** and the
  redirect silently won't happen. Module 9 shows the real case of this in
  the login action, where the catch block has to detect and re-throw it.

### `useRouter()` — client-side, imperative

For navigating after an action completes, in a client component:

```tsx
"use client";
const router = useRouter();           // from "next/navigation"
// …after saving:
router.push(`/workouts/${id}`);       // navigate
router.refresh();                     // re-fetch current page's server data
```

`router.refresh()` is worth understanding: it re-runs the server components
for the current URL and patches in fresh data **without losing client
state**. The lbs/kg toggle in the nav uses it — after saving the preference,
it refreshes so every server-rendered weight on the page re-renders in the
new unit.

---

## Part 5 — Special files

Beyond `page.tsx` and `layout.tsx`, certain filenames have built-in
meaning inside a route folder:

| File | Purpose |
|---|---|
| `page.tsx` | The page for this URL |
| `layout.tsx` | Wrapper for this folder and everything below |
| `route.ts` | A JSON/HTTP endpoint instead of a page (module 6) |
| `loading.tsx` | Shown automatically while the page's data resolves |
| `not-found.tsx` | 404 UI; triggered by calling `notFound()` |
| `error.tsx` | Error boundary — catches render errors below it |

`loading.tsx` is the neatest of these: create the file and Next.js
automatically shows it while the page's `await`s are pending, then swaps in
the real page. No state, no flags, no spinner logic.

`notFound()` behaves like `redirect()` — it throws, and the nearest
`not-found.tsx` (or the default 404) renders. `src/app/workouts/[id]/page.tsx`
calls it when the id doesn't match a workout you own:

```tsx
const workout = await getWorkoutDetail(session.user.id, id);
if (!workout) notFound();
```

Note that this doubles as authorisation: the query filters by `user_id`, so
someone else's valid workout id is indistinguishable from a nonexistent
one. That's the correct behaviour — it doesn't leak whether the record
exists.

This app uses `page`, `layout`, `route`, and `notFound()`. Adding
`error.tsx` and `loading.tsx` is one of the challenges in module 12.

---

## Part 6 — Static vs dynamic rendering

You'll notice this line at the top of several pages:

```tsx
export const dynamic = "force-dynamic";
```

Here's what it's for.

By default, Next.js tries to render pages **once, at build time**, and
serve the same HTML to everyone. That's ideal for a marketing page and
completely wrong for a dashboard. Next.js normally detects the difference
automatically — if a page reads cookies or headers, it must be per-request,
so it opts into dynamic rendering on its own.

`force-dynamic` states the requirement explicitly: **render this page on
every request, never cache it.** In an app where every page shows
per-user data that changes as soon as you log a workout, being explicit is
cheaper than debugging a stale cached page later.

The two modes:

| | Static | Dynamic |
|---|---|---|
| Rendered | Once, at build | On every request |
| Sees cookies/session | No | Yes |
| Good for | Landing pages, docs | Dashboards, anything per-user |
| In this app | The landing page | Everything behind login |

> **Coming from C#:** static rendering ≈ output caching a page forever;
> dynamic ≈ the normal request-per-response pipeline you're used to.
> `force-dynamic` is `[ResponseCache(NoStore = true)]` in spirit.

---

## Try it

1. **Create a page with nothing but a file.** Add
   `src/app/about/page.tsx`:

   ```tsx
   export default function AboutPage() {
     return <h1 className="text-3xl font-bold">About Rilesman Fitness</h1>;
   }
   ```

   Visit http://localhost:3000/about. Notice what you did *not* do: no
   route registration, no server restart.

2. **Make it dynamic.** Create `src/app/about/[topic]/page.tsx`:

   ```tsx
   export default async function TopicPage({
     params,
   }: {
     params: Promise<{ topic: string }>;
   }) {
     const { topic } = await params;
     return <h1 className="text-3xl font-bold capitalize">{topic}</h1>;
   }
   ```

   Visit `/about/anything-you-like`.

3. **Watch client-side navigation happen.** Open DevTools → Network, filter
   to `Doc`, then click between Dashboard and Workouts in the nav. No
   full-document request — just small data fetches. Now press F5 and see
   the difference.

4. **Confirm the layout persists.** Narrow the window so the hamburger menu
   appears, open it, then click a nav link. The menu state survives,
   because the layout never unmounted.

5. **Break a redirect on purpose.** In any protected page, wrap the guard:

   ```tsx
   try { if (!session?.user?.id) redirect("/login"); } catch {}
   ```

   Log out and visit the page — the redirect is swallowed and you get a
   crash instead, because the code below runs with no session. Undo it, and
   remember this when you read module 9.

6. Delete your `about` folder when you're done.

---

## Checkpoint

- What makes `/dashboard` a valid URL in this app? Name the exact file.
- Why is `params` a promise you have to `await`?
- Why does the exercises page keep its filter state in the URL instead of
  in React state?
- What actually happens in the browser when you click a `<Link>`?
- Why can a `try/catch` break a `redirect()`?

**Next:** [Module 5 — The data layer →](05-data-layer-sql.md)
