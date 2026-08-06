# Module 10 — Styling with Tailwind CSS

**Goal:** read and write the `className` strings that style every element
in this app — and understand why the CSS looks nothing like the CSS you may
have seen before.

---

## Part 1 — What CSS does, and the problem Tailwind is solving

CSS applies visual rules to elements. Traditionally you write rules in a
stylesheet and attach them by class name:

```css
/* styles.css */
.workout-card { border-radius: 12px; padding: 16px; background: #18181b; }
```
```html
<div class="workout-card">…</div>
```

That's clean at small scale. At real scale it develops three chronic
problems:

**1. Naming.** Every element needs a class name invented for it.
`.card`, `.card-header`, `.card-header-title`, `.card-header-title--compact`.
Whole methodologies (BEM, SMACSS) exist purely to manage this, and none of
them make it enjoyable.

**2. The cascade and specificity.** CSS rules apply globally and fight each
other by an arcane scoring system. Change `.card` for one page and you've
changed it everywhere, including places you've forgotten. The universal
symptom is a rule that mysteriously doesn't apply, "fixed" with `!important`.

**3. Dead styles.** Delete a component and its CSS remains — nobody can
prove it's unused. Stylesheets only grow.

### Tailwind's inversion

Tailwind supplies thousands of tiny single-purpose classes and asks you to
compose them **in the markup**:

```tsx
<div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
```

That reads as: *rounded corners (extra-large), 1px border in zinc-800,
background zinc-900 at 50% opacity, 1rem of padding.*

Look at what the three problems become:

1. **No naming.** There's nothing to name.
2. **No cascade conflicts.** Each class does one thing and applies to one
   element. Styles are effectively local, so you can restyle a component
   with zero risk to anything else.
3. **No dead styles.** Delete the element, its styles go with it.

The cost is honest: the markup gets verbose, and it looks wrong at first.
Most people find it uncomfortable for a couple of days and then don't go
back.

### The build step (and one gotcha it causes)

Setup here is minimal — [src/app/globals.css](../src/app/globals.css) is
essentially `@import "tailwindcss";` plus a few body defaults. At build
time, Tailwind **scans your source files for class names as plain text**
and generates CSS for only the ones it found. Unused utilities never ship.

That scanning is literal string matching, which produces the one real
Tailwind gotcha:

```tsx
// ✗ Broken — Tailwind never sees the string "text-lime-400"
const color = "lime";
<p className={`text-${color}-400`}>

// ✓ Fine — complete class names appear in the source
<p className={active ? "text-lime-400" : "text-zinc-400"}>
```

Never build a class name by concatenation. Always write the full names and
choose between them.

> **Coming from C#:** the closest experience is inline `style=` attributes
> in a Razor view — with the crucial differences that these are real classes
> (so pseudo-states like `hover:` and media queries work, which inline
> styles can't do), they're constrained to a design scale, and unused ones
> are stripped at build.

---

## Part 2 — The vocabulary you need for this codebase

### Spacing and size

The scale unit is `0.25rem` (4px), so `4` = 1rem = 16px.

- `p-4` padding all round · `px-3` left/right · `py-2` top/bottom
- `m-4` margin · `mt-8` margin-top · `mx-auto` horizontal auto (centres)
- `w-full` (100%) · `h-14` · `max-w-6xl` · `min-h-20`
- `gap-3` — space between flex/grid children. **Prefer this over margins**;
  it doesn't collapse and it doesn't add trailing space at the ends.

### Layout

Two systems do nearly all the work.

**Flexbox** — one dimension, for rows and columns:

```
flex items-center justify-between
 │     │              └─ horizontal distribution (space between ends)
 │     └─ vertical alignment (centred)
 └─ become a flex row
```

That exact string is the nav bar. Other common values: `justify-center`,
`gap-2`, `flex-col` (stack vertically), `flex-wrap`.

**Grid** — two dimensions, for card layouts:

```tsx
grid grid-cols-2 gap-4 lg:grid-cols-4    // dashboard stat cards
```

Two columns on phones, four on large screens.

**Aspect ratio** — the exercise photo frames:

```tsx
aspect-[3/2] overflow-hidden             // fixed 3:2 box
object-cover                             // image fills it, cropping overflow
```

The square brackets are Tailwind's **arbitrary value** syntax: when no
built-in utility fits, `aspect-[3/2]`, `w-[347px]`, or `bg-[#ff0000]` will
generate exactly that. (This app's white-bar fix was precisely this —
`aspect-square` + `object-contain` letterboxed 3:2 photos, so it became
`aspect-[3/2]` + `object-cover`. `object-contain` fits the whole image
inside the box and leaves gaps; `object-cover` fills the box and crops.)

### Colour

Format is `<property>-<palette>-<shade>`, shades running 50 (lightest) to
950 (darkest).

The app's dark theme:

| Role | Class |
|---|---|
| Page background | `bg-zinc-950` |
| Card background | `bg-zinc-900/50` |
| Borders | `border-zinc-800` |
| Primary text | `text-zinc-100` |
| Secondary text | `text-zinc-400` |
| Accent | `lime-400` |

The `/50` suffix is **opacity** — `bg-zinc-900/50` is that colour at 50%,
and `bg-lime-400/10` is the faint lime wash behind an active nav link.

### Typography

- `text-3xl font-bold tracking-tight` — every page's `<h1>`
- `text-sm text-zinc-400` — secondary text throughout
- `truncate` — one line, ellipsis on overflow (exercise card titles)
- `capitalize` — exercise names are stored lowercase; CSS title-cases them
  for display, leaving the data untouched

### State and responsive prefixes

A prefix before a colon makes the utility conditional:

```tsx
hover:bg-lime-300         // on mouse hover
focus:border-lime-400     // when focused (the input ring)
disabled:opacity-50       // when the element is disabled
group-hover:text-lime-400 // when an ancestor marked `group` is hovered
lg:flex                   // at ≥1024px wide
```

`group` is worth knowing: put `group` on a parent, then `group-hover:` on
any descendant, and hovering the parent styles the child. That's how the
whole exercise card lights up its title on hover.

**Responsive design here is mobile-first.** An unprefixed class applies at
every size; a prefixed one applies from that breakpoint *upward*.

```tsx
hidden lg:flex     // hidden on phones, flex on desktop  (nav links)
lg:hidden          // visible on phones, hidden on desktop (hamburger)
```

Breakpoints: `sm` 640px · `md` 768px · `lg` 1024px · `xl` 1280px.

---

## Part 3 — Reading real examples

### The primary button

```tsx
className="rounded-lg bg-lime-400 px-5 py-2.5 font-semibold text-zinc-950
           transition-colors hover:bg-lime-300"
```

Rounded, lime background, generous padding, semibold, near-black text (dark
text on a bright accent, for contrast), colour changes animated, lighter
lime on hover. This exact recipe appears on every primary action in the
app — consistency by convention rather than abstraction. The next step
would be extracting a `<Button>` component, which is one of the module 12
challenges.

### Conditional classes

Because `className` is just a string, conditional styling is ordinary
TypeScript. The nav's active-link logic:

```tsx
const linkClass = (href: string) =>
  `rounded-md px-2.5 py-1.5 text-sm transition-colors ${
    pathname === href
      ? "bg-lime-400/10 font-semibold text-lime-400"        // current page
      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
  }`;
```

Note both branches are **complete class names** — Part 1's rule.

The calendar tiles ([calendar/page.tsx](../src/app/calendar/page.tsx))
compose three conditions at once: a base style, a lime border for days you
trained, and a ring for today.

### The card

```tsx
<Link className="group overflow-hidden rounded-xl border border-zinc-800
                 bg-zinc-900/50 transition-colors hover:border-lime-400/50">
  <div className="aspect-[3/2] overflow-hidden bg-white"> … </div>
  <div className="p-3">
    <h3 className="truncate font-semibold capitalize group-hover:text-lime-400">
```

Every idea from Part 2 in one component: `group` + `group-hover`,
`aspect-[3/2]` with `overflow-hidden` to crop, `truncate` for long names,
`capitalize` for display casing, and opacity suffixes on the hover border.

---

## Try it

These are all live-reload friendly — save and the browser updates.

1. **Re-theme the app in 60 seconds.** Search-and-replace `lime-` → `orange-`
   across `src/`. Look at the result, then reverse it. That this works at
   all is the point: styles live in the markup, so one grep reaches every
   one of them.

2. **Add a hover lift.** In
   [exercise-card.tsx](../src/components/exercise-card.tsx), add
   `transition-transform hover:-translate-y-1` to the `<Link>`. Cards now
   rise on hover.

3. **Move a breakpoint.** In [nav.tsx](../src/components/nav.tsx), change
   `lg:flex` to `md:flex` and narrow the window. Desktop links now appear at
   768px instead of 1024px. Restore.

4. **Prove the scanning gotcha.** Replace a working `text-lime-400` with
   ``className={`text-${"lime"}-400`}``. The colour disappears — the class
   is generated at runtime, so Tailwind never saw the string at build time
   and produced no CSS for it. Restore it. This will save you a confusing
   half hour someday.

5. **Compare `object-cover` and `object-contain`.** In the card's image,
   swap `object-cover` for `object-contain` and reload /exercises. The white
   bars come back — that's the bug this app actually had, and now you can
   see exactly why.

6. **Inspect reality.** DevTools → Elements → click a card and read the
   Styles panel. Every utility maps to exactly one CSS rule with no
   surprises — the whole system is transparent, unlike component frameworks
   where you're debugging someone else's cascade.

---

## Checkpoint

- What three problems with traditional CSS does the utility approach
  address?
- Why does `` className={`text-${color}-400`} `` silently produce no
  styling?
- What does `bg-zinc-900/50` mean, part by part?
- In mobile-first thinking, what does `hidden lg:flex` do at 500px wide,
  and at 1200px?
- What's the difference between `object-cover` and `object-contain`, and
  which one fixed the white bars?

**Next:** [Module 11 — How this app was actually built →](11-how-it-was-built.md)
