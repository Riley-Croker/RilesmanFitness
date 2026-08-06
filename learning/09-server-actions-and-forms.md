# Module 9 — Server Actions & Forms

**Goal:** understand the *other* way client talks to server. Module 6's
logger used `fetch` + an API route; the login and register forms use
**server actions**. Knowing what each one really is — and when to pick
which — is the lesson.

---

## Part 1 — How HTML forms worked before any of this

Server actions are a modern take on a very old mechanism, so it's worth
one paragraph on the original.

A plain HTML form needs no JavaScript at all:

```html
<form method="POST" action="/login">
  <input name="email" />
  <input name="password" type="password" />
  <button type="submit">Log in</button>
</form>
```

Click submit and the **browser** — not your code — gathers every named
input, encodes them into the request body, POSTs to the `action` URL, and
renders whatever comes back. The set of name/value pairs it builds is
called **FormData**.

This is fully functional, requires zero client code, and works before (or
without) JavaScript. Its weakness is that the response replaces the whole
page, so you get a full reload for a validation error.

Server actions keep the good part and remove the reload.

---

## Part 2 — What a server action is

A server action is **a function that lives on the server but can be called
directly from client code.** You mark it, and Next.js generates the HTTP
plumbing between the two — no endpoint URL, no `fetch`, no JSON.

```ts
"use server";                     // ← every export in this file is an action

export async function loginAction(prevState, formData: FormData) { … }
```

### What actually happens under the hood

This is worth knowing precisely, because otherwise it feels like magic:

1. At build time, Next.js sees `"use server"` and assigns each exported
   function a unique id.
2. On the client, the "function" you import is a **stub**. It contains none
   of the server code — that never reaches the browser.
3. Calling it POSTs to the current page URL with a `Next-Action` header
   carrying that id and the arguments in the body.
4. The server looks up the id, runs the real function, and returns the
   result — which React feeds back to your component.

So it's **RPC** (remote procedure call): a normal-looking function call
that quietly crosses the network.

### The security consequence you must not miss

> **Every server action is a publicly reachable HTTP endpoint.**

It looks like a private function, but anyone who knows the action id can
invoke it with any arguments they like. The "only my form calls this"
intuition is wrong.

Therefore a server action needs exactly the same checks as an API route:
authenticate, authorise, validate. When you write `deleteAccountAction`,
it must call `auth()` itself and derive the user id from the session —
never accept a user id as an argument.

> **Coming from C#:** the nearest analogies are Blazor Server's circuit
> calls or classic WebForms postback handlers (without the ViewState).
> Conceptually it's a WCF/gRPC service method: a function you call that's
> actually a network round trip. The `"use server"` directive is the
> `[HttpPost]`-equivalent — and, exactly like a controller action, it is
> reachable by anyone who constructs the request.

---

## Part 3 — Reading the login action

Open [src/lib/actions.ts](../src/lib/actions.ts):

```ts
"use server";

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
    if (isRedirectError(error)) throw error;      // ← success path! see below
    if (error instanceof AuthError) return "Invalid email or password.";
    throw error;
  }
}
```

### The signature

The two parameters are dictated by `useActionState` (Part 4):

- `_prevState` — whatever the action returned last time. The login form
  doesn't need it, hence the underscore.
- `formData` — the submitted `FormData`. Read values with
  `formData.get("email")`, which returns `string | File | null`.

The **return value** is how the action reports failure back to the form.
Here: an error string, or `undefined` for success.

### The genuinely weird bit: re-throwing the redirect

Module 4 covered how `redirect()` works by **throwing** a special error
that Next.js catches upstream.

Now combine that with `signIn`, which redirects on *success*. The
successful path throws. So a naive `catch` would swallow the redirect,
convert a successful login into an error message, and leave the user
staring at "Invalid email or password" while actually logged in.

Hence:

```ts
if (isRedirectError(error)) throw error;    // not an error — let it fly
if (error instanceof AuthError) return "Invalid email or password.";
throw error;                                // anything else is a real bug
```

Three cases, in order: control flow (re-throw), expected failure (report),
unexpected failure (re-throw so it surfaces).

**The general rule:** never wrap a `redirect()` in an unconditional
`try/catch`. Either keep it outside the try, or detect and re-throw it.
This is the least intuitive pattern in the codebase.

---

## Part 4 — Wiring it to the form: `useActionState`

[src/app/login/page.tsx](../src/app/login/page.tsx):

```tsx
"use client";
const [error, formAction, pending] = useActionState(loginAction, undefined);

<form action={formAction}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  {error && <p className="text-red-400">{error}</p>}
  <button disabled={pending}>{pending ? "Logging in…" : "Log in"}</button>
</form>
```

`useActionState(action, initialState)` returns three things:

| | What it is |
|---|---|
| `error` | the action's last return value (initially `undefined`) |
| `formAction` | the wrapped action to hand to `<form action={…}>` |
| `pending` | `true` while the action is in flight |

`pending` is the quiet win — a correct loading state with no `useState`, no
`try/finally`, and no way to forget to reset it. Compare that with the
logger, which manages `saving` and `error` by hand (module 8).

### What isn't there

Look at what this form *doesn't* need:

- no `fetch`, no URL, no `JSON.stringify`, no `res.ok` check
- no `onChange` handlers and no state per input — inputs are read by
  `name` at submit time, the old-fashioned way
- no `onSubmit` with `preventDefault()`
- no manual loading flag

That's roughly thirty lines of plumbing that simply don't exist.

### Progressive enhancement

Because `<form action={…}>` is still a real form, it works **before the
JavaScript finishes loading**. Submit early and the browser does a
classic POST; once hydrated, React intercepts and does it without a
reload. Same code, both paths.

An API route + `fetch` cannot do this — no JavaScript, no request.

### The minimal case

Sign-out in [nav.tsx](../src/components/nav.tsx) — an action with no
arguments and no state:

```tsx
<form action={logoutAction}>
  <button type="submit">Sign out</button>
</form>
```

Note it's a **form**, not an `onClick`. Anything that changes server state
should be a POST, not a link — otherwise a prefetch or a crawler can
trigger it.

---

## Part 5 — `registerAction`: validation in one place

`registerAction` in the same file follows the pattern with real validation:

```ts
if (!email || !password) return "Email and password are required.";
if (password.length < 8) return "Password must be at least 8 characters.";

const [existing] = await db.execute("SELECT id FROM users WHERE email = ?", [email]);
if ((existing as unknown[]).length > 0) return "An account with that email already exists.";

const passwordHash = await bcrypt.hash(password, 12);
await db.execute("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)", …);
```

The thing to appreciate: validation, the uniqueness check, hashing, and the
insert are all in one function, in one file, with no serialisation boundary
in the middle. The error string it returns is rendered by the form
directly.

Everything in it should be familiar by now — `db.execute` and `?`
placeholders from module 5, `bcrypt.hash` and the cost factor from module
7, the `as unknown[]` cast from module 2.

---

## Part 6 — Choosing between the two

| | API route + `fetch` | Server action |
|---|---|---|
| Feels like | REST endpoint + HttpClient | RPC / form postback |
| Best for | JSON data, complex client state, anything reusable | Form submissions, simple mutations |
| Works without JS | No | Yes |
| Callable by other clients (mobile, curl) | Yes | No — internal protocol |
| Loading & error state | You write it | `pending` + return value, free |
| Discoverable URL | Yes | No |
| Needs auth checks | Yes | **Yes — equally** |
| In this app | logger save, delete buttons, picker search, charts, unit toggle | login, register, logout |

The split this app uses — **forms → actions, everything else → API routes**
— is a sensible default, not a law.

You *could* rewrite the logger's save as a server action. It would work and
delete some plumbing. You'd give up the public JSON contract and the
ability to call it from anything that isn't this app. That's a real
trade-off with no universally right answer; the important thing is making
it deliberately.

---

## Try it

1. **See the RPC on the wire.** DevTools → Network → submit the login form
   with a *wrong* password. Look at the request: a POST to the page's own
   URL (`/login`), with a `Next-Action` header holding the action id. Now
   compare it with the POST to `/api/workouts` when you save a workout — a
   conventional REST call to a named endpoint. Two different protocols,
   visible side by side.

2. **Watch `pending` work.** Throttle the network (DevTools → Network →
   Slow 3G) and submit the login form. The button disables and reads
   "Logging in…" for free. Nothing in the page manages that flag.

3. **Add a validation rule.** In `registerAction`, add a rule that the
   password must contain a digit:
   ```ts
   if (!/\d/.test(password)) return "Password must contain a number.";
   ```
   Test it in the register form. You just did full-stack validation with
   one line and no endpoint.

4. **Break the redirect handling.** In `loginAction`, comment out
   `if (isRedirectError(error)) throw error;`. Log in with **correct**
   credentials. You'll see the error message even though the login
   succeeded — refresh and you're on the dashboard. That's the module 4
   redirect-throws mechanic biting. Restore it.

5. **Prove an action is a public endpoint.** In DevTools, find the
   `Next-Action` id from step 1, then replay that POST from the Network
   panel (right-click → Copy as fetch, paste into the console, change the
   password). It runs — the form was never the gatekeeper. This is why
   `registerAction` validates its own inputs and `auth()` guards anything
   user-specific.

6. **Write one.** Add `deleteAccountAction` to actions.ts: call `auth()` to
   get the user id (**never take it as a parameter**), `DELETE FROM users
   WHERE id = ?` — the cascades from module 5 wipe the rest — then
   `signOut`. Wire it to a small red button behind a confirmation, reusing
   the `DeleteButton` two-step pattern. *Don't click it on data you care
   about.*

---

## Checkpoint

- What actually travels over the network when you call a server action?
- Why is "it's only called from my form" not a security argument?
- Why must `loginAction`'s catch block re-throw certain errors?
- What three values does `useActionState` give you, and which one replaces
  hand-written loading state?
- Which of the two approaches still works if JavaScript hasn't loaded, and
  why?

**Next:** [Module 10 — Styling with Tailwind →](10-styling-tailwind.md)
