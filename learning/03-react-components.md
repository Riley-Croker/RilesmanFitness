# Module 3 — React Components & JSX

**Goal:** understand what a component really is, what JSX compiles into,
how data moves between components, and why React insists on `key` props.

---

## Part 1 — A component is a function that returns a description

That's the entire definition. A React component is a JavaScript function
that takes one argument (an object of inputs) and returns a description of
what should appear on screen.

Open [src/components/exercise-card.tsx](../src/components/exercise-card.tsx):

```tsx
export default function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link href={`/exercises/${exercise.exerciseId}`} className="…">
      <h3>{exercise.name}</h3>
    </Link>
  );
}
```

Three rules that make a function a valid component:

1. **Its name starts with a capital letter.** This is not style — it's how
   JSX decides whether `<Foo />` means "your component" or "an HTML tag".
   Lowercase is reserved for real HTML elements.
2. **It takes at most one argument**, the props object.
3. **It returns JSX** (or `null` to render nothing).

There's no base class, no interface to implement, no lifecycle to override.
A component that meets those three rules *is* a component.

### What "returns a description" means

The function does **not** create HTML, and does not touch the page. It
returns a plain JavaScript object tree describing the intended output.
React receives that object, compares it to what's currently on screen, and
performs the real DOM operations itself.

This indirection is the whole design. Because your function only produces a
description, React is free to run it whenever it likes, throw the result
away, run it on a server instead of a browser, or run it and apply only the
three attribute changes that actually differ.

> **Coming from C#:** the closest things are a Blazor component or a Razor
> partial, but simpler — those are classes with lifecycle methods and state
> built in. A React component is *only* a function. State is added
> separately by calling a hook (module 8), and a component with no state is
> literally just a function that formats data.

---

## Part 2 — JSX: what it is and what it becomes

JSX is the HTML-looking syntax inside the function. It is **not** a
template language, and this distinction explains all of its rules.

JSX is a syntax extension that compiles to plain function calls:

```tsx
// What you write:
<h3 className="title">{exercise.name}</h3>

// What it compiles to (roughly):
React.createElement("h3", { className: "title" }, exercise.name)

// Which evaluates to a plain object:
{ type: "h3", props: { className: "title", children: "Barbell Bench Press" } }
```

That's it. JSX is a nicer way of writing nested object literals. Everything
below follows from that fact.

### Consequence 1: JSX is an expression

Because a JSX block evaluates to a value, you can do anything with it that
you can do with a value — assign it to a variable, return it from a
ternary, put it in an array, pass it to a function:

```tsx
const badge = <span className="chip">PR</span>;    // a variable
const chip = (label: string) => <span>{label}</span>;  // returned from a helper
const items = [<li key="a">A</li>, <li key="b">B</li>]; // in an array
```

`src/app/exercises/[id]/page.tsx` uses the helper-function form to build
its little label chips.

### Consequence 2: `{ }` contains real TypeScript

Curly braces don't introduce a special template syntax. They mean "evaluate
this expression and put the result here." Any expression works:

```tsx
{exercise.name}
{count + 1}
{items.length > 0 ? "Has items" : "Empty"}
{formatDate(new Date())}
{sets.reduce((t, s) => t + s.reps, 0)}
```

But only **expressions** — things that produce a value. Statements are not
allowed, which is why you never see `if` or `for` inside JSX:

```tsx
{if (x) { … }}        // ✗ not an expression
{for (…) { … }}       // ✗ not an expression
```

That constraint is what forces the two idioms in Part 3.

### Consequence 3: the attribute names are JavaScript, not HTML

Since attributes become object properties, they use JavaScript naming:

| HTML | JSX | Why |
|---|---|---|
| `class="btn"` | `className="btn"` | `class` is a reserved word |
| `for="email"` | `htmlFor="email"` | `for` is a reserved word |
| `onclick="…"` | `onClick={fn}` | camelCase; takes a *function*, not a string |
| `style="color:red"` | `style={{ color: "red" }}` | an object, not a string |

Note `onClick={handleSave}` passes the function itself. Writing
`onClick={handleSave()}` **calls** it during render and passes the result —
a very common early mistake. When you need arguments, wrap it:
`onClick={() => remove(i)}`.

### Consequence 4: one root element per return

A function returns one value, so JSX must have a single root. When you
don't want a wrapper `<div>`, use an empty **fragment**:

```tsx
return (
  <>
    <h1>Title</h1>
    <p>Body</p>
  </>
);
```

### Consequence 5: values that render as nothing

`null`, `undefined`, `false`, and `true` all render nothing. That's what
makes the `&&` trick in Part 3 work, and why `if (count === 0) return null;`
is the idiomatic "render nothing" escape.

Careful: `0` is a number and **does** render, visibly, as "0". This is the
classic React bug — `{items.length && <List/>}` prints a bare `0` when the
list is empty. Use a ternary or an explicit comparison.

> **Coming from C#:** Razor is a template language — `@` switches between
> markup mode and code mode, and the compiler generates write-to-output
> statements. JSX never switches modes because it isn't markup; it's an
> expression that builds an object. That's why Razor can host an `if`
> statement and JSX can't.
>
> | Razor | JSX |
> |---|---|
> | `@Model.Name` | `{exercise.name}` |
> | `@if (x) { <p>yes</p> }` | `{x && <p>yes</p>}` |
> | `@foreach (var w in list) { … }` | `{list.map((w) => …)}` |
> | `<partial name="Nav" />` | `<Nav userName={name} />` |

---

## Part 3 — The two idioms that replace `if` and `foreach`

Since JSX only holds expressions, branching and looping are done with
expressions. There are exactly two patterns and they cover ~90% of all JSX
you'll write.

### Branching: ternary and `&&`

```tsx
{/* either/or */}
{recent.length === 0 ? (
  <p>No workouts yet.</p>
) : (
  <ul>…</ul>
)}

{/* show something, or nothing */}
{error && <p className="text-red-400">{error}</p>}
```

The `&&` form works because JavaScript's `&&` returns the *right* operand
when the left is truthy, and the left one otherwise. So if `error` is
`null`, the expression is `null`, which renders nothing. (And per Part 2,
if the left side is `0`, you get a visible zero — use `length > 0 && …`.)

Real example, [src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx):

```tsx
{recent.length === 0 ? (
  <p>No workouts yet. …</p>
) : (
  <ul>{recent.map((w) => ( … ))}</ul>
)}
```

### Looping: `.map()`

`.map()` transforms an array of data into an array of JSX elements, and
React renders an array by rendering each item:

```tsx
{exercise.bodyParts.slice(0, 2).map((bp) => (
  <span key={bp} className="chip">{bp}</span>
))}
```

Note the arrow function returns the JSX via the parenthesised form (no
`return` needed). If you use braces, you must `return` explicitly.

---

## Part 4 — `key`: why React nags about it

Every element produced by `.map()` needs a `key` prop. This is not
bureaucracy — it's information React genuinely cannot derive.

Remember reconciliation from module 1: React compares the new description
to the previous one and applies the differences. For a list, that means
answering "is this the same item as before, or a different one?"

Without keys, React can only compare **by position**. Insert an item at the
top of a 5-item list and React sees: position 0 changed, position 1
changed, … — it will rewrite all five rows. Worse, if those rows contain
state (a half-typed input, a focused field, an open dropdown), the state
stays glued to the *position* and now belongs to the wrong item. That is
the bug: you insert a set at the top of the logger and the weight you typed
appears on the wrong row.

A `key` gives each item a stable identity, so React can match old to new by
identity and conclude "these four are the same, one was inserted."

Rules for keys:

- Must be **unique among siblings** (not globally).
- Must be **stable across renders** — the same item gets the same key every
  time.
- Use a real id when you have one: `key={w.id}`.
- A value that's naturally unique works too: `key={bp}` for a body-part
  name in the card above.
- **Avoid the array index** when the list can reorder, insert, or delete —
  the index is exactly the positional identity that causes the bug. It's
  acceptable only for a list that never changes order.

---

## Part 5 — Props: how data moves

**Props** ("properties") are the inputs to a component. The parent supplies
them as JSX attributes; the child receives them as a single object.

```tsx
// Parent passes them
<Nav userName="Riley" weightUnit="lbs" />

// Child receives one object: { userName: "Riley", weightUnit: "lbs" }
function Nav(props) { … }

// …but is almost always written destructured (module 2):
function Nav({ userName, weightUnit = "lbs" }) { … }
```

That `= "lbs"` is a default value, used when the prop isn't passed.

Anything can be a prop — strings, numbers, objects, arrays, and functions.
Non-string values need braces: `count={3}`, `exercise={ex}`,
`onPick={addExercise}`.

### Props are read-only, and data flows one way

A component may never modify its props. TypeScript enforces this, but the
deeper reason is the model: props are the *inputs* that a parent decided
on. If a child could change them, the parent's render output would no
longer describe the truth, and React's whole "re-run the function to get
the current picture" premise breaks.

So data flows strictly **downward**: parent → child → grandchild. This app
does it at the top level in [src/app/layout.tsx](../src/app/layout.tsx):

```tsx
// Server component — allowed to hit the database
const weightUnit = session?.user?.id ? await getWeightUnit(session.user.id) : "lbs";
return <Nav userName={session?.user?.name ?? null} weightUnit={weightUnit} />;
```

```tsx
// Client component — just receives plain data, no idea a DB exists
export default function Nav({ userName, weightUnit = "lbs" }: { … }) { … }
```

### Sending information back up: callback props

If data only flows down, how does a child tell its parent something
happened? The parent passes a **function** down, and the child calls it.
The call runs in the parent's scope, so the parent updates its own state.

From [src/components/workout-logger.tsx](../src/components/workout-logger.tsx):

```tsx
<ExercisePicker
  onPick={addExercise}                      // parent's function, handed down
  onClose={() => setPickerOpen(false)}
/>
```

The picker doesn't know what `onPick` does. It just calls
`onPick(exercise)` when the user chooses one. The logger's `addExercise`
runs and appends to the logger's own state.

```
    Logger  ──── onPick={addExercise} ────►  Picker     (props go down)
    Logger  ◄─── onPick(exercise) ─────────  Picker     (events go up)
```

This "data down, events up" shape is the fundamental wiring pattern of
every React app. Once you see it, most component trees become readable.

> **Coming from C#:** there is no two-way binding here. Blazor's `@bind`
> and WPF's `Mode=TwoWay` have no equivalent — you always write both halves
> explicitly (module 8's controlled inputs). A callback prop is passing an
> `Action<Exercise>` to a child, or subscribing the parent to a child's
> event; React just uses a plain function property rather than an event
> declaration.

### `children` — the special prop

Whatever you put between a component's open and close tags arrives as a
prop named `children`:

```tsx
<Card>
  <h1>Hello</h1>     ← this becomes Card's `children`
</Card>

function Card({ children }) {
  return <div className="card">{children}</div>;
}
```

This is how layouts work (module 4) — a layout receives the page as
`children` and decides where to render it.

---

## Part 6 — Server and client components in practice

Module 1 covered the concept. Here's how to actually make the call.

**Default to a server component.** Add `"use client"` to the top of the
file only when the component needs one of:

- state that changes over time (`useState`)
- side effects tied to the component's life (`useEffect`)
- event handlers (`onClick`, `onChange`, `onSubmit`)
- browser-only APIs (`window`, `localStorage`, `setInterval`)
- a client-only hook (`usePathname`, `useRouter`)

Where this project draws the line, and why:

| Component | Kind | Reason |
|---|---|---|
| [dashboard/page.tsx](../src/app/dashboard/page.tsx) | Server | Runs SQL; nothing interactive |
| [exercise-card.tsx](../src/components/exercise-card.tsx) | Server | Pure display — data in, markup out |
| [nav.tsx](../src/components/nav.tsx) | Client | Hamburger menu, unit toggle, active-link highlighting |
| [exercise-image.tsx](../src/components/exercise-image.tsx) | Client | `setInterval` frame animation + `onError` fallback |
| [workout-logger.tsx](../src/components/workout-logger.tsx) | Client | The entire form is state |
| [delete-button.tsx](../src/components/delete-button.tsx) | Client | Two-step confirm needs state |

Two mechanical rules worth memorising:

1. **`"use client"` is inherited.** Marking a file makes every component it
   imports part of the client bundle too. So it marks a *boundary*, not
   just a file — push it as far down the tree as you can.
2. **A client component can't render a server component** as a child it
   imports. It *can* render server-rendered content passed to it via
   `children` — but that's an advanced pattern this app doesn't need.

That second rule is why every page in this app fetches its data at the top
and passes it down: once you cross into client territory, the database is
unreachable except over HTTP.

---

## Try it

1. **Write a component from scratch.** Create
   `src/components/streak-badge.tsx`:

   ```tsx
   export default function StreakBadge({ count }: { count: number }) {
     if (count === 0) return null;            // renders nothing
     return (
       <span className="rounded-full bg-lime-400/10 px-3 py-1 text-sm text-lime-400">
         🔥 {count} workout{count === 1 ? "" : "s"} this week
       </span>
     );
   }
   ```

   In [dashboard/page.tsx](../src/app/dashboard/page.tsx), import it and
   render `<StreakBadge count={stats.workoutsThisWeek} />` under the `<h1>`.
   Note: no registration, no config — importing it is all it takes.

2. **See the object behind the JSX.** In any client component, add
   `console.log(<span>hi</span>)` and look at the browser console. You'll
   see the plain object with `type` and `props`. JSX demystified.

3. **Prove props are read-only.** In your badge, try `count = 5;` before
   the return. TypeScript refuses.

4. **Cause the key bug on purpose.** In the workout logger, find the set
   rows' `key` and change it to `key={setIdx}` (the array index). Add three
   sets, type different weights in each, then delete the *first* set. Watch
   the values land on the wrong rows. Restore the original key. This is the
   most valuable 60 seconds in the module.

5. **Hit the server/client wall.** Add `onClick={() => alert("hi")}` to the
   `<span>` in `streak-badge.tsx` *without* adding `"use client"`. Read the
   error, then add the directive and watch it work.

---

## Checkpoint

- What does `<h3 className="x">{name}</h3>` compile into?
- Why can't you put an `if` statement inside JSX?
- What specifically goes wrong when a list's keys are array indexes?
- A child needs to tell its parent the user picked something. What's the
  mechanism?
- What does adding `"use client"` do to the files that component imports?

**Next:** [Module 4 — Routing, pages & layouts →](04-routing-pages-layouts.md)
