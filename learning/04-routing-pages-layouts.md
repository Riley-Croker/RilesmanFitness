# Module 4 — Routing, Pages & Layouts

**Goal:** know how URLs map to files, how dynamic segments and query
strings work, and what layouts do.

## File-based routing

In ASP.NET you configure routes (attributes or conventions). In Next.js
**the folder structure *is* the route table**. Inside `src/app/`:

| Folder/file | URL |
|---|---|
| `page.tsx` | `/` |
| `dashboard/page.tsx` | `/dashboard` |
| `workouts/page.tsx` | `/workouts` |
| `workouts/new/page.tsx` | `/workouts/new` |
| `workouts/[id]/page.tsx` | `/workouts/{anything}` ← dynamic |
| `exercises/[id]/page.tsx` | `/exercises/{anything}` |
| `api/workouts/route.ts` | `/api/workouts` (JSON, module 6) |

`[id]` in a folder name is a **route parameter** — identical in spirit to
`[Route("workouts/{id}")]`.

## Reading route params and query strings

Open [src/app/workouts/[id]/page.tsx](../src/app/workouts/[id]/page.tsx):

```tsx
export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
```

Params arrive as a prop. (They're a `Promise` in modern Next — hence the
`await`. Think of it as `Task<RouteValues>`.)

Query strings work the same way via `searchParams`. Open
[src/app/exercises/page.tsx](../src/app/exercises/page.tsx):

```tsx
export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;   // ?search=squat&bodyPart=chest → { search: "squat", bodyPart: "chest" }
```

This page is a nice pattern to study: the **filter form is a plain
`<form method="GET">`** — submitting it just changes the URL query string,
which re-runs the server component with new `searchParams`. No JavaScript,
no state, fully bookmarkable. It's the same philosophy as a classic ASP.NET
GET form, and it's deliberately low-tech.

The calendar does the same with `?month=YYYY-MM`
([src/app/calendar/page.tsx](../src/app/calendar/page.tsx)), and the
workout logger reads `?template=` / `?exercise=` to pre-fill itself
([src/app/workouts/new/page.tsx](../src/app/workouts/new/page.tsx)).

## Layouts — the _Layout.cshtml of Next.js

[src/app/layout.tsx](../src/app/layout.tsx) wraps **every** page:

```tsx
export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav ... />
        <main>{children}</main>   {/* ← @RenderBody() */}
      </body>
    </html>
  );
}
```

`children` is the page being rendered — exactly `@RenderBody()`. The
layout is also where global CSS is imported and fonts are set up.

Layouts can nest: a `dashboard/layout.tsx` would wrap only dashboard
pages. This app doesn't need nesting, but that's the mechanism.

## Navigation: `<Link>` and redirects

- `<Link href="/workouts">` (from `next/link`) renders an `<a>` tag but
  intercepts the click and swaps pages **client-side** without a full
  reload — faster than a normal anchor. Used everywhere; see
  [nav.tsx](../src/components/nav.tsx).
- Server-side redirects use `redirect()` — the pattern guarding every
  private page:

  ```tsx
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  ```

  This is the `[Authorize]` attribute done manually. (Interesting
  mechanic: `redirect()` **throws** a special exception that Next catches —
  which is why code after it doesn't need a `return`. Remember this when
  you see try/catch around redirects in module 9.)
- Client-side navigation after an action uses the router hook — the logger
  does `router.push(`/workouts/${id}`)` after saving, like
  `RedirectToAction`.

## Special files

Besides `page.tsx` and `layout.tsx`, folders can hold:

- `route.ts` — API endpoint (module 6)
- `loading.tsx` — automatic loading UI while the page's data resolves
- `not-found.tsx` — 404 UI; triggered by calling `notFound()`, which
  [workouts/[id]/page.tsx](../src/app/workouts/[id]/page.tsx) does for a
  bad id
- `error.tsx` — error boundary (like a scoped exception handler page)

This project only uses the first two conventions plus `notFound()` — the
default 404/error screens are fine for now. (Challenge 12 fixes that.)

## Try it

1. **Make a page.** Create `src/app/about/page.tsx`:

   ```tsx
   export default function AboutPage() {
     return <h1 className="text-3xl font-bold">About Rilesman Fitness</h1>;
   }
   ```

   Visit http://localhost:3000/about — no registration, no route config.
2. **Make it dynamic.** Create `src/app/about/[topic]/page.tsx` that
   awaits `params` and renders the topic. Visit `/about/anything`.
3. **Trace a filter.** On `/exercises`, pick a body part and Apply. Watch
   the URL change. Now edit the URL by hand (`?bodyPart=back`) and refresh.
   Understand: the *URL is the state* on this page.
4. Delete your `about` folder when done.

**Next:** [Module 5 — The data layer →](05-data-layer-sql.md)
