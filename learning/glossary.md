# Glossary

Every term used in the course, defined in one line or two, with the module
that covers it properly. Use this when a word shows up that you can't
place.

---

## The stack

**JavaScript** — the only language browsers can execute. Everything else
compiles down to it. *(M1)*

**Node.js** — a program that runs JavaScript outside a browser. It's what
`npm run dev` starts, and it's where all your server code executes. *(M1)*

**TypeScript** — JavaScript plus a type system. Cannot be run directly;
types are stripped out at build time. *(M2)*

**React** — a library for describing UI. You write functions that return a
description of the screen; React makes the real page match. *(M1, M3)*

**Next.js** — a framework built on React that adds the server, routing,
data loading, API endpoints, and the build system. *(M1)*

**npm** — the package manager (installs libraries) and script runner
(`npm run dev`). *(M1)*

**Turbopack** — the bundler Next.js uses. You never invoke it directly.
*(M1)*

**Tailwind CSS** — a styling system of small single-purpose utility
classes composed in markup. *(M10)*

**mysql2** — the MariaDB/MySQL driver. Sends SQL, returns rows. Not an ORM.
*(M5)*

**NextAuth (Auth.js)** — the authentication library handling cookies,
token signing, and the sign-in flow. *(M7)*

**recharts** — the charting library used on the progress page.

---

## JavaScript language

**`const` / `let`** — variable declarations. `const` can't be reassigned
(but its contents can still be mutated); `let` can. Never use `var`. *(M2)*

**Arrow function** — `(a, b) => a + b`. A function expression. A single
expression body returns automatically. *(M2)*

**Destructuring** — unpacking values: `const { id } = workout` or
`const [rows] = await db.execute(…)`. *(M2)*

**Spread (`...`)** — copy-and-extend: `{ ...obj, name: "x" }` or
`[...list, item]`. Shallow — nested objects are shared, not copied. *(M2)*

**Template literal** — backtick string with `${}` interpolation; can span
lines. Used for every SQL query in the app. *(M2)*

**Truthy / falsy** — the six falsy values are `false`, `0`, `""`, `null`,
`undefined`, `NaN`. Everything else is truthy. Note `0` and `""`. *(M2)*

**`===`** — strict equality, no type coercion. Always use it over `==`.
*(M2)*

**`?.` (optional chaining)** — `a?.b` yields `undefined` instead of
throwing when `a` is null/undefined. *(M2)*

**`??` (nullish coalescing)** — fallback only for `null`/`undefined`,
unlike `||` which also catches `0` and `""`. *(M2)*

**`null` vs `undefined`** — `null` is a deliberate empty value; `undefined`
means nothing was ever set. JavaScript has both. *(M2)*

**Module** — a file. `export` publishes, `import` consumes. Each file has
its own scope; nothing is global. *(M2)*

**Default export** — the one unnamed export per file, imported without
braces. Next.js requires it for pages and layouts. *(M2)*

---

## Async

**Promise** — an object representing a value that isn't ready yet. Starts
running immediately when created. *(M2)*

**`async` / `await`** — `await` pauses a function until a promise settles.
Only legal inside an `async` function, which always returns a promise.
*(M2)*

**Event loop** — JavaScript's single-threaded scheduler. Your code runs on
one thread; I/O happens elsewhere and its continuation is queued. Blocking
that thread blocks the whole server. *(M2)*

**`Promise.all`** — start several promises, wait for all of them. Used by
the dashboard to run four queries concurrently. *(M2)*

**`AbortController`** — the cancellation mechanism for `fetch`. Pass its
`signal` to a request and call `.abort()` to cancel it. *(M8)*

**Debounce** — waiting for a pause in activity before acting, so typing
"bench" makes one request instead of five. *(M8)*

---

## TypeScript types

**Type annotation** — `name: string`, written after the name. *(M2)*

**Type inference** — TypeScript deducing types you didn't write. Hover a
variable in VS Code to see the result. *(M2)*

**Interface** — a named object shape. *(M2)*

**Structural typing** — a value's type is decided by its shape, not by a
declared name. Any object with the right properties satisfies an interface,
with no class or `implements` clause. *(M2)*

**Union type** — `string | null`, or `"lbs" | "kg"`. A value that may be
one of several types. C# has no equivalent. *(M2)*

**Narrowing** — the compiler shrinking a union as you check it, so after
`if (x === null) return;` the remaining type excludes `null`. *(M2)*

**Type erasure** — types exist only at build time and are removed before
the code runs. This is why runtime validation is manual. *(M2, M6)*

**`as` (type assertion)** — "trust me, this is that type." Generates no
code and checks nothing. Not a cast. *(M2)*

**`!` (non-null assertion)** — "this isn't null." Also unchecked. *(M2)*

**Generic** — a type parameter: `Promise<Workout>`, `useState<string[]>`.
*(M2)*

**Module augmentation** — re-opening a library's type declarations to add
fields. Used in `next-auth.d.ts` so `session.user.id` type-checks. *(M7)*

**zod** — a runtime validation library that checks data *and* produces a
TypeScript type. Not used in this app; the recommended fix for its
validation gap. *(M6)*

---

## React

**Component** — a function whose name starts with a capital letter, taking
props and returning JSX. *(M3)*

**JSX** — the HTML-looking syntax. Not a template language: it compiles to
function calls that build plain objects. *(M3)*

**Props** — a component's inputs, passed as JSX attributes and received as
one object. Read-only. *(M3)*

**`children`** — the special prop holding whatever was placed between a
component's tags. How layouts receive the page. *(M3, M4)*

**Callback prop** — a function passed down so a child can notify its
parent. The mechanism behind "data down, events up." *(M3)*

**Fragment (`<>…</>`)** — groups elements without adding a wrapper
element. *(M3)*

**Key** — a stable identity for each item in a rendered list, so React can
match old items to new ones across renders. Using array indexes causes
state to stick to positions instead of items. *(M3)*

**Reconciliation** — React comparing the new description of the UI to the
previous one and applying only the differences. *(M1, M3)*

**Virtual DOM** — the in-memory object tree your components return, which
React diffs against the previous one. *(M1)*

**Render** — one execution of your component function. Happens many times;
local variables don't survive between them. *(M8)*

**Hook** — a function starting with `use` that plugs into React's
machinery. Must be called at the top level of a component, never
conditionally. *(M8)*

**`useState`** — gives a component a value that survives re-renders and
triggers one when changed. *(M8)*

**Functional update** — `setX((prev) => …)`. Required whenever the new
state derives from the old, because the captured variable may be stale.
*(M8)*

**Batching** — React grouping multiple state updates from one event into a
single re-render. Why the setter doesn't take effect immediately. *(M8)*

**Immutable update** — producing a new object/array rather than modifying
one. Required because React detects change by comparing references. *(M8)*

**Derived state** — a value computed during render from existing state,
rather than stored separately. Prefer it — it can't fall out of sync.
*(M8)*

**Controlled input** — an input whose value comes from state, paired with
an `onChange` that writes back. Two-way binding written by hand. *(M8)*

**`useEffect`** — runs code after render to synchronise with something
outside React (timers, subscriptions, fetches). Not for responding to
clicks. *(M8)*

**Dependency array** — the second argument to `useEffect`, controlling when
it re-runs. `[]` means once. *(M8)*

**Cleanup function** — what an effect returns; React calls it before
re-running and on unmount. Forgetting it leaks timers and subscriptions.
*(M8)*

**`useActionState`** — hook wiring a server action to a form, returning the
last result, the submit handler, and a `pending` flag. *(M9)*

---

## Next.js

**App Router** — the routing system where `src/app/`'s folder structure
defines URLs. *(M4)*

**Server Component** — the default. Runs only on the server, can query the
database, never reaches the browser, can't be interactive. *(M1, M3)*

**Client Component** — marked `"use client"`. Bundled and run in the
browser, can be interactive, can't touch the database. *(M1, M3)*

**`"use client"`** — the directive making a file (and everything it
imports) part of the client bundle. Marks a boundary, not just a file.
*(M3)*

**`"use server"`** — the directive making a file's exports into server
actions. *(M9)*

**Hydration** — the browser downloading JavaScript for client components
and attaching behaviour to the already-rendered HTML. Before it, the page
is visible but inert. *(M1)*

**`page.tsx`** — makes a folder a renderable URL. Must default-export a
component. *(M4)*

**`layout.tsx`** — wraps every page beneath it, receiving the page as
`children`. Doesn't re-render when navigating between its pages. *(M4)*

**`route.ts`** — makes a path an HTTP endpoint instead of a page. Exports
one function per HTTP verb. *(M6)*

**Dynamic segment (`[id]`)** — a folder matching any value, captured under
that name. *(M4)*

**Catch-all segment (`[...name]`)** — matches any number of path parts.
Used by NextAuth. *(M6)*

**`params` / `searchParams`** — props carrying route parameters and query
string values. Both are promises you `await`. *(M4)*

**`redirect()`** — server-side navigation. Works by **throwing**, so a
`try/catch` around it will silently swallow it. *(M4, M9)*

**`notFound()`** — throws to render the 404 UI. *(M4)*

**`<Link>`** — client-side navigation. Renders a real `<a>` but swaps the
page without a full reload, and prefetches. *(M4)*

**`router.refresh()`** — re-runs the current page's server components and
patches in fresh data without losing client state. *(M4)*

**`force-dynamic`** — opts a page out of caching so it renders on every
request. Used on everything behind login. *(M4)*

**Server action** — a server function callable directly from client code;
Next.js generates the HTTP plumbing. It is a **public endpoint** and needs
its own auth checks. *(M9)*

**`FormData`** — the browser's name/value collection built from a form's
inputs on submit. *(M9)*

**Progressive enhancement** — working before JavaScript loads. Server
actions have it because they're real forms; `fetch` doesn't. *(M9)*

---

## Data and HTTP

**Connection pool** — a set of reusable open database connections. Opening
one per query would dominate latency. *(M5)*

**Prepared statement** — SQL compiled once by the server, with values sent
separately. What `db.execute` uses. *(M5)*

**Placeholder (`?`)** — a parameter marker. Values travel as data and can
never be interpreted as SQL. Only substitutes values, never identifiers.
*(M5)*

**SQL injection** — the attack that placeholders prevent, and that string
interpolation into SQL enables. *(M5)*

**Transaction** — a group of statements that all succeed or all roll back.
Must use one connection (`getConnection()`), not the pool. **Not currently
used in this app.** *(M5)*

**Denormalisation** — deliberately duplicating data. Here, exercise
name/body part/equipment are copied into `workout_exercises` so history
survives catalogue changes. *(M5)*

**`ON DELETE CASCADE`** — a foreign key rule that deletes children with
the parent. Why deleting a workout is one statement. *(M5)*

**UUID** — a random 36-character id generated in code with
`crypto.randomUUID()`. Used instead of auto-increment. *(M5)*

**`fetch`** — the browser's HTTP client. Does **not** throw on HTTP errors —
check `res.ok`. *(M6)*

**`NextResponse.json()`** — builds a JSON response with the right
content type and an optional status. *(M6)*

**Status codes** — 200 OK, 201 Created, 400 Bad Request, 401 not logged in,
404 not found *or not yours*, 500 server error. *(M6)*

**Same-origin** — requests to the same host, which carry cookies
automatically. Why API routes can call `auth()` with no token handling.
*(M6)*

---

## Authentication

**Stateless** — HTTP's property of not remembering anything between
requests. The reason cookies exist. *(M7)*

**Cookie** — data the server stores in the browser, automatically attached
to every subsequent request. *(M7)*

**`HttpOnly`** — a cookie flag making it unreadable by JavaScript, so XSS
can't steal the session token. *(M7)*

**Session (server-side)** — a cookie holding a meaningless id, with the
server storing the mapping. Revocable, but costs a lookup per request. Not
used here. *(M7)*

**JWT** — a token of three Base64 parts: header, payload, signature. The
payload is **readable by anyone** — it's signed, not encrypted. *(M7)*

**`AUTH_SECRET`** — the key that signs and verifies tokens. Anyone holding
it can forge a session for any user. *(M7)*

**Signing vs encryption** — signing proves the content wasn't tampered
with; encryption hides it. A JWT is only signed. *(M7)*

**Hashing** — a one-way transformation. Passwords are hashed, never
encrypted, so a database leak doesn't expose them. *(M7)*

**bcrypt** — a deliberately slow password hash with a tunable cost factor.
*(M7)*

**Cost factor** — bcrypt's work parameter (12 here); each +1 doubles the
time. Makes brute force impractical. *(M7)*

**Salt** — random data mixed into each hash so identical passwords produce
different hashes. bcrypt stores it inside the hash string. *(M7)*

**Constant-time comparison** — comparing without early exit, so timing
reveals nothing. What `bcrypt.compare` does. *(M7)*

**Authentication vs authorisation** — *who are you* (`auth()`) versus *what
may you touch* (`WHERE user_id = ?` on every query). *(M7)*

**Account enumeration** — leaking which emails are registered by giving
different errors for "no such user" and "wrong password". Avoided by
returning one message. *(M7)*

---

## Tailwind

**Utility class** — a class doing exactly one thing: `p-4`, `text-sm`,
`bg-zinc-900`. *(M10)*

**The cascade / specificity** — CSS's global rule-priority system, and the
source of the conflicts utility classes sidestep. *(M10)*

**Arbitrary value** — square-bracket syntax for anything the built-in scale
doesn't cover: `aspect-[3/2]`, `w-[347px]`. *(M10)*

**Opacity suffix (`/50`)** — `bg-zinc-900/50` is that colour at 50%
opacity. *(M10)*

**Mobile-first** — unprefixed classes apply everywhere; prefixed ones
(`lg:`) apply from that width upward. *(M10)*

**State prefix** — `hover:`, `focus:`, `disabled:`, `group-hover:` — makes
a utility conditional. *(M10)*

**`group`** — marks a parent so descendants can style themselves on the
parent's hover with `group-hover:`. *(M10)*

**`object-cover` vs `object-contain`** — fill the box and crop, versus fit
entirely inside and leave gaps. The white-bars fix. *(M10)*

**Class scanning** — Tailwind finds class names by searching source text,
so names built by string concatenation produce no CSS. *(M10)*

---

[← Back to the course](README.md)
