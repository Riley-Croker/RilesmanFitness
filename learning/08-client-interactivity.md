# Module 8 — Client Interactivity: State, Effects & the Logger

**Goal:** understand React's render cycle, what `useState` really does, why
immutability is non-negotiable, and when `useEffect` is the right tool —
then read the most complex component in the app with all of it in hand.

This is the densest module. Take it slowly; everything interactive in the
app is built from these four ideas.

---

## Part 1 — The render cycle

Module 3 established that a component is a function returning a description
of the UI. This module is about what makes that function run *again*.

The full loop:

```
   state changes
        │
        ▼
   React re-runs your component function
        │
        ▼
   you return a new description (new JSX)
        │
        ▼
   React diffs it against the previous description
        │
        ▼
   React applies only the differences to the real DOM
```

Some crucial implications, which surprise almost everyone:

- **Your component function runs many times** — every render, top to
  bottom, from scratch. It is not a constructor. Code in the function body
  executes on every single render.
- **Local variables do not survive.** `let count = 0` inside a component is
  re-created as `0` on every render. That's why state needs a special
  mechanism.
- **Rendering is not the same as updating the DOM.** React may run your
  function and conclude nothing changed, in which case the page doesn't
  move. Rendering is cheap; DOM mutation is what's expensive.
- **The re-run is the point.** You never write "update the label." You
  change data, and the new output describes a page where the label is
  different.

> **Coming from C#:** in WinForms/WPF you mutate controls
> (`label.Text = "3"`) and the control persists between events. React has
> no persistent control objects you own — the function that describes them
> re-runs and React reconciles. The closest familiar feeling is a Razor
> page re-rendering on postback, except it happens in-place, in
> milliseconds, without a round trip.

---

## Part 2 — `useState`

### What it is

`useState` gives a component a value that **survives re-renders** and
**triggers a re-render when changed**. Those are its two jobs, and normal
variables can do neither.

```tsx
const [confirming, setConfirming] = useState(false);
//     ↑ current value  ↑ updater      ↑ initial value
```

The array destructuring (module 2) is because `useState` returns a
two-element array: the current value and a function to change it. The names
are yours; `[x, setX]` is the universal convention.

The simplest real example is
[src/components/delete-button.tsx](../src/components/delete-button.tsx) —
read the whole file, it's about 60 lines. One boolean (`confirming`)
decides whether to show "Delete" or the "Sure? / Yes / Cancel" row, and a
second (`busy`) disables things mid-request. No DOM manipulation
anywhere; just a different return value.

### How it actually works

React keeps a list of state slots per component instance, in the order the
hooks were called. On first render it stores your initial value. On every
later render, `useState` returns whatever is currently in that slot,
ignoring the initial value entirely.

That ordering requirement is the reason for the **Rules of Hooks**:

- Call hooks only at the **top level** of a component — never inside `if`,
  loops, or nested functions.
- Call hooks only from components (or other hooks).

Break the ordering and React hands slot 2's value to the variable expecting
slot 3. The lint rules enforce this, and it's worth knowing *why* rather
than just obeying.

### Three behaviours that cause real bugs

**1. The state variable is read-only.**

```tsx
confirming = true;              // ✗ does nothing, React never notices
setConfirming(true);            // ✓
```

**2. Updates are asynchronous and batched.** Calling the setter does not
change the variable immediately — it *schedules* a re-render. Within the
current function run, the old value is still the old value:

```tsx
const [count, setCount] = useState(0);
function handleClick() {
  setCount(count + 1);
  console.log(count);      // still 0! the new value arrives next render
}
```

React batches multiple setter calls in one event into a single re-render,
which is why this classic doesn't work:

```tsx
setCount(count + 1);   // schedules: count = 0 + 1
setCount(count + 1);   // schedules: count = 0 + 1  ← same stale `count`
// result: 1, not 2
```

**3. The functional form fixes it.** Pass a function instead of a value and
React hands you the latest state:

```tsx
setCount((c) => c + 1);
setCount((c) => c + 1);   // result: 2
```

**Rule: whenever the new state derives from the old state, use the function
form.** Every state update in the workout logger does this — look at
`addSet`, `updateSet`, `removeSet` — because they all build the new array
from the previous one.

---

## Part 3 — Immutability, and why it isn't optional

This is the concept most likely to bite you, so here's the mechanism rather
than the rule.

### Why React can't detect mutation

When state changes, React needs to know whether to re-render. Deep-comparing
every object on every update would be far too slow, so React does the cheap
thing: it compares the **reference** — is this the same object in memory as
before?

```js
const a = { reps: 8 };
const b = a;
b.reps = 10;
a === b;              // true — same object. React sees NO change.

const c = { ...a, reps: 10 };
a === c;              // false — new object. React sees a change.
```

So if you mutate state in place, the reference is unchanged, React
concludes nothing happened, and **the screen doesn't update even though
your data did**. The data is right; the UI is stale. It's a maddening bug
if you don't know the cause, and completely obvious once you do.

### The immutable update patterns

```tsx
// Add to an array
setItems((prev) => [...prev, newItem]);

// Remove by index
setItems((prev) => prev.filter((_, i) => i !== idx));

// Update one item
setItems((prev) => prev.map((item, i) =>
  i === idx ? { ...item, reps: 10 } : item
));

// Update one field of an object
setUser((prev) => ({ ...prev, name: "New" }));
```

Note `.filter` and `.map` return new arrays (good), while `.push`,
`.splice`, `.sort`, and `.reverse` mutate in place (bad — copy first:
`[...list].sort(...)`).

### The nested case: the logger's `updateSet`

State shaped like `exercises[].sets[]` needs a new object at **every level
you touch**, because a shallow spread copies only one level deep:

```tsx
setExercises((prev) =>
  prev.map((ex, i) =>
    i !== exIdx
      ? ex                                              // untouched: reuse as-is
      : { ...ex,                                        // touched: new object
          sets: ex.sets.map((s, j) =>                   //   new array
            j !== setIdx ? s : { ...s, [field]: value } //   new set object
          ) }
  )
);
```

Read it as: *rebuild the path down to the changed value, and share
everything else.* Untouched exercises are the **same objects** as before —
that's deliberate, and it lets React skip re-rendering those subtrees
entirely. Immutability isn't wasteful; it's what makes the diffing cheap.

The `{ ...s, [field]: value }` uses a **computed property name** — the
square brackets mean "use the *value* of `field` as the key," so one
function can update either `reps` or `weight`.

> **Coming from C#:** this is exactly the discipline of records and `with`
> expressions: `ex with { Sets = … }` instead of `ex.Sets.Add(...)`. The
> difference is that C# gives you the choice, while React's change
> detection makes it a correctness requirement rather than a style
> preference.

---

## Part 4 — Derived state: the thing *not* to put in state

A very common beginner mistake is storing values that can be calculated:

```tsx
// ✗ Wrong — now there are two sources of truth to keep in sync
const [exercises, setExercises] = useState([]);
const [totalVolume, setTotalVolume] = useState(0);
// …and every single mutation must remember to recompute totalVolume
```

```tsx
// ✓ Right — compute during render
const totalVolume = exercises
  .flatMap((e) => e.sets)
  .reduce((sum, s) => sum + s.reps * (s.weight || 0), 0);
```

Since the function re-runs on every state change anyway, the derived value
is always current — for free, with no way to fall out of sync.

**Rule: state is for what the user changed. Everything computable from it
is computed during render.**

---

## Part 5 — Controlled inputs

An HTML `<input>` normally keeps its own text internally. React usually
takes that over, so state is the only truth:

```tsx
<input
  value={name}                                 // state → input
  onChange={(e) => setName(e.target.value)}    // input → state
/>
```

Every keystroke: `onChange` fires → `setName` → re-render → the input
receives the new `value`. The character you see was round-tripped through
React.

This feels redundant until you need to react to typing — validate,
uppercase, limit length, enable a button, filter a list. All of it becomes
trivial because the value lives somewhere you can read.

Two rules:

- If you set `value`, you **must** provide `onChange`, or the field appears
  frozen (React keeps resetting it to unchanged state).
- For a field that just needs an initial value and no logic, use
  `defaultValue` instead — that's the *uncontrolled* form, and it's what
  the exercises page's filter form uses (module 4).

> **Coming from C#:** this is Blazor's `@bind` written out by hand. React
> deliberately has no two-way binding — the explicit round trip is the
> point, since it keeps a single direction of data flow.

---

## Part 6 — `useEffect`

### What it's actually for

`useEffect` runs code **after** a render, to synchronise your component
with something outside React: a timer, a subscription, a network request,
the document title, a browser API.

```tsx
useEffect(() => {
  // the effect: runs after render
  return () => {
    // the cleanup: runs before the next effect, and on unmount
  };
}, [dependencies]);
```

### The dependency array controls everything

| Written as | Runs |
|---|---|
| `useEffect(fn)` | after **every** render (rarely correct) |
| `useEffect(fn, [])` | once, after the first render |
| `useEffect(fn, [a, b])` | after the first render, and any time `a` or `b` changed |

React compares dependencies by reference (`===`) against the previous
render's values. Which means an object or array literal in the dependency
list is a **new reference every render**, so the effect re-runs every time —
a classic infinite-loop source when the effect also sets state.

### Cleanup is not optional

The returned function is the cleanup, and React calls it before re-running
the effect *and* when the component is removed. Forget it and you leak.

From [src/components/exercise-image.tsx](../src/components/exercise-image.tsx):

```tsx
useEffect(() => {
  if (!animate || failed || images.length < 2) return;
  const timer = setInterval(() => setFrame((f) => (f + 1) % images.length), 1200);
  return () => clearInterval(timer);          // ← without this, every card
}, [animate, failed, images.length]);         //   leaks a timer forever
```

Navigate away from the exercise library without that cleanup and the timers
keep firing, on components that no longer exist, forever.

Note also `setFrame((f) => …)` — the functional form from Part 2, because
the new frame derives from the old one. Using `frame + 1` here would
capture a stale value from the render the effect was created in.

### The rule people get wrong

**Do not use `useEffect` to respond to user actions.** If something should
happen because the user clicked, put it in the click handler.

```tsx
// ✗ Wrong: an extra render, and confusing to read
useEffect(() => { if (submitted) save(); }, [submitted]);

// ✓ Right
<button onClick={save}>Save</button>
```

`useEffect` is for synchronising with the *outside world*, not for
sequencing your own logic. A useful test: *"is this reacting to the user,
or to something React doesn't control?"*

### The sophisticated example: debounced search

[src/components/exercise-picker.tsx](../src/components/exercise-picker.tsx)
combines everything above. The effect depends on `[search, bodyPart]`, so
every keystroke re-runs it. Each run:

1. Starts a 300 ms timer before fetching, so typing "bench" fires **one**
   request instead of five.
2. Returns a cleanup that clears that timer — which is what cancels the
   previous keystroke's pending request.
3. Uses an `AbortController` to cancel a request that already went out, so
   a slow response for "ben" can't arrive *after* the response for "bench"
   and overwrite it with stale results.

That last point is a real race condition, and the fix is the standard one.

> **Coming from C#:** the cleanup function is `IDisposable.Dispose()` — same
> contract, same consequences for forgetting it. `AbortController` is
> `CancellationTokenSource`, and passing `controller.signal` to `fetch` is
> passing a `CancellationToken`.

---

## Part 7 — Reading the workout logger

[src/components/workout-logger.tsx](../src/components/workout-logger.tsx)
is the app's most complex component. With Parts 1–6 in hand, it's readable.

Its state:

```tsx
const [name, setName]                 = useState(initialName);
const [date, setDate]                 = useState(today());
const [notes, setNotes]               = useState("");
const [exercises, setExercises]       = useState<LoggerExercise[]>(initialExercises);
const [pickerOpen, setPickerOpen]     = useState(false);
const [saving, setSaving]             = useState(false);
const [error, setError]               = useState<string | null>(null);
const [templateSaved, setTemplateSaved] = useState(false);
```

Notice the categories — this decomposition is the actual design work in any
React component:

- **Form data:** `name`, `date`, `notes`, `exercises`
- **UI state:** `pickerOpen` (is the modal open?)
- **Async state:** `saving`, `error` — the two flags every submit needs

The mutation functions (`addExercise`, `updateSet`, `addSet`, `removeSet`,
`removeExercise`) are all the same shape: functional updater, immutable
rebuild, no mutation.

`SetRow` at the bottom of the file is a child component that holds no state
at all — it receives values and callbacks as props (module 3's "data down,
events up") so all the truth stays in one place.

### The save flow, connecting every module

Trace `save()`:

1. **Validate on the client** → `setError("…")` renders the red box
   *(module 3: conditional rendering)*
2. `setSaving(true)` → the button disables and reads "Saving…"
   *(this module: async state)*
3. Weights converted to lbs via [units.ts](../src/lib/units.ts)
   *(module 2: the `WeightUnit` union type)*
4. `fetch("/api/workouts", { method: "POST", … })`, then `res.ok` checked
   *(module 6)*
5. Server validates, inserts workout → exercises → sets
   *(module 5)*
6. Response `{ id }` → `router.push('/workouts/' + id)`
   *(module 4: client-side navigation)*

Every module in the course meets in that one function.

---

## Try it

1. **Watch renders happen.** Add `console.log("render", exercises.length)`
   in the logger's function body (not in a handler). Open the browser
   console and type in a field. One log line per keystroke — that's one
   full re-run of the component per character. Internalise how normal that
   is.

2. **Cause the stale-closure bug.** In `addSet`, change the functional
   update to use the captured variable:
   ```tsx
   setExercises(exercises.map(...))   // instead of setExercises((prev) => ...)
   ```
   Then click "+ Add set" twice rapidly. Depending on timing, you lose an
   update. Restore it.

3. **Cause the mutation bug.** In `addSet`, mutate instead of copying:
   ```tsx
   setExercises((prev) => { prev[exIdx].sets.push({ reps: 0, weight: 0 }); return prev; });
   ```
   Click "+ Add set". Nothing appears — but add a `console.log(prev)` and
   you'll see the data *did* change. Same reference, so React saw nothing.
   This is the single most valuable bug in the module. Restore it.

4. **Add derived state.** Render a live total volume near the save button:
   ```tsx
   const totalVolume = exercises
     .flatMap((e) => e.sets)
     .reduce((sum, s) => sum + s.reps * (s.weight || 0), 0);
   ```
   It updates as you type, with no `useState` and no effect. That's Part 4
   working for you.

5. **Leak a timer on purpose.** In
   [exercise-image.tsx](../src/components/exercise-image.tsx), delete the
   `return () => clearInterval(timer);` line. Visit /exercises, navigate
   away, and watch the console/performance tab. Restore it, then change
   `1200` to `300` to see the animation get twitchy, then restore taste.

6. **Break the dependency array.** Add `console.log("effect ran")` inside
   the picker's search effect and remove `[search, bodyPart]` entirely.
   Open the picker and type — the effect now runs after every render,
   including the ones it caused. Restore it.

---

## Checkpoint

- Why doesn't `let count = 0` inside a component work as state?
- Why does `setCount(count + 1)` twice in a row only increment once?
- Explain, in terms of references, why mutating state leaves the UI stale.
- When should a value be in `useState`, and when should it be computed
  during render?
- What are the two things a `useEffect` dependency array controls?
- What does the cleanup function prevent in the image animation?

**Next:** [Module 9 — Server actions & forms →](09-server-actions-and-forms.md)
