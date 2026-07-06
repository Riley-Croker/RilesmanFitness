# Module 10 — Styling with Tailwind CSS

**Goal:** read and write the `className` strings that style every element,
and understand the app's dark theme.

## The idea: utility classes instead of stylesheets

Traditional CSS (and what ASP.NET templates usually give you): write a
`.workout-card` class in a `.css` file, apply it. Tailwind inverts this —
tiny single-purpose classes composed directly in markup:

```tsx
<div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
```

reads as: *rounded corners (xl), 1px border in zinc-800, background
zinc-900 at 50% opacity, padding 1rem.* The "stylesheet" is the markup.
Feels wrong for about two days, then most people never go back — you stop
naming things, styles never go stale, and deleting a component deletes
its styles.

Setup in this app is minimal: [globals.css](../src/app/globals.css) has
`@import "tailwindcss";` plus body defaults, and the build scans your
files for class names, generating only the CSS actually used.

## The vocabulary you need for this codebase

**Spacing & size** (unit = 0.25rem: `4` = 1rem)
- `p-4` padding, `px-3` horizontal, `py-2` vertical, `mt-8` margin-top
- `w-full` width:100%, `h-14` height:3.5rem, `max-w-6xl`, `min-h-20`
- `gap-3` — spacing between flex/grid children (use this, not margins)

**Layout**
- `flex items-center justify-between` — flexbox row, vertically centred,
  spread apart (the nav bar)
- `grid grid-cols-2 gap-4 lg:grid-cols-4` — 2-column grid, 4 on large
  screens (the dashboard stat cards)
- `aspect-[3/2] overflow-hidden` — the exercise photo frames (remember the
  white-bars fix? That was `aspect-square` → `aspect-[3/2]` + `object-cover`)

**Color** — palette name + shade (50 light … 950 dark)
- The theme: background `zinc-950`, cards `zinc-900/50`, borders
  `zinc-800`, text `zinc-100`/`zinc-400`, accent `lime-400`
- `/50` suffix = opacity; `bg-lime-400/10` is the faint lime glow on
  active nav links

**Typography**
- `text-3xl font-bold tracking-tight` — every page's `<h1>`
- `text-sm text-zinc-400` — secondary text everywhere
- `capitalize` — exercise names are stored lowercase; CSS title-cases them

**States & responsiveness** (prefix = condition)
- `hover:bg-lime-300` — on hover
- `focus:border-lime-400` — the input focus ring color
- `disabled:opacity-50` — the save button while `pending`
- `lg:flex hidden` — hidden by default, flex ≥1024px (desktop nav links);
  the hamburger is the inverse (`lg:hidden`). **Mobile-first:** bare
  classes are mobile, prefixes add breakpoints upward.

## Reading a real one

The primary button, from the dashboard:

```tsx
className="rounded-lg bg-lime-400 px-5 py-2.5 font-semibold text-zinc-950
           transition-colors hover:bg-lime-300"
```

Rounded, lime background, padding, semibold, near-black text (dark text on
the bright accent), color transitions animated, lighter lime on hover.
You'll see this exact recipe on every primary action — consistency by
copy-paste convention. (The next abstraction step would be extracting a
`<Button>` component — see the challenges.)

## Dynamic classes — template strings + ternaries

Conditional styling is just TypeScript. The nav's active-link logic:

```tsx
const linkClass = (href: string) =>
  `rounded-md px-2.5 py-1.5 text-sm transition-colors ${
    pathname === href
      ? "bg-lime-400/10 font-semibold text-lime-400"   // current page
      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
  }`;
```

And the calendar tiles ([calendar/page.tsx](../src/app/calendar/page.tsx))
compose three conditions: trained-day border, today's ring, base style.

## Try it (live-edit friendly — the browser updates as you save)

1. **Re-theme in 60 seconds.** Search-replace `lime-` → `orange-` across
   `src/` and look at the app. Pick your favourite; `lime` is easy to
   restore with the reverse replace. (This works *because* styles live in
   markup — one grep hits everything.)
2. **Read then modify.** In [exercise-card.tsx](../src/components/exercise-card.tsx),
   the card hover is `hover:border-lime-400/50`. Make the whole card lift:
   add `transition-transform hover:-translate-y-1`.
3. **Break a breakpoint.** In nav.tsx change `lg:flex` to `md:flex` and
   narrow the window — the desktop links now appear at ≥768px. Understand,
   then restore.
4. **Inspect reality.** DevTools → Elements → click a card. Every utility
   class maps to exactly one CSS rule — Tailwind is transparent, nothing
   like Bootstrap's opaque component styles.

**Next:** [Module 11 — How this app was actually built →](11-how-it-was-built.md)
