# Learn Next.js & TypeScript — Using Your Own App

A self-paced course that teaches Next.js, React, and TypeScript by
dissecting **Rilesman Fitness** — the app in this repo.

## How these modules are written

Every concept is explained **on its own terms first**: what problem it
solves, how it actually works mechanically, and what goes wrong when you
get it wrong. Then, where it helps, there's a boxed **"Coming from C#"**
comparison.

> **Coming from C#:** boxes look like this. They're a bridge, not the
> explanation — if a comparison doesn't land, skip it and the module still
> stands on its own.

The point is that you shouldn't need to be confident in the C# concept for
the Next.js concept to make sense. The analogy is there to speed things up
when it clicks, not to carry the weight.

Each module ends with a **Checkpoint** — questions you should be able to
answer without looking. If one stumps you, the answer is in that module.

## Why learn this way

You already have a real, working app with authentication, a database, an
API, and an interactive UI. Instead of building another to-do list from a
tutorial, you'll read, break, and extend code you actually use. When a
module says "open [src/lib/queries.ts](../src/lib/queries.ts)", that's your
real file.

## The path

Work through them in order — later modules assume earlier ones. Each is
30–60 minutes of reading plus hands-on tasks. **Don't skip the "Try it"
sections**; several of them have you deliberately cause a bug you'll
otherwise meet later at a worse moment.

| # | Module | You'll understand |
|---|--------|-------------------|
| 1 | [The big picture](01-big-picture.md) | The three running processes, what React and Next.js each do, server vs client components |
| 2 | [TypeScript](02-typescript-for-csharp-devs.md) | JS fundamentals, async/promises, types, unions, structural typing, array methods |
| 3 | [React components & JSX](03-react-components.md) | What JSX compiles to, props, keys and reconciliation, data down / events up |
| 4 | [Routing, pages & layouts](04-routing-pages-layouts.md) | File-based routing, params, layouts, navigation, static vs dynamic rendering |
| 5 | [The data layer](05-data-layer-sql.md) | Connection pooling, prepared statements, JS/SQL type hazards, MySQL vs T-SQL |
| 6 | [API routes](06-api-routes.md) | `route.ts` endpoints, reading requests, status codes, why validation is manual |
| 7 | [Authentication](07-auth.md) | Why cookies exist, what a JWT really is, hashing vs encryption, bcrypt |
| 8 | [Client interactivity](08-client-interactivity.md) | The render cycle, `useState`, immutability, `useEffect`, the logger dissected |
| 9 | [Server actions & forms](09-server-actions-and-forms.md) | RPC over HTTP, `useActionState`, progressive enhancement, when to use which |
| 10 | [Styling with Tailwind](10-styling-tailwind.md) | Why utility classes, the layout vocabulary, responsive prefixes |
| 11 | [How this app was built](11-how-it-was-built.md) | The real build story: decisions, dead ends, debugging |
| 12 | [Challenges](12-challenges.md) | Graded exercises to extend the app yourself |

📖 **[Glossary](glossary.md)** — every term in one place. Use it whenever a
word appears that you can't place.

## Ground rules

1. **Run the app while you read.**
   ```bash
   npm.cmd run dev
   ```
   Then keep http://localhost:3000 open. Every module asks you to poke at
   something live. (Use `npm.cmd` rather than `npm` if PowerShell's
   execution policy is still blocking scripts.)

2. **Break things on purpose.** Dev mode shows errors instantly and
   recovers when you undo. There's no faster way to learn what a line does
   than deleting it.

3. **Know which process you're looking at.** Server code logs to the
   **terminal**; browser code logs to the **DevTools console**. When a
   `console.log` "doesn't appear", it's almost always because you're
   watching the wrong one.

4. **Use the editor's type hints.** Hover any variable in VS Code and
   TypeScript tells you its inferred type. It's the fastest way to check
   whether you understand a piece of code.

5. **The database is disposable.** If you wreck your data, drop the
   `workout_app2` database and run `npm run db:init` to rebuild the schema
   from [scripts/schema.sql](../scripts/schema.sql). You'll need to register
   an account again afterwards — there's no seed script.

## Cheat sheet: .NET → this stack

| .NET world | This project |
|---|---|
| `.csproj` + NuGet | [package.json](../package.json) + npm |
| ASP.NET Core (Kestrel) | Next.js server (Node.js) |
| Razor Pages / MVC views | React Server Components (`page.tsx`) |
| Web API controllers | Route handlers (`api/**/route.ts`) |
| ADO.NET / Dapper | mysql2 ([src/lib/db.ts](../src/lib/db.ts)) |
| ASP.NET Identity | NextAuth ([src/lib/auth.ts](../src/lib/auth.ts)) |
| `appsettings.json` | [.env](../.env) |
| C# | TypeScript |
| LINQ (`Where`, `Select`) | Array methods (`filter`, `map`) |
| `Task<T>` / `await` | `Promise<T>` / `await` |
| Records + `with` expressions | Object spread `{ ...obj, x: 1 }` |
| Blazor components (closest) | React Client Components |
| `IDisposable.Dispose()` | `useEffect` cleanup function |
| `CancellationToken` | `AbortController` / `signal` |

Start with [Module 1 →](01-big-picture.md)
