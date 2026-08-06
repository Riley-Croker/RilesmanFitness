# Module 2 — TypeScript (and the JavaScript underneath it)

**Goal:** read any `.ts`/`.tsx` file in this project and know exactly what
the syntax means — including the JavaScript idioms that TypeScript doesn't
change.

This module is longer than the others on purpose. Syntax you can't read is
a wall in front of every later module, so it's worth over-investing here.

---

## Part 1 — The one thing that makes TypeScript different

TypeScript is JavaScript with a type system bolted on. The types are
checked when you save, and then **completely erased** before the code runs.

```ts
// What you write:
function add(a: number, b: number): number { return a + b; }

// What actually runs, after compilation:
function add(a, b) { return a + b; }
```

The types are gone. Nothing checks them at runtime. This has consequences
you will actually hit in this app:

- **No runtime type checking.** If SQL returns a string where your type
  says `number`, nothing complains — you get a string, and `+` will
  concatenate instead of add. That's why
  [queries.ts](../src/lib/queries.ts) is full of `Number(...)` calls: they
  are *real* conversions, not casts.
- **No reflection over types.** You cannot ask "what properties does
  `WorkoutSummary` have?" at runtime. The answer doesn't exist anymore.
- **A cast is a promise, not a check.** `as WorkoutInput` tells the
  compiler "trust me." It generates zero code. If you're wrong, you find
  out later, somewhere else, confusingly.

> The mental model: TypeScript is an extremely good linter that runs in
> your editor. It catches mistakes while you type. It defends nothing at
> runtime.

> **Coming from C#:** the contrast is sharp. C# types are real at runtime —
> they drive reflection, serialization, casting exceptions, generic
> dispatch. TypeScript types evaporate. `as Foo` is *not* `(Foo)obj`; the
> closest C# analogue is `Unsafe.As<T>` — pure assertion, no verification.
> This is why validating incoming HTTP bodies is manual work in module 6:
> there's no model binder, because at runtime there's no model.

---

## Part 2 — JavaScript essentials you need first

TypeScript adds types to JavaScript; it does not change how JavaScript
behaves. These are the behaviours that matter in this codebase.

### Declaring variables: `const` and `let`

```ts
const name = "Riley";   // cannot be reassigned
let count = 0;          // can be reassigned
count = 1;              // fine
```

Default to `const`. Use `let` only when you genuinely reassign (the
calendar page's `year`/`month` are a fair example). There is an older
keyword `var` — treat it as broken and never use it.

One subtlety: `const` prevents **reassignment**, not **mutation**.

```ts
const list = [1, 2];
list.push(3);      // allowed — the array changed, the binding didn't
list = [4];        // error — reassignment
```

### Objects and arrays are the only data structures

JavaScript has no classes-by-default culture. Data is plain objects and
arrays, written as literals:

```ts
const set = { reps: 8, weight: 135 };        // an object
const sets = [set, { reps: 6, weight: 155 }]; // an array of objects
set.reps;          // 8      — dot access
set["reps"];       // 8      — same thing, string key
```

Every object is effectively a dictionary with string keys. There's no
declaration required, no `new`, no class. This is why the entire app can
move data around as bare `{ ... }` literals.

### `null` vs `undefined` — JavaScript has both

This trips up everyone coming from a single-null language.

- **`undefined`** = "nothing was ever put here." Missing object property,
  parameter you didn't pass, function with no return.
- **`null`** = "something is deliberately here, and it's empty."

In this app the convention is: the database and API return `null` for
empty values (`notes: string | null`), while `undefined` shows up for
optional things that weren't provided. Both are falsy, so most checks
handle them together — which is why `??` and `?.` (below) treat them as a
pair.

### Truthiness — the values that count as false

Six values are **falsy**; everything else is truthy:

```
false   0   ""   null   undefined   NaN
```

Note carefully: `0` and `""` are falsy. This is a real bug source in an app
full of weights and reps.

```ts
if (weight) { ... }          // DANGER: skips a legitimate weight of 0
if (weight != null) { ... }  // correct: only skips null/undefined
```

You'll see `s.weight || 0` in a few places — that reads "if weight is
falsy, use 0", which is safe there because `0 || 0` is still `0`.

### `===` not `==`

Always use `===` (strict equality). The double-equals form applies type
coercion and produces genuinely absurd results (`0 == ""` is `true`).
`===` compares without conversion. Same for `!==`. There is no reason to
use `==` in this codebase, and it doesn't appear.

### Arrow functions

Two ways to write a function; the second is used far more:

```ts
function add(a: number, b: number): number { return a + b; }  // declaration

const add = (a: number, b: number): number => a + b;          // arrow
```

Arrow function rules:
- One expression body → the value is returned automatically (no `return`).
- Braces → you must `return` explicitly.
- To return an object literal, wrap it in parens: `() => ({ a: 1 })` —
  otherwise the braces look like a function body.

```ts
(x) => x * 2                    // returns x*2
(x) => { const y = x * 2; return y; }
() => ({ reps: 8, weight: 135 }) // returns an object
```

Functions are values. You pass them around constantly — into `.map()`, as
event handlers, as props. This is the single most common shape in React
code.

> **Coming from C#:** arrow functions are lambdas, near-identically.
> `(a, b) => a + b` is the same in both languages. Passing a function as a
> prop is passing an `Action<T>` or `Func<T,TResult>`.

### Destructuring — unpacking objects and arrays

Everywhere in this codebase. It's just shorthand for pulling fields out.

```ts
// Object destructuring
const { id, name } = workout;
// identical to: const id = workout.id; const name = workout.name;

// ...with renaming
const { template: templateId } = params;
// const templateId = params.template;

// ...with a default value
const { unit = "lbs" } = settings;
// use "lbs" if settings.unit is undefined

// Array destructuring — by position
const [rows] = await db.execute(sql, args);
// grabs element 0 and ignores the rest

const [stats, recent, records] = await Promise.all([...]);
// elements 0, 1, 2
```

It also works in **function parameters**, which is how every React
component in this app receives its props:

```tsx
function ExerciseCard({ exercise }: { exercise: Exercise }) { ... }
//                    ^^^^^^^^^^^^  destructuring the props object
```

That signature means: "this function takes one object argument; pull the
`exercise` property out of it."

### Spread `...` — copy and extend

```ts
const copy = { ...original };                 // shallow copy of an object
const changed = { ...original, name: "New" }; // copy, then override name
const longer = [...list, newItem];            // copy array + append
const merged = [...listA, ...listB];          // concatenate
```

This is the backbone of React state updates (module 8) because it creates
a **new** object/array rather than modifying the existing one. Remember
it's **shallow** — nested objects are shared, not copied, which is why the
logger's nested update in module 8 spreads at *every* level.

> **Coming from C#:** `{ ...original, name: "New" }` is a record `with`
> expression: `original with { Name = "New" }`.

### Optional chaining `?.` and nullish coalescing `??`

```ts
session?.user?.id
// if session is null/undefined → undefined, no crash
// else if user is null/undefined → undefined
// else → the id

value ?? "default"   // use "default" only if value is null or undefined
value || "default"   // use "default" if value is FALSY (0, "", false too!)
```

`??` is almost always what you want. `||` is correct only when you
genuinely want to replace empty strings and zeros too.

### Template literals

Backticks, with `${}` for interpolation. Can span multiple lines — which is
how every SQL query in this app is written.

```ts
`/workouts/${id}`
`Hello ${user.name}, you did ${count} sets`

const sql = `
  SELECT * FROM workouts
  WHERE user_id = ?
`;
```

> **Coming from C#:** `$"...{x}..."`, plus verbatim strings for the
> multi-line part.

---

## Part 3 — Async, promises, and why `await` is everywhere

This deserves real explanation because JavaScript's concurrency model is
genuinely different from .NET's, and the difference explains why the code
looks the way it does.

### The core fact: one thread

JavaScript runs your code on **a single thread**. There is no parallel
execution of your code, ever. Not on the server, not in the browser.

That sounds crippling — a database query takes 5ms, so is everything
blocked? No, because of how waiting works. When you start an I/O operation
(a SQL query, an HTTP request, a timer), it's handed off to the
runtime, which does it outside your thread. Your thread is then **free to
run other work**. When the I/O finishes, its continuation is queued, and
the thread picks it up once it's idle.

This loop — run available work, wait, run the next queued continuation — is
the **event loop**.

The practical rule that falls out of it:

> **Never do slow synchronous work.** A long `for` loop or a synchronous
> file read blocks the *entire server* — every user, every request. All
> slow things must be async.

### Promises

A `Promise<T>` is an object representing a value that isn't ready yet. It's
in one of three states: pending, fulfilled (with a value), or rejected
(with an error).

```ts
const p: Promise<Workout> = getWorkout(id);   // starts immediately, not done yet
```

Important: a promise starts running the moment it's created. It is not lazy.

You consume it with `await`, which pauses the enclosing function until the
promise settles and gives you the value:

```ts
async function load() {
  const workout = await getWorkout(id);   // pause here, resume with the value
  console.log(workout.name);
}
```

Rules:
- `await` is only legal inside a function marked `async`.
- An `async` function **always** returns a promise, even if you return a
  plain value. `async function f(): Promise<number> { return 1; }`
- Errors from an awaited promise are thrown, so ordinary `try/catch` works.

### Running things concurrently

Sequential awaits wait one after another:

```ts
const stats  = await getDashboardStats(userId);  // 5ms
const recent = await getWorkoutSummaries(userId); // 5ms  → 10ms total
```

`Promise.all` starts them all, then waits for the slowest:

```ts
const [stats, recent, records, unit] = await Promise.all([
  getDashboardStats(userId),
  getWorkoutSummaries(userId, 5),
  getPersonalRecords(userId, 3),
  getWeightUnit(userId),
]);                                               // → ~5ms total
```

The dashboard ([src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx))
does exactly this. If one rejects, the whole thing rejects.

> **Coming from C#:** `Promise<T>` ≈ `Task<T>`, `await` ≈ `await`,
> `Promise.all` ≈ `Task.WhenAll`. The differences that matter: a Promise is
> **hot** (already running) whereas a `Task` from an async method is too,
> but `Task.Run` gives you real thread-pool parallelism — JavaScript has no
> equivalent for your own code. There's no `ConfigureAwait`, no
> `SynchronizationContext`, and no `.Result` to deadlock on. There's also
> no `CancellationToken` built into promises; cancellation is done with a
> separate `AbortController` object (you'll see one in the exercise
> picker's search).

---

## Part 4 — The type system

Now the TypeScript-specific half.

### Annotations go after the name

```ts
const nums: number[] = [1, 2, 3];
function add(a: number, b: number): number { return a + b; }
let unit: WeightUnit = "lbs";
```

The primitive types are `string`, `number`, `boolean`, `null`,
`undefined`. Note there is only **one** number type — a 64-bit float.
No `int`, no `decimal`. Every integer in this app is a float that happens
to be whole, which is why you see `Math.round(...)` around computed
volumes.

### Inference — usually you write no types at all

TypeScript infers types from what you assign:

```ts
const name = "Riley";      // inferred: string
const count = 0;           // inferred: number
const rows = await getWorkoutSummaries(id);  // inferred: WorkoutSummary[]
```

Annotate function **parameters** and **return types** (they're the
contract); let everything else be inferred. Hover any variable in VS Code
to see what was inferred — that's the fastest way to check your
understanding of a file.

### `interface` — the shape of an object

Open [src/types/index.ts](../src/types/index.ts):

```ts
export interface WorkoutSummary {
  id: string;
  name: string;
  date: string;
  notes: string | null;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
}
```

Now the crucial difference from C#: **TypeScript typing is structural, not
nominal.**

In a nominal system, a type is identified by its *name* — a class is a
`WorkoutSummary` only if it was declared to be one. In a structural system,
a type is identified by its *shape* — any object with those seven
properties **is** a `WorkoutSummary`, regardless of where it came from or
what it was called.

```ts
// This is a valid WorkoutSummary. No class, no constructor, no interface
// implementation clause. It matches the shape, so it qualifies.
const w: WorkoutSummary = {
  id: "1", name: "Push", date: "2026-07-05", notes: null,
  exerciseCount: 3, setCount: 9, totalVolume: 5000,
};
```

This is why [queries.ts](../src/lib/queries.ts) can build plain objects out
of SQL rows and return them as typed results — no mapping layer, no
`new WorkoutSummary(...)`, no AutoMapper.

`interface` vs `type`: for object shapes they're nearly interchangeable.
The convention in this project is `interface` for object shapes, `type` for
unions and aliases.

> **Coming from C#:** an interface here is closer to a **record's shape**
> than to a C# `interface`. There's no `: IWorkoutSummary` declaration and
> no implements relationship — conformance is checked structurally at every
> assignment. If C# worked this way, any class with matching properties
> would satisfy an interface automatically.

### Union types — a value that can be one of several types

C# has no direct equivalent, so read this one carefully.

```ts
string | null           // either a string or null
number | undefined      // either a number or undefined
"lbs" | "kg"            // either the literal string "lbs" or "kg"
```

A union of **string literals** is the most useful form, and this app uses
it for units ([src/lib/units.ts](../src/lib/units.ts)):

```ts
export type WeightUnit = "lbs" | "kg";
```

That declares a type whose only legal values are those two exact strings.
Assign anything else and it's a compile error. It behaves like an enum,
except the values *are* plain strings — no `.ToString()`, no parsing, no
casting. It serialises to JSON as `"lbs"` and comes back as `"lbs"`.

**Narrowing** is how you work with a union: the compiler tracks what checks
you've done and shrinks the type accordingly.

```ts
function describe(notes: string | null) {
  // here notes is: string | null
  if (notes === null) return "none";
  // here notes is: string  — the compiler removed null
  return notes.trim();     // .trim() is safe now
}
```

This is the same machinery as null-checking; unions just generalise it.

### Null safety and `strict` mode

`tsconfig.json` sets `"strict": true`, so `null` and `undefined` are not
assignable to other types unless you say so:

```ts
let a: string = null;         // error
let b: string | null = null;  // fine
```

The escape hatch is `!` (non-null assertion): `user!.name` means "I promise
this isn't null." It generates no check. Same danger as C#'s `!`.

> **Coming from C#:** this is `<Nullable>enable</Nullable>`. `string | null`
> ≈ `string?`, `?.` ≈ `?.`, `??` ≈ `??`, `!` ≈ `!`. The genuinely new
> concept is unions of non-null types (`"lbs" | "kg"`), which C# cannot
> express.

### Generics

Same idea as C#, same angle brackets:

```ts
Promise<WorkoutSummary[]>       // a promise of an array of summaries
useState<LoggerExercise[]>([])  // state holding an array of exercises
Map<number, Workout[]>          // a dictionary
```

You'll mostly *consume* generics in this app rather than write them.

### Type-only imports

```ts
import { db } from "@/lib/db";            // a real value, exists at runtime
import type { Exercise } from "@/types";  // a type, erased at compile time
```

The `import type` form makes it explicit that nothing is being pulled into
the bundle. Worth using for types; harmless to forget.

---

## Part 5 — Array methods (the LINQ equivalents)

JavaScript arrays have built-in methods that mirror LINQ closely. These
appear on nearly every page of this app.

```ts
const names   = exercises.map((e) => e.name);            // transform each
const heavy   = sets.filter((s) => s.weight > 100);      // keep matching
const first   = list.find((w) => w.id === id);           // first match or undefined
const total   = sets.reduce((sum, s) => sum + s.reps, 0); // fold to one value
const any     = sets.some((s) => s.done);                // is any true?
const all     = sets.every((s) => s.done);               // are all true?
const flat    = exercises.flatMap((e) => e.sets);        // map then flatten
const sorted  = [...list].sort((a, b) => a.weight - b.weight); // ascending
const joined  = parts.join(", ");                        // array → string
```

| LINQ | JavaScript |
|---|---|
| `.Select(x => …)` | `.map(x => …)` |
| `.Where(x => …)` | `.filter(x => …)` |
| `.FirstOrDefault(…)` | `.find(…)` |
| `.Any(…)` / `.All(…)` | `.some(…)` / `.every(…)` |
| `.Aggregate(…)` | `.reduce(…)` |
| `.SelectMany(…)` | `.flatMap(…)` |
| `.OrderBy(x => x.W)` | `.sort((a,b) => a.w - b.w)` |
| `string.Join(", ", xs)` | `xs.join(", ")` |

Three differences that will bite you if you assume LINQ semantics:

1. **No deferred execution.** Every method runs immediately and returns a
   real array. There's no `IEnumerable` laziness, so chaining five methods
   means five full passes.
2. **`sort` mutates the original array** and returns it. That's a problem
   in React (module 8), which is why you'll see `[...list].sort(...)` —
   copy first, then sort.
3. **`sort` takes a comparator, not a key selector.** `(a, b) => a.w - b.w`
   returns negative/zero/positive. With no comparator it sorts as *strings*
   — so `[10, 9, 100].sort()` gives `[10, 100, 9]`.

Real example from [src/lib/exercise-library.ts](../src/lib/exercise-library.ts):

```ts
const scored = results
  .map((e) => ({ exercise: e, score: scoreMatch(e, term) }))
  .filter((x) => x.score > 0)
  .sort((a, b) => b.score - a.score);
```

---

## Part 6 — Modules: `import` / `export`

Every file is a module with its own scope. Nothing is global. You publish
with `export` and consume with `import`.

```ts
// src/lib/units.ts
export type WeightUnit = "lbs" | "kg";           // named export
export function toDisplayWeight(...) { ... }      // named export

// src/components/exercise-card.tsx
export default function ExerciseCard(...) { ... } // DEFAULT export
```

```ts
import { toDisplayWeight, type WeightUnit } from "@/lib/units"; // named: braces
import ExerciseCard from "@/components/exercise-card";          // default: no braces
```

A file may have **one** default export and any number of named ones. Next.js
requires pages and layouts to use a **default** export — that's the
convention it looks for. Components elsewhere follow the same style here.

The `@/` prefix maps to `src/`, configured in `tsconfig.json`.

> **Coming from C#:** roughly `using`, but per-file rather than per-
> namespace, and you name exactly what you're importing. There's no
> namespace hierarchy — the file path *is* the namespace.

---

## Try it

1. **Watch inference work.** Open
   [src/app/records/page.tsx](../src/app/records/page.tsx) and hover over
   `records`. Read the type you never wrote. Now hover over the function
   that produced it.

2. **Feel the erasure boundary.** In
   [src/types/index.ts](../src/types/index.ts), add `difficulty: number` to
   `WorkoutSummary`. Then check [queries.ts](../src/lib/queries.ts) and the
   dashboard — why does *nothing* error, even though no SQL query returns a
   `difficulty`? (Answer: `getWorkoutSummaries` builds its objects with a
   `...r` spread over untyped SQL rows. TypeScript cannot see inside a
   database, so it takes your word for it. This is precisely the "types are
   promises, not checks" boundary.) Remove it afterwards.

3. **Propagate a union.** In [src/lib/units.ts](../src/lib/units.ts) change
   `WeightUnit` to `"lbs" | "kg" | "stone"`. Save, then read the compiler
   errors — exactly one place must change (`isWeightUnit`), because
   everywhere else only *reads* the value. That asymmetry is what makes
   union types pleasant. Undo it.

4. **Trip over truthiness.** In the browser console:
   ```js
   [0, "", null, undefined, NaN, false].filter(Boolean)   // → []
   [10, 9, 100].sort()                                    // → [10, 100, 9]
   ```
   Both results should now be unsurprising. If either is, re-read Part 2.

5. **Prove promises are hot.** In the console:
   ```js
   const p = new Promise(r => { console.log("running!"); r(1); });
   ```
   "running!" prints immediately — before any `await`. Creating the promise
   started the work.

---

## Checkpoint

- Why does `as WorkoutInput` provide no safety at runtime?
- What's the difference between `??` and `||`, and when does it matter here?
- Why does `[...list].sort()` appear instead of `list.sort()`?
- What makes `WorkoutSummary` satisfied by a plain `{ ... }` literal?
- Why must slow work on the server be async?

**Next:** [Module 3 — React components & JSX →](03-react-components.md)
