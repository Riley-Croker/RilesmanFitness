# Module 1 — The Big Picture

**Goal:** understand what Next.js is, how this project is organised, and
what happens between typing a URL and seeing a page.

## What is Next.js?

In .NET terms: Next.js is to React what **ASP.NET Core MVC is to plain
C#** — a full-stack web framework that adds routing, a server, data
loading conventions, and a build system on top of a UI library.

- **React** = the UI library (components, like Blazor components)
- **Next.js** = the framework around it (routing, server rendering, API
  endpoints, bundling)
- **Node.js** = the runtime executing the server-side JavaScript (the CLR
  equivalent)
- **TypeScript** = the language — JavaScript plus a C#-style type system

One important mental shift: in ASP.NET you usually have a separate
frontend and backend. In Next.js **both live in one project and often in
one file**. A `page.tsx` can run SQL on the server and render HTML — like
a Razor Page — and hand off interactive parts to the browser.

## The project at a glance

```
WorkoutApp2/
├── package.json          ← .csproj + NuGet packages.config in one
├── .env                  ← appsettings.json (secrets, connection info)
├── scripts/schema.sql    ← plain SQL schema, you know this
├── src/
│   ├── app/              ← every folder = a URL route (module 4)
│   │   ├── layout.tsx    ← _Layout.cshtml equivalent
│   │   ├── page.tsx      ← the "/" page
│   │   ├── dashboard/page.tsx      ← the "/dashboard" page
│   │   └── api/workouts/route.ts   ← Web API controller for /api/workouts
│   ├── components/       ← reusable UI pieces (partial views / Blazor components)
│   ├── data/exercises.json ← the bundled exercise catalogue
│   ├── lib/              ← "business logic" layer: db, auth, queries
│   └── types/            ← shared type definitions (your POCOs/DTOs)
```

**Try it:** open [package.json](../package.json). The `dependencies`
section is your NuGet package list. The `scripts` section defines commands:
`npm run dev` is like `dotnet run` with hot reload.

## Life of a request

Type `http://localhost:3000/dashboard` and press Enter. What happens?

1. **The Node.js server receives the request** (like Kestrel).
2. Next.js maps the URL to a file: `/dashboard` →
   [src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx).
3. That file exports an `async function DashboardPage()`. Next.js **runs it
   on the server** — this is a *React Server Component*. Inside it:
   - `auth()` reads the session cookie (module 7)
   - `getDashboardStats(...)` runs real SQL against MariaDB (module 5)
   - the function returns JSX — an HTML-like template (module 3)
4. Next.js renders that to HTML and sends it to the browser. The user sees
   a full page immediately — same benefit as server-rendered Razor.
5. The browser *hydrates* the interactive islands — components marked
   `"use client"` (like the nav's unit toggle) come alive with JavaScript.

Compare with your C# instinct:

| ASP.NET MVC | Next.js here |
|---|---|
| Route table maps URL → controller action | Folder structure maps URL → `page.tsx` |
| Controller action queries DB, builds ViewModel | `page.tsx` function queries DB directly |
| Razor view renders ViewModel to HTML | JSX return value renders to HTML |
| jQuery/Blazor for interactivity | `"use client"` components |

## The two worlds: server and client

This is the single most important Next.js concept, and the source of most
beginner confusion:

- **Server Components** (the default): run **only on the server**, can use
  the database, secrets, and file system. Cannot use `useState`, click
  handlers, or browser APIs. Examples:
  [src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx),
  [src/app/records/page.tsx](../src/app/records/page.tsx).
- **Client Components** (marked with `"use client"` on line 1): shipped to
  the browser, can be interactive, **cannot** touch the DB directly.
  Examples: [src/components/workout-logger.tsx](../src/components/workout-logger.tsx),
  [src/components/nav.tsx](../src/components/nav.tsx).

Rule of thumb the app follows: **pages are server components that fetch
data; anything with a button or input is a client component that receives
that data as props.**

**Try it:**
1. Open [src/app/records/page.tsx](../src/app/records/page.tsx) — no
   `"use client"`. It runs SQL via `getPersonalRecords`. Server.
2. Open [src/components/delete-button.tsx](../src/components/delete-button.tsx)
   — `"use client"` on line 1, uses `useState` and `onClick`. Client.
3. In the delete button, try adding `import { db } from "@/lib/db";` at
   the top and using `db` inside the component. Watch the dev server
   error — it refuses to bundle a MySQL driver into browser code. Undo it.

## Where things live — a treasure hunt

Answer these by searching the codebase (Ctrl+Shift+F in VS Code). Answers
at the bottom.

1. Which file decides that weights are stored in lbs?
2. Which file contains the SQL that computes personal records?
3. The nav bar shows on every page. Which file puts it there?
4. When you press "Finish & Save Workout", which URL does the browser call,
   and which file handles it?

<details>
<summary>Answers</summary>

1. [src/lib/units.ts](../src/lib/units.ts) — conversion helpers; storage is lbs.
2. [src/lib/queries.ts](../src/lib/queries.ts) — `getPersonalRecords`, a window-function query.
3. [src/app/layout.tsx](../src/app/layout.tsx) — the root layout wraps every page and renders `<Nav />`.
4. `POST /api/workouts`, handled by [src/app/api/workouts/route.ts](../src/app/api/workouts/route.ts).
</details>

**Next:** [Module 2 — TypeScript for C# devs →](02-typescript-for-csharp-devs.md)
