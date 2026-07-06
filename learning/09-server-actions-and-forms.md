# Module 9 — Server Actions & Forms

**Goal:** understand the *other* way client talks to server. The logger
used `fetch` + API route; the login/register forms use **server actions**
— and knowing when to use which is the real lesson.

## What is a server action?

A function marked `"use server"` that lives on the server but can be
invoked directly from a form or client component — Next.js generates the
HTTP plumbing. It's RPC: the closest .NET analogies are Blazor Server's
circuit calls, or classic ASP.NET WebForms postback handlers (minus the
ViewState horror).

Open [src/lib/actions.ts](../src/lib/actions.ts):

```ts
"use server";                      // ← every export becomes an action

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;   // success path! see below
    if (error instanceof AuthError) return "Invalid email or password.";
    throw error;
  }
}
```

`FormData` is literally the posted form body — `Request.Form` in ASP.NET.
The return value (an error string or nothing) goes back to the form.

**The weird bit — rethrowing redirects:** in Next, `redirect()` works by
*throwing* a special error that the framework catches upstream (module 4
mentioned this). NextAuth's `signIn` redirects on success, so the
`catch` block must let that specific "error" escape (`isRedirectError`)
while converting real failures into a message. Miss that and a successful
login would display as an error. This is the least intuitive pattern in
the codebase — now it's yours.

## Wiring the form — [src/app/login/page.tsx](../src/app/login/page.tsx)

```tsx
"use client";
const [error, formAction, pending] = useActionState(loginAction, undefined);

<form action={formAction}>
  <input name="email" ... />
  <input name="password" ... />
  {error && <p className="...">{error}</p>}
  <button disabled={pending}>{pending ? "Logging in…" : "Log in"}</button>
</form>
```

`useActionState` gives you three things:

- `error` — whatever the action last returned (our error string)
- `formAction` — the submit handler to attach to `<form action=...>`
- `pending` — true while the action is in flight (free loading state)

Note what's absent: no `fetch`, no endpoint URL, no JSON serialisation, no
onChange handlers (the form reads inputs by `name` on submit —
old-school and correct). Compare with the logger's ~30 lines of save
plumbing.

`registerAction` is the same pattern plus validation and
`bcrypt.hash` + INSERT — read it now; after modules 5 and 7 every line
should make sense.

The **sign-out button** in [nav.tsx](../src/components/nav.tsx) is the
minimal case — a form whose action takes no arguments:

```tsx
<form action={logoutAction}>
  <button type="submit">Sign out</button>
</form>
```

## fetch + API route vs server action — when to use which?

| | API route + fetch | Server action |
|---|---|---|
| Feels like | Web API + HttpClient | RPC / form postback |
| Best for | JSON data, complex client state, reusable endpoints | Form submissions, simple mutations |
| Progressive enhancement | No — needs JS | Yes — plain form POST works even before JS loads |
| Callable from other clients (mobile app, curl) | Yes | No — Next-internal protocol |
| In this app | logger save, delete buttons, picker search, charts, unit toggle | login, register, logout |

The app's split is a reasonable default: **forms → actions; everything
else → API routes.** You could rewrite the logger's save as a server
action (skipping /api/workouts) — it'd work, but you'd lose the public
endpoint and the JSON contract. Trade-offs, not dogma.

## Try it

1. **Watch the wire.** DevTools → Network tab → submit the login form.
   You'll see a POST to the *page URL itself* with a `Next-Action` header —
   that's the RPC protocol. Compare with the POST to `/api/workouts` when
   saving a workout: a normal REST call.
2. **Return better errors.** In `registerAction`, the password rule is
   `length < 8`. Add a second rule (must contain a digit:
   `!/\d/.test(password)`) with its own message. Test in the register
   form. You've done full-stack validation in one file.
3. **Write your own action.** Add `deleteAccountAction` to actions.ts:
   `auth()` to get the user id, `DELETE FROM users WHERE id = ?` (cascade
   wipes everything), then `signOut`. Wire it to a small red button on the
   dashboard behind a `confirm()` — or reuse the DeleteButton pattern.
   *Don't click it on your real data unless you mean it.*

**Next:** [Module 10 — Styling with Tailwind →](10-styling-tailwind.md)
