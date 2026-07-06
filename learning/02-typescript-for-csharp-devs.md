# Module 2 — TypeScript for C# Developers

**Goal:** read any `.ts`/`.tsx` file in this project and know what the
syntax means. This module is a translation guide, not a full course.

TypeScript is JavaScript + a static type system that will feel familiar.
The big difference from C#: **types exist only at compile time.** They're
erased when the code runs. There's no reflection over types, no runtime
type checks — the compiler is a very smart linter.

## Variables and functions

```ts
// TypeScript                          // C# equivalent
const name = "Riley";                  // var name = "Riley"; (readonly)
let count = 0;                         // var count = 0; (mutable)
const nums: number[] = [1, 2, 3];      // int[] / List<double>

function add(a: number, b: number): number {   // double Add(double a, double b)
  return a + b;
}

const add2 = (a: number, b: number) => a + b;  // lambda: (a, b) => a + b
```

Notes:
- `const`/`let` replace `var` (never use `var` in modern TS).
- Types come **after** the name: `a: number` not `number a`.
- One number type: `number` (a double). No `int`/`decimal` — which is why
  [queries.ts](../src/lib/queries.ts) calls `Number(...)` and `Math.round(...)`
  liberally on values coming from SQL.
- Arrow functions `=>` are C# lambdas, used everywhere.

## Interfaces = your POCOs/DTOs

Open [src/types/index.ts](../src/types/index.ts). This is the project's
DTO file:

```ts
export interface WorkoutSummary {
  id: string;
  name: string;
  date: string;
  notes: string | null;      // ← nullable, explicit
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
}
```

Crucial difference from C#: TypeScript typing is **structural, not
nominal**. Any object with those properties *is* a `WorkoutSummary` — no
class declaration, no `: IWorkoutSummary`, no `new`. That's why
[queries.ts](../src/lib/queries.ts) can build plain objects with `{ ... }`
and return them as typed results.

```ts
// This is a valid WorkoutSummary — no constructor, no class:
const w: WorkoutSummary = { id: "1", name: "Push", date: "...", notes: null,
                            exerciseCount: 3, setCount: 9, totalVolume: 5000 };
```

## Null safety — like C# nullable reference types, but strict by default

`tsconfig.json` sets `"strict": true`, so this project behaves like a C#
project with `<Nullable>enable</Nullable>`:

```ts
notes: string | null       // string? — must be null-checked before use
session?.user?.id          // session?.User?.Id — same ?. operator
body.notes?.trim() || null // null-coalescing-ish: ?? exists too, || is looser
const name = user!.name    // null-forgiving ! — same as C#, same danger
```

`string | null` is a **union type** — C# doesn't have these. A value can
be declared as "one of several types":

```ts
// src/lib/units.ts
export type WeightUnit = "lbs" | "kg";
```

That's a type whose only legal values are those two strings — think of it
as an enum that needs no casting. The compiler then forces you to handle
both cases. Search the project for `WeightUnit` to see how it flows from
the DB read all the way into components.

## LINQ → array methods

You'll feel at home here. Open
[src/lib/exercise-library.ts](../src/lib/exercise-library.ts) and find:

```ts
const scored = results
  .map((e) => { ... })         // .Select(e => ...)
  .filter((x) => x !== null)   // .Where(x => x != null)
  .sort((a, b) => a.score - b.score);  // .OrderBy(x => x.Score)
```

| LINQ | JS/TS |
|---|---|
| `.Select(x => ...)` | `.map(x => ...)` |
| `.Where(x => ...)` | `.filter(x => ...)` |
| `.FirstOrDefault(...)` | `.find(...)` |
| `.Any(...)` / `.All(...)` | `.some(...)` / `.every(...)` |
| `.Aggregate(...)` | `.reduce(...)` |
| `.SelectMany(...)` | `.flatMap(...)` |
| `string.Join(", ", xs)` | `xs.join(", ")` |

One gotcha: these run eagerly (no deferred execution like `IEnumerable`).

## async/await — nearly identical

```ts
// Promise<T> is Task<T>
export async function getWeightUnit(userId: string): Promise<WeightUnit> {
  const [rows] = await db.execute("SELECT weight_unit FROM users WHERE id = ?", [userId]);
  ...
}
```

`Promise.all([...])` is `Task.WhenAll(...)` — the dashboard uses it to run
four queries concurrently
([src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx)):

```ts
const [stats, recent, records, unit] = await Promise.all([ ... ]);
```

That bracket syntax on the left is **destructuring** — unpacking an array
or object into variables. C# tuples do this: `var (stats, recent) = ...`.
You'll see it constantly:

```ts
const { id } = await params;          // var id = (await params).Id;
const [rows] = await db.execute(...); // first element of a tuple-ish array
```

## Modules: import/export vs using/namespace

Every file is a module. `export` makes something public; `import` pulls it
in. The `@/` prefix is a path alias for `src/` (configured in
tsconfig.json) — like a project-level `global using`.

```ts
import { db } from "@/lib/db";          // using static Lib.Db;  (roughly)
import type { Exercise } from "@/types"; // type-only import — erased at build
```

## Spread and object tricks you'll see in this codebase

```ts
{ ...r, date: new Date(r.date).toISOString() }
// "copy every property of r, then override date" — like a C# record's
// `r with { Date = ... }`

setExercises((prev) => [...prev, newItem]);
// copy array + append — immutability idiom, important for React (module 8)

const { template: templateId } = await searchParams;
// destructure AND rename: var templateId = searchParams.Template;
```

## Try it

1. In [src/types/index.ts](../src/types/index.ts), add a property
   `difficulty: number` to `WorkoutSummary`. Watch
   [queries.ts](../src/lib/queries.ts) and the dashboard **not** error —
   why not? (Hint: `getWorkoutSummaries` builds objects with `...r` spread,
   and TS can't verify what SQL returns. This is the type-system boundary:
   types are promises, not runtime checks.) Now remove it.
2. In [src/lib/units.ts](../src/lib/units.ts), change
   `export type WeightUnit = "lbs" | "kg";` to add `"stone"`. Follow the
   compiler errors (there is exactly one place that must change —
   `isWeightUnit`). This is how union types propagate. Undo it.
3. Hover over `records` in
   [src/app/records/page.tsx](../src/app/records/page.tsx) and read the
   inferred type. Note you never wrote it — inference did.

**Next:** [Module 3 — React components & JSX →](03-react-components.md)
