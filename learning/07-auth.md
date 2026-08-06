# Module 7 — Authentication

**Goal:** understand the full login story from first principles — why
cookies exist, what a JWT actually is, why passwords are hashed rather than
encrypted, and how every page in this app answers "who is this?".

---

## Part 1 — The problem: HTTP has no memory

HTTP is **stateless**. Each request is independent, and the server has no
built-in way to know that the request asking for `/dashboard` came from the
same person who typed a password thirty seconds ago. Nothing in a plain
HTTP request identifies a user.

So authentication is always the same two-part trick:

1. **Prove identity once** (email + password), and
2. **Carry proof of that on every subsequent request.**

The carrier is almost always a **cookie**: a small piece of data the server
sends back with `Set-Cookie`, which the browser then stores and
automatically attaches to every future request to that site. You don't
write code to send it; the browser just does.

The design question is *what goes in the cookie*, and there are two
answers.

### Option A: a session id (server-side sessions)

The cookie holds a meaningless random string. The server keeps a table
mapping that string to a user.

- ✅ You can revoke a session instantly — delete the row.
- ✅ The cookie contains nothing sensitive.
- ❌ Every single request costs a database lookup.
- ❌ You need a sessions table, and something to clean up expired rows.

### Option B: a signed token (what this app uses)

The cookie holds the user's identity *directly*, plus a cryptographic
signature proving the server issued it. No storage on the server at all.

- ✅ Zero database lookups to check identity — just verify the signature.
- ✅ No sessions table, nothing to clean up, survives server restarts.
- ❌ **You cannot revoke it.** Until it expires, it's valid. Logging out
  deletes the browser's copy, but a stolen copy still works.
- ❌ Anything in it is stale from the moment it's issued.

This app uses Option B, with a JWT as the token. The reason is in module
11's build story: the Credentials provider requires it, and for a
single-user local app the revocation downside is nearly free.

---

## Part 2 — What a JWT actually is

"JWT" (JSON Web Token) sounds cryptographic and mysterious. It isn't. A JWT
is three chunks of Base64 text, separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyIsIm5hbWUiOiJSaWxleSJ9.dBjftJeZ4CVP-mB92K
└──── header ────┘ └────────── payload ──────────┘ └──── signature ────┘
```

- **Header** — which algorithm signed it.
- **Payload** — the actual data. Here: your user id, name, and an expiry.
- **Signature** — the header and payload, hashed together with a secret key
  only the server knows (`AUTH_SECRET` in [.env](../.env)).

### The single most important fact about JWTs

**A JWT is signed, not encrypted. The payload is readable by anyone.**

Base64 is an encoding, not a cipher — decoding it takes one function call.
Paste your session token into jwt.io and you'll see your user id in plain
text.

What the signature buys you is **tamper detection**, not secrecy. If
someone edits the payload to say they're a different user, the signature no
longer matches, and the server rejects it. They can't forge a new signature
without the secret.

The rules that follow from this:

- **Never put anything secret in a JWT payload.** No passwords, no API
  keys, no private data. Identity and permissions only.
- **Keep `AUTH_SECRET` genuinely secret.** Anyone with it can mint a valid
  token for any user. It's the only thing standing between a stranger and
  your account.
- **A stolen token is a valid token.** Hence `HttpOnly` (below).

### Why the cookie is `HttpOnly`

The session cookie is set with the `HttpOnly` flag, which means
**JavaScript cannot read it** — `document.cookie` doesn't show it.

The threat this addresses is XSS: if an attacker manages to run any
JavaScript on your page, the first thing they'd do is read the cookie and
send it to themselves. `HttpOnly` makes the token invisible to scripts
while still being sent automatically with every request. Storing tokens in
`localStorage` — a common tutorial pattern — gives up this protection
entirely.

> **Coming from C#:** ASP.NET's cookie authentication uses an *encrypted*
> auth ticket (Data Protection API), so its payload isn't readable at all.
> A JWT is signed only, so the readability caveat is a real difference in
> kind, not just in library. The role is otherwise identical, and
> `[Authorize]`'s job here is done by an explicit `await auth()` call.

---

## Part 3 — Password storage: hashing, not encryption

The database stores `password_hash`, never a password. The distinction
matters:

- **Encryption is reversible.** With the key you get the original back.
  Wrong tool — if your database leaks, so does the key eventually, and then
  every password is exposed.
- **Hashing is one-way.** You cannot recover the input from the output. To
  check a password you hash the attempt and compare hashes.

So the server never knows your password after registration. It only knows
whether a given guess produces the same hash.

### Why bcrypt and not SHA-256

A general-purpose hash like SHA-256 is designed to be *fast* — billions per
second on a GPU. That's exactly wrong for passwords, because an attacker
with a leaked hash list can simply try every common password.

**bcrypt is deliberately slow, and tunably so.**

```ts
const passwordHash = await bcrypt.hash(password, 12);
```

That `12` is the **cost factor**: the algorithm runs 2¹² iterations. Each
+1 doubles the work. Cost 12 takes roughly a quarter-second — imperceptible
when you log in once, devastating when you're trying to test a billion
guesses. And as hardware improves, you raise the number.

### Salting, and why you never see the salt

If two users have the same password, naive hashing gives identical hashes —
which leaks information and lets an attacker crack both at once with
precomputed tables.

A **salt** is random data mixed into each hash, so identical passwords
produce different hashes. bcrypt generates one automatically and stores it
*inside* the output string:

```
$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyOm
└┬┘└┬┘└──────── salt ────────┘└──────── hash ────────┘
 │  └── cost factor (12)
 └───── algorithm (2b = bcrypt)
```

Everything needed to verify is in that one string, which is why the schema
has no separate salt column.

Verification compares in **constant time** — it doesn't return early on the
first mismatched byte, so an attacker can't learn anything from how long
the check took:

```ts
const ok = await bcrypt.compare(password, user.password_hash);
```

---

## Part 4 — How the pieces fit together in this app

```
REGISTER
  register form ──► registerAction ──► bcrypt.hash(pw, 12) ──► INSERT users

LOGIN
  login form ──► loginAction ──► signIn("credentials", {email, password})
                                        │
                                        ▼
                            authorize() in src/lib/auth.ts
                              1. SELECT user WHERE email = ?
                              2. bcrypt.compare(password, hash)
                              3. return user  |  return null
                                        │ success
                                        ▼
                            JWT built, signed with AUTH_SECRET,
                            sent as an HttpOnly cookie
                                        │
EVERY LATER REQUEST
  browser attaches cookie ──► auth() ──► verify signature ──► session.user.id
                                                                    │
                                                                    ▼
                                                    every SQL query filters by it
```

**NextAuth (Auth.js) v5** is the library wiring this together. It handles
the cookie, the signing, the verification, the sign-in/sign-out endpoints,
and the expiry — you supply the "is this password correct?" logic.

### The configuration — [src/lib/auth.ts](../src/lib/auth.ts)

```ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      async authorize(credentials) {
        // SELECT by email, bcrypt.compare, return a user object or null
      },
    }),
  ],
  callbacks: {
    jwt({ token, user })        { if (user) token.id = user.id; return token; },
    session({ session, token }) { session.user.id = token.id;   return session; },
  },
});
```

Reading it piece by piece:

- **`providers`** — the ways one can log in. `Credentials` is
  email+password. OAuth providers (Google, GitHub) would be additional
  entries here.
- **`authorize`** — *your* verification function. Return a user object and
  NextAuth issues a token; return `null` and it reports invalid
  credentials. Never throw a descriptive error here — "no such email" and
  "wrong password" must be indistinguishable to the caller, or you've built
  an account-enumeration oracle.
- **`strategy: "jwt"`** — Option B from Part 1. Required by the Credentials
  provider, which cannot use database sessions.
- **`pages: { signIn: "/login" }`** — use our page instead of NextAuth's
  built-in one.
- **The two callbacks** exist to carry `user.id` through. By default the
  token holds name and email but *not* the id, and the id is what every SQL
  query needs. `jwt()` runs when the token is created and stashes the id;
  `session()` runs whenever `auth()` is called and copies it back out onto
  `session.user.id`. Without those two lines the entire authorisation model
  in module 5 would have nothing to filter on.

The exported names are what the rest of the app imports: `auth()` to read
the session, `signIn`/`signOut` for the actions, `handlers` for the
catch-all route.

### Teaching TypeScript about `user.id`

Since NextAuth's built-in `Session` type has no `id`, adding one would be a
compile error. [src/types/next-auth.d.ts](../src/types/next-auth.d.ts)
fixes that with **module augmentation** — re-opening a library's type
declarations to add fields:

```ts
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
```

This is types-only; it changes nothing at runtime. It's the reason
`session.user.id` autocompletes.

> **Coming from C#:** conceptually like extending a `partial class` from
> another file, or adding members via extension — except it's the *type
> declaration* being merged, and it produces no code at all.

---

## Part 5 — Checking auth, and the two call sites

**In pages** (server components) — redirect anonymous users:

```tsx
const session = await auth();
if (!session?.user?.id) redirect("/login");
```

**In API routes** — return a status code, since there's no UI to redirect:

```ts
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

`auth()` reads the cookie, verifies the signature against `AUTH_SECRET`,
checks the expiry, and returns the session (or `null`). It's `HttpContext.User`
and `[Authorize]` collapsed into one explicit call.

Search the project for `await auth()` and you'll find every protected
surface in the app. Count them, then notice which pages *don't* call it:
the landing page, login, register, and the exercise browser are
deliberately public.

### Authentication vs authorisation

Worth separating clearly, because this app handles them in different
places:

- **Authentication** — *who are you?* Handled by `auth()`, once per
  request.
- **Authorisation** — *are you allowed to touch this?* Handled entirely by
  the `WHERE user_id = ?` clause on every query (module 5).

There are no roles, no permissions, and no ownership checks in the UI
layer. Every user owns exactly their own rows, and the SQL enforces it.
That's a small model, but it's coherent and it has no gaps — which is worth
more than a sophisticated model with holes in it.

---

## Part 6 — Sign out

The nav's Sign out button submits a form to `logoutAction`, which calls
NextAuth's `signOut()`. That clears the cookie and redirects.

With the JWT strategy there is **no server state to destroy** — "logging
out" literally means "delete the browser's copy of the token." The token
itself remains cryptographically valid until it expires. That's the Part 1
trade-off made concrete, and it's why long-lived JWTs are a bad idea.

---

## Part 7 — What's deliberately missing

Honest gaps, each a reasonable extension exercise:

- **Password change / reset** — needs email infrastructure for the reset
  flow. Changing a password while logged in is achievable now (module 12,
  challenge 3.1).
- **Account lockout / rate limiting.** Nothing stops a script from trying
  passwords as fast as bcrypt allows. Cost factor 12 is a real speed bump,
  but it isn't rate limiting.
- **Email verification** — anyone can register with any address.
- **OAuth providers.** The original skeleton had Google/GitHub via a
  database adapter; module 11 explains why they were removed.
- **CSRF protection** on the custom API routes. NextAuth protects its own
  endpoints; the app's cookie is `SameSite=Lax` by default, which covers
  the common cases, but a shared production app would want explicit tokens.

---

## Try it

1. **Look at a real hash.** In HeidiSQL:
   `SELECT email, password_hash FROM users;`
   Identify the four parts from Part 3 in the `$2b$12$...` string. Register
   a second account with the *same* password as the first and compare the
   hashes — completely different, thanks to the salt.

2. **Read your own token.** Log in, then DevTools → Application → Cookies →
   localhost:3000. Find `authjs.session-token`. Confirm `HttpOnly` is
   checked. Copy the value, paste it into https://jwt.io, and read your own
   user id in the payload. Sit with that for a second: it was never secret.

3. **Prove the signature matters.** In DevTools, edit one character in the
   middle of the token and refresh. You're logged out — signature
   verification failed. (Log back in with `testpass123`.)

4. **Prove `HttpOnly` works.** In the browser console, run
   `document.cookie`. The session token is not in the list, even though it
   is being sent with every request.

5. **Watch `authorize` run.** Add `console.log("authorize hit", credentials.email)`
   inside `authorize` in [src/lib/auth.ts](../src/lib/auth.ts), then log in
   and watch the **dev-server terminal** — not the browser console. Server
   code logs to the server. Getting this reflex right will save you hours.
   Remove the log afterwards.

6. **Feel the cost factor.** In a scratch file, hash the same password at
   cost 10 and cost 15 and time both. The difference between "instant" and
   "noticeably slow" is the entire defence.

---

## Checkpoint

- Why does a cookie exist at all — what problem does it solve?
- What can and cannot someone do with a stolen JWT, and what stops them
  editing it?
- Why is hashing the right operation for passwords and encryption the wrong
  one?
- What does bcrypt's cost factor buy, and where is the salt stored?
- What do the `jwt` and `session` callbacks accomplish, and what would break
  without them?
- Where is authorisation actually enforced in this app?

**Next:** [Module 8 — Client interactivity →](08-client-interactivity.md)
