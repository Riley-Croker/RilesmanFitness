# Learn Next.js & TypeScript — Using Your Own App

A self-paced course that teaches you Next.js and TypeScript by dissecting
**Rilesman Fitness** — the app in this repo. It's written for someone with
a **SQL and C#/.NET background**: every new concept is mapped to something
you already know.

## Why learn this way

You already have a real, working app with auth, a database, an API, and an
interactive UI. Instead of building yet another to-do list from a tutorial,
you'll read, modify, and extend code you actually use. When a module says
"open [src/lib/queries.ts](../src/lib/queries.ts)", that's your real file —
break it, fix it, learn.

## The path

Work through the modules in order. Each is 20–45 minutes of reading plus
hands-on tasks. Don't skip the **Try it** sections — typing code is where
the learning happens.

| # | Module | You'll understand |
|---|--------|-------------------|
| 1 | [The big picture](01-big-picture.md) | What Next.js is, how the app is organised, how a request flows |
| 2 | [TypeScript for C# devs](02-typescript-for-csharp-devs.md) | Types, interfaces, null-safety — mapped to C# |
| 3 | [React components & JSX](03-react-components.md) | Components, props, and the server/client split |
| 4 | [Routing, pages & layouts](04-routing-pages-layouts.md) | File-based routing vs ASP.NET routing |
| 5 | [The data layer](05-data-layer-sql.md) | mysql2 + raw SQL — your home turf, new dialect |
| 6 | [API routes](06-api-routes.md) | `route.ts` files vs Web API controllers |
| 7 | [Authentication](07-auth.md) | NextAuth, JWT cookies, bcrypt — vs ASP.NET Identity |
| 8 | [Client interactivity](08-client-interactivity.md) | `useState`, `useEffect`, and the workout logger deep-dive |
| 9 | [Server actions & forms](09-server-actions-and-forms.md) | The login/register flow without any API endpoint |
| 10 | [Styling with Tailwind](10-styling-tailwind.md) | Utility-class CSS and the dark theme |
| 11 | [How this app was actually built](11-how-it-was-built.md) | The real build story: decisions, dead ends, debugging |
| 12 | [Challenges](12-challenges.md) | Graded exercises to extend the app yourself |

## Ground rules for the course

1. **Run the app while you read.** `npm run dev` in the project root, then
   keep http://localhost:3000 open. Every module asks you to poke at
   something live.
2. **Break things on purpose.** Dev mode shows errors instantly and
   recovers when you undo. There is no faster way to learn what a line
   does than deleting it.
3. **Use the editor's type hints.** Hover over any variable in VS Code —
   TypeScript tells you its type. This is IntelliSense, same as C#, and
   it works because of the type system you'll learn in module 2.
4. **The database is disposable.** If you wreck your data, run
   `npm run db:init` to rebuild the schema (it keeps existing tables, so
   drop the `workout_app2` database first for a true reset).

## Cheat sheet: .NET → this stack

| .NET world | This project |
|---|---|
| .csproj + NuGet | [package.json](../package.json) + npm |
| ASP.NET Core (Kestrel) | Next.js dev/prod server (Node.js) |
| Razor Pages / MVC Views | React Server Components (`page.tsx`) |
| Web API controllers | Route handlers (`api/**/route.ts`) |
| ADO.NET / Dapper | mysql2 ([src/lib/db.ts](../src/lib/db.ts)) |
| ASP.NET Identity | NextAuth ([src/lib/auth.ts](../src/lib/auth.ts)) |
| `appsettings.json` | [.env](../.env) |
| C# | TypeScript |
| LINQ (`Where`, `Select`) | Array methods (`filter`, `map`) |
| `Task<T>` / `await` | `Promise<T>` / `await` |
| Blazor components (closest) | React Client Components |

Start with [Module 1 →](01-big-picture.md)
