# Module 8 — Client Interactivity: useState, useEffect & the Logger

**Goal:** understand React state — the thing that makes UI interactive —
by dissecting the most complex component in the app, the workout logger.

## The core idea: UI = f(state)

In WinForms/WPF you mutate controls (`label.Text = "3"`). In React you
never touch the DOM. You hold **state**, and when state changes, React
re-runs your component function and updates the DOM to match:

```
state changes → component function re-runs → new JSX → React diffs → DOM updates
```

## useState — a variable that triggers re-render

From [src/components/delete-button.tsx](../src/components/delete-button.tsx)
(the simplest example — read this file first, it's ~70 lines):

```tsx
const [confirming, setConfirming] = useState(false);
```

- `confirming` — current value (read-only!)
- `setConfirming(true)` — updates it **and schedules a re-render**
- `useState(false)` — the initial value

The component renders one of two UIs based on that boolean — the
"Delete" button, or the "Sure? / Yes / Cancel" row. No DOM manipulation;
just: change state, return different JSX.

Why not `let confirming = false`? Because plain variables are reset every
re-render and don't tell React anything changed. `useState` persists the
value between renders — that's its whole job.

## The logger — state shaped like your data

[src/components/workout-logger.tsx](../src/components/workout-logger.tsx)
holds the entire form as state:

```tsx
const [name, setName] = useState(initialName);
const [date, setDate] = useState(today());
const [exercises, setExercises] = useState<LoggerExercise[]>(initialExercises);
const [pickerOpen, setPickerOpen] = useState(false);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
```

The exercises array is the interesting one — nested data (exercises →
sets). **React requires immutable updates**: you don't push into the
array, you build a new one. Study `updateSet`:

```tsx
setExercises((prev) =>
  prev.map((ex, i) =>
    i !== exIdx
      ? ex                                             // untouched rows: same object
      : { ...ex, sets: ex.sets.map((s, j) =>           // target row: copy...
          j !== setIdx ? s : { ...s, [field]: value }  // ...with one set replaced
        ) }
  )
);
```

C# translation: think records + `with` expressions instead of mutating —
`prev.Select((ex, i) => i != exIdx ? ex : ex with { Sets = ... })`. The
`(prev) => ...` form receives the latest state — use it whenever the new
state derives from the old.

Why immutability? React decides what to re-render by comparing object
references. Mutate in place and nothing looks changed, so nothing
redraws. This trips up every newcomer once; let it be a cheap lesson.

## Controlled inputs — two-way binding, manually

```tsx
<input
  value={name}                              // state → input
  onChange={(e) => setName(e.target.value)} // input → state
/>
```

That pair is Blazor's `@bind` written out by hand. Every keystroke:
onChange fires → state updates → re-render → input shows new value. The
input never owns its text; state does. (Look at `SetRow` in the logger —
same pattern with numbers.)

## useEffect — code that runs *because* something changed

Rule of thumb: event handlers respond to *the user*; `useEffect` responds
to *state/time/the outside world*. Two clean examples in this app:

**The two-frame photo animation**
([exercise-image.tsx](../src/components/exercise-image.tsx)):

```tsx
useEffect(() => {
  if (!animate || failed || images.length < 2) return;
  const timer = setInterval(() => setFrame((f) => (f + 1) % images.length), 1200);
  return () => clearInterval(timer);   // cleanup — like Dispose()
}, [animate, failed, images.length]);  // dependency list — re-run when these change
```

The returned function is the cleanup — React calls it before re-running
the effect or unmounting, exactly an `IDisposable` contract. Forget it and
you leak a timer per mount.

**Debounced search**
([exercise-picker.tsx](../src/components/exercise-picker.tsx)): the effect
depends on `[search, bodyPart]`; each keystroke re-runs it, which starts a
300 ms timer and cancels the previous one (cleanup!) — so the API is only
called when you pause typing. It also uses `AbortController` to cancel
in-flight fetches — `CancellationToken` in .NET clothes.

## The save flow, end to end

Trace `save()` in the logger and connect all the modules:

1. Client-side validation → `setError("...")` renders the red box
2. `setSaving(true)` → button disables and shows "Saving…"
3. Weights converted to lbs ([units.ts](../src/lib/units.ts), module 2's
   union type at work)
4. `fetch("/api/workouts", { method: "POST", ... })` → module 6's endpoint
5. Server validates, INSERTs workout → exercises → sets (module 5)
6. Response `{ id }` → `router.push(`/workouts/${id}`)` → module 4 routing

## Try it

1. **Feel a re-render.** In the logger component body add
   `console.log("render", exercises.length);` and watch the browser
   console as you type and add sets. Every state change = one log line =
   one re-render. This is the loop that makes React tick.
2. **Break immutability on purpose.** In `addSet`, replace the immutable
   update with a mutation: `ex.sets.push({...}); return prev;` (and
   `setExercises(prev)`). Click "+ Add set" — the UI won't update even
   though the data changed. Now you know the symptom for life. Undo.
3. **Build with state.** Add a "total volume" live counter to the logger:
   compute `exercises.flatMap(e => e.sets).reduce((sum, s) => sum + s.reps * (s.weight || 0), 0)`
   directly in the component body (derived state needs no useState!) and
   render it near the save button. Note it updates as you type — because
   every keystroke re-renders and re-computes.
4. **Change the animation speed** in exercise-image.tsx from 1200 ms to
   400 ms and watch the library page get twitchy. Restore taste.

**Next:** [Module 9 — Server actions & forms →](09-server-actions-and-forms.md)
