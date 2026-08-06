# Module 1 — The Big Picture

**Goal:** understand what each piece of this stack actually *is*, why it
exists, and what physically happens between typing a URL and seeing a page.

> **How these modules are written.** Every concept is explained on its own
> terms first — what problem it solves and how it works. Then, where it
> helps, there's a **"Coming from C#"** box that maps it to something you
> know. The box is a bridge, not the explanation. If a comparison doesn't
> land, you can ignore it and the module still makes sense.

---

## Part 1 — What is actually running?

Before any framework talk, get the physical picture straight. When this app
is running there are **three separate programs** on your machine:

```
┌─────────────────┐   HTTP over port 3000   ┌──────────────────┐
│  Your browser   │ ──────────────────────► │  Node.js process │
│  (Chrome)       │ ◄────────────────────── │  running Next.js │
└─────────────────┘   HTML, CSS, JS, JSON   └──────────────────┘
                                                     │
                                            SQL over port 3306
                                                     ▼
                                            ┌──────────────────┐
                                            │ MariaDB service  │
                                            │ (the database)   │
                                            └──────────────────┘
```

1. **The browser.** Runs JavaScript, draws pixels, holds the cookie. It can
   never talk to the database directly — it doesn't have the password and
   isn't on the same trust boundary.
2. **The Node.js process.** This is `npm run dev`. It listens on port 3000,
   runs your server-side code, and is the only thing that talks to the DB.
3. **MariaDB.** A Windows service that runs whether or not your app does.

The single most useful debugging habit in this stack is asking *"which of
those three is this code running in?"* Most confusing errors come from
guessing wrong.

### The vocabulary, decoded

The JavaScript world is jargon-dense and most tutorials don't stop to
define terms. Here's the minimum set:

| Term | What it actually means |
|---|---|
| **JavaScript** | The only language browsers can execute. Everything eventually becomes this. |
| **Node.js** | A program that runs JavaScript *outside* a browser — on a server, on your laptop. It's the runtime: the thing that executes your code. |
| **TypeScript** | JavaScript plus a type system. Browsers and Node cannot run it — it gets **compiled** (stripped of types) into JavaScript first. Module 2. |
| **React** | A library for describing UI. You write functions that return a description of what the screen should look like; React makes the real page match. |
| **Next.js** | A framework built on React that adds routing, a server, data loading, and a build system. It's what you actually run. |
| **npm** | The package manager (downloads libraries) and script runner (`npm run dev`). |
| **Bundler** | The tool that takes your hundreds of source files and packs them into a few files a browser can download efficiently. Next.js uses **Turbopack**; you never call it directly. |
| **Package** | A downloadable library. Lives in `node_modules/`, listed in `package.json`. |

> **Coming from C#:** Node.js ≈ the CLR (the runtime that executes code),
> TypeScript ≈ C# (typed language that compiles down), npm ≈ NuGet + the
> `dotnet` CLI, `package.json` ≈ `.csproj`, `node_modules/` ≈ the NuGet
> package cache, bundling ≈ compiling to a DLL (roughly — it's packing for
> download, not producing IL).

---

## Part 2 — What is React, and why does it exist?

Skip this if you already know. It's worth reading if React has always been
a black box, because everything in modules 3 and 8 rests on it.

### The problem React solves

A web page is a tree of elements called the **DOM** (Document Object
Model). Originally, making a page interactive meant writing code that
*mutates that tree by hand*:

```js
// The old way — imperative DOM manipulation
document.getElementById("count").textContent = "3";
document.getElementById("warning").style.display = "block";
document.querySelector(".btn").disabled = true;
```

This works fine for one counter. It becomes unmanageable in a real app,
because **you are responsible for every transition**. If a workout has 3
exercises and the user deletes the middle one, you must write code that
removes the right row, renumbers the rest, updates the total, and re-enables
the save button. Every new feature multiplies the number of transitions you
must handle, and any one you forget is a bug where the screen shows stale
information.

### React's answer

React inverts it. You never describe *transitions*. You write a function
that says **"given this data, here is what the screen should look like"**,
and React figures out the transitions for you.

```
        your data ──► your function ──► description of the UI
                                              │
                                              ▼
                              React compares it to what's on screen
                              and changes only the differences
```

That description is a plain JavaScript object tree (React calls it the
*virtual DOM*). When your data changes, React runs your function again,
gets a new description, compares it against the previous one, and applies
the **minimum set of real DOM changes** needed. This comparison step is
called **reconciliation**, and it's why React feels fast despite seeming
wasteful.

The practical consequence, which is the whole point:

> **You describe the destination, not the journey.** There is no code
> anywhere in this app that says "remove the third row." There's only code
> that says "here are the exercises" — and the rows follow.

A component is just one of those functions. Module 3 covers writing them;
module 8 covers what "when your data changes" actually means.

> **Coming from C#:** the imperative style above is WinForms
> (`label.Text = "3"`). React is closer to WPF/Blazor data binding, but
> more literal: instead of binding expressions that update in place, the
> entire view function re-runs and React diffs the result.

---

## Part 3 — What Next.js adds on top

React only knows how to render UI. It has no opinion about URLs, servers,
databases, or files. A pure React app is a single HTML page that boots up
an empty `<div>` and draws everything with JavaScript after the fact.

That has two real costs: the user stares at a blank screen while the
JavaScript downloads, and search engines/link previews see an empty page.
It also means you still need a *separate* backend project for anything
involving a database.

Next.js is a framework that wraps React and supplies the missing parts:

| What Next.js adds | Why you care in this app |
|---|---|
| **A server** | Node process that handles requests, so pages can arrive as finished HTML |
| **File-based routing** | Folder layout defines URLs — no route configuration anywhere (module 4) |
| **Server Components** | Components that run on the server and can query MariaDB directly (below) |
| **Route handlers** | JSON endpoints, i.e. a REST API, in the same project (module 6) |
| **Server Actions** | Call a server function straight from a form, no endpoint needed (module 9) |
| **A build system** | TypeScript compilation, bundling, CSS processing — all preconfigured |

The headline consequence: **frontend and backend live in one project, and
often in one file.** A single `page.tsx` can run SQL and produce HTML. That
is the biggest structural difference from a typical .NET setup and it takes
a bit of getting used to.

> **Coming from C#:** React alone ≈ a UI library with no host. Next.js ≈
> ASP.NET Core: it brings the web server, routing, and the request
> pipeline. A `page.tsx` that queries the DB and returns markup is
> spiritually a **Razor Page** — model and view in one file.

---

## Part 4 — The project, folder by folder

```
WorkoutApp2/
├── package.json            ← dependencies + scripts (npm run dev, etc.)
├── tsconfig.json           ← TypeScript compiler settings (strict mode on)
├── next.config.ts          ← framework config (allowed image hosts, etc.)
├── .env                    ← secrets & connection settings, NOT in git
├── scripts/
│   ├── schema.sql          ← the database DDL, plain SQL
│   └── init-db.ts          ← runs schema.sql  (npm run db:init)
├── public/                 ← static files served as-is at /
└── src/
    ├── app/                ← ROUTING LIVES HERE. Every folder = a URL.
    │   ├── layout.tsx      ← wraps every page (nav bar, <html>, fonts)
    │   ├── page.tsx        ← the "/" landing page
    │   ├── globals.css     ← the only stylesheet (Tailwind import)
    │   ├── dashboard/page.tsx        ← "/dashboard"
    │   ├── exercises/[id]/page.tsx   ← "/exercises/<anything>"
    │   └── api/workouts/route.ts     ← "/api/workouts" (JSON endpoint)
    ├── components/         ← reusable UI pieces, no URLs of their own
    ├── lib/                ← the non-UI logic: db, auth, queries, units
    ├── data/exercises.json ← the bundled 873-exercise catalogue
    └── types/index.ts      ← shared type definitions
```

Two conventions to internalise now:

- **`src/app/` is special.** Its folder structure *is* the route table.
  Nothing else in the project has that power.
- **`@/` means `src/`.** Every import you'll see (`@/lib/db`) uses this
  alias, configured in `tsconfig.json`, so imports don't turn into
  `../../../lib/db`.

**Try it:** open [package.json](../package.json). `dependencies` is the
library list. `scripts` defines the commands — `npm run dev` starts the
dev server with hot reload; `npm run build` produces the optimised
production output.

---

## Part 5 — Life of a request

You type `http://localhost:3000/dashboard` and press Enter.

**1. The browser sends `GET /dashboard`** to the Node process on port 3000.

**2. Next.js maps the URL to a file** by looking at folders:
`/dashboard` → [src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx).
No configuration was consulted; the path *is* the config.

**3. Next.js calls the function that file exports — on the server.**

```tsx
export default async function DashboardPage() {
  const session = await auth();                    // reads the cookie
  if (!session?.user?.id) redirect("/login");      // not logged in? bail
  const [stats, recent] = await Promise.all([      // real SQL, right here
    getDashboardStats(session.user.id),
    getWorkoutSummaries(session.user.id, 5),
  ]);
  return ( <div> …JSX using stats and recent… </div> );
}
```

This function runs **inside the Node process**. It has the DB password. It
can `await` a SQL query directly. The browser never sees this code — not
the SQL, not the connection details, not even the fact that a query
happened. This is a **Server Component**.

**4. Next.js turns the returned description into HTML** and sends it. The
user sees a complete, populated dashboard on the first paint — no spinner,
no flash of empty layout.

**5. The browser "hydrates" the interactive parts.** Here's what that word
means: the HTML that arrived is inert — real text and boxes, but no
behaviour. Buttons don't click, toggles don't toggle. So the browser then
downloads the JavaScript for the components that need interactivity,
React re-runs those components in the browser, matches them up against the
existing HTML, and attaches the event handlers. The page was already
*visible*; hydration makes it *alive*.

Only components marked `"use client"` get shipped and hydrated — the nav's
lbs/kg toggle, the workout logger. The dashboard's stat cards are pure
HTML forever, and their code never enters the browser at all.

> **Coming from C#:**
>
> | ASP.NET MVC | Next.js here |
> |---|---|
> | Route table maps URL → controller action | Folder structure maps URL → `page.tsx` |
> | Action queries DB, builds a ViewModel | The `page.tsx` function queries the DB itself |
> | Razor view renders ViewModel → HTML | The returned JSX renders → HTML |
> | `[Authorize]` attribute | An explicit `await auth()` + `redirect()` at the top |
> | jQuery / Blazor for interactivity | `"use client"` components, hydrated after load |

---

## Part 6 — The server/client split (the concept that matters most)

This is where nearly all Next.js confusion lives, so it's worth being
precise. Every component in this app is one of two kinds.

### Server Components — the default

Any component **without** `"use client"` at the top of its file.

- Runs **only** on the server, only while building the response.
- **Can:** query the database, read `.env` secrets, read files, `await`
  anything.
- **Cannot:** respond to clicks, hold state that changes, use `setInterval`,
  or touch `window`. There is no browser here — by the time the user sees
  the output, this code has already finished and been discarded.
- Its source code is **never sent to the browser**.

Examples: [src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx),
[src/app/records/page.tsx](../src/app/records/page.tsx),
[src/components/exercise-card.tsx](../src/components/exercise-card.tsx).

### Client Components — opt in with `"use client"`

The literal string `"use client"` as the first line of the file.

- Its code is **bundled and downloaded by the browser**, then hydrated.
- **Can:** handle clicks, hold changing state, run timers, read the URL,
  use browser APIs.
- **Cannot:** import the database, read secrets, or `await` at the top
  level. Anything it needs from the server must either be **passed in as
  props** or **fetched over HTTP**.

Examples: [src/components/nav.tsx](../src/components/nav.tsx),
[src/components/workout-logger.tsx](../src/components/workout-logger.tsx),
[src/components/exercise-image.tsx](../src/components/exercise-image.tsx).

### Why the split exists at all

Three reasons, all practical:

1. **Security.** Code in the browser is readable by anyone. Your DB
   password can never be in it.
2. **Payload size.** The 873-exercise catalogue, the SQL, the bcrypt
   library — none of it needs to be downloaded. Keeping components on the
   server keeps the bundle small.
3. **Speed to first paint.** Data fetched on the server arrives *with* the
   HTML instead of after a round trip from the browser.

### The rule this app follows

> **Pages are Server Components that fetch data. Anything with a button or
> an input is a Client Component that receives that data as props.**

And one directional rule that explains a lot of the code's shape: a Server
Component can render a Client Component, but **a Client Component cannot
render a Server Component**. Once you've crossed into the browser you stay
there. That's why data is always fetched at the top (in the page) and
passed *downward*.

**Try it — prove the wall exists:**

1. Open [src/app/records/page.tsx](../src/app/records/page.tsx). No
   `"use client"`; it calls `getPersonalRecords`. Server.
2. Open [src/components/delete-button.tsx](../src/components/delete-button.tsx).
   `"use client"` on line 1, has `useState` and `onClick`. Client.
3. In the delete button, add `import { db } from "@/lib/db";` at the top
   and reference `db` inside the component. Save and watch the dev server
   refuse — it won't bundle a MySQL driver into browser code. **Read the
   error message carefully**, then undo. You will meet it again.

---

## Where things live — a treasure hunt

Answer by searching the codebase (Ctrl+Shift+F in VS Code). Answers below.

1. Which file decides that weights are stored in lbs?
2. Which file contains the SQL that computes personal records?
3. The nav bar appears on every page. Which file puts it there?
4. When you press "Finish & Save Workout", which URL does the browser call,
   and which file handles it?
5. Which file teaches the app what `/exercises/Barbell_Bench_Press` should
   render?

<details>
<summary>Answers</summary>

1. [src/lib/units.ts](../src/lib/units.ts) — conversion helpers; storage is lbs.
2. [src/lib/queries.ts](../src/lib/queries.ts) — `getPersonalRecords`, a window-function query.
3. [src/app/layout.tsx](../src/app/layout.tsx) — the root layout wraps every page and renders `<Nav />`.
4. `POST /api/workouts`, handled by [src/app/api/workouts/route.ts](../src/app/api/workouts/route.ts).
5. `src/app/exercises/[id]/page.tsx` — the `[id]` folder catches any value.
</details>

---

## Checkpoint

You should now be able to answer, without looking:

- Which of the three processes runs a `page.tsx` function?
- Why can't a component with an `onClick` handler run a SQL query?
- What does "hydration" mean, and what is the page like before it happens?
- What does React actually do when your data changes?

**Next:** [Module 2 — TypeScript →](02-typescript-for-csharp-devs.md)
