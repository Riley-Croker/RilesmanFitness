# Module 3 — React Components & JSX

**Goal:** understand what a component is, how JSX works, how data flows
via props, and the server/client component split in practice.

## A component is a function that returns UI

The closest .NET concept is a **Blazor component** or a Razor partial
view, but simpler: a React component is literally just a function.

Open [src/components/exercise-card.tsx](../src/components/exercise-card.tsx):

```tsx
export default function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link href={`/exercises/${exercise.exerciseId}`} className="...">
      ...
      <h3>{exercise.name}</h3>
    </Link>
  );
}
```

- The function takes one argument: the **props** object (think: method
  parameters / TagHelper attributes). Here it's destructured inline:
  `{ exercise }` pulls the `exercise` property out.
- It returns **JSX** — the HTML-looking syntax. JSX is not a template
  language like Razor; it compiles to function calls, so **everything
  inside `{ }` is real TypeScript**, not a special expression syntax.

## JSX vs Razor

| Razor | JSX |
|---|---|
| `@Model.Name` | `{exercise.name}` |
| `@if (x) { <p>yes</p> }` | `{x && <p>yes</p>}` or `{x ? <p>yes</p> : <p>no</p>}` |
| `@foreach (var w in list) { ... }` | `{list.map((w) => ( ... ))}` |
| `class="btn"` | `className="btn"` (class is a JS keyword) |
| `<partial name="Nav" />` | `<Nav userName={...} />` |

Two rules that trip up newcomers:

1. **JSX is an expression.** You can assign it to variables, return it
   from ternaries, put it in arrays. See
   [src/app/exercises/[id]/page.tsx](../src/app/exercises/[id]/page.tsx)
   where `const chip = (label) => (<span>...</span>)` builds little badge
   elements from a helper function.
2. **Lists need a `key`.** `{workouts.map((w) => <li key={w.id}>...)}` —
   the key lets React track which item is which between re-renders. The
   compiler warns if you forget.

## Conditional rendering in the wild

From [src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx):

```tsx
{recent.length === 0 ? (
  <p>No workouts yet. ...</p>       // empty state
) : (
  <ul>
    {recent.map((w) => ( ... ))}    // the list
  </ul>
)}
```

This ternary-for-branching, `map`-for-loops pattern is 90% of the JSX
you'll ever write.

## Props flow down

Data flows **one way**: parent passes props to child. The root layout
fetches the session and unit, then hands them to the nav:

```tsx
// src/app/layout.tsx (server — can query the DB)
const weightUnit = session?.user?.id ? await getWeightUnit(session.user.id) : "lbs";
<Nav userName={session?.user?.name ?? null} weightUnit={weightUnit} />
```

```tsx
// src/components/nav.tsx (client — receives plain data)
export default function Nav({ userName, weightUnit = "lbs" }: { ... })
```

Note `weightUnit = "lbs"` — a default value, like a C# optional parameter.

There is no two-way binding like Blazor's `@bind`. When a child needs to
tell a parent something, the parent passes a **callback function as a
prop** — see how
[workout-logger.tsx](../src/components/workout-logger.tsx) gives the
picker an `onPick` function:

```tsx
<ExercisePicker onPick={addExercise} onClose={() => setPickerOpen(false)} />
```

The picker calls `onPick(exercise)` when you choose one; the logger
receives it and updates its own state. Functions-as-values is the glue —
this is just passing an `Action<Exercise>` in C# terms.

## Server vs client components — the practical rules

The default is server. Add `"use client"` as the file's first line only
when you need:

- state (`useState`) or effects (`useEffect`)
- event handlers (`onClick`, `onChange`)
- browser APIs (`window`, `setInterval`, …)

**Where this project draws the line, and why:**

| Component | Kind | Reason |
|---|---|---|
| [dashboard/page.tsx](../src/app/dashboard/page.tsx) | Server | Needs SQL, no interactivity |
| [exercise-card.tsx](../src/components/exercise-card.tsx) | Server | Pure display |
| [nav.tsx](../src/components/nav.tsx) | Client | Hamburger toggle, unit toggle |
| [exercise-image.tsx](../src/components/exercise-image.tsx) | Client | `setInterval` for the 2-frame animation, `onError` fallback |
| [workout-logger.tsx](../src/components/workout-logger.tsx) | Client | The whole form is state |

A server component can render client components (layout renders Nav), but
a client component **cannot render a server component** — once you cross
into the browser, you stay there. That's why pages fetch data first, then
pass it *down* into client components.

## Try it

1. **Build a component.** Create `src/components/streak-badge.tsx`:

   ```tsx
   export default function StreakBadge({ count }: { count: number }) {
     if (count === 0) return null;   // returning null renders nothing
     return (
       <span className="rounded-full bg-lime-400/10 px-3 py-1 text-sm text-lime-400">
         🔥 {count} workout{count === 1 ? "" : "s"} this week
       </span>
     );
   }
   ```

   Then in [dashboard/page.tsx](../src/app/dashboard/page.tsx), import it
   and render `<StreakBadge count={stats.workoutsThisWeek} />` under the
   `<h1>`. Refresh the dashboard.
2. **Prove the one-way flow.** In your badge, try to modify `count`
   (`count = 5`). TypeScript stops you — props are read-only.
3. **Prove the server/client wall.** Add `"use client"` to the top of
   `streak-badge.tsx` — still works (it's allowed, just unnecessary). Now
   instead add `onClick={() => alert("hi")}` to the span *without*
   `"use client"` — read the error carefully; you'll see it again in real
   life.

**Next:** [Module 4 — Routing, pages & layouts →](04-routing-pages-layouts.md)
